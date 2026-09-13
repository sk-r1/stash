import { Video } from "../api";
import { DownloadItem } from "./DownloadItem";
import { useTranslation } from "../i18n/I18nContext";

interface Props {
  videos: Video[];
  onCancel: (id: number) => void;
}

export function DownloadQueue({ videos, onCancel }: Props) {
  const { t } = useTranslation();

  if (videos.length === 0) {
    return <p className="meta">{t("downloads_empty")}</p>;
  }

  return (
    <div>
      {videos.map((v) => (
        <DownloadItem key={v.id} video={v} onCancel={onCancel} />
      ))}
    </div>
  );
}
