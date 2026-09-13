import { useState } from "react";
import { Channel, ChannelVideoPreview } from "../api";
import { ChannelVideoPicker } from "./ChannelVideoPicker";
import { RefreshIcon, HeadphonesIcon, TrashIcon } from "./Icons";
import { useTranslation } from "../i18n/I18nContext";

interface Props {
  channel: Channel;
  onFetch: (id: number) => Promise<ChannelVideoPreview[]>;
  onDownload: (id: number, videos: ChannelVideoPreview[]) => Promise<{ queued: number[] }>;
  onToggleAudioOnly: (id: number, audioOnly: boolean) => Promise<void>;
  onDelete: (id: number) => Promise<void>;
}

export function ChannelListItem({ channel, onFetch, onDownload, onToggleAudioOnly, onDelete }: Props) {
  const { t } = useTranslation();
  const [fetching, setFetching] = useState(false);
  const [foundVideos, setFoundVideos] = useState<ChannelVideoPreview[] | null>(null);
  const [message, setMessage] = useState<{ text: string; isError: boolean } | null>(null);

  async function handleFetch() {
    setFetching(true);
    setMessage(null);
    setFoundVideos(null);
    try {
      const found = await onFetch(channel.id);
      if (found.length > 0) {
        setFoundVideos(found);
      } else {
        setMessage({ text: t("channels_fetch_none"), isError: false });
      }
    } catch (err) {
      setMessage({ text: (err as Error).message, isError: true });
    } finally {
      setFetching(false);
    }
  }

  async function handleDownloadSelected(selected: ChannelVideoPreview[]) {
    const { queued } = await onDownload(channel.id, selected);
    setFoundVideos(null);
    setMessage({
      text: t("channels_fetch_queued").replace("{count}", String(queued.length)),
      isError: false,
    });
  }

  return (
    <div className="channel-list-item-wrapper">
      <div className="channel-list-item">
        {channel.thumbnail_url ? <img src={channel.thumbnail_url} alt="" /> : <div className="channel-list-item-thumb-placeholder" />}
        <div className="grow">
          <div style={{ fontWeight: 600 }}>{channel.name}</div>
          <div className="meta">{channel.url}</div>
          {message && <div className={`inline-notice ${message.isError ? "error" : "info"}`}>{message.text}</div>}
        </div>
        <label className="audio-only-toggle">
          <input
            type="checkbox"
            checked={!!channel.audio_only}
            onChange={(e) => onToggleAudioOnly(channel.id, e.target.checked)}
          />
          <HeadphonesIcon /> {t("channels_audio_only")}
        </label>
        <button className="btn btn-secondary" onClick={handleFetch} disabled={fetching}>
          <RefreshIcon /> {fetching ? t("common_loading") : t("channels_fetch_button")}
        </button>
        <button className="btn btn-secondary" onClick={() => onDelete(channel.id)}>
          <TrashIcon /> {t("channels_delete")}
        </button>
      </div>
      {foundVideos && (
        <ChannelVideoPicker
          videos={foundVideos}
          onDownload={handleDownloadSelected}
          onDismiss={() => setFoundVideos(null)}
        />
      )}
    </div>
  );
}
