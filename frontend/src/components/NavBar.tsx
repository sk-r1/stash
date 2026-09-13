import { NavLink } from "react-router-dom";
import { useTranslation } from "../i18n/I18nContext";

export function NavBar() {
  const { t } = useTranslation();
  return (
    <aside className="sidebar">
      <h1>Stash</h1>
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
    </aside>
  );
}
