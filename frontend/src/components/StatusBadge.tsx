import { VideoStatus } from "../api";
import { useTranslation } from "../i18n/I18nContext";

export function StatusBadge({ status }: { status: VideoStatus }) {
  const { t } = useTranslation();
  const labels: Record<VideoStatus, string> = {
    pending: t("status_pending"),
    downloading: t("status_downloading"),
    completed: t("status_completed"),
    error: t("status_error"),
  };
  return <span className={`status-badge ${status}`}>{labels[status]}</span>;
}
