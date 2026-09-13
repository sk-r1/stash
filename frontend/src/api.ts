export type VideoStatus = "pending" | "downloading" | "completed" | "error";

export interface Channel {
  id: number;
  name: string;
  url: string;
  channel_id: string | null;
  description: string | null;
  thumbnail_url: string | null;
  audio_only: 0 | 1;
  created_at: string;
}

export interface DownloadProgress {
  percent: number;
  totalSize: string | null;
  speed: string | null;
  eta: string | null;
}

export interface Category {
  id: number;
  name: string;
  created_at: string;
}

export interface Video {
  id: number;
  channel_id: number;
  channel_name?: string;
  youtube_id: string;
  title: string;
  description: string | null;
  url: string;
  thumbnail: string | null;
  resolution: string | null;
  audio_bitrate: number | null;
  video_file_path: string | null;
  audio_only: 0 | 1;
  duration: number | null;
  file_size: number | null;
  status: VideoStatus;
  error_message: string | null;
  downloaded_at: string | null;
  created_at: string;
  progress?: DownloadProgress | null;
  stream_url?: string | null;
  tags: string[];
  categories: Category[];
}

export interface ChannelVideoPreview {
  youtubeId: string;
  title: string;
  url: string;
  thumbnail: string | null;
  duration: number | null;
}

export interface Settings {
  language: "de" | "en";
  dark_mode: boolean;
  max_parallel_downloads: number;
  sponsorblock_enabled: boolean;
  subtitles_enabled: boolean;
  yt_dlp_version: string | null;
}

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) {
    let message = res.statusText;
    try {
      const body = await res.json();
      message = body.error || message;
    } catch {
      // response body wasn't JSON, keep statusText
    }
    throw new Error(message);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

export const api = {
  getChannels: () => request<Channel[]>("/api/channels"),
  addChannel: (url: string) =>
    request<Channel>("/api/channels", { method: "POST", body: JSON.stringify({ url }) }),
  updateChannel: (id: number, patch: Partial<Pick<Channel, "name" | "audio_only">>) =>
    request<Channel>(`/api/channels/${id}`, { method: "PUT", body: JSON.stringify(patch) }),
  deleteChannel: (id: number) => request<void>(`/api/channels/${id}`, { method: "DELETE" }),
  fetchChannelVideos: (id: number) =>
    request<ChannelVideoPreview[]>(`/api/channels/${id}/fetch`, { method: "POST" }),
  downloadChannelVideos: (id: number, videos: ChannelVideoPreview[], audioOnly?: boolean) =>
    request<{ queued: number[] }>(`/api/channels/${id}/download`, {
      method: "POST",
      body: JSON.stringify({ videos, audio_only: audioOnly }),
    }),

  addVideo: (url: string, audioOnly?: boolean) =>
    request<Video>("/api/videos", {
      method: "POST",
      body: JSON.stringify({ url, audio_only: audioOnly }),
    }),

  getVideos: (filters: {
    status?: string;
    channel_id?: number;
    search?: string;
    sort?: string;
    tag?: string;
    category_id?: number;
  }) => {
    const params = new URLSearchParams();
    if (filters.status) params.set("status", filters.status);
    if (filters.channel_id) params.set("channel_id", String(filters.channel_id));
    if (filters.search) params.set("search", filters.search);
    if (filters.sort) params.set("sort", filters.sort);
    if (filters.tag) params.set("tag", filters.tag);
    if (filters.category_id) params.set("category_id", String(filters.category_id));
    const qs = params.toString();
    return request<Video[]>(`/api/videos${qs ? `?${qs}` : ""}`);
  },
  deleteVideo: (id: number) => request<void>(`/api/videos/${id}`, { method: "DELETE" }),
  updateVideoTags: (id: number, tags: string[]) =>
    request<Video>(`/api/videos/${id}`, { method: "PUT", body: JSON.stringify({ tags }) }),
  updateVideoCategories: (id: number, categoryIds: number[]) =>
    request<Video>(`/api/videos/${id}`, { method: "PUT", body: JSON.stringify({ category_ids: categoryIds }) }),
  getAllTags: () => request<string[]>("/api/videos/tags"),

  getCategories: () => request<Category[]>("/api/categories"),
  createCategory: (name: string) =>
    request<Category>("/api/categories", { method: "POST", body: JSON.stringify({ name }) }),
  renameCategory: (id: number, name: string) =>
    request<Category>(`/api/categories/${id}`, { method: "PUT", body: JSON.stringify({ name }) }),
  deleteCategory: (id: number) => request<void>(`/api/categories/${id}`, { method: "DELETE" }),

  getDownloads: () => request<Video[]>("/api/downloads"),
  batchDownload: (videoIds: number[], audioOnly?: boolean) =>
    request<{ enqueued: number[] }>("/api/downloads/batch", {
      method: "POST",
      body: JSON.stringify({ video_ids: videoIds, audio_only: audioOnly }),
    }),
  cancelDownload: (videoId: number) =>
    request<{ cancelled: boolean }>(`/api/downloads/${videoId}/cancel`, { method: "POST" }),

  getSettings: () => request<Settings>("/api/settings"),
  updateSettings: (patch: Partial<Settings>) =>
    request<Settings>("/api/settings", { method: "PUT", body: JSON.stringify(patch) }),
  checkYtDlpUpdate: () => request<{ version: string }>("/api/yt-dlp/check-update", { method: "POST" }),
  updateYtDlp: () => request<{ version: string }>("/api/yt-dlp/update", { method: "POST" }),
  backupDatabaseUrl: "/api/database/backup",
};
