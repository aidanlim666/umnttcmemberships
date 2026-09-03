import { cookies } from "next/headers";
import { DEFAULT_LANG, isLang, LANG_COOKIE, translator, type Lang } from "./config";

/** Reads the language cookie so server-rendered HTML is already in the right language. */
export async function getLang(): Promise<Lang> {
  const store = await cookies();
  const value = store.get(LANG_COOKIE)?.value;
  return isLang(value) ? value : DEFAULT_LANG;
}

export async function getT() {
  const lang = await getLang();
  return { lang, t: translator(lang) };
}
