import type { MembershipTier } from "@/lib/generated/prisma/enums";
import type { Lang } from "@/i18n/config";
import { translator } from "@/i18n/config";

/** The membership pill that sits next to the profile in the header. */
export function MembershipBadge({
  tier,
  lang,
  size = "sm",
}: {
  tier: MembershipTier | null;
  lang: Lang;
  size?: "sm" | "md";
}) {
  const t = translator(lang);
  const pad = size === "md" ? "px-2.5 py-1 text-xs" : "px-2 py-0.5 text-[11px]";

  if (!tier) {
    return <span className={`chip chip-muted ${pad}`}>{t("badge.guest")}</span>;
  }

  return (
    <span className={`chip chip-gold ${pad}`}>
      <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
        <path d="M12 2l2.9 6.1 6.6.9-4.8 4.6 1.2 6.6L12 17.1 6.1 20.2l1.2-6.6L2.5 9l6.6-.9z" />
      </svg>
      {t(tier === "YEAR" ? "badge.yearMember" : "badge.fallMember")}
    </span>
  );
}
