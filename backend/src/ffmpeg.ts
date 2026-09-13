import { spawn } from "node:child_process";

const FFPROBE_BIN = process.env.FFPROBE_BIN || "ffprobe";

export interface ProbedMetadata {
  resolution: string | null;
  audioBitrate: number | null;
}

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
    child.on("error", () => resolve({ resolution: null, audioBitrate: null }));
    child.on("close", (code) => {
      if (code !== 0) {
        resolve({ resolution: null, audioBitrate: null });
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
        });
      } catch {
        resolve({ resolution: null, audioBitrate: null });
      }
    });
  });
}
