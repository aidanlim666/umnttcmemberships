import Link from "next/link";
import { Logo } from "@/components/Logo";
import { LangToggle } from "@/components/LangToggle";
import { getT } from "@/i18n/server";

export async function Header() {
  const { t } = await getT();

  return (
    <header className="sticky top-0 z-40">
      <div className="bg-[var(--maroon)] text-white">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-3 py-2 sm:px-5">
          <Link href="/" className="focus-ring flex items-center gap-2.5 rounded-lg">
            <span className="grid h-10 w-10 place-items-center rounded-lg bg-white/95 p-1">
              <Logo size={32} priority />
            </span>
            <span className="display text-[15px] font-extrabold leading-tight tracking-tight">
              {t("site.short")}
            </span>
          </Link>

          {/* Top-right: the language toggle, and nothing else — there are no accounts. */}
          <div className="ml-auto flex items-center gap-2">
            <LangToggle />
          </div>
        </div>
      </div>

      {/* Scrolling notice strip */}
      <div className="marquee border-b border-[#f0dca5] bg-[var(--gold-wash)] text-[11.5px] font-semibold text-[#7a5200]">
        <div className="marquee-track py-1.5">
          {[0, 1].map((copy) => (
            <span key={copy} className="inline-flex gap-12" aria-hidden={copy === 1}>
              <span>📣 {t("announce.1")}</span>
              <span>🏓 {t("announce.2")}</span>
              <span>📍 {t("announce.3")}</span>
              <span>🎟️ {t("announce.4")}</span>
            </span>
          ))}
        </div>
      </div>
    </header>
  );
}
