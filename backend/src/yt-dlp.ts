import { spawn, ChildProcess } from "node:child_process";
import readline from "node:readline";
import { sponsorBlockArgs } from "./sponsorblock";

const YT_DLP_BIN = process.env.YT_DLP_BIN || "yt-dlp";

function runCollectJson(args: string[]): Promise<any> {
  return new Promise((resolve, reject) => {
    const child = spawn(YT_DLP_BIN, args);
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => (stdout += chunk));
    child.stderr.on("data", (chunk) => (stderr += chunk));
    child.on("error", reject);
    child.on("close", (code) => {
      if (code !== 0) {
        reject(new Error(`yt-dlp exited with code ${code}: ${stderr.trim() || "unknown error"}`));
        return;
      }
      try {
        resolve(JSON.parse(stdout));
      } catch (err) {
        reject(new Error(`Failed to parse yt-dlp JSON output: ${(err as Error).message}`));
      }
    });
  });
}

function runCollectText(bin: string, args: string[]): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = spawn(bin, args);
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => (stdout += chunk));
    child.stderr.on("data", (chunk) => (stderr += chunk));
    child.on("error", reject);
    child.on("close", (code) => {
      if (code !== 0) {
        reject(new Error(`${bin} exited with code ${code}: ${stderr.trim() || "unknown error"}`));
        return;
      }
      resolve(stdout.trim());
    });
  });
}

export interface ChannelMeta {
  name: string;
  channelId: string | null;
  description: string | null;
  thumbnailUrl: string | null;
}

/** Resolves channel name/id/description without enumerating any videos (playlist-items 0). */
export async function resolveChannel(url: string): Promise<ChannelMeta> {
  const data = await runCollectJson([
    "--flat-playlist",
    "--playlist-items",
    "0",
    "--dump-single-json",
    url,
  ]);
  const thumbnails: Array<{ url: string }> = data.thumbnails || [];
  return {
    name: data.channel || data.uploader || data.title || url,
    channelId: data.channel_id || data.uploader_id || null,
    description: data.description || null,
    thumbnailUrl: thumbnails.length ? thumbnails[thumbnails.length - 1].url : null,
  };
}

export interface FlatEntry {
  youtubeId: string;
  title: string;
  url: string;
}

/** Cheap listing of a channel's videos (no per-video metadata resolution). */
export async function listChannelVideos(url: string): Promise<FlatEntry[]> {
  const data = await runCollectJson(["--flat-playlist", "--dump-single-json", url]);
  const entries: any[] = data.entries || [];
  return entries
    .filter((e) => e && e.id)
    .map((e) => ({
      youtubeId: e.id as string,
      title: (e.title as string) || e.id,
      url: (e.url as string) || `https://www.youtube.com/watch?v=${e.id}`,
    }));
}

export interface VideoMeta {
  title: string;
  description: string | null;
  thumbnail: string | null;
  duration: number | null;
}

/** Full metadata for a single new video, without downloading it. */
export async function getVideoMetadata(url: string): Promise<VideoMeta> {
  const data = await runCollectJson(["--dump-json", "--no-download", "--no-playlist", url]);
  return {
    title: data.title || url,
    description: data.description || null,
    thumbnail: data.thumbnail || null,
    duration: typeof data.duration === "number" ? data.duration : null,
  };
}

export interface DownloadProgressEvent {
  percent: number;
  totalSize: string | null;
  speed: string | null;
  eta: string | null;
}

export interface DownloadOptions {
  outputTemplate: string;
  audioOnly: boolean;
  sponsorblockEnabled: boolean;
}

export interface DownloadHandlers {
  onProgress: (progress: DownloadProgressEvent) => void;
  onExit: (result: { success: boolean; errorMessage: string | null; filePath: string | null }) => void;
}

const PROGRESS_RE = /\[download\]\s+([\d.]+)%\s+of\s+(.+?)\s+at\s+(.+?)\s+ETA\s+(.+)$/;

/** Spawns yt-dlp for a single video download. Caller owns the returned process (for cancellation). */
export function startDownload(
  url: string,
  options: DownloadOptions,
  handlers: DownloadHandlers
): ChildProcess {
  const formatArgs = options.audioOnly
    ? ["-f", "bestaudio", "-x", "--audio-format", "m4a"]
    : ["-f", "bestvideo+bestaudio/best", "--merge-output-format", "mp4"];

  const args = [
    ...formatArgs,
    "-o",
    options.outputTemplate,
    "--no-playlist",
    "--newline",
    "--print",
    "after_move:filepath",
    ...sponsorBlockArgs(options.sponsorblockEnabled),
    url,
  ];

  const child = spawn(YT_DLP_BIN, args);
  let stderr = "";
  let filePath: string | null = null;

  const rl = readline.createInterface({ input: child.stdout });
  rl.on("line", (line) => {
    const match = PROGRESS_RE.exec(line);
    if (match) {
      handlers.onProgress({
        percent: parseFloat(match[1]),
        totalSize: match[2],
        speed: match[3],
        eta: match[4],
      });
    } else if (line.trim() && !line.startsWith("[")) {
      // The --print after_move:filepath output is a bare path line, unlike
      // yt-dlp's own status messages which are always bracket-prefixed.
      filePath = line.trim();
    }
  });

  child.stderr.on("data", (chunk) => {
    stderr += chunk;
  });

  child.on("close", (code, signal) => {
    if (signal) {
      handlers.onExit({ success: false, errorMessage: "Cancelled by user", filePath: null });
    } else if (code === 0) {
      handlers.onExit({ success: true, errorMessage: null, filePath });
    } else {
      handlers.onExit({
        success: false,
        errorMessage: stderr.trim().split("\n").pop() || `yt-dlp exited with code ${code}`,
        filePath: null,
      });
    }
  });

  child.on("error", (err) => {
    handlers.onExit({ success: false, errorMessage: err.message, filePath: null });
  });

  return child;
}

export async function getVersion(): Promise<string> {
  return runCollectText(YT_DLP_BIN, ["--version"]);
}

export async function selfUpdate(): Promise<string> {
  await runCollectText("pip", ["install", "--upgrade", "--break-system-packages", "yt-dlp"]);
  return getVersion();
}
