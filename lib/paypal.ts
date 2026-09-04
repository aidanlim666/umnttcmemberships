import "@/lib/net";
/**
 * Thin PayPal REST v2 client. Talking to the REST API directly (rather than the
 * server SDK) keeps the surface small: three calls is the whole integration.
 *
 * The same credentials power the Venmo button - Venmo is only reachable through
 * PayPal's SDK, and only for US buyers on supported devices.
 */

const BASE =
  process.env.PAYPAL_ENV === "live"
    ? "https://api-m.paypal.com"
    : "https://api-m.sandbox.paypal.com";

export const paypalConfigured = () =>
  Boolean(process.env.PAYPAL_CLIENT_ID && process.env.PAYPAL_CLIENT_SECRET);

async function accessToken(): Promise<string> {
  const id = process.env.PAYPAL_CLIENT_ID;
  const secret = process.env.PAYPAL_CLIENT_SECRET;
  if (!id || !secret) throw new Error("PayPal is not configured");

  const res = await fetch(`${BASE}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${id}:${secret}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`PayPal token failed: ${res.status} ${await res.text()}`);

  const json = (await res.json()) as { access_token: string };
  return json.access_token;
}

async function call<T>(path: string, init: RequestInit & { idempotencyKey?: string }) {
  const token = await accessToken();
  const { idempotencyKey, ...rest } = init;
  const res = await fetch(`${BASE}${path}`, {
    ...rest,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(idempotencyKey ? { "PayPal-Request-Id": idempotencyKey } : {}),
      ...(rest.headers ?? {}),
    },
    cache: "no-store",
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`PayPal ${path} failed: ${res.status} ${text}`);
  return JSON.parse(text) as T;
}

/**
 * Where PayPal sends the buyer back to after an app switch. Set SITE_URL in production;
 * without it the mobile Venmo hand-off has nowhere to return and the buyer is stranded in
 * the Venmo app with no way back to the order.
 */
function siteUrl(): string {
  return (process.env.SITE_URL ?? "https://umn-ttc-membership.netlify.app").replace(/\/$/, "");
}

export async function createPayPalOrder(args: {
  orderId: string;
  amount: string;
  description: string;
}): Promise<{ id: string }> {
  return call<{ id: string }>("/v2/checkout/orders", {
    method: "POST",
    // Our own order id, echoed back on capture and in the webhook.
    idempotencyKey: args.orderId,
    body: JSON.stringify({
      intent: "CAPTURE",
      purchase_units: [
        {
          custom_id: args.orderId,
          description: args.description.slice(0, 127),
          amount: { currency_code: "USD", value: args.amount },
        },
      ],
      application_context: {
        brand_name: "UMN Table Tennis Club",
        shipping_preference: "NO_SHIPPING",
        user_action: "PAY_NOW",
        // Required for the mobile app-switch flow: tapping Venmo leaves the browser
        // entirely, so PayPal needs a destination to hand the buyer back to. The desktop
        // popup flow never uses these, which is why the omission only showed up on a phone.
        return_url: `${siteUrl()}/checkout/${args.orderId}`,
        cancel_url: `${siteUrl()}/checkout/${args.orderId}`,
      },
    }),
  });
}

export type PayPalCapture = {
  id: string;
  status: string;
  purchase_units?: Array<{ custom_id?: string }>;
};

export async function capturePayPalOrder(paypalOrderId: string): Promise<PayPalCapture> {
  return call<PayPalCapture>(`/v2/checkout/orders/${paypalOrderId}/capture`, {
    method: "POST",
    body: "{}",
  });
}

/** Asks PayPal whether a webhook body really came from PayPal. */
export async function verifyPayPalWebhook(
  headers: Headers,
  rawBody: string,
): Promise<boolean> {
  const webhookId = process.env.PAYPAL_WEBHOOK_ID;
  if (!webhookId) return false;

  const result = await call<{ verification_status: string }>(
    "/v1/notifications/verify-webhook-signature",
    {
      method: "POST",
      body: JSON.stringify({
        auth_algo: headers.get("paypal-auth-algo"),
        cert_url: headers.get("paypal-cert-url"),
        transmission_id: headers.get("paypal-transmission-id"),
        transmission_sig: headers.get("paypal-transmission-sig"),
        transmission_time: headers.get("paypal-transmission-time"),
        webhook_id: webhookId,
        webhook_event: JSON.parse(rawBody),
      }),
    },
  );
  return result.verification_status === "SUCCESS";
}
