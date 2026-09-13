import { db } from "./db";
import { listChannelVideos } from "./yt-dlp";
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
 *
 * Uses only the single flat-playlist listing call, not a per-video metadata
 * fetch — a channel can have hundreds of uploads, and resolving each one
 * individually would turn "fetch new videos" into one yt-dlp process per
 * video (way too slow to feel like it did anything). Full technical
 * metadata (resolution/bitrate) is filled in later anyway, once the video
 * actually downloads.
 */
export async function fetchNewVideosForChannel(channel: ChannelRow): Promise<VideoRow[]> {
  const entries = await listChannelVideos(channel.url);
  const newEntries = entries.filter((e) => !existingYoutubeIdStmt.get(e.youtubeId));

  const inserted: VideoRow[] = [];
  for (const entry of newEntries) {
    const info = insertVideoStmt.run({
      channel_id: channel.id,
      youtube_id: entry.youtubeId,
      title: entry.title,
      description: null,
      url: entry.url,
      thumbnail: entry.thumbnail,
      duration: entry.duration,
      audio_only: channel.audio_only,
    });

    inserted.push(getVideoStmt.get(info.lastInsertRowid) as VideoRow);
  }

  return inserted;
}
