/** Money is stored and computed in integer cents; only formatting turns it into dollars. */

export function formatUsd(cents: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: cents % 100 === 0 ? 0 : 2,
  }).format(cents / 100);
}

/** PayPal and Stripe both want a decimal string like "50.00". */
export function toDecimalString(cents: number): string {
  return (cents / 100).toFixed(2);
}
