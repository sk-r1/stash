import { Category, Channel } from "../api";
import { SearchIcon } from "./Icons";
import { useTranslation } from "../i18n/I18nContext";

export interface VideoFilters {
  status: string;
  channel_id: string;
  search: string;
  sort: string;
  tag: string;
  category_id: string;
}

interface Props {
  channels: Channel[];
  tags: string[];
  categories: Category[];
  filters: VideoFilters;
  onChange: (filters: VideoFilters) => void;
}

export function FilterBar({ channels, tags, categories, filters, onChange }: Props) {
  const { t } = useTranslation();

  return (
    <div>
      <div className="search-row">
        <SearchIcon />
        <input
          type="text"
          placeholder={t("library_search_placeholder")}
          value={filters.search}
          onChange={(e) => onChange({ ...filters, search: e.target.value })}
        />
      </div>
      <div className="filter-bar">
        <select
          value={filters.channel_id}
          onChange={(e) => onChange({ ...filters, channel_id: e.target.value })}
        >
          <option value="">{t("library_filter_all_channels")}</option>
          {channels.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <select value={filters.status} onChange={(e) => onChange({ ...filters, status: e.target.value })}>
          <option value="">{t("library_filter_all_status")}</option>
          <option value="pending">{t("status_pending")}</option>
          <option value="downloading">{t("status_downloading")}</option>
          <option value="completed">{t("status_completed")}</option>
          <option value="error">{t("status_error")}</option>
        </select>
        {categories.length > 0 && (
          <select
            value={filters.category_id}
            onChange={(e) => onChange({ ...filters, category_id: e.target.value })}
          >
            <option value="">{t("library_filter_all_categories")}</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        )}
        {tags.length > 0 && (
          <select value={filters.tag} onChange={(e) => onChange({ ...filters, tag: e.target.value })}>
            <option value="">{t("library_filter_all_tags")}</option>
            {tags.map((tag) => (
              <option key={tag} value={tag}>
                {tag}
              </option>
            ))}
          </select>
        )}
        <select value={filters.sort} onChange={(e) => onChange({ ...filters, sort: e.target.value })}>
          <option value="date">{t("library_sort_date")}</option>
          <option value="name">{t("library_sort_name")}</option>
          <option value="channel">{t("library_sort_channel")}</option>
        </select>
      </div>
    </div>
  );
}
