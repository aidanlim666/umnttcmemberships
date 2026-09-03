"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";
import { dictionaries, type Lang, type TranslateKey } from "./config";

type LangContextValue = { lang: Lang; t: (key: TranslateKey) => string };

const LangContext = createContext<LangContextValue | null>(null);

export function LangProvider({ lang, children }: { lang: Lang; children: ReactNode }) {
  const value = useMemo<LangContextValue>(
    () => ({ lang, t: (key) => dictionaries[lang][key] }),
    [lang],
  );
  return <LangContext.Provider value={value}>{children}</LangContext.Provider>;
}

export function useLang(): LangContextValue {
  const ctx = useContext(LangContext);
  if (!ctx) throw new Error("useLang must be used inside <LangProvider>");
  return ctx;
}
