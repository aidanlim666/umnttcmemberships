import { formatUsd } from "@/lib/money";

/** Big red price with tabular figures — the anchor of every commerce card. */
export function PriceTag({
  cents,
  tbdLabel,
  size = "md",
}: {
  cents: number | null;
  tbdLabel: string;
  size?: "sm" | "md" | "lg";
}) {
  if (cents === null) {
    return (
      <span className={`display font-extrabold text-[var(--ink-3)] ${
        size === "lg" ? "text-xl" : size === "md" ? "text-base" : "text-sm"
      }`}>
        {tbdLabel}
      </span>
    );
  }

  const whole = Math.floor(cents / 100);
  const frac = cents % 100;
  const bigCls = size === "lg" ? "text-[2.6rem]" : size === "md" ? "text-2xl" : "text-lg";

  return (
    <span className="num display inline-flex items-baseline font-extrabold text-[var(--price)]">
      <span className={size === "lg" ? "text-lg" : "text-xs"}>$</span>
      <span className={`${bigCls} leading-none tracking-tight`}>{whole}</span>
      {frac > 0 && (
        <span className={size === "lg" ? "text-lg" : "text-xs"}>
          .{String(frac).padStart(2, "0")}
        </span>
      )}
      <span className="sr-only">{formatUsd(cents)}</span>
    </span>
  );
}
