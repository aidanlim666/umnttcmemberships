"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useLang } from "@/i18n/LangProvider";
import { DatePicker } from "@/components/DatePicker";
import { formatUsd } from "@/lib/money";

const DATE_SECTION_ID = "choose-session-date";

const LEVELS = ["BEGINNER", "INTERMEDIATE", "ADVANCED"] as const;
type Level = (typeof LEVELS)[number];

const LEVEL_KEY = {
  BEGINNER: "buyer.levelBeginner",
  INTERMEDIATE: "buyer.levelIntermediate",
  ADVANCED: "buyer.levelAdvanced",
} as const;

export function BuyPanel({
  slug,
  requiresDate,
  purchasable,
  priceLabel,
  allowedWeekdays = null,
}: {
  slug: string;
  requiresDate: boolean;
  /** False only when the product has no price yet. */
  purchasable: boolean;
  priceLabel: string;
  allowedWeekdays?: readonly number[] | null;
}) {
  const { t } = useLang();
  const router = useRouter();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [level, setLevel] = useState<Level | "">("");
  const [date, setDate] = useState<string | null>(null);
  const [promo, setPromo] = useState<AppliedPromo | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!purchasable) {
    return (
      <div className="rounded-xl border border-[#f2dca5] bg-[var(--gold-wash)] px-4 py-3 text-center text-[13px] font-bold text-[#7a5200]">
        {t("product.priceTbd")}
      </div>
    );
  }

  const missingDetails = !name.trim() || !email.trim();
  const missingDate = requiresDate && !date;
  const blocked = missingDetails || missingDate;

  async function buy() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          slug,
          buyerName: name.trim(),
          buyerEmail: email.trim(),
          skillLevel: level || null,
          eventDate: date,
          promoCode: promo?.code ?? null,
        }),
      });
      if (!res.ok) {
        setError(t("buyer.error"));
        return;
      }
      const { orderId, free } = (await res.json()) as { orderId: string; free: boolean };
      // A full-value code leaves nothing to pay, so there is no checkout to visit.
      router.push(free ? `/checkout/${orderId}/success` : `/checkout/${orderId}`);
      router.refresh();
    } catch {
      setError(t("buyer.error"));
    } finally {
      setBusy(false);
    }
  }

  const buttonLabel = missingDetails
    ? t("buyer.needDetails")
    : missingDate
      ? t("product.dateRequired")
      : t("product.buy");

  return (
    <div className="space-y-3">
      <div className="space-y-2.5">
        <label className="block">
          <span className="mb-1 block text-[12.5px] font-bold">{t("buyer.name")}</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoComplete="name"
            className="field"
          />
        </label>

        <label className="block">
          <span className="mb-1 block text-[12.5px] font-bold">{t("buyer.email")}</span>
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            type="email"
            autoComplete="email"
            className="field"
          />
          <span className="mt-1 block text-[11px] text-[var(--ink-3)]">{t("buyer.emailHint")}</span>
        </label>

        {/* Only dated day passes ask this — it exists to place a new player in the right group. */}
        {requiresDate && (
          <fieldset className="block border-0 p-0">
            <legend className="mb-1.5 block text-[12.5px] font-bold">{t("buyer.level")}</legend>
            <div className="grid grid-cols-3 gap-1.5">
              {LEVELS.map((l) => (
                <button
                  key={l}
                  type="button"
                  aria-pressed={level === l}
                  onClick={() => setLevel(level === l ? "" : l)}
                  className={[
                    "focus-ring rounded-lg border px-2 py-1.5 text-[12px] font-semibold transition-colors",
                    level === l
                      ? "border-[var(--maroon)] bg-[var(--maroon)] text-white"
                      : "border-[var(--line-strong)] bg-white text-[var(--ink-2)] hover:bg-[var(--gold-wash)]",
                  ].join(" ")}
                >
                  {t(LEVEL_KEY[l])}
                </button>
              ))}
            </div>
          </fieldset>
        )}
      </div>

      {requiresDate && (
        <DateSection date={date} setDate={setDate} allowedWeekdays={allowedWeekdays} />
      )}

      <PromoField slug={slug} applied={promo} onChange={setPromo} />

      {error && (
        <p className="rounded-lg bg-[#fff1f1] px-3 py-2 text-[12.5px] font-semibold text-[var(--price-deep)]">
          {error}
        </p>
      )}

      <button
        type="button"
        onClick={buy}
        disabled={busy || blocked}
        className="btn btn-primary w-full py-3 text-[15px]"
      >
        {buttonLabel}
      </button>

      {/* Mirrors the inline button exactly, so the bar never promises an action the page
          cannot deliver — the form sits directly above it either way. */}
      <StickyBar priceLabel={promo ? formatUsd(promo.amountCents) : priceLabel}>
        <button
          type="button"
          onClick={buy}
          disabled={busy || blocked}
          className="btn btn-primary px-6 py-2.5 text-[14px]"
        >
          {buttonLabel}
        </button>
      </StickyBar>
    </div>
  );
}

