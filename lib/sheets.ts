import "@/lib/net";
import { google, type sheets_v4 } from "googleapis";
import type { MembershipTier } from "@/lib/generated/prisma/enums";

/**
 * The officers' spreadsheet.
 *
 * Three tabs, each written at the moment the thing it records actually happens:
 *   Full-Year Memberships — season members
 *   Semester Memberships  — fall-only members
 *   Purchases             — the full ledger, including drop-ins and training
 *
 * A membership purchase therefore appears twice by design: once in Purchases as a
 * transaction, and once in its membership tab as a roster entry.
 */

export const TABS = {
  year: "Full-Year Memberships",
  semester: "Semester Memberships",
  purchases: "Purchases",
} as const;

export const HEADERS: Record<string, string[]> = {
  [TABS.year]: [
    "Purchased At (UTC)", "Name", "Email", "Valid Until",
    "Amount Paid (USD)", "Promo Code", "Order ID",
  ],
  [TABS.semester]: [
    "Purchased At (UTC)", "Name", "Email", "Valid Until",
    "Amount Paid (USD)", "Promo Code", "Order ID",
  ],
  [TABS.purchases]: [
    "Purchased At (UTC)", "Name", "Email", "Product", "Amount (USD)",
    "Session Date", "Skill Level", "Payment Method", "Promo Code", "Order ID",
  ],
};

const SCOPES = ["https://www.googleapis.com/auth/spreadsheets"];

function credentials() {
  const sheetId = process.env.GOOGLE_SHEET_ID;
  const clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  // Keys pasted into .env keep their newlines as the two characters \ and n.
  const privateKey = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY?.replace(/\\n/g, "\n");
  if (!sheetId || !clientEmail || !privateKey) return null;
  return { sheetId, clientEmail, privateKey };
}

export const sheetsConfigured = () => credentials() !== null;

export function sheetsClient(): { sheets: sheets_v4.Sheets; sheetId: string } | null {
  const creds = credentials();
  if (!creds) return null;
  const auth = new google.auth.JWT({
    email: creds.clientEmail,
    key: creds.privateKey,
    scopes: SCOPES,
  });
  return { sheets: google.sheets({ version: "v4", auth }), sheetId: creds.sheetId };
}

/**
 * Appends one row to one tab.
 *
 * Deliberately never throws: a spreadsheet outage must not fail a payment that has already
 * been captured, nor block an account that has already been confirmed. When Sheets is not
 * configured the row is logged instead, so the flow stays observable in development.
 */
async function appendRow(tab: string, values: string[]): Promise<void> {
  const client = sheetsClient();
  if (!client) {
    console.log(`[sheets] not configured — ${tab}: ${values.join(" | ")}`);
    return;
  }

  try {
    await client.sheets.spreadsheets.values.append({
      spreadsheetId: client.sheetId,
      // Tab names contain spaces and hyphens, so they must be quoted in an A1 range.
      range: `'${tab}'!A:Z`,
      valueInputOption: "USER_ENTERED",
      insertDataOption: "INSERT_ROWS",
      requestBody: { values: [values] },
    });
  } catch (err) {
    console.error(`[sheets] append to ${tab} failed — row: ${values.join(" | ")}`, err);
  }
}

const isoDate = (d: Date) => d.toISOString().slice(0, 10);
const money = (cents: number) => (cents / 100).toFixed(2);

/* -------------------------------------------------------------- Memberships */

export async function appendMembership(row: {
  tier: MembershipTier;
  purchasedAt: Date;
  name: string;
  email: string;
  endsAt: Date;
  amountCents: number;
  promoCode: string | null;
  orderId: string;
}): Promise<void> {
  await appendRow(row.tier === "YEAR" ? TABS.year : TABS.semester, [
    row.purchasedAt.toISOString(),
    row.name,
    row.email,
    isoDate(row.endsAt),
    money(row.amountCents),
    row.promoCode ?? "",
    row.orderId,
  ]);
}

/* ---------------------------------------------------------------- Purchases */

export type PurchaseRow = {
  purchasedAt: Date;
  name: string;
  email: string;
  productName: string;
  amountCents: number;
  /** Only set for Friday league / open play drop-ins. */
  eventDate: Date | null;
  /** Self-assessed level, day passes only. */
  skillLevel?: string | null;
  orderId: string;
  paymentMethod: string;
  /** The promo code applied, if any — officers need to see why a total was discounted. */
  promoCode?: string | null;
};

export async function appendPurchase(row: PurchaseRow): Promise<void> {
  await appendRow(TABS.purchases, [
    row.purchasedAt.toISOString(),
    row.name,
    row.email,
    row.productName,
    money(row.amountCents),
    row.eventDate ? isoDate(row.eventDate) : "",
    row.skillLevel ?? "",
    row.paymentMethod,
    row.promoCode ?? "",
    row.orderId,
  ]);
}
