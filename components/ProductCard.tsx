import Link from "next/link";
import { Logo } from "@/components/Logo";
import { PriceTag } from "@/components/PriceTag";
import type { LocalizedProduct } from "@/lib/products";
import type { Eligibility } from "@/lib/eligibility";
import { translator, type Lang } from "@/i18n/config";

/** Short status ribbon shown over the thumbnail when a product is not buyable. */
function statusChip(reason: Eligibility["reason"], t: ReturnType<typeof translator>) {
  switch (reason) {
    case "includedInMembership":
      return <span className="chip chip-gold">{t("badge.includedShort")}</span>;
    case "alreadyMember":
      return <span className="chip chip-gold">{t("badge.owned")}</span>;
    case "priceTbd":
      return <span className="chip chip-muted">{t("product.priceTbd")}</span>;
    default:
      return null;
  }
}

export function ProductCard({
  product,
  eligibility,
  lang,
  featured = false,
}: {
  product: LocalizedProduct;
  eligibility: Eligibility;
  lang: Lang;
  featured?: boolean;
}) {
  const t = translator(lang);
  const chip = statusChip(eligibility.reason, t);

  return (
    <Link
      href={`/products/${product.slug}`}
      className="card card-hover focus-ring group flex flex-col overflow-hidden"
    >
      <div className="relative aspect-[4/3] bg-[linear-gradient(150deg,#fffdf8,#f6ece2)]">
        <span className="absolute inset-0 grid place-items-center p-4">
          <Logo size={featured ? 118 : 96} className="drop-shadow-sm transition-transform duration-300 group-hover:scale-105" />
        </span>
        <span className="absolute left-2 top-2 flex gap-1">
          {featured && <span className="chip chip-maroon">{t("badge.bestValue")}</span>}
          {chip}
        </span>
      </div>

      <div className="flex flex-1 flex-col gap-1.5 border-t border-[var(--line)] p-2.5 sm:p-3">
        <h3 className="display line-clamp-2 text-[13.5px] font-bold leading-snug sm:text-[15px]">
          {product.name}
        </h3>
        <p className="line-clamp-2 text-[11.5px] leading-relaxed text-[var(--ink-3)]">
          {product.desc}
        </p>

        <div className="mt-auto flex items-end justify-between gap-2 pt-1.5">
          <PriceTag cents={product.priceCents} tbdLabel={t("product.priceTbd")} />
          <span
            className={`btn px-3 py-1.5 text-[12px] ${
              eligibility.allowed ? "btn-primary" : "btn-ghost opacity-70"
            }`}
          >
            {eligibility.allowed ? t("product.buy") : t("product.viewDetails")}
          </span>
        </div>
      </div>
    </Link>
  );
}
