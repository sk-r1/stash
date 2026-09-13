import { useMemo, useState } from "react";
import { ChannelVideoPreview } from "../api";
import { useTranslation } from "../i18n/I18nContext";

interface Props {
  videos: ChannelVideoPreview[];
  onDownload: (selected: ChannelVideoPreview[]) => Promise<void>;
  onDismiss: () => void;
}

function formatDuration(seconds: number | null): string {
  if (!seconds) return "";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const mm = h > 0 ? String(m).padStart(2, "0") : String(m);
  const ss = String(s).padStart(2, "0");
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

export function ChannelVideoPicker({ videos, onDownload, onDismiss }: Props) {
  const { t } = useTranslation();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [submitting, setSubmitting] = useState(false);

  const allSelected = useMemo(
    () => videos.length > 0 && videos.every((v) => selected.has(v.youtubeId)),
    [videos, selected]
  );

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    setSelected(allSelected ? new Set() : new Set(videos.map((v) => v.youtubeId)));
  }

  async function handleDownload() {
    const chosen = videos.filter((v) => selected.has(v.youtubeId));
    if (chosen.length === 0) return;
    setSubmitting(true);
    try {
      await onDownload(chosen);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="card" style={{ marginTop: "0.5rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
        <label style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
          <input type="checkbox" checked={allSelected} onChange={toggleAll} />
          {t("channel_picker_select_all")} ({videos.length})
        </label>
        <button className="btn btn-secondary" onClick={onDismiss}>
          {t("channel_picker_dismiss")}
        </button>
      </div>

      <div style={{ maxHeight: "320px", overflowY: "auto", display: "flex", flexDirection: "column", gap: "0.4rem" }}>
        {videos.map((v) => (
          <label key={v.youtubeId} style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
            <input type="checkbox" checked={selected.has(v.youtubeId)} onChange={() => toggle(v.youtubeId)} />
            {v.thumbnail ? (
              <img src={v.thumbnail} alt="" style={{ width: "80px", height: "45px", objectFit: "cover", borderRadius: "4px" }} />
            ) : (
              <div style={{ width: "80px", height: "45px", borderRadius: "4px", background: "var(--surface-hover)" }} />
            )}
            <span style={{ flex: 1 }}>{v.title}</span>
            <span className="meta">{formatDuration(v.duration)}</span>
          </label>
        ))}
      </div>

      <button
        className="btn"
        style={{ marginTop: "0.75rem" }}
        onClick={handleDownload}
        disabled={submitting || selected.size === 0}
      >
        {t("channel_picker_download")} ({selected.size})
      </button>
    </div>
  );
}
