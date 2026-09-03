import { NextResponse } from "next/server";
import { z } from "zod";
import { createPayPalOrder, paypalConfigured } from "@/lib/paypal";
import { loadPayableOrder } from "@/lib/orderAccess";
import { toDecimalString } from "@/lib/money";

const schema = z.object({ orderId: z.string().min(1) });

export async function POST(request: Request) {
  if (!paypalConfigured()) {
    return NextResponse.json({ error: "notConfigured" }, { status: 503 });
  }

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "badRequest" }, { status: 400 });

  const result = await loadPayableOrder(parsed.data.orderId);
  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 409 });
  }

  const { order } = result;
  // Amount comes from our database record, never from the browser.
  const paypal = await createPayPalOrder({
    orderId: order.id,
    amount: toDecimalString(order.amountCents),
    description: order.product.nameEn,
  });

  return NextResponse.json({ paypalOrderId: paypal.id });
}
