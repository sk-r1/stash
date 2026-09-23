import { Router } from "express";
import path from "node:path";
import fs from "node:fs";
import { ChildProcess } from "node:child_process";
import { db, getSettings, clampMaxParallel } from "../db";
import { startDownload, DownloadProgressEvent } from "../yt-dlp";
import { probeMetadata } from "../ffmpeg";
import { VideoRow } from "../types";

const router = Router();

const VIDEOS_PATH = process.env.VIDEOS_PATH || path.join(__dirname, "..", "..", "videos");

const getVideoWithChannelStmt = db.prepare(`
  SELECT v.*, c.name as channel_name
  FROM videos v JOIN channels c ON c.id = v.channel_id
  WHERE v.id = ?
`);
const setPendingQueuedStmt = db.prepare(
  "UPDATE videos SET status = 'pending', queued = 1, error_message = NULL, audio_only = ? WHERE id = ?"
);
const setDownloadingStmt = db.prepare("UPDATE videos SET status = 'downloading' WHERE id = ?");
const setCompletedStmt = db.prepare(`
  UPDATE videos SET status = 'completed', video_file_path = ?, resolution = ?, audio_bitrate = ?,
    video_codec = ?, audio_codec = ?, color_transfer = ?, file_size = ?, downloaded_at = datetime('now') WHERE id = ?
`);
const setErrorStmt = db.prepare(
  "UPDATE videos SET status = 'error', error_message = ? WHERE id = ?"
);
const queuedPendingIdsStmt = db.prepare(
  "SELECT id FROM videos WHERE status = 'pending' AND queued = 1 ORDER BY id"
);
const downloadsQueueViewStmt = db.prepare(`
  SELECT v.*, c.name as channel_name FROM videos v
  JOIN channels c ON c.id = v.channel_id
  WHERE v.status IN ('pending', 'downloading', 'error') AND v.queued = 1
  ORDER BY v.created_at ASC
`);

const queue: number[] = [];
const active = new Map<number, ChildProcess>();
const progress = new Map<number, DownloadProgressEvent>();

function sanitizeForPath(name: string): string {
  return name.replace(/[/\\:*?"<>|]/g, "_").trim() || "unknown";
}

function tryStartNext(): void {
  const maxParallel = clampMaxParallel(getSettings().max_parallel_downloads);
  while (active.size < maxParallel && queue.length > 0) {
    const videoId = queue.shift()!;
    startVideoDownload(videoId);
  }
}

function startVideoDownload(videoId: number): void {
  if (active.has(videoId)) return;

  const video = getVideoWithChannelStmt.get(videoId) as
    | (VideoRow & { channel_name: string })
    | undefined;
  if (!video) return;

  setDownloadingStmt.run(videoId);
  const settings = getSettings();
  const outputTemplate = path.join(
    VIDEOS_PATH,
    sanitizeForPath(video.channel_name),
    // The id keeps two same-titled uploads of one channel from colliding
    // on a single file (and one delete removing the other's file).
    "%(title)s [%(id)s].%(ext)s"
  );

  const child = startDownload(
    video.url,
    {
      outputTemplate,
      audioOnly: !!video.audio_only,
      sponsorblockEnabled: settings.sponsorblock_enabled,
      subtitlesEnabled: settings.subtitles_enabled,
    },
    {
      onProgress: (p) => progress.set(videoId, p),
      onExit: async (result) => {
        active.delete(videoId);
        progress.delete(videoId);

        if (result.success && result.filePath) {
          const meta = await probeMetadata(result.filePath);
          let fileSize: number | null = null;
          try {
            fileSize = fs.statSync(result.filePath).size;
          } catch {
            fileSize = null;
          }
          // "" = probed but not present (e.g. SDR has no color_transfer), so the
          // startup backfill doesn't re-probe this file on every boot.
          setCompletedStmt.run(
            result.filePath,
            meta.resolution,
            meta.audioBitrate,
            meta.videoCodec ?? "",
            meta.audioCodec ?? "",
            meta.colorTransfer ?? "",
            fileSize,
            videoId
          );
        } else {
          setErrorStmt.run(result.errorMessage || "Download failed", videoId);
        }

        tryStartNext();
      },
    }
  );

  active.set(videoId, child);
}

/** Called once at server startup, after crash-recovery has reset stuck rows to 'pending'. */
export function resumeQueuedDownloads(): void {
  const rows = queuedPendingIdsStmt.all() as { id: number }[];
  for (const row of rows) queue.push(row.id);
  tryStartNext();
}

/**
 * Marks a video pending+queued and kicks the pump. Shared by the batch route
 * and by "add a single video by URL", which enqueues immediately on insert.
 */
export function enqueueVideoForDownload(videoId: number, audioOnly?: boolean): boolean {
  const existing = getVideoWithChannelStmt.get(videoId) as VideoRow | undefined;
  if (!existing || existing.status === "completed" || existing.status === "downloading" || active.has(videoId)) {
    return false;
  }

  const effectiveAudioOnly = audioOnly !== undefined ? (audioOnly ? 1 : 0) : existing.audio_only;
  setPendingQueuedStmt.run(effectiveAudioOnly, videoId);
  if (!queue.includes(videoId)) queue.push(videoId);
  tryStartNext();
  return true;
}

/** Drops a video from the queue and kills its yt-dlp process if running — used before deleting it. */
export function abortDownload(videoId: number): void {
  const queued = queue.indexOf(videoId);
  if (queued !== -1) queue.splice(queued, 1);
  active.get(videoId)?.kill("SIGTERM");
}

function parseTags(tags: string | null): string[] {
  if (!tags) return [];
  try {
    const parsed = JSON.parse(tags);
    return Array.isArray(parsed) ? parsed.filter((t) => typeof t === "string") : [];
  } catch {
    return [];
  }
}

router.get("/", (_req, res) => {
  const rows = downloadsQueueViewStmt.all() as VideoRow[];
  const withProgress = rows.map((row) => ({
    ...row,
    tags: parseTags(row.tags),
    categories: [] as { id: number; name: string }[], // not worth joining here; downloads aren't category-editable
    progress: row.status === "downloading" ? progress.get(row.id) || null : null,
  }));
  res.json(withProgress);
});

router.post("/batch", (req, res) => {
  const { video_ids, audio_only } = req.body as { video_ids?: number[]; audio_only?: boolean };
  if (!Array.isArray(video_ids) || video_ids.length === 0) {
    res.status(400).json({ error: "video_ids is required" });
    return;
  }

  const enqueued = video_ids.filter((videoId) => enqueueVideoForDownload(videoId, audio_only));
  res.status(202).json({ enqueued });
});

router.post("/:video_id/cancel", (req, res) => {
  const videoId = Number(req.params.video_id);
  const child = active.get(videoId);
  if (!child) {
    res.status(404).json({ error: "No active download for this video" });
    return;
  }
  child.kill("SIGTERM");
  res.status(202).json({ cancelled: true });
});

export default router;
