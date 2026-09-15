import { Router } from "express";
import { db } from "../db";
import { resolveChannel, FlatEntry } from "../yt-dlp";
import { listNewVideosForChannel } from "../scheduler";
import { enqueueVideoForDownload } from "./downloads";
import { ChannelRow, VideoRow } from "../types";

const router = Router();

const listChannelsStmt = db.prepare(
  "SELECT * FROM channels WHERE subscribed = 1 ORDER BY name COLLATE NOCASE"
);
const getChannelStmt = db.prepare("SELECT * FROM channels WHERE id = ?");
const getChannelByUrlStmt = db.prepare("SELECT * FROM channels WHERE url = ?");
const getChannelByYoutubeChannelIdStmt = db.prepare("SELECT * FROM channels WHERE channel_id = ?");
const insertChannelStmt = db.prepare(`
  INSERT INTO channels (name, url, channel_id, description, thumbnail_url, audio_only, subscribed)
  VALUES (@name, @url, @channel_id, @description, @thumbnail_url, @audio_only, 1)
`);
const markSubscribedStmt = db.prepare("UPDATE channels SET subscribed = 1 WHERE id = ?");
const updateChannelStmt = db.prepare(`
  UPDATE channels SET name = @name, audio_only = @audio_only WHERE id = @id
`);
const deleteChannelStmt = db.prepare("DELETE FROM channels WHERE id = ?");

const getVideoStmt = db.prepare("SELECT * FROM videos WHERE id = ?");
const getVideoByYoutubeIdStmt = db.prepare("SELECT * FROM videos WHERE youtube_id = ?");
const insertVideoStmt = db.prepare(`
  INSERT INTO videos (channel_id, youtube_id, title, description, url, thumbnail, duration, audio_only, status)
  VALUES (@channel_id, @youtube_id, @title, @description, @url, @thumbnail, @duration, @audio_only, 'pending')
`);

router.get("/", (_req, res) => {
  res.json(listChannelsStmt.all());
});

router.post("/", async (req, res) => {
  const { url } = req.body as { url?: string };
  if (!url) {
    res.status(400).json({ error: "url is required" });
    return;
  }

  const existing = getChannelByUrlStmt.get(url) as ChannelRow | undefined;
  if (existing) {
    if (existing.subscribed) {
      res.status(409).json({ error: "Channel already added" });
      return;
    }
    // Was only auto-created as the uploader of a single video someone added by
    // URL — promote it to a real subscription instead of erroring.
    markSubscribedStmt.run(existing.id);
    res.status(200).json(getChannelStmt.get(existing.id));
    return;
  }

  try {
    const meta = await resolveChannel(url);

    // A channel can have more than one valid URL (e.g. /channel/UC... vs
    // /@handle); the exact-URL check above can miss a channel that already
    // exists under a different URL form. YouTube's own channel_id is the
    // stable identifier, so check that too before creating a duplicate row.
    if (meta.channelId) {
      const existingByChannelId = getChannelByYoutubeChannelIdStmt.get(meta.channelId) as
        | ChannelRow
        | undefined;
      if (existingByChannelId) {
        if (existingByChannelId.subscribed) {
          res.status(409).json({ error: "Channel already added" });
          return;
        }
        markSubscribedStmt.run(existingByChannelId.id);
        res.status(200).json(getChannelStmt.get(existingByChannelId.id));
        return;
      }
    }

    const info = insertChannelStmt.run({
      name: meta.name,
      url,
      channel_id: meta.channelId,
      description: meta.description,
      thumbnail_url: meta.thumbnailUrl,
      audio_only: 0,
    });
    res.status(201).json(getChannelStmt.get(info.lastInsertRowid));
  } catch (err) {
    if ((err as any).code === "SQLITE_CONSTRAINT_UNIQUE") {
      res.status(409).json({ error: "Channel already added" });
      return;
    }
    res.status(502).json({ error: `Could not resolve channel: ${(err as Error).message}` });
  }
});

