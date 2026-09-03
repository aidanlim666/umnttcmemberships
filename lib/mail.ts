import "@/lib/net";
import nodemailer from "nodemailer";
import type SMTPTransport from "nodemailer/lib/smtp-transport";

/**
 * Outbound email.
 *
 * NOTE: currently unwired. It existed for signup confirmation codes and password resets,
 * which went away with the accounts. Kept because the Brevo credentials behind it are live
 * and verified — if the club ever wants purchase receipts, this is ready to call.
 *
 * Follows the same rule as the Sheets integration: fully working when SMTP credentials
 * are present, and a loud console fallback when they are not. That way signup and password
 * reset can be exercised end to end in development without a mail server, and the codes
 * are never silently swallowed.
 */

/**
 * Transport selection.
 *
 * HTTPS is preferred wherever it is configured, because cloud hosts routinely block
 * outbound SMTP ports (25/465/587) to stop spam relay — Railway does, which is why signup
 * email failed in production while working locally. Port 443 is never blocked.
 * SMTP stays supported for local development and for hosts that permit it.
 */
function httpApi() {
  const key = process.env.BREVO_API_KEY;
  if (!key) return null;
  return { key, from: process.env.MAIL_FROM ?? "" };
}

function smtp() {
  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASSWORD;
  if (!host || !user || !pass) return null;
  return {
    host,
    port: Number(process.env.SMTP_PORT ?? 587),
    user,
    pass,
    from: process.env.MAIL_FROM ?? user,
  };
}

export const mailConfigured = () => httpApi() !== null || smtp() !== null;

/** Splits `Name <addr@example.com>` into the parts Brevo's API wants separately. */
function parseFrom(value: string): { name?: string; email: string } {
  const m = value.match(/^\s*(.*?)\s*<([^>]+)>\s*$/);
  return m ? { name: m[1] || undefined, email: m[2] } : { email: value.trim() };
}

async function sendViaHttp(
  api: { key: string; from: string },
  args: { to: string; subject: string; text: string; html: string },
): Promise<void> {
  const res = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: { "api-key": api.key, "content-type": "application/json", accept: "application/json" },
    body: JSON.stringify({
      sender: parseFrom(api.from),
      to: [{ email: args.to }],
      subject: args.subject,
      textContent: args.text,
      htmlContent: args.html,
    }),
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) throw new Error(`Brevo ${res.status}: ${await res.text()}`);
}

export async function sendMail(args: {
  to: string;
  subject: string;
  text: string;
  html: string;
}): Promise<void> {
  const api = httpApi();
  if (api) {
    await sendViaHttp(api, args);
    return;
  }

  const config = smtp();

  if (!config) {
    console.log(
      `\n[mail] SMTP not configured — email not sent.\n` +
        `       To:      ${args.to}\n` +
        `       Subject: ${args.subject}\n` +
        `${args.text.replace(/^/gm, "       ")}\n`,
    );
    return;
  }

  const options: SMTPTransport.Options = {
    host: config.host,
    port: config.port,
    secure: config.port === 465,
    auth: { user: config.user, pass: config.pass },
    // Bound every phase, so an unreachable or silent mail server surfaces as an error in
    // seconds instead of leaving the member staring at a spinning signup button.
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 20_000,
  };

  const transport = nodemailer.createTransport(options);

  await transport.sendMail({
    from: config.from,
    to: args.to,
    subject: args.subject,
    text: args.text,
    html: args.html,
  });
}

/** Shared shell so both codes arrive looking like they came from the same club. */
export function codeEmail(args: { heading: string; body: string; code: string; footer: string }) {
  const text = `${args.heading}\n\n${args.body}\n\n${args.code}\n\n${args.footer}`;
  const html = `<!doctype html><html><body style="margin:0;padding:24px;background:#f7f1ec;font-family:system-ui,-apple-system,'PingFang SC','Microsoft YaHei',sans-serif;color:#241a15">
  <table role="presentation" style="max-width:480px;margin:0 auto;background:#fff;border:1px solid #ece0d6;border-radius:14px">
    <tr><td style="padding:24px">
      <p style="margin:0 0 4px;font-size:13px;font-weight:700;color:#7a0019">UMN Table Tennis Club</p>
      <h1 style="margin:0 0 12px;font-size:19px;line-height:1.3">${escapeHtml(args.heading)}</h1>
      <p style="margin:0 0 18px;font-size:14px;line-height:1.6;color:#5c4c43">${escapeHtml(args.body)}</p>
      <p style="margin:0 0 18px;padding:14px;background:#fff4d6;border:1px solid #f2dca5;border-radius:10px;
                text-align:center;font-size:30px;font-weight:800;letter-spacing:.28em;
                font-variant-numeric:tabular-nums;color:#7a0019">${escapeHtml(args.code)}</p>
      <p style="margin:0;font-size:12px;line-height:1.6;color:#94827a">${escapeHtml(args.footer)}</p>
    </td></tr>
  </table>
</body></html>`;
  return { text, html };
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!,
  );
}
