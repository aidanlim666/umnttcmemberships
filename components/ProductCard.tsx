import Link from "next/link";
import Image from "next/image";
import { PRODUCT_IMAGE } from "@/lib/productImages";
import { PriceTag } from "@/components/PriceTag";
import { isComingSoon, isFreeDuringTrial } from "@/lib/catalog";
import type { LocalizedProduct } from "@/lib/products";
import { translator, type Lang } from "@/i18n/config";

export function ProductCard({
  product,
  lang,
  featured = false,
}: {
  product: LocalizedProduct;
  lang: Lang;
  featured?: boolean;
}) {
  const t = translator(lang);
  const comingSoon = isComingSoon(product.kind);
  const freeTrial = isFreeDuringTrial(product.kind);
  // The only thing that stops a product being bought now is having no price yet.
  const buyable = product.priceCents !== null;

  const body = (
    <>
      <div className="relative aspect-[4/3] overflow-hidden bg-[linear-gradient(150deg,#fffdf8,#f6ece2)]">
        <Image
          src={PRODUCT_IMAGE[product.kind]}
          alt={product.name}
          fill
          // Two per row on phones, up to four on desktop - keeps the browser from
          // fetching a full-width file for a card that is never wider than ~360px.
          sizes="(min-width: 1024px) 300px, (min-width: 640px) 45vw, 50vw"
          className={`object-cover transition-transform duration-300 ${
            comingSoon ? "grayscale" : "group-hover:scale-105"
          }`}
        />
        <span className="absolute left-2 top-2 flex gap-1">
          {comingSoon ? (
            <span className="chip chip-muted">{t("product.comingSoon")}</span>
          ) : (
            <>
              {featured && <span className="chip chip-maroon">{t("badge.bestValue")}</span>}
              {freeTrial && <span className="chip chip-maroon">{t("trial.free")}</span>}
              {!buyable && <span className="chip chip-muted">{t("product.priceTbd")}</span>}
            </>
          )}
        </span>
      </div>

      <div className="flex flex-1 flex-col gap-1.5 border-t border-[var(--line)] p-2.5 sm:p-3">
        <h3 className="display line-clamp-2 text-[13.5px] font-bold leading-snug sm:text-[15px]">
          {product.name}
        </h3>
        {/* A product may have no description; don't leave a blank line where it would be. */}
        {product.desc && (
          <p className="line-clamp-2 text-[11.5px] leading-relaxed text-[var(--ink-3)]">
            {product.desc}
          </p>
        )}

        <div className="mt-auto flex items-end justify-between gap-2 pt-1.5">
          {/* During the trial a drop-in's listed price is not what anyone pays, so say so
              rather than showing a number the Buy now button will not charge. */}
          {freeTrial ? (
            <span className="display text-base font-extrabold text-[var(--price)]">
              {t("trial.free")}
            </span>
          ) : (
            <PriceTag cents={product.priceCents} tbdLabel={t("product.priceTbd")} />
          )}
          <span
            className={`btn px-3 py-1.5 text-[12px] ${
              comingSoon || !buyable ? "btn-ghost opacity-70" : "btn-primary"
            }`}
          >
            {comingSoon
              ? t("product.comingSoon")
              : buyable
                ? t("product.buy")
                : t("product.viewDetails")}
          </span>
        </div>
      </div>
    </>
  );

  // Memberships are not on sale during the trial, so the card is a flat panel rather than a
  // link - there is no product page worth opening while nothing on it can be bought.
  if (comingSoon) {
    return (
      <div
        aria-disabled="true"
        className="card flex cursor-not-allowed flex-col overflow-hidden opacity-60 grayscale"
      >
        {body}
      </div>
    );
  }

  return (
    <Link
      href={`/products/${product.slug}`}
      className="card card-hover focus-ring group flex flex-col overflow-hidden"
    >
      {body}
    </Link>
  );
}
