import { useEffect, useState } from "react";
import { api, Channel, ChannelVideoPreview } from "../api";
import { ChannelForm } from "../components/ChannelForm";
import { ChannelList } from "../components/ChannelList";
import { ChannelVideoPicker } from "../components/ChannelVideoPicker";
import { RefreshIcon } from "../components/Icons";
import { useTranslation } from "../i18n/I18nContext";

interface CheckAllResult {
  channel: Channel;
  videos: ChannelVideoPreview[];
}

export function ChannelManagement() {
  const { t } = useTranslation();
  const [channels, setChannels] = useState<Channel[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [checkingAll, setCheckingAll] = useState(false);
  const [checkAllResults, setCheckAllResults] = useState<CheckAllResult[] | null>(null);
  const [checkAllMessage, setCheckAllMessage] = useState<string | null>(null);

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

  async function handleDownload(id: number, videos: ChannelVideoPreview[]) {
    return api.downloadChannelVideos(id, videos);
  }

  async function handleToggleAudioOnly(id: number, audioOnly: boolean) {
    await api.updateChannel(id, { audio_only: audioOnly ? 1 : 0 });
    refresh();
  }

  async function handleDelete(id: number) {
    await api.deleteChannel(id);
    refresh();
  }

  async function handleCheckAll() {
    setCheckingAll(true);
    setCheckAllMessage(null);
    setCheckAllResults(null);
    try {
      const results = await api.checkAllChannels();
      if (results.length === 0) {
        setCheckAllMessage(t("channels_check_all_none"));
      } else {
        setCheckAllResults(results);
      }
    } catch (err) {
      setCheckAllMessage((err as Error).message);
    } finally {
      setCheckingAll(false);
    }
  }

  async function handleDownloadFromCheckAll(channelId: number, selected: ChannelVideoPreview[]) {
    await api.downloadChannelVideos(channelId, selected);
    setCheckAllResults((prev) => (prev ? prev.filter((r) => r.channel.id !== channelId) : prev));
  }

  function dismissCheckAllResult(channelId: number) {
    setCheckAllResults((prev) => (prev ? prev.filter((r) => r.channel.id !== channelId) : prev));
  }

  return (
    <div>
      <h2>{t("nav_channels")}</h2>
      <ChannelForm onAdd={handleAdd} />
      {error && <p className="error-text">{error}</p>}

      <div style={{ marginTop: "1rem" }}>
        <button className="btn btn-secondary" onClick={handleCheckAll} disabled={checkingAll}>
          <RefreshIcon /> {checkingAll ? t("common_loading") : t("channels_check_all_button")}
        </button>
        {checkAllMessage && <div className="inline-notice info">{checkAllMessage}</div>}
      </div>

      {checkAllResults && checkAllResults.length > 0 && (
        <div style={{ marginTop: "1rem", display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          {checkAllResults.map(({ channel, videos }) => (
            <div key={channel.id}>
              <div style={{ fontWeight: 600, marginBottom: "0.25rem" }}>{channel.name}</div>
              <ChannelVideoPicker
                videos={videos}
                onDownload={(selected) => handleDownloadFromCheckAll(channel.id, selected)}
                onDismiss={() => dismissCheckAllResult(channel.id)}
              />
            </div>
          ))}
        </div>
      )}

      <div style={{ marginTop: "1.5rem" }}>
        <ChannelList
          channels={channels}
          onFetch={handleFetch}
          onDownload={handleDownload}
          onToggleAudioOnly={handleToggleAudioOnly}
          onDelete={handleDelete}
        />
      </div>
    </div>
  );
}
