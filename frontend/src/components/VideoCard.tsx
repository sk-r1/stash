import { Category, Video } from "../api";
import { StatusBadge } from "./StatusBadge";
import { TagEditor } from "./TagEditor";
import { CategoryEditor } from "./CategoryEditor";
import { PlayIcon, TrashIcon, HeadphonesIcon, ExternalLinkIcon } from "./Icons";
import { useTranslation } from "../i18n/I18nContext";

interface Props {
  video: Video;
  selected: boolean;
  allCategories: Category[];
  onToggleSelect: (id: number) => void;
  onDelete: (id: number) => void;
  onSaveTags: (id: number, tags: string[]) => Promise<void>;
  onSaveCategories: (id: number, categoryIds: number[]) => Promise<void>;
  onPlay: (video: Video) => void;
}

function formatBitrate(bps: number | null): string {
  if (!bps) return "—";
  return `${Math.round(bps / 1000)} kbps`;
}

const CODEC_LABELS: Record<string, string> = {
  h264: "H.264",
  hevc: "HEVC",
  vp9: "VP9",
  av1: "AV1",
  aac: "AAC",
  opus: "Opus",
  mp3: "MP3",
  vorbis: "Vorbis",
};

function formatCodec(codec: string | null): string | null {
  if (!codec) return null;
  return CODEC_LABELS[codec.toLowerCase()] || codec.toUpperCase();
}

export function VideoCard({
  video,
  selected,
  allCategories,
  onToggleSelect,
  onDelete,
  onSaveTags,
  onSaveCategories,
  onPlay,
}: Props) {
  const { t } = useTranslation();
  return (
    <div className="card video-card">
      <label
        className="video-card-select"
        style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}
        title={video.status === "error" ? t("library_retry_hint") : undefined}
      >
        <input
          type="checkbox"
          checked={selected}
          onChange={() => onToggleSelect(video.id)}
          disabled={video.status !== "error"}
        />
        <StatusBadge status={video.status} />
      </label>
      {video.thumbnail ? <img src={video.thumbnail} alt="" /> : <div className="video-card-thumb-placeholder" />}
      <div className="title" title={video.title}>
        {video.title}
      </div>
      <div className="meta video-card-source">
        <span>{video.channel_name}</span>
        <a href={video.url} target="_blank" rel="noopener noreferrer" title={t("library_youtube_link")}>
          <ExternalLinkIcon size={12} /> YouTube
        </a>
      </div>
      <div className="meta">
        {video.resolution || "—"}
        {formatCodec(video.video_codec) && ` (${formatCodec(video.video_codec)})`} ·{" "}
        {formatBitrate(video.audio_bitrate)}
        {formatCodec(video.audio_codec) && ` (${formatCodec(video.audio_codec)})`}
        {!!video.audio_only && (
          <span className="audio-only-badge">
            <HeadphonesIcon size={12} /> {t("library_audio_only_badge")}
          </span>
        )}
      </div>
      <CategoryEditor
        assigned={video.categories}
        allCategories={allCategories}
        onSave={(ids) => onSaveCategories(video.id, ids)}
      />
      <TagEditor tags={video.tags} onSave={(tags) => onSaveTags(video.id, tags)} />
      {video.status === "error" && video.error_message && (
        <div className="error-text">{video.error_message}</div>
      )}
      <div className="video-card-actions">
        {video.status === "completed" && video.stream_url && (
          <button className="btn btn-secondary" onClick={() => onPlay(video)}>
            <PlayIcon /> {t("library_play")}
          </button>
        )}
        <button className="btn btn-secondary" onClick={() => onDelete(video.id)}>
          <TrashIcon /> {t("library_delete")}
        </button>
      </div>
    </div>
  );
}
