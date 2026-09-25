import { useEffect, useRef, useState } from "react";
import { Category } from "../api";
import { useTranslation } from "../i18n/I18nContext";

interface Props {
  categories: Category[];
  selectedIds: number[];
  onChange: (ids: number[]) => void;
}

/** Multi-select category filter; videos in any of the selected categories match. */
export function CategoryFilter({ categories, selectedIds, onChange }: Props) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handlePointerDown(e: PointerEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [open]);

  function toggle(id: number) {
    onChange(selectedIds.includes(id) ? selectedIds.filter((x) => x !== id) : [...selectedIds, id]);
  }

  let label = t("library_filter_all_categories");
  if (selectedIds.length === 1) {
    label = categories.find((c) => c.id === selectedIds[0])?.name ?? label;
  } else if (selectedIds.length > 1) {
    label = t("library_filter_categories_selected").replace("{count}", String(selectedIds.length));
  }

  return (
    <div className="category-filter" ref={rootRef}>
      <button
        type="button"
        className="category-filter-button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
      >
        <span>{label}</span>
      </button>
      {open && (
        <div className="category-filter-menu">
          <label className={`category-dropdown-option${selectedIds.length === 0 ? " selected" : ""}`}>
            <input type="checkbox" checked={selectedIds.length === 0} onChange={() => onChange([])} />
            {t("library_filter_all_categories")}
          </label>
          {categories.map((c) => (
            <label
              key={c.id}
              className={`category-dropdown-option${selectedIds.includes(c.id) ? " selected" : ""}`}
            >
              <input type="checkbox" checked={selectedIds.includes(c.id)} onChange={() => toggle(c.id)} />
              {c.name}
            </label>
          ))}
        </div>
      )}
    </div>
  );
}
