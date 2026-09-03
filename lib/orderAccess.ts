import { prisma } from "@/lib/db";

/**
 * Loads an order that is still payable.
 *
 * With no accounts there is no owner to check, so the order id is the only thing guarding
 * a checkout — it is a cuid and unguessable, the same way a hosted payment link works.
 */
export async function loadPayableOrder(orderId: string) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { product: true },
  });
  if (!order) return { error: "notFound" as const };
  if (order.status === "PAID") return { error: "alreadyPaid" as const };

  return { order };
}
