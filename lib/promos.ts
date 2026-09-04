/**
 * Promo codes.
 *
 * Kept as a small in-code registry rather than a database table: the club runs a handful
 * of codes a season, and a code is a decision an officer makes, not data members create.
 * Add an entry here and it works everywhere - the product page preview and the order API
 * read the same list.
 */

export type Promo = {
  code: string;
  /** Whole percent off, 1–100. */
  percentOff: number;
  /** Shown to whoever applies it, so a test code is never mistaken for a real discount. */
  labelEn: string;
  labelZh: string;
  /**
   * Off in production unless ENABLE_TEST_PROMO=true. A 100%-off code on a public site is
   * free memberships for anyone who guesses or is told it, so it must not ship live by
   * accident - flip the env var when you deliberately want to test against production.
   */
  devOnly?: boolean;
};

const ALL_PROMOS: Promo[] = [
  {
    code: "TESTINGTESTING",
    percentOff: 100,
    labelEn: "Test code - 100% off",
    labelZh: "测试码 - 100% 折扣",
    devOnly: true,
  },
];

function activePromos(): Promo[] {
  const allowTest =
    process.env.NODE_ENV !== "production" || process.env.ENABLE_TEST_PROMO === "true";
  return ALL_PROMOS.filter((p) => !p.devOnly || allowTest);
}

/** Codes are matched case-insensitively and ignore surrounding whitespace. */
export function findPromo(input: string | null | undefined): Promo | null {
  if (!input) return null;
  const normalised = input.trim().toUpperCase();
  if (!normalised) return null;
  return activePromos().find((p) => p.code === normalised) ?? null;
}

export type Priced = { amountCents: number; discountCents: number; promo: Promo | null };

/**
 * Works out what a member actually pays. Always computed on the server from the product's
 * own price - the browser sends a code, never an amount.
 */
export function applyPromo(priceCents: number, input?: string | null): Priced {
  const promo = findPromo(input);
  if (!promo) return { amountCents: priceCents, discountCents: 0, promo: null };

  // Round the discount down so rounding can never push a total below zero.
  const discountCents = Math.min(
    priceCents,
    Math.floor((priceCents * promo.percentOff) / 100),
  );
  return { amountCents: priceCents - discountCents, discountCents, promo };
}
