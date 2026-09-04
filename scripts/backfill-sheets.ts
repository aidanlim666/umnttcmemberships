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
    console.error("Sheets is not configured - nothing to backfill into.");
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

  // ---- Memberships (keyed on order id, column G)
  const memberships = await prisma.membership.findMany({
    include: { order: true },
    orderBy: { createdAt: "asc" },
  });
  for (const [tier, tab] of [["YEAR", TABS.year], ["FALL", TABS.semester]] as const) {
    const seen = await existingKeys(tab, 6);
    const rows = memberships
      .filter((m) => m.tier === tier && !seen.has(m.orderId))
      .map((m) => [
        m.createdAt.toISOString(),
        m.order.buyerName,
        m.order.buyerEmail,
        isoDate(m.endsAt),
        money(m.order.amountCents),
        m.order.promoCode ?? "",
        m.orderId,
      ]);
    await append(tab, rows);
    console.log(`${tab}: added ${rows.length}`);
  }

  // ---- Purchases (keyed on order id, column I)
  const seenOrders = await existingKeys(TABS.purchases, 9);
  const orders = await prisma.order.findMany({
    where: { status: "PAID" },
    include: { product: true },
    orderBy: { createdAt: "asc" },
  });
  const purchaseRows = orders
    .filter((o) => !seenOrders.has(o.id))
    .map((o) => [
      (o.fulfilledAt ?? o.createdAt).toISOString(),
      o.buyerName,
      o.buyerEmail,
      o.product.nameEn,
      money(o.amountCents),
      o.eventDate ? isoDate(o.eventDate) : "",
      o.skillLevel ?? "",
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
