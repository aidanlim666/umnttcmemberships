import { NextResponse } from "next/server";
import { z } from "zod";
import { stripe, stripeConfigured } from "@/lib/stripe";
import { loadPayableOrder } from "@/lib/orderAccess";
import { fulfillOrder } from "@/lib/fulfill";

const schema = z.object({ orderId: z.string().min(1), paymentIntentId: z.string().min(1) });

/**
 * Called by the browser right after Stripe reports success, so the member sees their
 * membership immediately instead of waiting on the webhook. The webhook still runs and
 * is the durable path; fulfilment is idempotent, so both arriving is harmless.
 */
export async function POST(request: Request) {
  if (!stripeConfigured()) {
    return NextResponse.json({ error: "notConfigured" }, { status: 503 });
  }

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "badRequest" }, { status: 400 });

  const result = await loadPayableOrder(parsed.data.orderId);
  if ("error" in result) {
    if (result.error === "alreadyPaid") return NextResponse.json({ ok: true });
    return NextResponse.json({ error: result.error }, { status: 409 });
  }

  const intent = await stripe().paymentIntents.retrieve(parsed.data.paymentIntentId);
  // Trust Stripe's record of the payment, not the browser's claim about it.
  if (intent.status !== "succeeded" || intent.metadata.orderId !== result.order.id) {
    return NextResponse.json({ error: "notCompleted" }, { status: 402 });
  }

  await fulfillOrder(result.order.id, "STRIPE", `stripe:${intent.id}`);
  return NextResponse.json({ ok: true });
}
