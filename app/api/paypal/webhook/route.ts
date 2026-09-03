import { NextResponse } from "next/server";
import { verifyPayPalWebhook } from "@/lib/paypal";
import { fulfillOrder } from "@/lib/fulfill";

type PayPalEvent = {
  event_type?: string;
  resource?: { id?: string; custom_id?: string };
};

/**
 * PayPal's own confirmation. This is what makes the sale durable when the buyer closes
 * the tab between approving and the capture call returning.
 */
export async function POST(request: Request) {
  const raw = await request.text();

  const verified = await verifyPayPalWebhook(request.headers, raw).catch(() => false);
  if (!verified) {
    return NextResponse.json({ error: "invalidSignature" }, { status: 400 });
  }

  const event = JSON.parse(raw) as PayPalEvent;
  if (event.event_type !== "PAYMENT.CAPTURE.COMPLETED") {
    return NextResponse.json({ ignored: true });
  }

  const orderId = event.resource?.custom_id;
  const captureId = event.resource?.id;
  if (!orderId || !captureId) return NextResponse.json({ ignored: true });

  await fulfillOrder(orderId, "PAYPAL", `paypal:${captureId}`);
  return NextResponse.json({ ok: true });
}
