import { prisma } from "@/lib/db";
import { appendMembership, appendPurchase } from "@/lib/sheets";
import { membershipWindow, tierForKind } from "@/lib/catalog";
import type { MembershipTier, PaymentProvider } from "@/lib/generated/prisma/enums";

const PROVIDER_LABEL: Record<PaymentProvider, string> = {
  PAYPAL: "PayPal / Venmo",
  STRIPE: "Apple Pay / Card",
  PROMO: "Promo code (no charge)",
};

export type FulfillResult =
  | { status: "fulfilled"; orderId: string }
  | { status: "alreadyFulfilled"; orderId: string }
  | { status: "unknownOrder" };

/**
 * Turns a captured payment into a real entitlement, exactly once.
 *
 * Both the browser's capture call and the provider's webhook race to call this for the
 * same payment. The `fulfilledAt` guard inside the transaction means whichever arrives
 * second is a no-op — so a member can never be granted two memberships, and the
 * spreadsheet can never gain a duplicate row.
 */
export async function fulfillOrder(
  orderId: string,
  provider: PaymentProvider,
  providerRef: string,
): Promise<FulfillResult> {
  const outcome = await prisma.$transaction(async (tx) => {
    const order = await tx.order.findUnique({
      where: { id: orderId },
      include: { product: true },
    });
    if (!order) return { kind: "unknown" as const };

    if (order.fulfilledAt) return { kind: "already" as const, order };

    await tx.order.update({
      where: { id: order.id },
      data: { status: "PAID", provider, providerRef, fulfilledAt: new Date() },
    });

    const tier = tierForKind(order.product.kind);
    let membership: { tier: MembershipTier; endsAt: Date } | null = null;
    if (tier) {
      const { startsAt, endsAt } = membershipWindow(tier);
      await tx.membership.create({
        data: { tier, startsAt, endsAt, orderId: order.id },
      });
      membership = { tier, endsAt };
    }

    return { kind: "fulfilled" as const, order, membership };
  });

  if (outcome.kind === "unknown") return { status: "unknownOrder" };
  if (outcome.kind === "already") {
    return { status: "alreadyFulfilled", orderId: outcome.order.id };
  }

  // The buyer named themselves at purchase; there is no account to look up.
  const buyerName = outcome.order.buyerName;
  const buyerEmail = outcome.order.buyerEmail;

  // Outside the transaction: a slow or failing Sheets call must not roll back the sale.
  // A membership lands on two tabs — the ledger, and its own roster.
  if (outcome.membership) {
    await appendMembership({
      tier: outcome.membership.tier,
      purchasedAt: new Date(),
      name: buyerName,
      email: buyerEmail,
      endsAt: outcome.membership.endsAt,
      amountCents: outcome.order.amountCents,
      promoCode: outcome.order.promoCode,
      orderId: outcome.order.id,
    });
  }

  await appendPurchase({
    purchasedAt: new Date(),
    name: buyerName,
    email: buyerEmail,
    productName: outcome.order.product.nameEn,
    amountCents: outcome.order.amountCents,
    eventDate: outcome.order.eventDate,
    skillLevel: outcome.order.skillLevel,
    orderId: outcome.order.id,
    paymentMethod: PROVIDER_LABEL[provider],
    promoCode: outcome.order.promoCode,
  });

  return { status: "fulfilled", orderId: outcome.order.id };
}
