import type { MembershipTier, ProductKind } from "@/lib/generated/prisma/enums";

/**
 * The club sells a fall membership and a full-year membership as alternatives, not as a
 * tier — a fall member is not currently allowed to pay the difference and upgrade.
 * Flip this to true if the club decides to offer upgrades; nothing else needs to change.
 */
export const ALLOW_UPGRADE = false;

export type EligibilityReason =
  | "ok"
  | "priceTbd"
  | "inactive"
  | "alreadyMember"
  | "includedInMembership";

export type Eligibility = { allowed: boolean; reason: EligibilityReason };

export type ActiveMembership = { tier: MembershipTier; endsAt: Date };

export type EligibilityProduct = {
  kind: ProductKind;
  priceCents: number | null;
  active: boolean;
};

/** The membership that is currently in force, preferring the longer-running one. */
export function currentMembership(
  memberships: ActiveMembership[],
  now: Date = new Date(),
): ActiveMembership | null {
  const active = memberships.filter((m) => m.endsAt.getTime() >= now.getTime());
  if (active.length === 0) return null;
  return active.sort((a, b) => b.endsAt.getTime() - a.endsAt.getTime())[0];
}

/**
 * Single source of truth for "can this user buy this product right now".
 * Used by the UI to disable and explain, and by the order API to enforce — never
 * trust the UI check alone.
 */
export function checkEligibility(
  memberships: ActiveMembership[],
  product: EligibilityProduct,
  now: Date = new Date(),
): Eligibility {
  if (!product.active) return { allowed: false, reason: "inactive" };
  if (product.priceCents === null) return { allowed: false, reason: "priceTbd" };

  // Training is coaching time, not court access — a membership never covers it.
  if (product.kind === "TRAINING") return { allowed: true, reason: "ok" };

  const held = currentMembership(memberships, now);
  if (!held) return { allowed: true, reason: "ok" };

  const buyingMembership =
    product.kind === "YEAR_MEMBERSHIP" || product.kind === "FALL_MEMBERSHIP";

  if (buyingMembership) {
    if (ALLOW_UPGRADE && held.tier === "FALL" && product.kind === "YEAR_MEMBERSHIP") {
      return { allowed: true, reason: "ok" };
    }
    return { allowed: false, reason: "alreadyMember" };
  }

  // Drop-ins: both membership tiers already include open play and Friday league.
  return { allowed: false, reason: "includedInMembership" };
}
