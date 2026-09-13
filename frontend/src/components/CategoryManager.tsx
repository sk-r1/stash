import { useState } from "react";
import { Category } from "../api";
import { PlusIcon, TrashIcon, SaveIcon } from "./Icons";
import { useTranslation } from "../i18n/I18nContext";

interface Props {
  categories: Category[];
  onAdd: (name: string) => Promise<void>;
  onRename: (id: number, name: string) => Promise<void>;
  onDelete: (id: number) => Promise<void>;
}

function CategoryChip({
  category,
  onRename,
  onDelete,
}: {
  category: Category;
  onRename: (id: number, name: string) => Promise<void>;
  onDelete: (id: number) => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(category.name);

  async function commit() {
    const trimmed = draft.trim();
    if (trimmed && trimmed !== category.name) {
      await onRename(category.id, trimmed);
    }
    setEditing(false);
  }

  if (editing) {
    return (
      <span className="tag-chip category-chip">
        <input
          type="text"
          autoFocus
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") commit();
            if (e.key === "Escape") setEditing(false);
          }}
          style={{ fontSize: "0.72rem", padding: "0.1rem 0.3rem", width: "8rem" }}
        />
        <button className="icon-btn" onClick={commit} aria-label="save category name">
          <SaveIcon size={11} />
        </button>
      </span>
    );
  }

  return (
    <span className="tag-chip category-chip">
      <span onClick={() => setEditing(true)} role="button" tabIndex={0}>
        {category.name}
      </span>
      <button className="icon-btn" onClick={() => onDelete(category.id)} aria-label="delete category">
        <TrashIcon size={12} />
      </button>
    </span>
  );
}

export function CategoryManager({ categories, onAdd, onRename, onDelete }: Props) {
  const { t } = useTranslation();
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setError(null);
    try {
      await onAdd(name.trim());
      setName("");
    } catch (err) {
      setError((err as Error).message);
    }
  }

  return (
    <div>
      <form onSubmit={handleSubmit} style={{ display: "flex", gap: "0.5rem" }}>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t("settings_categories_placeholder")}
          style={{ flex: 1 }}
        />
        <button className="btn" type="submit">
          <PlusIcon size={14} /> {t("settings_categories_add")}
        </button>
      </form>
      {error && <p className="error-text">{error}</p>}
      {categories.length === 0 ? (
        <p className="meta" style={{ marginTop: "0.5rem" }}>
          {t("settings_categories_empty")}
        </p>
      ) : (
        <div className="category-manager-list">
          {categories.map((c) => (
            <CategoryChip key={c.id} category={c} onRename={onRename} onDelete={onDelete} />
          ))}
        </div>
      )}
    </div>
  );
}
