import { api } from "../api";
import { usePolling } from "../hooks/usePolling";
import { DownloadQueue } from "../components/DownloadQueue";
import { useTranslation } from "../i18n/I18nContext";

export function Downloads() {
  const { t } = useTranslation();
  const { data: videos, error, refresh } = usePolling(() => api.getDownloads(), 2500);

  async function handleCancel(id: number) {
    await api.cancelDownload(id);
    refresh();
  }

  return (
    <div>
      <h2>{t("nav_downloads")}</h2>
      {error && <p className="error-text">{error}</p>}
      <DownloadQueue videos={videos || []} onCancel={handleCancel} />
    </div>
  );
}
