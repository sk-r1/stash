import { Category, Video } from "../api";
import { VideoCard } from "./VideoCard";
import { useTranslation } from "../i18n/I18nContext";

interface Props {
  videos: Video[];
  selectedIds: Set<number>;
  allCategories: Category[];
  onToggleSelect: (id: number) => void;
  onDelete: (id: number) => void;
  onSaveTags: (id: number, tags: string[]) => Promise<void>;
  onSaveCategories: (id: number, categoryIds: number[]) => Promise<void>;
  onPlay: (video: Video) => void;
}

export function VideoGallery({
  videos,
  selectedIds,
  allCategories,
  onToggleSelect,
  onDelete,
  onSaveTags,
  onSaveCategories,
  onPlay,
}: Props) {
  const { t } = useTranslation();

  if (videos.length === 0) {
    return <p className="meta">{t("library_empty")}</p>;
  }

  return (
    <div className="video-gallery">
      {videos.map((video) => (
        <VideoCard
          key={video.id}
          video={video}
          selected={selectedIds.has(video.id)}
          allCategories={allCategories}
          onToggleSelect={onToggleSelect}
          onDelete={onDelete}
          onSaveTags={onSaveTags}
          onSaveCategories={onSaveCategories}
          onPlay={onPlay}
        />
      ))}
    </div>
  );
}
