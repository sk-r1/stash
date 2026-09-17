import { db } from "./db";
import { listChannelVideos, FlatEntry } from "./yt-dlp";
import { ChannelRow } from "./types";

const existingYoutubeIdStmt = db.prepare("SELECT 1 FROM videos WHERE youtube_id = ?");

/**
 * On-demand "fetch new videos" for a channel: diffs the channel's video list
 * against known youtube_ids and returns the ones we don't have yet, WITHOUT
 * inserting anything — a channel can easily have hundreds of uploads, and
 * the user picks which of the new ones are actually worth downloading
 * rather than every single one landing in the library. Manual-trigger
 * only — no interval/cron job calls this.
 *
 * Uses only the single flat-playlist listing call, not a per-video metadata
 * fetch, since resolving each one individually would turn "fetch new
 * videos" into one yt-dlp process per video (way too slow to feel like it
 * did anything). Full technical metadata (resolution/bitrate) is filled in
 * later anyway, once a video actually downloads.
 */
export async function listNewVideosForChannel(channel: ChannelRow): Promise<FlatEntry[]> {
  const entries = await listChannelVideos(channel.url);
  const newEntries = entries.filter((e) => !existingYoutubeIdStmt.get(e.youtubeId));

  // TEMPORARY diagnostics for a reported "no new videos found" bug on a very
  // large channel — remove once resolved.
  console.log(
    `[fetch-videos-debug] channel="${channel.name}" url="${channel.url}": yt-dlp returned ` +
      `${entries.length} entries, ${newEntries.length} considered new. ` +
      `First 5 ids from yt-dlp: ${entries.slice(0, 5).map((e) => `${e.youtubeId} (${e.title})`).join(" | ") || "(none)"}`
  );

  return newEntries;
}
