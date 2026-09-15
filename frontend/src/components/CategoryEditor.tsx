import { useMemo, useState } from "react";
import { Category } from "../api";
import { FolderIcon, PlusIcon, SearchIcon } from "./Icons";
import { useTranslation } from "../i18n/I18nContext";

interface Props {
  assigned: Category[];
  allCategories: Category[];
  onSave: (categoryIds: number[]) => Promise<void>;
}

export function CategoryEditor({ assigned, allCategories, onSave }: Props) {
  const { t } = useTranslation();
  const [editing, setEditing] = useState(false);
  const [query, setQuery] = useState("");
  const assignedIds = new Set(assigned.map((c) => c.id));

  // Assigned categories float to the top so they stay visible once the list
  // scrolls, and a search filters the rest — a flat checkbox list per
  // category doesn't scale once there are more than a handful.
  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    const matches = q ? allCategories.filter((c) => c.name.toLowerCase().includes(q)) : allCategories;
    return [...matches].sort((a, b) => {
      const aSel = assignedIds.has(a.id) ? 0 : 1;
      const bSel = assignedIds.has(b.id) ? 0 : 1;
      return aSel !== bSel ? aSel - bSel : a.name.localeCompare(b.name);
    });
  }, [allCategories, query, assigned]);

  async function toggle(categoryId: number) {
    const next = assignedIds.has(categoryId)
      ? assigned.filter((c) => c.id !== categoryId).map((c) => c.id)
      : [...assignedIds, categoryId];
    await onSave(next);
  }

  function startEditing() {
    setQuery("");
    setEditing(true);
  }

  if (editing) {
    return (
      <div className="category-dropdown">
        {allCategories.length === 0 ? (
          <span className="meta">{t("category_none_defined")}</span>
        ) : (
          <>
            <div className="category-dropdown-search">
              <SearchIcon size={14} />
              <input
                type="text"
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t("category_search_placeholder")}
              />
            </div>
            <div className="category-dropdown-list">
              {visible.length === 0 ? (
                <span className="meta">{t("category_search_none")}</span>
              ) : (
                visible.map((c) => (
                  <label
                    key={c.id}
                    className={`category-dropdown-option${assignedIds.has(c.id) ? " selected" : ""}`}
                  >
                    <input type="checkbox" checked={assignedIds.has(c.id)} onChange={() => toggle(c.id)} />
                    {c.name}
                  </label>
                ))
              )}
            </div>
          </>
        )}
        <button className="icon-btn" onClick={() => setEditing(false)} aria-label="done">
          {t("common_done")}
        </button>
      </div>
    );
  }

  return (
    <div className="tag-row" onClick={startEditing} role="button" tabIndex={0}>
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
