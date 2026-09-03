import { prisma } from "@/lib/db";
import { getViewerId } from "@/lib/session";

/** Loads an order only if it belongs to the signed-in member and is still payable. */
export async function loadPayableOrder(orderId: string) {
  const userId = await getViewerId();
  if (!userId) return { error: "unauthenticated" as const };

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { product: true },
  });
  if (!order || order.userId !== userId) return { error: "notFound" as const };
  if (order.status === "PAID") return { error: "alreadyPaid" as const };

  return { order };
}
