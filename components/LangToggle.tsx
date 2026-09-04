"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { useLang } from "@/i18n/LangProvider";
import { LANG_COOKIE } from "@/i18n/config";

/**
 * Writes the language cookie client-side and refreshes so the server re-renders
 * every string - including the ones that come out of the database.
 */
export function LangToggle() {
  const { lang, t } = useLang();
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function switchTo() {
    const next = lang === "en" ? "zh" : "en";
    document.cookie = `${LANG_COOKIE}=${next};path=/;max-age=31536000;samesite=lax`;
    document.documentElement.lang = next === "zh" ? "zh-CN" : "en";
    startTransition(() => router.refresh());
  }

  return (
    <button
      type="button"
      onClick={switchTo}
      disabled={pending}
      aria-label={t("lang.label")}
      className="chip chip-muted focus-ring hover:bg-[var(--gold-wash)] hover:text-[#7a5200] transition-colors"
    >
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden>
        <circle cx="12" cy="12" r="9" />
        <path d="M3 12h18M12 3a15 15 0 0 1 0 18M12 3a15 15 0 0 0 0 18" />
      </svg>
      {t("lang.toggle")}
    </button>
  );
}
