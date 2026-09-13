import { useState } from "react";
import { TagIcon, PlusIcon, SaveIcon } from "./Icons";

interface Props {
  tags: string[];
  onSave: (tags: string[]) => Promise<void>;
}

export function TagEditor({ tags, onSave }: Props) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(tags.join(", "));
  const [saving, setSaving] = useState(false);

  function startEditing() {
    setDraft(tags.join(", "));
    setEditing(true);
  }

  async function commit() {
    setSaving(true);
    try {
      const next = draft
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);
      await onSave(next);
      setEditing(false);
    } finally {
      setSaving(false);
    }
  }

  if (editing) {
    return (
      <div style={{ display: "flex", gap: "0.35rem", alignItems: "center" }}>
        <input
          type="text"
          autoFocus
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") commit();
            if (e.key === "Escape") setEditing(false);
          }}
          placeholder="tag1, tag2…"
          style={{ flex: 1, fontSize: "0.8rem", padding: "0.25rem 0.5rem" }}
        />
        <button className="icon-btn" onClick={commit} disabled={saving} aria-label="save tags">
          <SaveIcon />
        </button>
      </div>
    );
  }

  return (
    <div className="tag-row" onClick={startEditing} role="button" tabIndex={0}>
      {tags.length === 0 ? (
        <span className="tag-chip tag-chip-empty">
          <PlusIcon size={12} /> Tags
        </span>
      ) : (
        <>
          {tags.map((tag) => (
            <span key={tag} className="tag-chip">
              <TagIcon /> {tag}
            </span>
          ))}
        </>
      )}
    </div>
  );
}
