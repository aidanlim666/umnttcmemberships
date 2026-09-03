import { notFound, redirect } from "next/navigation";
import { getT } from "@/i18n/server";
import { getViewer } from "@/lib/session";
import { prisma } from "@/lib/db";
import { localize } from "@/lib/products";
import { formatUsd } from "@/lib/money";
import { formatEventDate } from "@/lib/dates";
import { paypalConfigured } from "@/lib/paypal";
import { stripeConfigured } from "@/lib/stripe";
import { Logo } from "@/components/Logo";
import { PayPanel } from "@/components/PayPanel";

export default async function CheckoutPage({ params }: PageProps<"/checkout/[orderId]">) {
  const { orderId } = await params;
  const [{ lang, t }, viewer] = await Promise.all([getT(), getViewer()]);

  if (!viewer) redirect(`/login?next=${encodeURIComponent(`/checkout/${orderId}`)}`);

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { product: true },
  });
  if (!order || order.userId !== viewer.id) notFound();
  if (order.status === "PAID") redirect(`/checkout/${order.id}/success`);

  const product = localize(order.product, lang);

  return (
    <div className="mx-auto max-w-3xl px-3 py-4 sm:px-5 sm:py-7">
      <h1 className="display mb-3 text-xl font-extrabold">{t("checkout.title")}</h1>

      <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_300px]">
        {/* Payment methods */}
        <div className="order-2 sm:order-1">
          <PayPanel
            orderId={order.id}
            paypalAvailable={paypalConfigured() && Boolean(process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID)}
            paypalClientId={process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID ?? ""}
            stripeAvailable={stripeConfigured() && Boolean(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY)}
            stripePublishableKey={process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? ""}
          />
        </div>

        {/* Order summary */}
        <aside className="order-1 sm:order-2">
          <div className="card p-4">
            <h2 className="display mb-3 text-[13.5px] font-bold text-[var(--ink-2)]">
              {t("checkout.summary")}
            </h2>

            <div className="flex gap-3">
              <span className="grid h-16 w-16 shrink-0 place-items-center rounded-lg bg-[linear-gradient(150deg,#fffdf8,#f6ece2)]">
                <Logo size={48} />
              </span>
              <div className="min-w-0">
                <p className="display text-[13.5px] font-bold leading-snug">{product.name}</p>
                {order.eventDate && (
                  <p className="num mt-1 text-[11.5px] text-[var(--ink-3)]">
                    {t("checkout.sessionDate")}: {formatEventDate(order.eventDate, lang)}
                  </p>
                )}
              </div>
            </div>

            {order.discountCents > 0 && (
              <div className="mt-3 flex items-baseline justify-between gap-2 text-[12px]">
                <span className="coupon">{order.promoCode}</span>
                <span className="num font-bold text-[var(--price)]">
                  −{formatUsd(order.discountCents)}
                </span>
              </div>
            )}

            <div className="mt-3 flex items-baseline justify-between border-t border-[var(--line)] pt-3">
              <span className="text-[12.5px] font-bold text-[var(--ink-2)]">
                {t("checkout.total")}
              </span>
              <span className="num display text-2xl font-extrabold text-[var(--price)]">
                {formatUsd(order.amountCents)}
              </span>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
