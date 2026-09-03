import nodemailer from "nodemailer";

/**
 * Outbound email.
 *
 * Follows the same rule as the Sheets integration: fully working when SMTP credentials
 * are present, and a loud console fallback when they are not. That way signup and password
 * reset can be exercised end to end in development without a mail server, and the codes
 * are never silently swallowed.
 */

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

export const mailConfigured = () => smtp() !== null;

export async function sendMail(args: {
  to: string;
  subject: string;
  text: string;
  html: string;
}): Promise<void> {
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

  const transport = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.port === 465,
    auth: { user: config.user, pass: config.pass },
  });

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
