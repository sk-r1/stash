import { useState } from "react";
import { useTranslation } from "../i18n/I18nContext";
import { PlusIcon } from "./Icons";

export function ChannelForm({ onAdd }: { onAdd: (url: string) => Promise<void> }) {
  const { t } = useTranslation();
  const [url, setUrl] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!url.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      await onAdd(url.trim());
      setUrl("");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: "flex", gap: "0.5rem" }}>
      <input
        type="text"
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        placeholder={t("channels_add_placeholder")}
        style={{ flex: 1 }}
      />
      <button className="btn" type="submit" disabled={submitting}>
        <PlusIcon /> {t("channels_add_button")}
      </button>
      {error && <p className="error-text">{error}</p>}
    </form>
  );
}
