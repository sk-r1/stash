import { Router } from "express";
import { db } from "../db";
import { resolveChannel } from "../yt-dlp";
import { fetchNewVideosForChannel } from "../scheduler";
import { ChannelRow } from "../types";

const router = Router();

const listChannelsStmt = db.prepare("SELECT * FROM channels ORDER BY name COLLATE NOCASE");
const getChannelStmt = db.prepare("SELECT * FROM channels WHERE id = ?");
const insertChannelStmt = db.prepare(`
  INSERT INTO channels (name, url, channel_id, description, thumbnail_url, audio_only)
  VALUES (@name, @url, @channel_id, @description, @thumbnail_url, @audio_only)
`);
const updateChannelStmt = db.prepare(`
  UPDATE channels SET name = @name, audio_only = @audio_only WHERE id = @id
`);
const deleteChannelStmt = db.prepare("DELETE FROM channels WHERE id = ?");

router.get("/", (_req, res) => {
  res.json(listChannelsStmt.all());
});

router.post("/", async (req, res) => {
  const { url } = req.body as { url?: string };
  if (!url) {
    res.status(400).json({ error: "url is required" });
    return;
  }

  try {
    const meta = await resolveChannel(url);
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

router.delete("/:id", (req, res) => {
  deleteChannelStmt.run(req.params.id);
  res.status(204).end();
});

router.post("/:id/fetch", async (req, res) => {
  const channel = getChannelStmt.get(req.params.id) as ChannelRow | undefined;
  if (!channel) {
    res.status(404).json({ error: "Channel not found" });
    return;
  }
  try {
    const inserted = await fetchNewVideosForChannel(channel);
    res.json(inserted);
  } catch (err) {
    res.status(502).json({ error: `Could not fetch videos: ${(err as Error).message}` });
  }
});

export default router;
