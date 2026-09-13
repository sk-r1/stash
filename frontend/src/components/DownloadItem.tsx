import { Video } from "../api";
import { StatusBadge } from "./StatusBadge";
import { XIcon } from "./Icons";
import { useTranslation } from "../i18n/I18nContext";

interface Props {
  video: Video;
  onCancel: (id: number) => void;
}

export function DownloadItem({ video, onCancel }: Props) {
  const { t } = useTranslation();
  const percent = video.progress?.percent ?? 0;

  return (
    <div className="card" style={{ marginBottom: "0.75rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <div style={{ fontWeight: 600 }}>{video.title}</div>
          <div className="meta">{video.channel_name}</div>
        </div>
        <StatusBadge status={video.status} />
      </div>
      {video.status === "downloading" && (
        <div style={{ marginTop: "0.5rem" }}>
          <div className="progress-bar">
            <div style={{ width: `${percent}%` }} />
          </div>
          <div className="meta">
            {percent.toFixed(1)}% · {video.progress?.speed || ""} · ETA {video.progress?.eta || "—"}
          </div>
        </div>
      )}
      {video.status === "error" && video.error_message && (
        <div className="error-text">{video.error_message}</div>
      )}
      {video.status === "downloading" && (
        <button className="btn btn-secondary" style={{ marginTop: "0.5rem" }} onClick={() => onCancel(video.id)}>
          <XIcon size={14} /> {t("downloads_cancel")}
        </button>
      )}
    </div>
  );
}
