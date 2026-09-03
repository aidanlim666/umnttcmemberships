import Link from "next/link";
import { redirect } from "next/navigation";
import { getT } from "@/i18n/server";
import { getViewer } from "@/lib/session";
import { prisma } from "@/lib/db";
import { localize } from "@/lib/products";
import { formatUsd } from "@/lib/money";
import { formatEventDate } from "@/lib/dates";
import { MembershipBadge } from "@/components/MembershipBadge";

export default async function AccountPage() {
  const [{ lang, t }, viewer] = await Promise.all([getT(), getViewer()]);
  if (!viewer) redirect(`/login?next=${encodeURIComponent("/account")}`);

  const orders = await prisma.order.findMany({
    where: { userId: viewer.id },
    include: { product: true },
    orderBy: { createdAt: "desc" },
  });

  const dateFmt = new Intl.DateTimeFormat(lang === "zh" ? "zh-CN" : "en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

  return (
    <div className="mx-auto max-w-4xl px-3 py-4 sm:px-5 sm:py-7">
      <h1 className="display mb-3 text-xl font-extrabold">{t("account.title")}</h1>

      {/* Membership status card */}
      <section className="card overflow-hidden">
        <div className="flex flex-wrap items-center gap-3 bg-[linear-gradient(120deg,#7a0019,#9d1631)] p-4 text-white">
          <span className="grid h-11 w-11 place-items-center rounded-full bg-[var(--gold)] text-base font-extrabold text-[var(--maroon-deep)]">
            {(viewer.name || viewer.email || "?").trim().charAt(0).toUpperCase()}
          </span>
          <div className="min-w-0">
            <p className="display truncate text-[15px] font-bold">{viewer.name ?? viewer.email}</p>
            <p className="truncate text-[12px] text-white/70">{viewer.email}</p>
          </div>
          <span className="ml-auto">
            <MembershipBadge tier={viewer.membership?.tier ?? null} lang={lang} size="md" />
          </span>
        </div>

        <div className="p-4">
          <h2 className="display text-[12.5px] font-bold text-[var(--ink-2)]">
            {t("account.membership")}
          </h2>
          {viewer.membership ? (
            <p className="num mt-1 text-[13px] text-[var(--ink-2)]">
              {t("account.validUntil")}{" "}
              <strong>{dateFmt.format(viewer.membership.endsAt)}</strong>
            </p>
          ) : (
            <div className="mt-1 flex flex-wrap items-center gap-3">
              <p className="text-[13px] text-[var(--ink-3)]">
                {t("account.noMembership")} — {t("account.noMembershipSub")}
              </p>
              <Link href="/" className="btn btn-primary px-4 py-1.5 text-[12.5px]">
                {t("home.heroCta")}
              </Link>
            </div>
          )}
        </div>
      </section>

      {/* Purchase history */}
      <section className="mt-4">
        <h2 className="display mb-2 text-[15px] font-extrabold">{t("account.history")}</h2>

        {orders.length === 0 ? (
          <p className="card p-6 text-center text-[13px] text-[var(--ink-3)]">
            {t("account.noHistory")}
          </p>
        ) : (
          <div className="card overflow-x-auto">
            <table className="w-full min-w-[34rem] text-left text-[12.5px]">
              <thead className="bg-[var(--surface-warm)] text-[11px] uppercase tracking-wide text-[var(--ink-3)]">
                <tr>
                  <th className="px-3 py-2 font-bold">{t("account.item")}</th>
                  <th className="px-3 py-2 font-bold">{t("account.sessionDate")}</th>
                  <th className="px-3 py-2 font-bold">{t("account.date")}</th>
                  <th className="px-3 py-2 text-right font-bold">{t("account.amount")}</th>
                  <th className="px-3 py-2 text-right font-bold">{t("account.status")}</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((o) => (
                  <tr key={o.id} className="border-t border-[var(--line)]">
                    <td className="px-3 py-2.5 font-semibold">{localize(o.product, lang).name}</td>
                    <td className="num px-3 py-2.5 text-[var(--ink-3)]">
                      {o.eventDate ? formatEventDate(o.eventDate, lang) : "—"}
                    </td>
                    <td className="num px-3 py-2.5 text-[var(--ink-3)]">
                      {dateFmt.format(o.createdAt)}
                    </td>
                    <td className="num px-3 py-2.5 text-right font-bold">
                      {formatUsd(o.amountCents)}
                    </td>
                    <td className="px-3 py-2.5 text-right">
                      <span
                        className={`chip ${
                          o.status === "PAID"
                            ? "chip-gold"
                            : o.status === "PENDING"
                              ? "chip-muted"
                              : "chip-maroon"
                        }`}
                      >
                        {t(`status.${o.status}` as const)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
