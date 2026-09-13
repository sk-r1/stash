import { useEffect, useState } from "react";
import { useSettings } from "../SettingsContext";
import { api, Category } from "../api";
import { RefreshIcon, DownloadsIcon, SunIcon, MoonIcon } from "../components/Icons";
import { CategoryManager } from "../components/CategoryManager";
import { useTranslation } from "../i18n/I18nContext";

export function SettingsPage() {
  const { settings, update } = useSettings();
  const { t } = useTranslation();
  const [versionMessage, setVersionMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);

  function refreshCategories() {
    api.getCategories().then(setCategories).catch(() => {});
  }

  useEffect(refreshCategories, []);

  if (!settings) return null;

  async function handleCheckUpdate() {
    setBusy(true);
    try {
      const { version } = await api.checkYtDlpUpdate();
      setVersionMessage(version);
    } catch (err) {
      setVersionMessage((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function handleUpdate() {
    setBusy(true);
    try {
      const { version } = await api.updateYtDlp();
      setVersionMessage(version);
    } catch (err) {
      setVersionMessage((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function handleAddCategory(name: string) {
    await api.createCategory(name);
    refreshCategories();
  }

  async function handleRenameCategory(id: number, name: string) {
    await api.renameCategory(id, name);
    refreshCategories();
  }

  async function handleDeleteCategory(id: number) {
    await api.deleteCategory(id);
    refreshCategories();
  }

  return (
    <div>
      <h2>{t("nav_settings")}</h2>
      <div className="settings-section">
        <div className="settings-row">
          <label>{t("settings_language")}</label>
          <select value={settings.language} onChange={(e) => update({ language: e.target.value as "de" | "en" })}>
            <option value="de">Deutsch</option>
            <option value="en">English</option>
          </select>
        </div>

        <div className="settings-row">
          <label>
            {settings.dark_mode ? <MoonIcon /> : <SunIcon />} {t("settings_dark_mode")}
          </label>
          <input
            type="checkbox"
            checked={settings.dark_mode}
            onChange={(e) => update({ dark_mode: e.target.checked })}
          />
        </div>

        <div className="settings-row">
          <label>{t("settings_max_parallel")}</label>
          <input
            type="number"
            min={1}
            max={4}
            value={settings.max_parallel_downloads}
            onChange={(e) => update({ max_parallel_downloads: Number(e.target.value) })}
            style={{ width: "4rem" }}
          />
        </div>

        <div className="settings-row">
          <label>{t("settings_sponsorblock")}</label>
          <input
            type="checkbox"
            checked={settings.sponsorblock_enabled}
            onChange={(e) => update({ sponsorblock_enabled: e.target.checked })}
          />
        </div>

        <div className="settings-row">
          <label>{t("settings_subtitles")}</label>
          <input
            type="checkbox"
            checked={settings.subtitles_enabled}
            onChange={(e) => update({ subtitles_enabled: e.target.checked })}
          />
        </div>

        <div className="settings-row">
          <label>{t("settings_yt_dlp_version")}</label>
          <span>{versionMessage || settings.yt_dlp_version || "—"}</span>
        </div>

        <div style={{ display: "flex", gap: "0.5rem" }}>
          <button className="btn btn-secondary" onClick={handleCheckUpdate} disabled={busy}>
            <RefreshIcon size={14} /> {t("settings_check_update")}
          </button>
          <button className="btn" onClick={handleUpdate} disabled={busy}>
            <DownloadsIcon size={14} /> {t("settings_update")}
          </button>
        </div>
      </div>

      <h3 className="settings-subheading">{t("settings_categories_title")}</h3>
      <CategoryManager
        categories={categories}
        onAdd={handleAddCategory}
        onRename={handleRenameCategory}
        onDelete={handleDeleteCategory}
      />

      <div className="settings-section" style={{ marginTop: "1.5rem" }}>
        <a className="btn btn-secondary" href={api.backupDatabaseUrl} style={{ textAlign: "center", textDecoration: "none" }}>
          <DownloadsIcon size={14} /> {t("settings_backup")}
        </a>
      </div>
    </div>
  );
}
