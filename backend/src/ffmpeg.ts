import { spawn } from "node:child_process";

const FFPROBE_BIN = process.env.FFPROBE_BIN || "ffprobe";

export interface ProbedMetadata {
  resolution: string | null;
  audioBitrate: number | null;
  videoCodec: string | null;
  audioCodec: string | null;
  colorTransfer: string | null;
}

const EMPTY_METADATA: ProbedMetadata = {
  resolution: null,
  audioBitrate: null,
  videoCodec: null,
  audioCodec: null,
  colorTransfer: null,
};

/** Best-effort metadata extraction; never throws — callers should still mark the download complete on failure. */
export function probeMetadata(filePath: string): Promise<ProbedMetadata> {
  return new Promise((resolve) => {
    const child = spawn(FFPROBE_BIN, [
      "-v",
      "quiet",
      "-print_format",
      "json",
      "-show_format",
      "-show_streams",
      filePath,
    ]);

    let stdout = "";
    child.stdout.on("data", (chunk) => (stdout += chunk));
    child.on("error", () => resolve(EMPTY_METADATA));
    child.on("close", (code) => {
      if (code !== 0) {
        resolve(EMPTY_METADATA);
        return;
      }
      try {
        const data = JSON.parse(stdout);
        const streams: any[] = data.streams || [];
        const videoStream = streams.find((s) => s.codec_type === "video");
        const audioStream = streams.find((s) => s.codec_type === "audio");

        const resolution =
          videoStream && videoStream.width && videoStream.height
            ? `${videoStream.width}x${videoStream.height}`
            : null;

        const bitRateRaw =
          audioStream?.bit_rate ?? data.format?.bit_rate ?? null;
        const audioBitrate = bitRateRaw !== null ? parseInt(bitRateRaw, 10) : null;

        resolve({
          resolution,
          audioBitrate: Number.isFinite(audioBitrate) ? audioBitrate : null,
          videoCodec: videoStream?.codec_name || null,
          audioCodec: audioStream?.codec_name || null,
          // e.g. "arib-std-b67" (HLG) or "smpte2084" (PQ) — the two transfer
          // functions that mean "this is HDR", as opposed to plain "bt709".
          colorTransfer: videoStream?.color_transfer || null,
        });
      } catch {
        resolve(EMPTY_METADATA);
      }
    });
  });
}
