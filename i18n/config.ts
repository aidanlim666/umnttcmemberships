import { en } from "./en";
import { zh } from "./zh";

export const LANGS = ["en", "zh"] as const;
export type Lang = (typeof LANGS)[number];

export const DEFAULT_LANG: Lang = "en";
export const LANG_COOKIE = "umnttc_lang";

export const dictionaries = { en, zh };

export function isLang(value: unknown): value is Lang {
  return typeof value === "string" && (LANGS as readonly string[]).includes(value);
}

export type TranslateKey = keyof typeof en;

export function translator(lang: Lang) {
  const dict = dictionaries[lang];
  return (key: TranslateKey) => dict[key];
}
