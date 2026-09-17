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
      // TEMPORARY diagnostics for a reported "0 entries" channel-listing bug
      // — remove once resolved. stderr was previously only surfaced on
      // failure, so a warning yt-dlp prints on an otherwise "successful"
      // (exit 0) but empty result was invisible until now.
      if (stderr.trim()) {
        console.log(`[yt-dlp-json stderr] args=${JSON.stringify(args)}\n${stderr.trim()}`);
      }
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

const CHANNEL_TAB_RE = /\/(videos|shorts|streams|playlists|community)(\/|\?|$)/i;
const DIRECT_MEDIA_RE = /\/(watch\?v=|playlist\?list=)/i;

/**
 * yt-dlp's flat-playlist on a bare channel URL (no tab suffix) returns the
 * channel's tabs themselves (Videos/Shorts/Live/...) as top-level entries,
 * each with a channel-shaped id — not the videos inside them. Pointing at
 * the "videos" tab explicitly makes it list actual videos instead.
 */
function toVideosTabUrl(url: string): string {
  if (CHANNEL_TAB_RE.test(url) || DIRECT_MEDIA_RE.test(url)) return url;
  return url.replace(/\/+$/, "") + "/videos";
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
  thumbnail: string | null;
  duration: number | null;
}

function bestThumbnail(thumbnails: Array<{ url: string }> | undefined): string | null {
  return thumbnails && thumbnails.length ? thumbnails[thumbnails.length - 1].url : null;
}

/**
 * Cheap listing of a channel's videos: a single yt-dlp call for the whole channel,
 * using whatever lightweight fields the tab page already exposes (no per-video
 * metadata resolution — that would mean one extra yt-dlp process per video, which
 * is far too slow for channels with more than a handful of uploads).
 */
export async function listChannelVideos(url: string): Promise<FlatEntry[]> {
  const data = await runCollectJson(["--flat-playlist", "--dump-single-json", toVideosTabUrl(url)]);
  const entries: any[] = data.entries || [];
  return entries
    .filter((e) => e && e.id && /^[A-Za-z0-9_-]{11}$/.test(e.id) && e._type !== "playlist" && e._type !== "url")
    .map((e) => ({
      youtubeId: e.id as string,
      title: (e.title as string) || e.id,
      url: (e.url as string) || `https://www.youtube.com/watch?v=${e.id}`,
      thumbnail: bestThumbnail(e.thumbnails),
      duration: typeof e.duration === "number" ? e.duration : null,
    }));
}

export interface VideoMeta {
  youtubeId: string;
  title: string;
  description: string | null;
  thumbnail: string | null;
  duration: number | null;
  channelName: string;
  channelUrl: string;
  channelId: string | null;
  channelThumbnailUrl: string | null;
}

/** Full metadata for a single video, without downloading it — used for adding one video by URL. */
export async function getVideoMetadata(url: string): Promise<VideoMeta> {
  const data = await runCollectJson(["--dump-json", "--no-download", "--no-playlist", url]);
  const channelUrl: string | null = data.channel_url || data.uploader_url || null;
  return {
    youtubeId: data.id,
    title: data.title || url,
    description: data.description || null,
    thumbnail: data.thumbnail || null,
    duration: typeof data.duration === "number" ? data.duration : null,
    channelName: data.channel || data.uploader || "Unknown",
    channelUrl: channelUrl || `https://www.youtube.com/channel/${data.channel_id || data.uploader_id}`,
    channelId: data.channel_id || data.uploader_id || null,
    channelThumbnailUrl: bestThumbnail(data.channel_thumbnails || data.uploader_thumbnails),
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
  subtitlesEnabled: boolean;
}

function subtitleArgs(enabled: boolean, audioOnly: boolean): string[] {
  // Embedding subs into an audio-only extraction doesn't make sense.
  if (!enabled || audioOnly) return [];
  // --ignore-errors: subtitles are a nice-to-have and their own fetch can
  // fail independently of the video (e.g. YouTube rate-limiting subtitle
  // requests with a 429) — that must not abort an otherwise-fine download.
  return ["--write-subs", "--write-auto-subs", "--sub-langs", "en.*,de.*", "--embed-subs", "--ignore-errors"];
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
    "--progress",
    "--print",
    "after_move:filepath",
    ...sponsorBlockArgs(options.sponsorblockEnabled),
    ...subtitleArgs(options.subtitlesEnabled, options.audioOnly),
    url,
  ];

  // Python block-buffers stdout when it isn't a TTY (i.e. always, when spawned
  // from Node), so progress lines would otherwise only surface in large,
  // delayed chunks instead of as they're printed.
  const child = spawn(YT_DLP_BIN, args, { env: { ...process.env, PYTHONUNBUFFERED: "1" } });
  let stderr = "";
  let filePath: string | null = null;

  // child_process pipes never reach `docker logs` on their own — only what
  // this Node process itself writes to console does. Echoing every raw line
  // (temporarily; safe to remove once progress parsing is confirmed working)
  // is the only way to see yt-dlp's actual output format from the container.
  function handleStdoutLine(line: string): void {
    console.log(`[yt-dlp stdout] ${line}`);
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
  }

  // Depending on version/config, yt-dlp's progress line can land on stdout or
  // stderr — listen on both rather than gamble on which one this build uses.
  function handleStderrLine(line: string): void {
    console.log(`[yt-dlp stderr] ${line}`);
    const match = PROGRESS_RE.exec(line);
    if (match) {
      handlers.onProgress({
        percent: parseFloat(match[1]),
        totalSize: match[2],
        speed: match[3],
        eta: match[4],
      });
    }
  }

  readline.createInterface({ input: child.stdout }).on("line", handleStdoutLine);
  readline.createInterface({ input: child.stderr }).on("line", handleStderrLine);

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
