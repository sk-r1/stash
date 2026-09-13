import { Channel } from "../api";
import { ChannelListItem } from "./ChannelListItem";
import { useTranslation } from "../i18n/I18nContext";

interface Props {
  channels: Channel[];
  onFetch: (id: number) => Promise<void>;
  onToggleAudioOnly: (id: number, audioOnly: boolean) => Promise<void>;
  onDelete: (id: number) => Promise<void>;
}

export function ChannelList({ channels, onFetch, onToggleAudioOnly, onDelete }: Props) {
  const { t } = useTranslation();

  if (channels.length === 0) {
    return <p className="meta">{t("channels_empty")}</p>;
  }

  return (
    <div>
      {channels.map((c) => (
        <ChannelListItem
          key={c.id}
          channel={c}
          onFetch={onFetch}
          onToggleAudioOnly={onToggleAudioOnly}
          onDelete={onDelete}
        />
      ))}
    </div>
  );
}
