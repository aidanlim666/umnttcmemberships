import type { ProductKind } from "@/lib/generated/prisma/enums";

/**
 * Product photography lives in public/products, keyed by kind rather than slug so that
 * TypeScript forces a picture to exist for every kind - the same reason CATEGORY_OF in
 * lib/products.ts is keyed that way. Each file is a 1600x1067 (3:2) master: that sits
 * between the 4:3 card and the 16:8 detail hero, so object-cover crops modestly in both.
 */
export const PRODUCT_IMAGE: Record<ProductKind, string> = {
  YEAR_MEMBERSHIP: "/products/full-year-membership.webp",
  FALL_MEMBERSHIP: "/products/fall-semester-membership.webp",
  LEAGUE_DROPIN: "/products/friday-league-drop-in.webp",
  OPENPLAY_DROPIN: "/products/open-play-drop-in.webp",
  TRAINING: "/products/training-session.webp",
};
