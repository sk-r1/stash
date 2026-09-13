import { useState } from "react";
import { Channel, Video } from "../api";
import { useTranslation } from "../i18n/I18nContext";

interface Props {
  channel: Channel;
  onFetch: (id: number) => Promise<Video[]>;
  onToggleAudioOnly: (id: number, audioOnly: boolean) => Promise<void>;
  onDelete: (id: number) => Promise<void>;
}

export function ChannelListItem({ channel, onFetch, onToggleAudioOnly, onDelete }: Props) {
  const { t } = useTranslation();
  const [fetching, setFetching] = useState(false);
  const [message, setMessage] = useState<{ text: string; isError: boolean } | null>(null);

  async function handleFetch() {
    setFetching(true);
    setMessage(null);
    try {
      const found = await onFetch(channel.id);
      setMessage({
        text:
          found.length > 0
            ? t("channels_fetch_found").replace("{count}", String(found.length))
            : t("channels_fetch_none"),
        isError: false,
      });
    } catch (err) {
      setMessage({ text: (err as Error).message, isError: true });
    } finally {
      setFetching(false);
    }
  }

  return (
    <div className="channel-list-item">
      {channel.thumbnail_url ? <img src={channel.thumbnail_url} alt="" /> : <div className="channel-list-item-thumb-placeholder" />}
      <div className="grow">
        <div style={{ fontWeight: 600 }}>{channel.name}</div>
        <div className="meta">{channel.url}</div>
        {message && <div className={message.isError ? "error-text" : "meta"}>{message.text}</div>}
      </div>
      <label style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
        <input
          type="checkbox"
          checked={!!channel.audio_only}
          onChange={(e) => onToggleAudioOnly(channel.id, e.target.checked)}
        />
        {t("channels_audio_only")}
      </label>
      <button className="btn btn-secondary" onClick={handleFetch} disabled={fetching}>
        {fetching ? t("common_loading") : t("channels_fetch_button")}
      </button>
      <button className="btn btn-secondary" onClick={() => onDelete(channel.id)}>
        {t("channels_delete")}
      </button>
    </div>
  );
}
