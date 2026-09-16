export type VideoStatus = "pending" | "downloading" | "completed" | "error";

export interface ChannelRow {
  id: number;
  name: string;
  url: string;
  channel_id: string | null;
  description: string | null;
  thumbnail_url: string | null;
  audio_only: 0 | 1;
  created_at: string;
  /** 1 = a real subscription added via Channel Management; 0 = auto-created as the uploader of a single video added by URL. */
  subscribed: 0 | 1;
}

export interface VideoRow {
  id: number;
  channel_id: number;
  youtube_id: string;
  title: string;
  description: string | null;
  url: string;
  thumbnail: string | null;
  resolution: string | null;
  audio_bitrate: number | null;
  video_codec: string | null;
  audio_codec: string | null;
  video_file_path: string | null;
  audio_only: 0 | 1;
  duration: number | null;
  file_size: number | null;
  status: VideoStatus;
  error_message: string | null;
  downloaded_at: string | null;
  created_at: string;
  /** Internal: distinguishes videos explicitly queued for download from freshly-fetched, unselected ones. */
  queued: 0 | 1;
  /** JSON-encoded string array, e.g. '["Travel","Desert"]'. Null/empty means no tags. */
  tags: string | null;
}

export interface Settings {
  language: "de" | "en";
  dark_mode: boolean;
  max_parallel_downloads: number;
  sponsorblock_enabled: boolean;
  subtitles_enabled: boolean;
  yt_dlp_version: string | null;
}

export const DEFAULT_SETTINGS: Settings = {
  language: "de",
  dark_mode: false,
  max_parallel_downloads: 1,
  sponsorblock_enabled: false,
  subtitles_enabled: false,
  yt_dlp_version: null,
};

export interface DownloadProgress {
  video_id: number;
  percent: number;
  total_size: string | null;
  speed: string | null;
  eta: string | null;
}
