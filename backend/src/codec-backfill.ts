import { db } from "./db";
import { probeMetadata } from "./ffmpeg";

// video_codec and color_transfer were added in separate releases, so a row
// can be missing either one independently — pick up both cases.
const pendingBackfillStmt = db.prepare(
  `SELECT id, video_file_path FROM videos
   WHERE video_file_path IS NOT NULL AND (video_codec IS NULL OR color_transfer IS NULL)`
);
const setCodecsStmt = db.prepare(
  "UPDATE videos SET video_codec = ?, audio_codec = ?, color_transfer = ? WHERE id = ?"
);

/**
 * One-time, read-only backfill for videos downloaded before codec/HDR
 * tracking existed: re-runs ffprobe (already used for resolution/bitrate) on
 * each file to fill in video_codec/audio_codec/color_transfer, without
 * touching the files themselves. Safe to call on every boot — a row is only
 * picked up once it's missing one of these fields.
 */
export async function backfillVideoCodecs(): Promise<void> {
  const rows = pendingBackfillStmt.all() as { id: number; video_file_path: string }[];
  for (const row of rows) {
    const meta = await probeMetadata(row.video_file_path);
    // "" = probed but not present (SDR files have no color_transfer, audio-only
    // files no video codec) — NULL would get the row re-probed every boot.
    setCodecsStmt.run(meta.videoCodec ?? "", meta.audioCodec ?? "", meta.colorTransfer ?? "", row.id);
  }
}
