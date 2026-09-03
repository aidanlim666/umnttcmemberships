"use client";

import { useMemo, useState } from "react";
import { useLang } from "@/i18n/LangProvider";
import { minBookableISO, toISODate } from "@/lib/dates";

function startOfMonth(iso: string) {
  const [y, m] = iso.split("-").map(Number);
  return { year: y, month: m - 1 };
}

/**
 * Compact month grid for choosing a drop-in session date. No dependency, no popover
 * library — it is always visible on the product page so the choice is impossible to miss.
 */
export function DatePicker({
  value,
  onChange,
  allowedWeekdays = null,
}: {
  value: string | null;
  onChange: (iso: string) => void;
  /** JS weekday numbers the club runs this session on; null means any day. */
  allowedWeekdays?: readonly number[] | null;
}) {
  const { t, lang } = useLang();
  const minISO = useMemo(() => minBookableISO(), []);
  const floor = startOfMonth(minISO);

  const initial = value ? startOfMonth(value) : floor;
  const [cursor, setCursor] = useState(initial);

  const months = t("cal.months").split(",");
  const dayNames = t("cal.days").split(",");

  const first = new Date(cursor.year, cursor.month, 1);
  const daysInMonth = new Date(cursor.year, cursor.month + 1, 0).getDate();
  const leading = first.getDay();

  const atFloor = cursor.year === floor.year && cursor.month === floor.month;

  function shift(delta: number) {
    const d = new Date(cursor.year, cursor.month + delta, 1);
    setCursor({ year: d.getFullYear(), month: d.getMonth() });
  }

  const monthLabel =
    lang === "zh"
      ? `${cursor.year} 年 ${months[cursor.month]}`
      : `${months[cursor.month]} ${cursor.year}`;

  return (
    <div className="card p-3">
      <div className="mb-2 flex items-center justify-between">
        <button
          type="button"
          onClick={() => shift(-1)}
          disabled={atFloor}
          aria-label={t("cal.prev")}
          className="focus-ring grid h-7 w-7 place-items-center rounded-full border border-[var(--line)] text-[var(--ink-2)] disabled:opacity-30"
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" aria-hidden>
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>

        <span className="display num text-[13.5px] font-bold">{monthLabel}</span>

        <button
          type="button"
          onClick={() => shift(1)}
          aria-label={t("cal.next")}
          className="focus-ring grid h-7 w-7 place-items-center rounded-full border border-[var(--line)] text-[var(--ink-2)]"
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" aria-hidden>
            <path d="M9 6l6 6-6 6" />
          </svg>
        </button>
      </div>

      <div className="grid grid-cols-7 gap-0.5 text-center text-[10.5px] font-bold text-[var(--ink-3)]">
        {dayNames.map((d) => (
          <span key={d} className="py-1">
            {d}
          </span>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-0.5">
        {Array.from({ length: leading }).map((_, i) => (
          <span key={`pad-${i}`} />
        ))}

        {Array.from({ length: daysInMonth }).map((_, i) => {
          const day = i + 1;
          const date = new Date(cursor.year, cursor.month, day);
          const iso = toISODate(date);
          const runsToday = !allowedWeekdays || allowedWeekdays.includes(date.getDay());
          const disabled = iso < minISO || !runsToday;
          const selected = value === iso;

          return (
            <button
              key={iso}
              type="button"
              disabled={disabled}
              aria-pressed={selected}
              onClick={() => onChange(iso)}
              className={[
                "num focus-ring aspect-square rounded-lg text-[12.5px] font-semibold transition-colors",
                selected
                  ? "bg-[var(--maroon)] text-white shadow-[0_2px_6px_rgba(122,0,25,0.3)]"
                  : disabled
                    ? "text-[var(--line-strong)]"
                    : // Session nights are highlighted so the handful of live dates are
                      // obvious against a month of greyed-out ones.
                      "bg-[var(--gold-wash)] text-[var(--maroon)] ring-1 ring-inset ring-[#f2dca5] hover:bg-[var(--gold)] hover:text-[var(--maroon-deep)]",
              ].join(" ")}
            >
              {day}
            </button>
          );
        })}
      </div>
    </div>
  );
}
