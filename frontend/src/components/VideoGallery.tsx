import { Video } from "../api";
import { VideoCard } from "./VideoCard";
import { useTranslation } from "../i18n/I18nContext";

interface Props {
  videos: Video[];
  selectedIds: Set<number>;
  onToggleSelect: (id: number) => void;
  onDelete: (id: number) => void;
  onSaveTags: (id: number, tags: string[]) => Promise<void>;
}

export function VideoGallery({ videos, selectedIds, onToggleSelect, onDelete, onSaveTags }: Props) {
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
          onToggleSelect={onToggleSelect}
          onDelete={onDelete}
          onSaveTags={onSaveTags}
        />
      ))}
    </div>
  );
}
