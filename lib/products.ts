import { prisma } from "@/lib/db";
import type { Lang } from "@/i18n/config";
import type { Product } from "@/lib/generated/prisma/client";

export type LocalizedProduct = {
  id: string;
  slug: string;
  kind: Product["kind"];
  name: string;
  desc: string;
  priceCents: number | null;
  requiresDate: boolean;
  active: boolean;
  sortOrder: number;
};

/** Product copy is stored as paired columns, so localising is a column pick, not a lookup. */
export function localize(p: Product, lang: Lang): LocalizedProduct {
  return {
    id: p.id,
    slug: p.slug,
    kind: p.kind,
    name: lang === "zh" ? p.nameZh : p.nameEn,
    desc: lang === "zh" ? p.descZh : p.descEn,
    priceCents: p.priceCents,
    requiresDate: p.requiresDate,
    active: p.active,
    sortOrder: p.sortOrder,
  };
}

export async function listProducts(lang: Lang): Promise<LocalizedProduct[]> {
  const rows = await prisma.product.findMany({
    where: { active: true },
    orderBy: { sortOrder: "asc" },
  });
  return rows.map((p) => localize(p, lang));
}

export async function getProductBySlug(slug: string, lang: Lang) {
  const row = await prisma.product.findUnique({ where: { slug } });
  return row ? { raw: row, view: localize(row, lang) } : null;
}

export const CATEGORY_OF: Record<Product["kind"], "memberships" | "dropins" | "training"> = {
  YEAR_MEMBERSHIP: "memberships",
  FALL_MEMBERSHIP: "memberships",
  LEAGUE_DROPIN: "dropins",
  OPENPLAY_DROPIN: "dropins",
  TRAINING: "training",
};
