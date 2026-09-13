import { useState } from "react";
import { Category } from "../api";
import { FolderIcon, PlusIcon } from "./Icons";
import { useTranslation } from "../i18n/I18nContext";

interface Props {
  assigned: Category[];
  allCategories: Category[];
  onSave: (categoryIds: number[]) => Promise<void>;
}

export function CategoryEditor({ assigned, allCategories, onSave }: Props) {
  const { t } = useTranslation();
  const [editing, setEditing] = useState(false);
  const assignedIds = new Set(assigned.map((c) => c.id));

  async function toggle(categoryId: number) {
    const next = assignedIds.has(categoryId)
      ? assigned.filter((c) => c.id !== categoryId).map((c) => c.id)
      : [...assignedIds, categoryId];
    await onSave(next);
  }

  if (editing) {
    return (
      <div className="category-picker">
        {allCategories.length === 0 ? (
          <span className="meta">{t("category_none_defined")}</span>
        ) : (
          allCategories.map((c) => (
            <label key={c.id} className="category-picker-option">
              <input type="checkbox" checked={assignedIds.has(c.id)} onChange={() => toggle(c.id)} />
              {c.name}
            </label>
          ))
        )}
        <button className="icon-btn" onClick={() => setEditing(false)} aria-label="done">
          {t("common_done")}
        </button>
      </div>
    );
  }

  return (
    <div className="tag-row" onClick={() => setEditing(true)} role="button" tabIndex={0}>
      {assigned.length === 0 ? (
        <span className="tag-chip tag-chip-empty">
          <PlusIcon size={12} /> {t("category_editor_label")}
        </span>
      ) : (
        assigned.map((c) => (
          <span key={c.id} className="tag-chip category-chip">
            <FolderIcon /> {c.name}
          </span>
        ))
      )}
    </div>
  );
}