/**
 * The always-visible price + action bar that Chinese commerce apps put at the bottom of
 * every product page. Mobile only — on desktop the purchase card is already pinned.
 */
function StickyBar({
  priceLabel,
  children,
}: {
  priceLabel: string;
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-30 flex items-center gap-3 border-t border-[var(--line)] bg-[var(--surface)]/95 px-4 py-2.5 backdrop-blur lg:hidden">
      <span className="num display text-xl font-extrabold text-[var(--price)]">{priceLabel}</span>
      <span className="ml-auto">{children}</span>
    </div>
  );
}

export type AppliedPromo = {
  code: string;
  labelEn: string;
  labelZh: string;
  amountCents: number;
  discountCents: number;
};

/**
 * Promo code entry. The preview it shows comes from the server; the order API checks the
 * code again and recomputes the price, so this is convenience, not the security boundary.
 */
function PromoField({
  slug,
  applied,
  onChange,
}: {
  slug: string;
  applied: AppliedPromo | null;
  onChange: (promo: AppliedPromo | null) => void;
}) {
  const { t, lang } = useLang();
  const [code, setCode] = useState("");
  const [checking, setChecking] = useState(false);
  const [invalid, setInvalid] = useState(false);

  async function apply() {
    const trimmed = code.trim();
    if (!trimmed) return;

    setChecking(true);
    setInvalid(false);
    try {
      const res = await fetch("/api/promos/validate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ slug, code: trimmed }),
      });
      const data = res.ok ? await res.json() : { valid: false };
      if (!data.valid) {
        setInvalid(true);
        return;
      }
      onChange(data as AppliedPromo);
      setCode("");
    } catch {
      setInvalid(true);
    } finally {
      setChecking(false);
    }
  }

  if (applied) {
    const free = applied.amountCents === 0;
    return (
      <div className="rounded-xl border border-[#f2dca5] bg-[var(--gold-wash)] px-3 py-2.5">
        <div className="flex items-center gap-2">
          <span className="coupon">{applied.code}</span>
          <span className="text-[12px] font-bold text-[#7a5200]">
            {lang === "zh" ? applied.labelZh : applied.labelEn}
          </span>
          <button
            type="button"
            onClick={() => onChange(null)}
            className="focus-ring ml-auto rounded text-[11.5px] font-semibold text-[var(--ink-3)] underline hover:text-[var(--ink-2)]"
          >
            {t("promo.remove")}
          </button>
        </div>
        <p className="num mt-1.5 text-[12.5px] font-bold text-[#7a5200]">
          {free ? t("promo.free") : `${t("promo.youPay")} ${formatUsd(applied.amountCents)}`}
        </p>
      </div>
    );
  }

  return (
    <div>
      <label className="mb-1 block text-[12px] font-bold text-[var(--ink-2)]" htmlFor="promo">
        {t("promo.label")}
      </label>
      <div className="flex gap-2">
        <input
          id="promo"
          value={code}
          onChange={(e) => {
            setCode(e.target.value);
            setInvalid(false);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              void apply();
            }
          }}
          placeholder={t("promo.placeholder")}
          autoCapitalize="characters"
          autoComplete="off"
          spellCheck={false}
          className="field flex-1 py-2 text-[13px] uppercase"
        />
        <button
          type="button"
          onClick={apply}
          disabled={checking || !code.trim()}
          className="btn btn-ghost px-4 py-2 text-[13px]"
        >
          {t("promo.apply")}
        </button>
      </div>
      {invalid && (
        <p className="mt-1.5 text-[11.5px] font-semibold text-[var(--price-deep)]">
          {t("promo.invalid")}
        </p>
      )}
    </div>
  );
}

function DateSection({
  date,
  setDate,
  allowedWeekdays,
}: {
  date: string | null;
  setDate: (iso: string) => void;
  allowedWeekdays: readonly number[] | null;
}) {
  const { t, lang } = useLang();
  const pretty = date
    ? new Intl.DateTimeFormat(lang === "zh" ? "zh-CN" : "en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
        weekday: "short",
      }).format(new Date(`${date}T12:00:00`))
    : null;

  return (
    <div id={DATE_SECTION_ID} className="scroll-mt-28 space-y-2">
      <h3 className="display text-[13.5px] font-bold">{t("product.selectDate")}</h3>
      <DatePicker value={date} onChange={setDate} allowedWeekdays={allowedWeekdays} />
      {pretty && (
        <p className="num rounded-lg bg-[var(--gold-wash)] px-3 py-2 text-[12.5px] font-bold text-[#7a5200]">
          {t("product.selected")}: {pretty}
        </p>
      )}
    </div>
  );
}
