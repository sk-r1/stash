import { useEffect, useRef, useState, PointerEvent as ReactPointerEvent } from "react";
import { XIcon, ExternalLinkIcon } from "./Icons";
import { useTranslation } from "../i18n/I18nContext";

interface Props {
  src: string;
  title: string;
  onClose: () => void;
}

const DIALOG_WIDTH_ESTIMATE = 960;
const DIALOG_HEIGHT_ESTIMATE = 560;

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), Math.max(min, max));
}

export function VideoPlayerModal({ src, title, onClose }: Props) {
  const { t } = useTranslation();
  const dialogRef = useRef<HTMLDivElement>(null);
  const dragState = useRef<{ pointerId: number; offsetX: number; offsetY: number } | null>(null);

  const [position, setPosition] = useState(() => ({
    x: Math.max(0, (window.innerWidth - DIALOG_WIDTH_ESTIMATE) / 2),
    y: Math.max(0, (window.innerHeight - DIALOG_HEIGHT_ESTIMATE) / 2),
  }));

  function clampToViewport(x: number, y: number): { x: number; y: number } {
    const el = dialogRef.current;
    const w = el?.offsetWidth ?? DIALOG_WIDTH_ESTIMATE;
    return {
      x: clamp(x, -w + 80, window.innerWidth - 80),
      y: clamp(y, 0, window.innerHeight - 40),
    };
  }

  function handleHeaderPointerDown(e: ReactPointerEvent<HTMLDivElement>) {
    if ((e.target as HTMLElement).closest("button")) return;
    const el = dialogRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    dragState.current = {
      pointerId: e.pointerId,
      offsetX: e.clientX - rect.left,
      offsetY: e.clientY - rect.top,
    };
    e.currentTarget.setPointerCapture(e.pointerId);
  }

  function handleHeaderPointerMove(e: ReactPointerEvent<HTMLDivElement>) {
    const drag = dragState.current;
    if (!drag || drag.pointerId !== e.pointerId) return;
    const next = clampToViewport(e.clientX - drag.offsetX, e.clientY - drag.offsetY);
    setPosition(next);
  }

  function handleHeaderPointerUp(e: ReactPointerEvent<HTMLDivElement>) {
    if (dragState.current?.pointerId === e.pointerId) dragState.current = null;
  }

  useEffect(() => {
    function handleResize() {
      setPosition((p) => clampToViewport(p.x, p.y));
    }
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return (
    <div className="player-backdrop" onClick={onClose}>
      <div
        ref={dialogRef}
        className="player-dialog"
        style={{ left: position.x, top: position.y }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="player-header"
          onPointerDown={handleHeaderPointerDown}
          onPointerMove={handleHeaderPointerMove}
          onPointerUp={handleHeaderPointerUp}
        >
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
