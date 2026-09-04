import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { fromISODate, ISO_DATE_RE, isBookable } from "@/lib/dates";
import { isComingSoon, isFreeDuringTrial, weekdaysFor } from "@/lib/catalog";
import { applyPromo } from "@/lib/promos";
import { fulfillOrder } from "@/lib/fulfill";

const bodySchema = z.object({
  slug: z.string().min(1),
  buyerName: z.string().trim().min(1).max(120),
  buyerEmail: z.email().max(200),
  // Asked only for dated day passes, and optional even there.
  skillLevel: z.enum(["BEGINNER", "INTERMEDIATE", "ADVANCED"]).nullish(),
  eventDate: z.string().regex(ISO_DATE_RE).nullish(),
  promoCode: z.string().max(64).nullish(),
});

/**
 * Creates an order. There are no accounts: the buyer identifies themselves here, and the
 * details are taken on trust because nothing about a name or email needs to be trusted -
 * they are for the club's records, not for access control.
 *
 * What the server does still decide for itself is everything that touches money: the price
 * comes from the Product row, the promo code is re-checked here, and the session date must
 * be a night the club actually runs.
 */
export async function POST(request: Request) {
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "badRequest" }, { status: 400 });
  }

  const product = await prisma.product.findUnique({ where: { slug: parsed.data.slug } });
  if (!product?.active) {
    return NextResponse.json({ error: "notFound" }, { status: 404 });
  }
  if (product.priceCents === null) {
    return NextResponse.json({ error: "priceTbd" }, { status: 403 });
  }
  // The membership cards are inert and the product page withholds its buy panel, but this
  // is the only check that actually stops a membership being created during the trial.
  if (isComingSoon(product.kind)) {
    return NextResponse.json({ error: "comingSoon" }, { status: 403 });
  }

  let eventDate: Date | null = null;
  if (product.requiresDate) {
    const iso = parsed.data.eventDate;
    if (!iso || !isBookable(iso, weekdaysFor(product.kind))) {
      return NextResponse.json({ error: "invalidDate" }, { status: 400 });
    }
    eventDate = fromISODate(iso);
  }

  // A drop-in is free for the week, so the price the order is written at is zero rather than
  // the product's listed price - and a promo code against nothing would only put a
  // meaningless discount row in the club's records.
  const trial = isFreeDuringTrial(product.kind);

  // The browser sends a code, never an amount.
  const { amountCents, discountCents, promo } = applyPromo(
    trial ? 0 : product.priceCents,
    trial ? null : parsed.data.promoCode,
  );

  const order = await prisma.order.create({
    data: {
      productId: product.id,
      buyerName: parsed.data.buyerName,
      buyerEmail: parsed.data.buyerEmail.toLowerCase(),
      // A level on a membership would be meaningless, so it is only kept where it is asked.
      skillLevel: product.requiresDate ? (parsed.data.skillLevel ?? null) : null,
      amountCents,
      discountCents,
      promoCode: promo?.code ?? null,
      eventDate,
    },
    select: { id: true },
  });

  // Nothing to charge - either the trial or a code worth the full price - so there is no
  // checkout to visit: the order is fulfilled here and the buyer goes straight to their
  // confirmation. PROMO is the provider for "settled with no processor involved"; the
  // label is what keeps a trial sign-up distinguishable from a redeemed code.
  if (amountCents === 0) {
    await fulfillOrder(
      order.id,
      "PROMO",
      `${trial ? "trial" : "promo"}:${order.id}`,
      trial ? "Free trial (no charge)" : undefined,
    );
    return NextResponse.json({ orderId: order.id, free: true });
  }

  return NextResponse.json({ orderId: order.id, free: false });
}
