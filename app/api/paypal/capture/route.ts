import { NextResponse } from "next/server";
import { z } from "zod";
import { capturePayPalOrder, paypalConfigured } from "@/lib/paypal";
import { loadPayableOrder } from "@/lib/orderAccess";
import { fulfillOrder } from "@/lib/fulfill";

const schema = z.object({ orderId: z.string().min(1), paypalOrderId: z.string().min(1) });

export async function POST(request: Request) {
  if (!paypalConfigured()) {
    return NextResponse.json({ error: "notConfigured" }, { status: 503 });
  }

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "badRequest" }, { status: 400 });

  const result = await loadPayableOrder(parsed.data.orderId);
  if ("error" in result) {
    // The webhook may have fulfilled it first — that is a success from the buyer's view.
    if (result.error === "alreadyPaid") return NextResponse.json({ ok: true });
    return NextResponse.json({ error: result.error }, { status: 409 });
  }

  const capture = await capturePayPalOrder(parsed.data.paypalOrderId);
  if (capture.status !== "COMPLETED") {
    return NextResponse.json({ error: "notCompleted" }, { status: 402 });
  }

  await fulfillOrder(result.order.id, "PAYPAL", `paypal:${capture.id}`);
  return NextResponse.json({ ok: true });
}
