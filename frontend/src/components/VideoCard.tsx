import { Video } from "../api";
import { StatusBadge } from "./StatusBadge";
import { TagEditor } from "./TagEditor";
import { PlayIcon, TrashIcon } from "./Icons";
import { useTranslation } from "../i18n/I18nContext";

interface Props {
  video: Video;
  selected: boolean;
  onToggleSelect: (id: number) => void;
  onDelete: (id: number) => void;
  onSaveTags: (id: number, tags: string[]) => Promise<void>;
}

function formatBitrate(bps: number | null): string {
  if (!bps) return "—";
  return `${Math.round(bps / 1000)} kbps`;
}

export function VideoCard({ video, selected, onToggleSelect, onDelete, onSaveTags }: Props) {
  const { t } = useTranslation();
  return (
    <div className="card video-card">
      <label style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <input
          type="checkbox"
          checked={selected}
          onChange={() => onToggleSelect(video.id)}
          disabled={video.status === "completed" || video.status === "downloading"}
        />
        <StatusBadge status={video.status} />
      </label>
      {video.thumbnail ? <img src={video.thumbnail} alt="" /> : <div className="video-card-thumb-placeholder" />}
      <div className="title" title={video.title}>
        {video.title}
      </div>
      <div className="meta">{video.channel_name}</div>
      <div className="meta">
        {video.resolution || "—"} · {formatBitrate(video.audio_bitrate)}
      </div>
      <TagEditor tags={video.tags} onSave={(tags) => onSaveTags(video.id, tags)} />
      {video.status === "error" && video.error_message && (
        <div className="error-text">{video.error_message}</div>
      )}
      <div className="video-card-actions">
        {video.status === "completed" && video.stream_url && (
          <a
            className="btn btn-secondary"
            href={video.stream_url}
            target="_blank"
            rel="noopener noreferrer"
            title={t("library_play_hint")}
          >
            <PlayIcon /> {t("library_play")}
          </a>
        )}
        <button className="btn btn-secondary" onClick={() => onDelete(video.id)}>
          <TrashIcon /> {t("library_delete")}
        </button>
      </div>
    </div>
  );
}
