#!/usr/bin/env node
/**
 * Creates any missing tabs and writes the correct header row on each.
 *
 * Safe to re-run: existing tabs are left in place and only their header row is rewritten,
 * so this also repairs a header that was pasted wrong. Data rows are never touched.
 */
import "dotenv/config";
import { google } from "googleapis";

const TABS = {
  year: "Full-Year Memberships",
  semester: "Semester Memberships",
  purchases: "Purchases",
};

const HEADERS = {
  [TABS.year]: ["Purchased At (UTC)", "Name", "Email", "Valid Until", "Amount Paid (USD)", "Promo Code", "Order ID"],
  [TABS.semester]: ["Purchased At (UTC)", "Name", "Email", "Valid Until", "Amount Paid (USD)", "Promo Code", "Order ID"],
  [TABS.purchases]: ["Purchased At (UTC)", "Name", "Email", "Product", "Amount (USD)", "Session Date", "Skill Level", "Payment Method", "Promo Code", "Order ID"],
};

const sheetId = process.env.GOOGLE_SHEET_ID;
const clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
const privateKey = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY?.replace(/\\n/g, "\n");

if (!sheetId || !clientEmail || !privateKey) {
  console.error("Not configured — run: npm run sheets:setup -- <service-account.json> <spreadsheet-id>");
  process.exit(1);
}

const auth = new google.auth.JWT({ email: clientEmail, key: privateKey, scopes: ["https://www.googleapis.com/auth/spreadsheets"] });
const sheets = google.sheets({ version: "v4", auth });

const meta = await sheets.spreadsheets.get({ spreadsheetId: sheetId });
const existing = meta.data.sheets.map((s) => s.properties.title);
console.log(`"${meta.data.properties.title}" currently has: ${existing.join(", ")}`);

const missing = Object.values(TABS).filter((t) => !existing.includes(t));
if (missing.length) {
  await sheets.spreadsheets.batchUpdate({
    spreadsheetId: sheetId,
    requestBody: {
      requests: missing.map((title) => ({ addSheet: { properties: { title } } })),
    },
  });
  console.log(`Created: ${missing.join(", ")}`);
}

// Write every header row, repairing any that drifted.
await sheets.spreadsheets.values.batchUpdate({
  spreadsheetId: sheetId,
  requestBody: {
    valueInputOption: "RAW",
    data: Object.entries(HEADERS).map(([tab, header]) => ({
      range: `'${tab}'!A1:${String.fromCharCode(64 + header.length)}1`,
      values: [header],
    })),
  },
});
console.log("Headers written on all three tabs.");

// Freeze and bold each header so the sheet is usable by hand.
const after = await sheets.spreadsheets.get({ spreadsheetId: sheetId });
await sheets.spreadsheets.batchUpdate({
  spreadsheetId: sheetId,
  requestBody: {
    requests: after.data.sheets
      .filter((s) => Object.values(TABS).includes(s.properties.title))
      .flatMap((s) => [
        {
          updateSheetProperties: {
            properties: { sheetId: s.properties.sheetId, gridProperties: { frozenRowCount: 1 } },
            fields: "gridProperties.frozenRowCount",
          },
        },
        {
          repeatCell: {
            range: { sheetId: s.properties.sheetId, startRowIndex: 0, endRowIndex: 1 },
            cell: { userEnteredFormat: { textFormat: { bold: true } } },
            fields: "userEnteredFormat.textFormat.bold",
          },
        },
      ]),
  },
});
console.log("Header rows frozen and bolded. Done.");
