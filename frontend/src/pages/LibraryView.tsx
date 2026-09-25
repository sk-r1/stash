import { useEffect, useMemo, useState } from "react";
import { api, Category, Channel, Video } from "../api";
import { usePolling } from "../hooks/usePolling";
import { FilterBar, VideoFilters } from "../components/FilterBar";
import { VideoGallery } from "../components/VideoGallery";
import { VideoUrlForm } from "../components/VideoUrlForm";
import { VideoPlayerModal } from "../components/VideoPlayerModal";
import { RefreshIcon } from "../components/Icons";
import { useTranslation } from "../i18n/I18nContext";

const DEFAULT_FILTERS: VideoFilters = {
  status: "",
  channel_id: "",
  search: "",
  sort: "date",
  tag: "",
  category_ids: [],
};

export function LibraryView() {
  const { t } = useTranslation();
  const [filters, setFilters] = useState<VideoFilters>(DEFAULT_FILTERS);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [tags, setTags] = useState<string[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [playingVideo, setPlayingVideo] = useState<Video | null>(null);

  function refreshChannels() {
    api.getChannels().then(setChannels).catch(() => {});
  }

  function refreshTags() {
    api.getAllTags().then(setTags).catch(() => {});
  }

  function refreshCategories() {
    api.getCategories().then(setCategories).catch(() => {});
  }

  useEffect(refreshChannels, []);
  useEffect(refreshTags, []);
  useEffect(refreshCategories, []);

  // Joined to a string so the dependency lists compare by value, not array identity.
  const categoryIdsKey = filters.category_ids.join(",");

  const fetchVideos = useMemo(
    () => () =>
      api.getVideos({
        status: filters.status || undefined,
        channel_id: filters.channel_id ? Number(filters.channel_id) : undefined,
        search: filters.search || undefined,
        sort: filters.sort,
        tag: filters.tag || undefined,
        category_ids: filters.category_ids,
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [filters.status, filters.channel_id, filters.search, filters.sort, filters.tag, categoryIdsKey]
  );

  const { data: videos, error, refresh } = usePolling(fetchVideos, 3000, [
    filters.status,
    filters.channel_id,
    filters.search,
    filters.sort,
    filters.tag,
    categoryIdsKey,
  ]);

  function toggleSelect(id: number) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleDelete(id: number) {
    await api.deleteVideo(id);
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
    refresh();
  }

  async function handleDownloadSelected() {
    if (selectedIds.size === 0) return;
    await api.batchDownload(Array.from(selectedIds));
    setSelectedIds(new Set());
    refresh();
  }

  async function handleAddVideoUrl(url: string, audioOnly: boolean) {
    await api.addVideo(url, audioOnly);
    refresh();
    refreshChannels();
  }

  async function handleSaveTags(id: number, videoTags: string[]) {
    await api.updateVideoTags(id, videoTags);
    refresh();
    refreshTags();
  }

  async function handleSaveCategories(id: number, categoryIds: number[]) {
    await api.updateVideoCategories(id, categoryIds);
    refresh();
  }

  return (
    <div>
      <h2>{t("nav_library")}</h2>
      <VideoUrlForm onAdd={handleAddVideoUrl} />
      <FilterBar channels={channels} tags={tags} categories={categories} filters={filters} onChange={setFilters} />
      {selectedIds.size > 0 && (
        <button className="btn" style={{ marginTop: "1rem" }} onClick={handleDownloadSelected}>
          <RefreshIcon size={14} /> {t("library_retry_selected")} ({selectedIds.size})
        </button>
      )}
      {error && <p className="error-text">{error}</p>}
      <VideoGallery
        videos={videos || []}
        selectedIds={selectedIds}
        allCategories={categories}
        onToggleSelect={toggleSelect}
        onDelete={handleDelete}
        onSaveTags={handleSaveTags}
        onSaveCategories={handleSaveCategories}
        onPlay={setPlayingVideo}
      />
      {playingVideo && playingVideo.stream_url && (
        <VideoPlayerModal
          src={playingVideo.stream_url}
          title={playingVideo.title}
          onClose={() => setPlayingVideo(null)}
        />
      )}
    </div>
  );
}
