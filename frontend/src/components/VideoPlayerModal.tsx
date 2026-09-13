import { XIcon, ExternalLinkIcon } from "./Icons";
import { useTranslation } from "../i18n/I18nContext";

interface Props {
  src: string;
  title: string;
  onClose: () => void;
}

export function VideoPlayerModal({ src, title, onClose }: Props) {
  const { t } = useTranslation();

  return (
    <div className="player-backdrop" onClick={onClose}>
      <div className="player-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="player-header">
          <span className="title">{title}</span>
          <button className="icon-btn" onClick={onClose} aria-label="close">
            <XIcon size={16} />
          </button>
        </div>
        {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
        <video src={src} controls autoPlay style={{ width: "100%", maxHeight: "75vh", background: "#000" }} />
        <a href={src} target="_blank" rel="noopener noreferrer" className="player-external-link">
          <ExternalLinkIcon size={12} /> {t("library_play_hint")}
        </a>
      </div>
    </div>
  );
}
