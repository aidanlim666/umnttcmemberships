#!/usr/bin/env node
/**
 * Wires a Google service-account key into .env.
 *
 * The private key is a multi-line PEM block, which is the step people get wrong when
 * copying it by hand — it has to be escaped onto a single line. This does that for you.
 *
 * Usage:
 *   node scripts/setup-sheets.mjs ~/Downloads/umnttc-sheets-abc123.json <spreadsheet-id>
 */
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const [, , keyPath, sheetId] = process.argv;

if (!keyPath || !sheetId) {
  console.error("Usage: node scripts/setup-sheets.mjs <service-account.json> <spreadsheet-id>");
  process.exit(1);
}

let key;
try {
  key = JSON.parse(readFileSync(resolve(keyPath), "utf8"));
} catch (err) {
  console.error(`Could not read ${keyPath}: ${err.message}`);
  process.exit(1);
}

if (!key.client_email || !key.private_key) {
  console.error("That file is missing client_email / private_key — is it the service account JSON key?");
  process.exit(1);
}

const envPath = resolve(".env");
let env = readFileSync(envPath, "utf8");

const set = (name, value) => {
  const line = `${name}="${value}"`;
  const re = new RegExp(`^${name}=.*$`, "m");
  env = re.test(env) ? env.replace(re, line) : `${env.trimEnd()}\n${line}\n`;
};

set("GOOGLE_SHEET_ID", sheetId);
set("GOOGLE_SERVICE_ACCOUNT_EMAIL", key.client_email);
// Escape the newlines; lib/sheets.ts unescapes them again at runtime.
set("GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY", key.private_key.replace(/\n/g, "\\n"));

writeFileSync(envPath, env);

console.log(`Wrote .env:
  GOOGLE_SHEET_ID                     ${sheetId}
  GOOGLE_SERVICE_ACCOUNT_EMAIL        ${key.client_email}
  GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY  (${key.private_key.length} chars, newlines escaped)

Next: share the spreadsheet with ${key.client_email} as an Editor,
then run  npm run sheets:check`);
