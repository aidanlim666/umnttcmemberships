import Stripe from "stripe";

export const stripeConfigured = () => Boolean(process.env.STRIPE_SECRET_KEY);

let client: Stripe | null = null;

/** Apple Pay and cards both arrive through the same PaymentIntent. */
export function stripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("Stripe is not configured");
  client ??= new Stripe(key);
  return client;
}
