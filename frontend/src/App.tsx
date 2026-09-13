import { Routes, Route } from "react-router-dom";
import { NavBar } from "./components/NavBar";
import { SettingsProvider, useSettings } from "./SettingsContext";
import { I18nProvider } from "./i18n/I18nContext";
import { LibraryView } from "./pages/LibraryView";
import { ChannelManagement } from "./pages/ChannelManagement";
import { Downloads } from "./pages/Downloads";
import { SettingsPage } from "./pages/Settings";

function Shell() {
  const { settings, loading } = useSettings();

  if (loading || !settings) {
    return <div style={{ padding: "2rem" }}>Loading…</div>;
  }

  return (
    <I18nProvider language={settings.language}>
      <div className="app-shell">
        <NavBar />
        <main className="main-content">
          <Routes>
            <Route path="/" element={<LibraryView />} />
            <Route path="/channels" element={<ChannelManagement />} />
            <Route path="/downloads" element={<Downloads />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Routes>
        </main>
      </div>
    </I18nProvider>
  );
}

export default function App() {
  return (
    <SettingsProvider>
      <Shell />
    </SettingsProvider>
  );
}
