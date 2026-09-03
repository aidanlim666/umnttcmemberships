"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { PayPalScriptProvider, PayPalButtons } from "@paypal/react-paypal-js";
import { Elements, PaymentElement, useElements, useStripe } from "@stripe/react-stripe-js";
import { loadStripe, type Stripe } from "@stripe/stripe-js";
import { useLang } from "@/i18n/LangProvider";

type Method = "paypal" | "stripe";

export function PayPanel({
  orderId,
  paypalAvailable,
  paypalClientId,
  stripeAvailable,
  stripePublishableKey,
}: {
  orderId: string;
  paypalAvailable: boolean;
  paypalClientId: string;
  stripeAvailable: boolean;
  stripePublishableKey: string;
}) {
  const { t, lang } = useLang();
  const [method, setMethod] = useState<Method>(paypalAvailable ? "paypal" : "stripe");
  const [error, setError] = useState<string | null>(null);

  const tabs: Array<{ id: Method; label: string; available: boolean; hint: string }> = [
    {
      id: "paypal",
      label: t("checkout.paypalVenmo"),
      available: paypalAvailable,
      hint: "PayPal · Venmo",
    },
    {
      id: "stripe",
      label: t("checkout.applePayCard"),
      available: stripeAvailable,
      hint: "Apple Pay · Visa · Mastercard",
    },
  ];

  return (
    <div className="card p-4">
      <h2 className="display mb-3 text-[13.5px] font-bold text-[var(--ink-2)]">
        {t("checkout.payWith")}
      </h2>

      <div className="mb-4 grid grid-cols-2 gap-2">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setMethod(tab.id)}
            className={[
              "focus-ring rounded-xl border px-3 py-2.5 text-left transition-colors",
              method === tab.id
                ? "border-[var(--maroon)] bg-[#fbeef1]"
                : "border-[var(--line)] bg-white hover:border-[var(--line-strong)]",
            ].join(" ")}
          >
            <span className="display block text-[12.5px] font-bold">{tab.label}</span>
            <span className="mt-0.5 block text-[10.5px] text-[var(--ink-3)]">{tab.hint}</span>
          </button>
        ))}
      </div>

      {error && (
        <p className="mb-3 rounded-lg bg-[#fff1f1] px-3 py-2 text-[12.5px] font-semibold text-[var(--price-deep)]">
          {error}
        </p>
      )}

      {method === "paypal" &&
        (paypalAvailable ? (
          <PayPalSection
            orderId={orderId}
            clientId={paypalClientId}
            lang={lang}
            onError={setError}
          />
        ) : (
          <NotConfigured text={t("checkout.notConfigured")} />
        ))}

      {method === "stripe" &&
        (stripeAvailable ? (
          <StripeSection
            orderId={orderId}
            publishableKey={stripePublishableKey}
            onError={setError}
          />
        ) : (
          <NotConfigured text={t("checkout.notConfigured")} />
        ))}

      <p className="mt-4 text-[11px] leading-relaxed text-[var(--ink-3)]">
        {t("checkout.securedBy")}
      </p>
    </div>
  );
}

function NotConfigured({ text }: { text: string }) {
  return (
    <p className="rounded-xl border border-dashed border-[var(--line-strong)] bg-[var(--surface-warm)] px-4 py-6 text-center text-[12.5px] text-[var(--ink-3)]">
      {text}
    </p>
  );
}

/* ------------------------------------------------------------------ PayPal + Venmo */

function PayPalSection({
  orderId,
  clientId,
  lang,
  onError,
}: {
  orderId: string;
  clientId: string;
  lang: string;
  onError: (msg: string | null) => void;
}) {
  const { t } = useLang();
  const router = useRouter();

  return (
    <PayPalScriptProvider
      options={{
        clientId,
        currency: "USD",
        intent: "capture",
        // Venmo is only reachable through PayPal's SDK, and only for US buyers.
        "enable-funding": "venmo",
        locale: lang === "zh" ? "zh_CN" : "en_US",
      }}
    >
      <PayPalButtons
        style={{ layout: "vertical", shape: "pill", height: 46 }}
        createOrder={async () => {
          onError(null);
          const res = await fetch("/api/paypal/create-order", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ orderId }),
          });
          if (!res.ok) throw new Error("create-order failed");
          const { paypalOrderId } = (await res.json()) as { paypalOrderId: string };
          return paypalOrderId;
        }}
        onApprove={async (data) => {
          const res = await fetch("/api/paypal/capture", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ orderId, paypalOrderId: data.orderID }),
          });
          if (!res.ok) {
            onError(t("checkout.failed"));
            return;
          }
          router.push(`/checkout/${orderId}/success`);
          router.refresh();
        }}
        onError={() => onError(t("checkout.failed"))}
      />
    </PayPalScriptProvider>
  );
}

/* ------------------------------------------------------------- Apple Pay + cards */

const stripeCache = new Map<string, Promise<Stripe | null>>();

function stripePromiseFor(key: string) {
  if (!stripeCache.has(key)) stripeCache.set(key, loadStripe(key));
  return stripeCache.get(key)!;
}

function StripeSection({
  orderId,
  publishableKey,
  onError,
}: {
  orderId: string;
  publishableKey: string;
  onError: (msg: string | null) => void;
}) {
  const { t } = useLang();
  const [clientSecret, setClientSecret] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/stripe/create-intent", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ orderId }),
    })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error("intent failed"))))
      .then((d: { clientSecret: string }) => {
        if (!cancelled) setClientSecret(d.clientSecret);
      })
      .catch(() => {
        if (!cancelled) onError(t("checkout.failed"));
      });
    return () => {
      cancelled = true;
    };
  }, [orderId, onError, t]);

  if (!clientSecret) {
    return <div className="h-32 animate-pulse rounded-xl bg-[var(--surface-warm)]" />;
  }

  return (
    <Elements
      stripe={stripePromiseFor(publishableKey)}
      options={{
        clientSecret,
        appearance: {
          theme: "flat",
          variables: {
            colorPrimary: "#7a0019",
            colorText: "#241a15",
            borderRadius: "10px",
            fontFamily: "system-ui, -apple-system, sans-serif",
          },
        },
      }}
    >
      <StripeForm orderId={orderId} onError={onError} />
    </Elements>
  );
}

function StripeForm({
  orderId,
  onError,
}: {
  orderId: string;
  onError: (msg: string | null) => void;
}) {
  const { t } = useLang();
  const stripe = useStripe();
  const elements = useElements();
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function pay(e: React.FormEvent) {
    e.preventDefault();
    if (!stripe || !elements) return;

    setBusy(true);
    onError(null);

    const { error, paymentIntent } = await stripe.confirmPayment({
      elements,
      redirect: "if_required",
      confirmParams: {
        return_url: `${window.location.origin}/checkout/${orderId}/success`,
      },
    });

    if (error || paymentIntent?.status !== "succeeded") {
      onError(t("checkout.failed"));
      setBusy(false);
      return;
    }

    // Confirm server-side so the membership is live before the success page renders.
    await fetch("/api/stripe/confirm", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ orderId, paymentIntentId: paymentIntent.id }),
    });

    router.push(`/checkout/${orderId}/success`);
    router.refresh();
  }

  return (
    <form onSubmit={pay} className="space-y-3">
      <PaymentElement options={{ layout: "tabs" }} />
      <button type="submit" disabled={!stripe || busy} className="btn btn-primary w-full py-3 text-[15px]">
        {busy ? t("checkout.processing") : t("product.buy")}
      </button>
    </form>
  );
}
