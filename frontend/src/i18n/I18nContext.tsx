import React, { createContext, useContext, useMemo } from "react";
import { dictionaries, TranslationKey } from "./dictionaries";

type Language = keyof typeof dictionaries;

interface I18nContextValue {
  t: (key: TranslationKey) => string;
  language: Language;
}

const I18nContext = createContext<I18nContextValue>({
  t: (key) => dictionaries.en[key],
  language: "en",
});

export function I18nProvider({
  language,
  children,
}: {
  language: Language;
  children: React.ReactNode;
}) {
  const value = useMemo<I18nContextValue>(() => {
    const dict = dictionaries[language] || dictionaries.en;
    return { language, t: (key) => dict[key] ?? key };
  }, [language]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useTranslation() {
  return useContext(I18nContext);
}
