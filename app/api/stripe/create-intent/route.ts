import { NextResponse } from "next/server";
import { z } from "zod";
import { stripe, stripeConfigured } from "@/lib/stripe";
import { loadPayableOrder } from "@/lib/orderAccess";

const schema = z.object({ orderId: z.string().min(1) });

export async function POST(request: Request) {
  if (!stripeConfigured()) {
    return NextResponse.json({ error: "notConfigured" }, { status: 503 });
  }

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "badRequest" }, { status: 400 });

  const result = await loadPayableOrder(parsed.data.orderId);
  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 409 });
  }

  const { order } = result;
  const intent = await stripe().paymentIntents.create(
    {
      amount: order.amountCents,
      currency: "usd",
      // Lets Stripe surface Apple Pay on supported devices and cards everywhere else.
      automatic_payment_methods: { enabled: true },
      description: order.product.nameEn,
      metadata: { orderId: order.id },
    },
    // Re-entering checkout reuses the same intent instead of creating a second one.
    { idempotencyKey: `pi_${order.id}` },
  );

  return NextResponse.json({ clientSecret: intent.client_secret });
}
