import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getViewerId } from "@/lib/session";
import { checkEligibility } from "@/lib/eligibility";
import { fromISODate, ISO_DATE_RE, isBookable } from "@/lib/dates";
import { weekdaysFor } from "@/lib/catalog";
import { applyPromo } from "@/lib/promos";
import { fulfillOrder } from "@/lib/fulfill";

const bodySchema = z.object({
  slug: z.string().min(1),
  eventDate: z.string().regex(ISO_DATE_RE).nullish(),
  promoCode: z.string().max(64).nullish(),
});

export async function POST(request: Request) {
  const userId = await getViewerId();
  if (!userId) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "badRequest" }, { status: 400 });
  }

  const product = await prisma.product.findUnique({ where: { slug: parsed.data.slug } });
  if (!product) {
    return NextResponse.json({ error: "notFound" }, { status: 404 });
  }

  // The UI already disables ineligible products; this is the check that actually counts.
  const memberships = await prisma.membership.findMany({
    where: { userId },
    select: { tier: true, endsAt: true },
  });
  const eligibility = checkEligibility(memberships, product);
  if (!eligibility.allowed || product.priceCents === null) {
    return NextResponse.json({ error: eligibility.reason }, { status: 403 });
  }

  let eventDate: Date | null = null;
  if (product.requiresDate) {
    const iso = parsed.data.eventDate;
    if (!iso || !isBookable(iso, weekdaysFor(product.kind))) {
      return NextResponse.json({ error: "invalidDate" }, { status: 400 });
    }
    eventDate = fromISODate(iso);
  }

  // The code is re-checked here against the product's own price. The browser sends a
  // code, never an amount, so a tampered preview response cannot discount anything.
  const { amountCents, discountCents, promo } = applyPromo(
    product.priceCents,
    parsed.data.promoCode,
  );

  const order = await prisma.order.create({
    data: {
      userId,
      productId: product.id,
      amountCents,
      discountCents,
      promoCode: promo?.code ?? null,
      eventDate,
    },
    select: { id: true },
  });

  // A code worth the full price leaves nothing to charge, so there is no processor to
  // send them to — grant it here and send them straight to the confirmation.
  if (amountCents === 0) {
    await fulfillOrder(order.id, "PROMO", `promo:${order.id}`);
    return NextResponse.json({ orderId: order.id, free: true });
  }

  return NextResponse.json({ orderId: order.id, free: false });
}
