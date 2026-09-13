import { NavLink } from "react-router-dom";
import { useTranslation } from "../i18n/I18nContext";
import { StashLogo } from "./StashLogo";

export function NavBar() {
  const { t } = useTranslation();
  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <StashLogo />
        <h1>Stash</h1>
      </div>
      <nav>
        <NavLink to="/" end className={({ isActive }) => (isActive ? "active" : "")}>
          {t("nav_library")}
        </NavLink>
        <NavLink to="/channels" className={({ isActive }) => (isActive ? "active" : "")}>
          {t("nav_channels")}
        </NavLink>
        <NavLink to="/downloads" className={({ isActive }) => (isActive ? "active" : "")}>
          {t("nav_downloads")}
        </NavLink>
        <NavLink to="/settings" className={({ isActive }) => (isActive ? "active" : "")}>
          {t("nav_settings")}
        </NavLink>
      </nav>
      <div className="sidebar-version">v{__APP_VERSION__}</div>
    </aside>
  );
}
