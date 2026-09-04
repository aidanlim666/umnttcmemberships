import type { MembershipTier, ProductKind } from "@/lib/generated/prisma/enums";

/**
 * The club's season. Memberships bought at any point in the season run to the same end date,
 * which is how the club has always sold them.
 */
export const SEASON_START = new Date("2026-09-01T00:00:00.000Z");
export const FALL_END = new Date("2026-12-31T23:59:59.999Z");
export const YEAR_END = new Date("2027-08-31T23:59:59.999Z");

/** Drop-in dates cannot be picked before the season opens. */
export const DROPIN_MIN_DATE = SEASON_START;

/**
 * The nights each drop-in actually runs, as JS weekday numbers (0 = Sunday).
 * The calendar offers only these dates and the order API refuses anything else, so the
 * club never has to turn someone away who paid for a night that does not exist.
 * Change a night here and both the picker and the server follow.
 */
export const SESSION_WEEKDAYS: Partial<Record<ProductKind, readonly number[]>> = {
  LEAGUE_DROPIN: [5], // Friday
  OPENPLAY_DROPIN: [1, 3], // Monday and Wednesday
};

export function weekdaysFor(kind: ProductKind): readonly number[] | null {
  return SESSION_WEEKDAYS[kind] ?? null;
}

export const MEMBERSHIP_KINDS: ProductKind[] = ["YEAR_MEMBERSHIP", "FALL_MEMBERSHIP"];

export function tierForKind(kind: ProductKind): MembershipTier | null {
  if (kind === "YEAR_MEMBERSHIP") return "YEAR";
  if (kind === "FALL_MEMBERSHIP") return "FALL";
  return null;
}

export function membershipWindow(tier: MembershipTier): { startsAt: Date; endsAt: Date } {
  return { startsAt: SEASON_START, endsAt: tier === "YEAR" ? YEAR_END : FALL_END };
}

export const SEED_PRODUCTS = [
  {
    slug: "full-year-membership",
    kind: "YEAR_MEMBERSHIP" as ProductKind,
    nameEn: "2026-27 Full Year Membership",
    nameZh: "2026-27 学年全年会员",
    descEn:
      "Unlimited open play and Friday league entry for the entire 2026-27 academic year. Covers every open play session and every Friday league through August 2027.",
    descZh:
      "整个 2026-27 学年无限次 open play 与周五league 参与资格。涵盖至 2027 年 8 月前的所有 open play 与周五league。",
    priceCents: 5000,
    requiresDate: false,
    sortOrder: 1,
  },
  {
    slug: "fall-semester-membership",
    kind: "FALL_MEMBERSHIP" as ProductKind,
    nameEn: "Fall 2026 Semester Membership",
    nameZh: "2026 秋季学期会员",
    descEn:
      "Unlimited open play and Friday league entry for the fall semester, valid through December 2026. Ideal if you are only on campus for one term.",
    descZh:
      "秋季学期内无限次 open play 与周五league 参与资格，有效期至 2026 年 12 月。适合只在校一个学期的同学。",
    priceCents: 3000,
    requiresDate: false,
    sortOrder: 2,
  },
  {
    slug: "friday-league-drop-in",
    kind: "LEAGUE_DROPIN" as ProductKind,
    nameEn: "Friday League Drop-In",
    nameZh: "周五league 单次入场",
    descEn:
      "Single-entry pass for one Friday league session. Pick your date at checkout. Included free with any membership.",
    descZh:
      "单次周五league 入场资格。结账时选择日期。任意会员均已包含此项。",
    priceCents: 500,
    requiresDate: true,
    sortOrder: 3,
  },
  {
    slug: "open-play-drop-in",
    kind: "OPENPLAY_DROPIN" as ProductKind,
    nameEn: "Open Play Drop-In",
    nameZh: "Open Play 单次入场",
    descEn:
      "One session of open play. Pick your session date at checkout. Included free with any membership.",
    descZh: "单次 open play 入场。结账时选择日期。任意会员均已包含此项。",
    priceCents: 300,
    requiresDate: true,
    sortOrder: 4,
  },
  {
    slug: "training-session",
    kind: "TRAINING" as ProductKind,
    nameEn: "Coached Training Session",
    nameZh: "教练训练课",
    descEn:
      "Structured coaching with the club's training staff - footwork, multiball, and match play. Sold separately and never included in a membership.",
    descZh:
      "由俱乐部教练组带训的系统课程：步法、多球与实战。单独售卖，不包含在任何会员方案内。",
    priceCents: null as number | null,
    requiresDate: false,
    sortOrder: 5,
  },
];
