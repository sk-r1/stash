import { Router } from "express";
import fs from "node:fs";
import path from "node:path";
import { db } from "../db";
import { getVideoMetadata } from "../yt-dlp";
import { enqueueVideoForDownload } from "./downloads";
import { ChannelRow, VideoRow } from "../types";

const router = Router();

const VIDEOS_PATH = process.env.VIDEOS_PATH || path.join(__dirname, "..", "..", "videos");

function toStreamUrl(filePath: string | null): string | null {
  if (!filePath) return null;
  const rel = path.relative(VIDEOS_PATH, filePath);
  if (rel.startsWith("..")) return null;
  return "/media/" + rel.split(path.sep).map(encodeURIComponent).join("/");
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

function toClientVideo(row: VideoRow & { channel_name?: string }) {
  return { ...row, stream_url: toStreamUrl(row.video_file_path), tags: parseTags(row.tags) };
}

const getVideoStmt = db.prepare("SELECT * FROM videos WHERE id = ?");
const getVideoByYoutubeIdStmt = db.prepare("SELECT * FROM videos WHERE youtube_id = ?");
const deleteVideoStmt = db.prepare("DELETE FROM videos WHERE id = ?");
const updateTagsStmt = db.prepare("UPDATE videos SET tags = ? WHERE id = ?");

const getChannelByUrlStmt = db.prepare("SELECT * FROM channels WHERE url = ?");
const getChannelByIdStmt = db.prepare("SELECT * FROM channels WHERE id = ?");
const insertChannelStmt = db.prepare(`
  INSERT INTO channels (name, url, channel_id, description, thumbnail_url, audio_only, subscribed)
  VALUES (@name, @url, @channel_id, @description, @thumbnail_url, @audio_only, 0)
`);
const insertVideoStmt = db.prepare(`
  INSERT INTO videos (channel_id, youtube_id, title, description, url, thumbnail, duration, audio_only, status)
  VALUES (@channel_id, @youtube_id, @title, @description, @url, @thumbnail, @duration, @audio_only, 'pending')
`);

const SORT_COLUMNS: Record<string, string> = {
  date: "v.created_at",
  name: "v.title",
  channel: "c.name",
};

router.get("/", (req, res) => {
  const { status, channel_id, search, sort, tag } = req.query as Record<string, string | undefined>;

  const clauses: string[] = [];
  const params: Record<string, unknown> = {};

  if (status) {
    clauses.push("v.status = @status");
    params.status = status;
  }
  if (channel_id) {
    clauses.push("v.channel_id = @channel_id");
    params.channel_id = channel_id;
  }
  if (search) {
    clauses.push("v.title LIKE @search");
    params.search = `%${search}%`;
  }

  const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
  const sortColumn = SORT_COLUMNS[sort || "date"] || SORT_COLUMNS.date;

  const rows = db
    .prepare(
      `SELECT v.*, c.name as channel_name FROM videos v
       JOIN channels c ON c.id = v.channel_id
       ${where}
       ORDER BY ${sortColumn} DESC`
    )
    .all(params) as VideoRow[];

  const withTags = rows.map(toClientVideo);
  res.json(tag ? withTags.filter((v) => v.tags.includes(tag)) : withTags);
});

/** All distinct tags currently in use, for the Library's tag filter dropdown. */
router.get("/tags", (_req, res) => {
  const rows = db.prepare("SELECT tags FROM videos WHERE tags IS NOT NULL").all() as { tags: string }[];
  const all = new Set<string>();
  for (const row of rows) for (const tag of parseTags(row.tags)) all.add(tag);
  res.json([...all].sort((a, b) => a.localeCompare(b)));
});

/** Updates a video's tags. */
router.put("/:id", (req, res) => {
  const video = getVideoStmt.get(req.params.id) as VideoRow | undefined;
  if (!video) {
    res.status(404).json({ error: "Video not found" });
    return;
  }
  const { tags } = req.body as { tags?: string[] };
  if (!Array.isArray(tags)) {
    res.status(400).json({ error: "tags must be an array of strings" });
    return;
  }
  const cleaned = [...new Set(tags.map((t) => t.trim()).filter(Boolean))];
  updateTagsStmt.run(JSON.stringify(cleaned), video.id);
  res.json(toClientVideo(getVideoStmt.get(video.id) as VideoRow));
});

/** Adds a single video by URL (auto-discovering/reusing its channel) and immediately queues it. */
router.post("/", async (req, res) => {
  const { url, audio_only } = req.body as { url?: string; audio_only?: boolean };
  if (!url) {
    res.status(400).json({ error: "url is required" });
    return;
  }

  let meta;
  try {
    meta = await getVideoMetadata(url);
  } catch (err) {
    res.status(502).json({ error: `Could not resolve video: ${(err as Error).message}` });
    return;
  }

  const existingVideo = getVideoByYoutubeIdStmt.get(meta.youtubeId) as VideoRow | undefined;
  if (existingVideo) {
    if (existingVideo.status === "completed") {
      res.status(409).json({ error: "Video already downloaded" });
      return;
    }
    enqueueVideoForDownload(existingVideo.id, audio_only);
    res.status(202).json(toClientVideo(getVideoStmt.get(existingVideo.id) as VideoRow));
    return;
  }

  let channel = getChannelByUrlStmt.get(meta.channelUrl) as ChannelRow | undefined;
  if (!channel) {
    const info = insertChannelStmt.run({
      name: meta.channelName,
      url: meta.channelUrl,
      channel_id: meta.channelId,
      description: null,
      thumbnail_url: meta.channelThumbnailUrl,
      audio_only: 0,
    });
    channel = getChannelByIdStmt.get(info.lastInsertRowid) as ChannelRow;
  }

  const effectiveAudioOnly = audio_only !== undefined ? (audio_only ? 1 : 0) : channel.audio_only;
  let videoId: number | bigint;
  try {
    const info = insertVideoStmt.run({
      channel_id: channel.id,
      youtube_id: meta.youtubeId,
      title: meta.title,
      description: meta.description,
      url,
      thumbnail: meta.thumbnail,
      duration: meta.duration,
      audio_only: effectiveAudioOnly,
    });
    videoId = info.lastInsertRowid;
  } catch (err) {
    if ((err as any).code !== "SQLITE_CONSTRAINT_UNIQUE") throw err;
    // Lost a race with a concurrent identical request; use the row it just inserted.
    const raced = getVideoByYoutubeIdStmt.get(meta.youtubeId) as VideoRow;
    videoId = raced.id;
  }

  enqueueVideoForDownload(videoId as number, audio_only);
  res.status(202).json(toClientVideo(getVideoStmt.get(videoId) as VideoRow));
});

router.delete("/:id", (req, res) => {
  const video = getVideoStmt.get(req.params.id) as VideoRow | undefined;
  if (!video) {
    res.status(404).json({ error: "Video not found" });
    return;
  }
  if (video.video_file_path && fs.existsSync(video.video_file_path)) {
    fs.unlinkSync(video.video_file_path);
  }
  deleteVideoStmt.run(video.id);
  res.status(204).end();
});

export default router;
