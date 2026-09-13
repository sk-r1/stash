import { useEffect, useState } from "react";
import { api, Channel } from "../api";
import { ChannelForm } from "../components/ChannelForm";
import { ChannelList } from "../components/ChannelList";
import { useTranslation } from "../i18n/I18nContext";

export function ChannelManagement() {
  const { t } = useTranslation();
  const [channels, setChannels] = useState<Channel[]>([]);
  const [error, setError] = useState<string | null>(null);

  function refresh() {
    api.getChannels().then(setChannels).catch((err: Error) => setError(err.message));
  }

  useEffect(refresh, []);

  async function handleAdd(url: string) {
    await api.addChannel(url);
    refresh();
  }

  async function handleFetch(id: number) {
    return api.fetchChannelVideos(id);
  }

  async function handleToggleAudioOnly(id: number, audioOnly: boolean) {
    await api.updateChannel(id, { audio_only: audioOnly ? 1 : 0 });
    refresh();
  }

  async function handleDelete(id: number) {
    await api.deleteChannel(id);
    refresh();
  }

  return (
    <div>
      <h2>{t("nav_channels")}</h2>
      <ChannelForm onAdd={handleAdd} />
      {error && <p className="error-text">{error}</p>}
      <div style={{ marginTop: "1.5rem" }}>
        <ChannelList
          channels={channels}
          onFetch={handleFetch}
          onToggleAudioOnly={handleToggleAudioOnly}
          onDelete={handleDelete}
        />
      </div>
    </div>
  );
}
