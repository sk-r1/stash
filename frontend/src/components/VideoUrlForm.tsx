import { useState } from "react";
import { useTranslation } from "../i18n/I18nContext";
import { DownloadsIcon, HeadphonesIcon } from "./Icons";

interface Props {
  onAdd: (url: string, audioOnly: boolean) => Promise<void>;
}

export function VideoUrlForm({ onAdd }: Props) {
  const { t } = useTranslation();
  const [url, setUrl] = useState("");
  const [audioOnly, setAudioOnly] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!url.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      await onAdd(url.trim(), audioOnly);
      setUrl("");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="card" style={{ display: "flex", gap: "0.75rem", alignItems: "center", marginBottom: "1rem" }}>
      <input
        type="text"
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        placeholder={t("video_url_placeholder")}
        style={{ flex: 1 }}
      />
      <label className="audio-only-toggle">
        <input type="checkbox" checked={audioOnly} onChange={(e) => setAudioOnly(e.target.checked)} />
        <HeadphonesIcon /> {t("channels_audio_only")}
      </label>
      <button className="btn" type="submit" disabled={submitting}>
        <DownloadsIcon size={16} /> {t("video_url_download")}
      </button>
      {error && <p className="error-text">{error}</p>}
    </form>
  );
}
