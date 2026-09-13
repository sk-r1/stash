import { useEffect, useMemo, useState } from "react";
import { api, Channel } from "../api";
import { usePolling } from "../hooks/usePolling";
import { FilterBar, VideoFilters } from "../components/FilterBar";
import { VideoGallery } from "../components/VideoGallery";
import { useTranslation } from "../i18n/I18nContext";

const DEFAULT_FILTERS: VideoFilters = { status: "", channel_id: "", search: "", sort: "date" };

export function LibraryView() {
  const { t } = useTranslation();
  const [filters, setFilters] = useState<VideoFilters>(DEFAULT_FILTERS);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  useEffect(() => {
    api.getChannels().then(setChannels).catch(() => {});
  }, []);

  const fetchVideos = useMemo(
    () => () =>
      api.getVideos({
        status: filters.status || undefined,
        channel_id: filters.channel_id ? Number(filters.channel_id) : undefined,
        search: filters.search || undefined,
        sort: filters.sort,
      }),
    [filters.status, filters.channel_id, filters.search, filters.sort]
  );

  const { data: videos, error, refresh } = usePolling(fetchVideos, 3000, [
    filters.status,
    filters.channel_id,
    filters.search,
    filters.sort,
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

  return (
    <div>
      <h2>{t("nav_library")}</h2>
      <FilterBar channels={channels} filters={filters} onChange={setFilters} />
      {selectedIds.size > 0 && (
        <button className="btn" style={{ marginTop: "1rem" }} onClick={handleDownloadSelected}>
          {t("library_download_selected")} ({selectedIds.size})
        </button>
      )}
      {error && <p className="error-text">{error}</p>}
      <VideoGallery
        videos={videos || []}
        selectedIds={selectedIds}
        onToggleSelect={toggleSelect}
        onDelete={handleDelete}
      />
    </div>
  );
}
