import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { applyPromo } from "@/lib/promos";

const schema = z.object({ slug: z.string().min(1), code: z.string().min(1).max(64) });

/**
 * Previews a code against a specific product so the buyer sees the real total before
 * committing. This is only a preview - the order API re-checks the code and recomputes
 * the price itself, so a forged response here buys nothing.
 */
export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "badRequest" }, { status: 400 });

  const product = await prisma.product.findUnique({
    where: { slug: parsed.data.slug },
    select: { priceCents: true, active: true },
  });
  if (!product?.active || product.priceCents === null) {
    return NextResponse.json({ error: "notFound" }, { status: 404 });
  }

  const { amountCents, discountCents, promo } = applyPromo(
    product.priceCents,
    parsed.data.code,
  );
  if (!promo) return NextResponse.json({ valid: false });

  return NextResponse.json({
    valid: true,
    code: promo.code,
    percentOff: promo.percentOff,
    labelEn: promo.labelEn,
    labelZh: promo.labelZh,
    amountCents,
    discountCents,
  });
}
