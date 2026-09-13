import { useState } from "react";
import { Channel } from "../api";
import { useTranslation } from "../i18n/I18nContext";

interface Props {
  channel: Channel;
  onFetch: (id: number) => Promise<void>;
  onToggleAudioOnly: (id: number, audioOnly: boolean) => Promise<void>;
  onDelete: (id: number) => Promise<void>;
}

export function ChannelListItem({ channel, onFetch, onToggleAudioOnly, onDelete }: Props) {
  const { t } = useTranslation();
  const [fetching, setFetching] = useState(false);

  async function handleFetch() {
    setFetching(true);
    try {
      await onFetch(channel.id);
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
        {t("channels_fetch_button")}
      </button>
      <button className="btn btn-secondary" onClick={() => onDelete(channel.id)}>
        {t("channels_delete")}
      </button>
    </div>
  );
}