/** Checks every subscribed channel for new videos in one go; nothing is inserted here. */
router.post("/check-all", async (_req, res) => {
  const channels = listChannelsStmt.all() as ChannelRow[];
  const results: { channel: ChannelRow; videos: FlatEntry[] }[] = [];

  // Sequential, not parallel: each check spawns a yt-dlp process, and a
  // channel list can be large enough that firing them all at once would be
  // a lot of concurrent subprocesses for one button click.
  for (const channel of channels) {
    try {
      const found = await listNewVideosForChannel(channel);
      if (found.length > 0) results.push({ channel, videos: found });
    } catch {
      // One channel failing to resolve (deleted/renamed upstream, transient
      // network issue) shouldn't abort the check for the rest.
    }
  }

  res.json(results);
});

router.put("/:id", (req, res) => {
  const channel = getChannelStmt.get(req.params.id) as ChannelRow | undefined;
  if (!channel) {
    res.status(404).json({ error: "Channel not found" });
    return;
  }
  const { name, audio_only } = req.body as { name?: string; audio_only?: boolean };
  updateChannelStmt.run({
    id: channel.id,
    name: name ?? channel.name,
    audio_only: audio_only !== undefined ? (audio_only ? 1 : 0) : channel.audio_only,
  });
  res.json(getChannelStmt.get(channel.id));
});

const hasVideosStmt = db.prepare("SELECT 1 FROM videos WHERE channel_id = ? LIMIT 1");

router.delete("/:id", (req, res) => {
  // Hard-deleting a channel cascades to its videos' DB rows (FK ON DELETE
  // CASCADE) — fine for an empty channel, but surprising and destructive for
  // one with actual downloads: "remove this channel" should not silently
  // wipe a video's library entry. So a channel that still has videos is only
  // unsubscribed (hidden from Channel Management), not deleted outright.
  if (hasVideosStmt.get(req.params.id)) {
    db.prepare("UPDATE channels SET subscribed = 0 WHERE id = ?").run(req.params.id);
  } else {
    deleteChannelStmt.run(req.params.id);
  }
  res.status(204).end();
});

/** Previews videos the channel has that we don't know about yet — nothing is inserted here. */
router.post("/:id/fetch", async (req, res) => {
  const channel = getChannelStmt.get(req.params.id) as ChannelRow | undefined;
  if (!channel) {
    res.status(404).json({ error: "Channel not found" });
    return;
  }
  try {
    const found = await listNewVideosForChannel(channel);
    res.json(found);
  } catch (err) {
    res.status(502).json({ error: `Could not fetch videos: ${(err as Error).message}` });
  }
});

/** Adds and immediately queues the videos the user picked from the fetch preview. */
router.post("/:id/download", (req, res) => {
  const channel = getChannelStmt.get(req.params.id) as ChannelRow | undefined;
  if (!channel) {
    res.status(404).json({ error: "Channel not found" });
    return;
  }

  const { videos, audio_only } = req.body as { videos?: FlatEntry[]; audio_only?: boolean };
  if (!Array.isArray(videos) || videos.length === 0) {
    res.status(400).json({ error: "videos is required" });
    return;
  }

  const queued: number[] = [];
  for (const v of videos) {
    if (!v || !v.youtubeId) continue;

    let row = getVideoByYoutubeIdStmt.get(v.youtubeId) as VideoRow | undefined;
    if (!row) {
      const effectiveAudioOnly = audio_only !== undefined ? (audio_only ? 1 : 0) : channel.audio_only;
      const info = insertVideoStmt.run({
        channel_id: channel.id,
        youtube_id: v.youtubeId,
        title: v.title,
        description: null,
        url: v.url,
        thumbnail: v.thumbnail,
        duration: v.duration,
        audio_only: effectiveAudioOnly,
      });
      row = getVideoStmt.get(info.lastInsertRowid) as VideoRow;
    }

    if (enqueueVideoForDownload(row.id, audio_only)) queued.push(row.id);
  }

  res.status(202).json({ queued });
});

export default router;
