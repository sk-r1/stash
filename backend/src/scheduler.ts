import { db } from "./db";
import { listChannelVideos, FlatEntry } from "./yt-dlp";
import { ChannelRow } from "./types";

const existingYoutubeIdStmt = db.prepare("SELECT 1 FROM videos WHERE youtube_id = ?");

/**
 * On-demand "fetch new videos" for a channel, WITHOUT inserting anything —
 * the user picks which of the new ones are actually worth downloading.
 * Manual-trigger only — no interval/cron job calls this.
 *
 * "New" means "uploaded after the newest video of this channel we already
 * know about", not "not currently in our library": the channel tab is
 * always newest-first, so entries are walked from the top and stopped at
 * the first already-known video — everything from there on is necessarily
 * older. Diffing against the full set of known ids instead (as this used
 * to) would treat a channel's entire back catalog as "new" after grabbing
 * just one recent video, which for a channel with hundreds/thousands of
 * uploads defeats the point of a "what's new" check.
 *
 * Uses only the single flat-playlist listing call, not a per-video metadata
 * fetch, since resolving each one individually would turn "fetch new
 * videos" into one yt-dlp process per video (way too slow to feel like it
 * did anything). Full technical metadata (resolution/bitrate) is filled in
 * later anyway, once a video actually downloads.
 */
export async function listNewVideosForChannel(channel: ChannelRow): Promise<FlatEntry[]> {
  const entries = await listChannelVideos(channel.url);
  const newEntries: FlatEntry[] = [];
  for (const entry of entries) {
    if (existingYoutubeIdStmt.get(entry.youtubeId)) break;
    newEntries.push(entry);
  }
  return newEntries;
}
