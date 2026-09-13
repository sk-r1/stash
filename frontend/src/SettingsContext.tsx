import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import { api, Settings } from "./api";

interface SettingsContextValue {
  settings: Settings | null;
  loading: boolean;
  update: (patch: Partial<Settings>) => Promise<void>;
}

const SettingsContext = createContext<SettingsContextValue>({
  settings: null,
  loading: true,
  update: async () => {},
});

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .getSettings()
      .then(setSettings)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!settings) return;
    document.documentElement.setAttribute("data-theme", settings.dark_mode ? "dark" : "light");
  }, [settings]);

  const update = useCallback(async (patch: Partial<Settings>) => {
    const next = await api.updateSettings(patch);
    setSettings(next);
  }, []);

  return (
    <SettingsContext.Provider value={{ settings, loading, update }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  return useContext(SettingsContext);
}
