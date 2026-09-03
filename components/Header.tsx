import Link from "next/link";
import { Logo } from "@/components/Logo";
import { LangToggle } from "@/components/LangToggle";
import { MembershipBadge } from "@/components/MembershipBadge";
import { LogoutButton } from "@/components/LogoutButton";
import { getViewer } from "@/lib/session";
import { getT } from "@/i18n/server";

export async function Header() {
  const [{ lang, t }, viewer] = await Promise.all([getT(), getViewer()]);
  const initial = (viewer?.name || viewer?.email || "?").trim().charAt(0).toUpperCase();

  return (
    <header className="sticky top-0 z-40">
      <div className="bg-[var(--maroon)] text-white">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-3 py-2 sm:px-5">
          <Link href="/" className="focus-ring flex items-center gap-2.5 rounded-lg">
            <span className="grid h-10 w-10 place-items-center rounded-lg bg-white/95 p-1">
              <Logo size={32} priority />
            </span>
            <span className="leading-tight">
              <span className="display block text-[15px] font-extrabold tracking-tight">
                {t("site.short")}
              </span>
              <span className="block text-[10px] text-white/70">{t("site.tagline")}</span>
            </span>
          </Link>

          <nav className="ml-2 hidden items-center gap-1 text-[13px] font-semibold sm:flex">
            <Link href="/" className="focus-ring rounded-full px-3 py-1.5 hover:bg-white/10">
              {t("nav.shop")}
            </Link>
            {viewer && (
              <Link href="/account" className="focus-ring rounded-full px-3 py-1.5 hover:bg-white/10">
                {t("nav.account")}
              </Link>
            )}
          </nav>

          {/* Top-right cluster: language toggle, then identity + membership status. */}
          <div className="ml-auto flex items-center gap-2">
            <LangToggle />

            {viewer ? (
              <div className="flex items-center gap-2 rounded-full bg-white/10 py-1 pl-1 pr-2">
                {/* The avatar is the account link on mobile, where the name is hidden. */}
                <Link
                  href="/account"
                  aria-label={t("nav.account")}
                  className="focus-ring grid h-7 w-7 place-items-center rounded-full bg-[var(--gold)] text-[12px] font-extrabold text-[var(--maroon-deep)]"
                >
                  {initial}
                </Link>
                <div className="hidden leading-tight sm:block">
                  <Link href="/account" className="focus-ring block max-w-[9rem] truncate text-[12px] font-bold">
                    {viewer.name ?? viewer.email}
                  </Link>
                  <span className="mt-0.5 block">
                    <MembershipBadge tier={viewer.membership?.tier ?? null} lang={lang} />
                  </span>
                </div>
                <span className="sm:hidden">
                  <MembershipBadge tier={viewer.membership?.tier ?? null} lang={lang} />
                </span>
                <LogoutButton label={t("nav.logout")} />
              </div>
            ) : (
              <div className="flex items-center gap-1.5">
                <Link href="/login" className="btn btn-ghost px-3 py-1.5 text-[13px]">
                  {t("nav.login")}
                </Link>
                <Link href="/register" className="btn btn-gold px-3 py-1.5 text-[13px]">
                  {t("nav.register")}
                </Link>
              </div>
            )}
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
            </span>
          ))}
        </div>
      </div>
    </header>
  );
}
