#!/usr/bin/env node
/** Appends a labelled test row, then tells you exactly what went wrong if it fails. */
import "dotenv/config";
import { google } from "googleapis";

const sheetId = process.env.GOOGLE_SHEET_ID;
const clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
const privateKey = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY?.replace(/\\n/g, "\n");

if (!sheetId || !clientEmail || !privateKey) {
  console.error("Not configured yet - GOOGLE_SHEET_ID / _EMAIL / _PRIVATE_KEY are not all set in .env");
  process.exit(1);
}

const auth = new google.auth.JWT({
  email: clientEmail,
  key: privateKey,
  scopes: ["https://www.googleapis.com/auth/spreadsheets"],
});
const sheets = google.sheets({ version: "v4", auth });

try {
  const meta = await sheets.spreadsheets.get({ spreadsheetId: sheetId });
  const tabs = meta.data.sheets.map((s) => s.properties.title);
  console.log(`Opened "${meta.data.properties.title}"`);
  console.log(`Tabs: ${tabs.join(", ")}`);

  if (!tabs.includes("Purchases")) {
    console.error('\nNo tab named "Purchases" - rename your tab (it is case-sensitive).');
    process.exit(1);
  }

  await sheets.spreadsheets.values.append({
    spreadsheetId: sheetId,
    range: "Purchases!A:I",
    valueInputOption: "USER_ENTERED",
    insertDataOption: "INSERT_ROWS",
    requestBody: {
      values: [[
        new Date().toISOString(), "TEST ROW", "delete-me@example.com",
        "Connection test", "0.00", "", "-", "", "setup-check",
      ]],
    },
  });
  console.log("\nAppended a TEST ROW to the Purchases tab - delete it by hand.");
  console.log("Google Sheets is connected.");
} catch (err) {
  const status = err?.status ?? err?.code;
  console.error(`\nFailed (${status ?? "unknown"}): ${err.message}`);
  if (status === 403) {
    console.error(`\n  Most likely: the sheet is not shared with ${clientEmail}.`);
    console.error("  Open the spreadsheet, click Share, paste that address, give it Editor.");
    console.error("  (Or the Google Sheets API is not enabled on the project.)");
  } else if (status === 404) {
    console.error("\n  Most likely: GOOGLE_SHEET_ID is wrong. It is the long id in the sheet URL:");
    console.error("  docs.google.com/spreadsheets/d/<THIS_PART>/edit");
  } else if (String(err.message).includes("DECODER") || String(err.message).includes("PEM")) {
    console.error("\n  The private key is malformed. Re-run: node scripts/setup-sheets.mjs <json> <id>");
  }
  process.exit(1);
}
