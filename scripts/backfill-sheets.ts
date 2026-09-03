import "dotenv/config";
import { prisma } from "../lib/db";
import { HEADERS, TABS, sheetsClient } from "../lib/sheets";

/**
 * Writes existing database records into the spreadsheet.
 *
 * For data created before Sheets was connected, or to rebuild a tab. Idempotent: rows
 * already present (matched on email for accounts, order id elsewhere) are skipped, so
 * running it twice does not duplicate anything.
 */

const isoDate = (d: Date) => d.toISOString().slice(0, 10);
const money = (c: number) => (c / 100).toFixed(2);

const PROVIDER_LABEL: Record<string, string> = {
  PAYPAL: "PayPal / Venmo",
  STRIPE: "Apple Pay / Card",
  PROMO: "Promo code (no charge)",
};

async function main() {
  const client = sheetsClient();
  if (!client) {
    console.error("Sheets is not configured — nothing to backfill into.");
    process.exit(1);
  }
  const { sheets, sheetId } = client;

  async function existingKeys(tab: string, keyColumn: number): Promise<Set<string>> {
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: `'${tab}'!A:Z`,
    });
    const rows = res.data.values ?? [];
    return new Set(rows.slice(1).map((r) => String(r[keyColumn] ?? "")));
  }

  async function append(tab: string, values: string[][]) {
    if (values.length === 0) return;
    await sheets.spreadsheets.values.append({
      spreadsheetId: sheetId,
      range: `'${tab}'!A:Z`,
      valueInputOption: "USER_ENTERED",
      insertDataOption: "INSERT_ROWS",
      requestBody: { values },
    });
  }

  // ---- Accounts (keyed on email, column C)
  const seenEmails = await existingKeys(TABS.accounts, 2);
  const users = await prisma.user.findMany({ orderBy: { createdAt: "asc" } });
  const accountRows = users
    .filter((u) => u.email && !seenEmails.has(u.email))
    .map((u) => [
      u.createdAt.toISOString(),
      u.name ?? u.email!,
      u.email!,
      u.passwordHash ? "Password" : "Google",
    ]);
  await append(TABS.accounts, accountRows);
  console.log(`${TABS.accounts}: added ${accountRows.length} (skipped ${users.length - accountRows.length})`);

  // ---- Memberships (keyed on order id, column G)
  const memberships = await prisma.membership.findMany({
    include: { user: true, order: true },
    orderBy: { createdAt: "asc" },
  });
  for (const [tier, tab] of [["YEAR", TABS.year], ["FALL", TABS.semester]] as const) {
    const seen = await existingKeys(tab, 6);
    const rows = memberships
      .filter((m) => m.tier === tier && !seen.has(m.orderId))
      .map((m) => [
        m.createdAt.toISOString(),
        m.user.name ?? m.user.email ?? "Unknown",
        m.user.email ?? "",
        isoDate(m.endsAt),
        money(m.order.amountCents),
        m.order.promoCode ?? "",
        m.orderId,
      ]);
    await append(tab, rows);
    console.log(`${tab}: added ${rows.length}`);
  }

  // ---- Purchases (keyed on order id, column I)
  const seenOrders = await existingKeys(TABS.purchases, 8);
  const orders = await prisma.order.findMany({
    where: { status: "PAID" },
    include: { user: true, product: true },
    orderBy: { createdAt: "asc" },
  });
  const purchaseRows = orders
    .filter((o) => !seenOrders.has(o.id))
    .map((o) => [
      (o.fulfilledAt ?? o.createdAt).toISOString(),
      o.user.name ?? o.user.email ?? "Unknown",
      o.user.email ?? "",
      o.product.nameEn,
      money(o.amountCents),
      o.eventDate ? isoDate(o.eventDate) : "",
      o.provider ? (PROVIDER_LABEL[o.provider] ?? o.provider) : "",
      o.promoCode ?? "",
      o.id,
    ]);
  await append(TABS.purchases, purchaseRows);
  console.log(`${TABS.purchases}: added ${purchaseRows.length} (skipped ${orders.length - purchaseRows.length})`);

  void HEADERS;
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
