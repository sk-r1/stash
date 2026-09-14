import { NavLink } from "react-router-dom";
import { useTranslation } from "../i18n/I18nContext";
import { StashLogo } from "./StashLogo";
import { LibraryIcon, ChannelsIcon, DownloadsIcon, SettingsIcon } from "./Icons";

export function NavBar() {
  const { t } = useTranslation();
  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <StashLogo />
        <h1>Stash</h1>
        <span className="sidebar-version">v{__APP_VERSION__}</span>
      </div>
      <nav>
        <NavLink to="/" end className={({ isActive }) => (isActive ? "active" : "")}>
          <LibraryIcon /> {t("nav_library")}
        </NavLink>
        <NavLink to="/channels" className={({ isActive }) => (isActive ? "active" : "")}>
          <ChannelsIcon /> {t("nav_channels")}
        </NavLink>
        <NavLink to="/downloads" className={({ isActive }) => (isActive ? "active" : "")}>
          <DownloadsIcon /> {t("nav_downloads")}
        </NavLink>
        <NavLink to="/settings" className={({ isActive }) => (isActive ? "active" : "")}>
          <SettingsIcon /> {t("nav_settings")}
        </NavLink>
      </nav>
    </aside>
  );
}
