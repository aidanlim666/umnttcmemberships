/**
 * Drop-in dates are calendar days, not instants. They travel as "YYYY-MM-DD" strings so
 * that a member in Minneapolis and a server in UTC always agree on which day was picked.
 */

export function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function fromISODate(s: string): Date {
  const [y, m, d] = s.split("-").map(Number);
  // Noon UTC keeps the date stable across every US timezone when re-read.
  return new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
}

export const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/** The club's season opens on 1 September 2026; nothing earlier can be booked. */
export const SEASON_START_ISO = "2026-09-01";

/** Sessions cannot be booked in the past, nor before the season opens. */
export function minBookableISO(today: Date = new Date()): string {
  const t = toISODate(today);
  return t > SEASON_START_ISO ? t : SEASON_START_ISO;
}

/** The JS weekday (0 = Sunday) for an ISO date, read in UTC to match `fromISODate`. */
export function weekdayOf(iso: string): number {
  return fromISODate(iso).getUTCDay();
}

export function isBookable(
  iso: string,
  allowedWeekdays: readonly number[] | null = null,
  today: Date = new Date(),
): boolean {
  if (!ISO_DATE_RE.test(iso)) return false;
  if (iso < minBookableISO(today)) return false;
  // A drop-in can only be bought for a night the club actually runs.
  if (allowedWeekdays && !allowedWeekdays.includes(weekdayOf(iso))) return false;
  return true;
}

export function formatEventDate(d: Date, lang: "en" | "zh"): string {
  return new Intl.DateTimeFormat(lang === "zh" ? "zh-CN" : "en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "short",
    timeZone: "UTC",
  }).format(d);
}
