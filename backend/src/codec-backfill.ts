import { db } from "./db";
import { probeMetadata } from "./ffmpeg";

const pendingBackfillStmt = db.prepare(
  "SELECT id, video_file_path FROM videos WHERE video_file_path IS NOT NULL AND video_codec IS NULL"
);
const setCodecsStmt = db.prepare("UPDATE videos SET video_codec = ?, audio_codec = ? WHERE id = ?");

/**
 * One-time, read-only backfill for videos downloaded before codec tracking
 * existed: re-runs ffprobe (already used for resolution/bitrate) on each
 * file to fill in video_codec/audio_codec, without touching the files
 * themselves. Safe to call on every boot — a row is only picked up once,
 * since it's excluded from the query as soon as it has a codec.
 */
export async function backfillVideoCodecs(): Promise<void> {
  const rows = pendingBackfillStmt.all() as { id: number; video_file_path: string }[];
  for (const row of rows) {
    const meta = await probeMetadata(row.video_file_path);
    setCodecsStmt.run(meta.videoCodec, meta.audioCodec, row.id);
  }
}
