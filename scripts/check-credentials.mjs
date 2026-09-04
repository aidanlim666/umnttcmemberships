#!/usr/bin/env node
/**
 * Tests whichever of the three integrations are configured, and says plainly what is
 * missing. Run after adding each set of keys — a real API round-trip, not a format check.
 *
 *   node scripts/check-credentials.mjs            # test locally against .env
 *   npx netlify-cli env:exec -- node scripts/check-credentials.mjs   # deployed environment
 */
import "dotenv/config";

const ok = (m) => console.log(`  ✓ ${m}`);
const bad = (m) => console.log(`  ✗ ${m}`);
const skip = (m) => console.log(`  – ${m}`);

let failures = 0;

/* ------------------------------------------------------------------ SMTP */
console.log("\nEMAIL (not used by the site — kept for future receipts)");
if (process.env.BREVO_API_KEY) {
  try {
    const r = await fetch("https://api.brevo.com/v3/account", {
      headers: { "api-key": process.env.BREVO_API_KEY, accept: "application/json" },
    });
    if (!r.ok) throw new Error(`${r.status} ${await r.text()}`);
    const a = await r.json();
    ok(`Brevo API over HTTPS — ${a.email ?? "authenticated"}`);
    ok("works on hosts that block SMTP ports");
    if (!process.env.MAIL_FROM) bad("MAIL_FROM unset — Brevo needs an explicit verified sender");
    else ok(`sending as ${process.env.MAIL_FROM}`);
    if (process.argv[2]) {
      const m = (process.env.MAIL_FROM ?? "").match(/^\s*(.*?)\s*<([^>]+)>\s*$/);
      const send = await fetch("https://api.brevo.com/v3/smtp/email", {
        method: "POST",
        headers: { "api-key": process.env.BREVO_API_KEY, "content-type": "application/json" },
        body: JSON.stringify({
          sender: m ? { name: m[1] || undefined, email: m[2] } : { email: process.env.MAIL_FROM },
          to: [{ email: process.argv[2] }],
          subject: "UMN TTC — email test",
          textContent: "If you are reading this, outbound email works over HTTPS.",
        }),
      });
      if (!send.ok) { failures++; bad(`send failed: ${send.status} ${await send.text()}`); }
      else ok(`sent a test message to ${process.argv[2]} — check the inbox`);
    } else skip("pass an address to also send a real test message");
  } catch (e) {
    // Not counted as a failure: no code path sends email today.
    bad(e.message.slice(0, 200));
    if (/unrecognised IP/i.test(e.message))
      skip("  Brevo IP allowlisting is on. Irrelevant unless receipts get wired up.");
  }
} else if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASSWORD) {
  skip("not configured — codes print to the server log instead of being emailed");
  skip("needs BREVO_API_KEY + MAIL_FROM (works in production), or SMTP_* (local only)");
} else {
  try {
    const nodemailer = (await import("nodemailer")).default;
    const port = Number(process.env.SMTP_PORT ?? 587);
    const t = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port,
      secure: port === 465,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD },
    });
    await t.verify();
    ok(`connected to ${process.env.SMTP_HOST}:${port} as ${process.env.SMTP_USER}`);
    skip("SMTP only — often blocked on serverless; set BREVO_API_KEY for the live site");
    if (process.argv[2]) {
      await t.sendMail({
        from: process.env.MAIL_FROM ?? process.env.SMTP_USER,
        to: process.argv[2],
        subject: "UMN TTC — SMTP test",
        text: "If you are reading this, outbound email works.",
      });
      ok(`sent a test message to ${process.argv[2]} — check the inbox`);
    } else {
      skip("pass an address to also send a real test message");
    }
  } catch (e) {
    failures++;
    bad(`${e.message}`);
    if (/invalid login|username and password/i.test(e.message))
      bad("  Gmail needs an App Password (16 chars), not your account password.");
  }
}

/* ---------------------------------------------------------------- PayPal */
console.log("\nPAYPAL / VENMO");
const ppId = process.env.PAYPAL_CLIENT_ID, ppSecret = process.env.PAYPAL_CLIENT_SECRET;
if (!ppId || !ppSecret) {
  skip("not configured — checkout shows 'not configured yet' for this method");
  skip("needs PAYPAL_ENV, PAYPAL_CLIENT_ID, PAYPAL_CLIENT_SECRET, NEXT_PUBLIC_PAYPAL_CLIENT_ID");
} else {
  const live = process.env.PAYPAL_ENV === "live";
  const base = live ? "https://api-m.paypal.com" : "https://api-m.sandbox.paypal.com";
  try {
    const r = await fetch(`${base}/v1/oauth2/token`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(`${ppId}:${ppSecret}`).toString("base64")}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: "grant_type=client_credentials",
    });
    if (!r.ok) throw new Error(`${r.status} ${await r.text()}`);
    ok(`authenticated against ${live ? "LIVE" : "sandbox"} PayPal`);
    if (process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID !== ppId) {
      failures++;
      bad("NEXT_PUBLIC_PAYPAL_CLIENT_ID does not match PAYPAL_CLIENT_ID — the buttons will not load");
    } else ok("public client id matches");
    if (!process.env.PAYPAL_WEBHOOK_ID) bad("PAYPAL_WEBHOOK_ID unset — webhooks will be rejected");
    else ok("webhook id set");
  } catch (e) {
    failures++;
    bad(e.message.slice(0, 200));
    bad("  Check you copied the secret from the same app, and the right sandbox/live tab.");
  }
}

/* ---------------------------------------------------------------- Stripe */
console.log("\nSTRIPE (Apple Pay + cards)");
const sk = process.env.STRIPE_SECRET_KEY;
if (!sk) {
  skip("not configured — checkout shows 'not configured yet' for this method");
  skip("needs STRIPE_SECRET_KEY, NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY, STRIPE_WEBHOOK_SECRET");
} else {
  try {
    const Stripe = (await import("stripe")).default;
    const acct = await new Stripe(sk).accounts.retrieve();
    ok(`authenticated as ${acct.settings?.dashboard?.display_name ?? acct.id} (${sk.startsWith("sk_live") ? "LIVE" : "test"} key)`);
    const pk = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? "";
    const secretLive = sk.startsWith("sk_live"), pubLive = pk.startsWith("pk_live");
    if (!pk) { failures++; bad("NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY unset — the card form will not render"); }
    else if (secretLive !== pubLive) { failures++; bad("secret and publishable keys are from different modes (one live, one test)"); }
    else ok("publishable key matches mode");
    if (!process.env.STRIPE_WEBHOOK_SECRET) bad("STRIPE_WEBHOOK_SECRET unset — webhooks will be rejected");
    else ok("webhook secret set");
  } catch (e) {
    failures++;
    bad(e.message.slice(0, 200));
  }
}

console.log(failures ? `\n${failures} problem(s) above.\n` : "\nNo problems found.\n");
process.exit(failures ? 1 : 0);
