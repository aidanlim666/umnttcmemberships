import Link from "next/link";
import { notFound } from "next/navigation";
import { getT } from "@/i18n/server";
import { prisma } from "@/lib/db";
import { localize } from "@/lib/products";
import { formatUsd } from "@/lib/money";
import { formatEventDate } from "@/lib/dates";

export default async function SuccessPage({
  params,
}: PageProps<"/checkout/[orderId]/success">) {
  const { orderId } = await params;
  const { lang, t } = await getT();

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { product: true },
  });
  if (!order) notFound();

  const product = localize(order.product, lang);

  return (
    <div className="mx-auto max-w-md px-4 py-10 text-center">
      <span className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-[var(--gold)] text-3xl">
        🏓
      </span>
      <h1 className="display mt-4 text-2xl font-extrabold">{t("success.title")}</h1>
      <p className="mt-1.5 text-[13.5px] text-[var(--ink-3)]">{t("success.sub")}</p>

      <div className="card mt-5 space-y-2 p-4 text-left">
        <div className="flex items-center justify-between gap-3">
          <span className="display text-[13.5px] font-bold">{product.name}</span>
          <span className="num display font-extrabold text-[var(--price)]">
            {formatUsd(order.amountCents)}
          </span>
        </div>

        {order.promoCode && (
          <p className="flex items-center gap-2 text-[12px]">
            <span className="coupon">{order.promoCode}</span>
            <span className="num text-[var(--ink-3)]">−{formatUsd(order.discountCents)}</span>
          </p>
        )}

        {order.eventDate && (
          <p className="num text-[12px] text-[var(--ink-3)]">
            {t("checkout.sessionDate")}: {formatEventDate(order.eventDate, lang)}
          </p>
        )}

        <div className="flex items-center justify-between gap-3 border-t border-[var(--line)] pt-2">
          <span className="num text-[11px] text-[var(--ink-3)]">
            {t("success.orderId")} {order.id.slice(-8).toUpperCase()}
          </span>
          <span className="truncate text-[11px] text-[var(--ink-3)]">{order.buyerEmail}</span>
        </div>
      </div>

      <div className="mt-4">
        <Link href="/" className="btn btn-primary w-full py-2.5 text-[14px]">
          {t("success.toShop")}
        </Link>
      </div>
    </div>
  );
}
