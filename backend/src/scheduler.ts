import { db } from "./db";
import { listChannelVideos, getVideoMetadata } from "./yt-dlp";
import { ChannelRow, VideoRow } from "./types";

const existingYoutubeIdStmt = db.prepare("SELECT 1 FROM videos WHERE youtube_id = ?");

const insertVideoStmt = db.prepare(`
  INSERT INTO videos (channel_id, youtube_id, title, description, url, thumbnail, duration, audio_only, status)
  VALUES (@channel_id, @youtube_id, @title, @description, @url, @thumbnail, @duration, @audio_only, 'pending')
`);

const getVideoStmt = db.prepare("SELECT * FROM videos WHERE id = ?");

/**
 * On-demand "fetch new videos" for a channel: diffs the channel's video list
 * against known youtube_ids and inserts genuinely new ones as pending rows.
 * Manual-trigger only — no interval/cron job calls this.
 */
export async function fetchNewVideosForChannel(channel: ChannelRow): Promise<VideoRow[]> {
  const entries = await listChannelVideos(channel.url);
  const newEntries = entries.filter((e) => !existingYoutubeIdStmt.get(e.youtubeId));

  const inserted: VideoRow[] = [];
  for (const entry of newEntries) {
    let meta;
    try {
      meta = await getVideoMetadata(entry.url);
    } catch {
      meta = { title: entry.title, description: null, thumbnail: null, duration: null };
    }

    const info = insertVideoStmt.run({
      channel_id: channel.id,
      youtube_id: entry.youtubeId,
      title: meta.title,
      description: meta.description,
      url: entry.url,
      thumbnail: meta.thumbnail,
      duration: meta.duration,
      audio_only: channel.audio_only,
    });

    inserted.push(getVideoStmt.get(info.lastInsertRowid) as VideoRow);
  }

  return inserted;
}
