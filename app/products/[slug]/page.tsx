import { notFound } from "next/navigation";
import Link from "next/link";
import { getT } from "@/i18n/server";
import { getProductBySlug, CATEGORY_OF } from "@/lib/products";
import { weekdaysFor } from "@/lib/catalog";
import Image from "next/image";
import { PRODUCT_IMAGE } from "@/lib/productImages";
import { PriceTag } from "@/components/PriceTag";
import { formatUsd } from "@/lib/money";
import { BuyPanel } from "@/components/BuyPanel";
import type { ProductKind } from "@/lib/generated/prisma/enums";
import type { TranslateKey } from "@/i18n/config";

/**
 * "What you get" is per product, not per category: a drop-in buys one session, whereas a
 * membership buys the whole season.
 */
const PERKS_BY_KIND = {
  YEAR_MEMBERSHIP: ["home.perk1", "home.perk2", "home.perk4"],
  FALL_MEMBERSHIP: ["home.perk1", "home.perk2", "home.perk4"],
  LEAGUE_DROPIN: ["perk.oneTimeLeague"],
  OPENPLAY_DROPIN: ["perk.oneTimeOpenPlay"],
  TRAINING: ["home.perk3", "home.perk4"],
} as const satisfies Record<ProductKind, readonly TranslateKey[]>;

export default async function ProductPage({ params }: PageProps<"/products/[slug]">) {
  const { slug } = await params;
  const { lang, t } = await getT();

  const found = await getProductBySlug(slug, lang);
  if (!found || !found.view.active) notFound();

  const { view } = found;
  const category = CATEGORY_OF[view.kind];

  const perks = PERKS_BY_KIND[view.kind];

  return (
    <div className="mx-auto max-w-6xl px-3 pb-24 pt-3 sm:px-5 sm:pt-5 lg:pb-8">
      <nav className="mb-3 text-[12px] font-semibold text-[var(--ink-2)]">
        <Link href="/" className="focus-ring rounded hover:text-[var(--maroon)]">
          {t("nav.shop")}
        </Link>
        <span className="px-1.5">/</span>
        <span className="text-[var(--ink-2)]">{t(`cat.${category}` as const)}</span>
      </nav>

      <div className="grid grid-flow-dense gap-3 lg:grid-cols-[minmax(0,1fr)_360px] lg:gap-5">
        {/* ------------------------------------------------ Left: the product */}
        <div className="order-1 space-y-3">
          <div className="card overflow-hidden">
            <div className="relative aspect-[16/10] bg-[linear-gradient(150deg,#fffdf8,#f6ece2)] sm:aspect-[16/8]">
              <Image
                src={PRODUCT_IMAGE[view.kind]}
                alt={view.name}
                fill
                sizes="(min-width: 1024px) 720px, 100vw"
                priority
                className="object-cover"
              />
            </div>
          </div>

          <div className="card p-4 sm:p-5">
            <div className="flex flex-wrap items-center gap-1.5">
              {view.kind === "YEAR_MEMBERSHIP" && (
                <span className="chip chip-maroon">{t("badge.bestValue")}</span>
              )}
              {view.requiresDate && <span className="coupon">{t("product.selectDate")}</span>}
            </div>

            <h1 className="display mt-2 text-[1.4rem] font-extrabold leading-tight sm:text-[1.75rem]">
              {view.name}
            </h1>
            <p className="mt-2 text-[13.5px] leading-relaxed text-[var(--ink-2)]">{view.desc}</p>

            <h2 className="display mt-5 text-[13px] font-bold text-[var(--ink-2)]">
              {t("product.whatsIncluded")}
            </h2>
            <ul className="mt-2 grid gap-1.5 sm:grid-cols-2">
              {perks.map((k) => (
                <li
                  key={k}
                  className="flex items-center gap-2 rounded-lg bg-[var(--surface-warm)] px-3 py-2 text-[12.5px] font-semibold text-[var(--ink-2)]"
                >
                  <span className="grid h-4 w-4 shrink-0 place-items-center rounded-full bg-[var(--maroon)] text-[9px] text-white">
                    ✓
                  </span>
                  {t(k)}
                </li>
              ))}
            </ul>

          </div>
        </div>

        {/* ------------------------------------------- Right: price + purchase */}
        <aside className="order-2 lg:sticky lg:top-28 lg:self-start">
          <div className="card space-y-3 p-4">
            <div className="flex items-end justify-between gap-2 border-b border-[var(--line)] pb-3">
              <div>
                <p className="text-[11.5px] font-semibold text-[var(--ink-3)]">
                  {t("product.from")}
                </p>
                <PriceTag cents={view.priceCents} tbdLabel={t("product.priceTbd")} size="lg" />
              </div>
              <span className="chip chip-muted">{t(`cat.${category}` as const)}</span>
            </div>

            <BuyPanel
              slug={view.slug}
              requiresDate={view.requiresDate}
              purchasable={view.priceCents !== null}
              allowedWeekdays={weekdaysFor(view.kind)}
              priceLabel={
                view.priceCents === null
                  ? t("product.priceTbd")
                  : formatUsd(view.priceCents)
              }
            />

            <p className="text-[11px] leading-relaxed text-[var(--ink-3)]">
              {t("checkout.securedBy")}
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}
