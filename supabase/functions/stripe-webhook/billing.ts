// Pure billing rules for stripe-webhook, kept apart so they can be tested
// without Stripe or Supabase.

// Token Health Scan PRO prices (product prod_SL06FmW2V1gnjJ). The Stripe
// account also sells other products (Web3 Growth Audit, Web3 Roast, BRL
// plans), and this endpoint receives their events too.
export const THS_PRO_PRICE_IDS = new Set([
  "price_1RQK5tD41aNWIHmd4YspKxDi", // $20 / month
  "price_1RQK5tD41aNWIHmd1p46UCwl", // $120 / year
]);

export const PRO_SCAN_LIMIT = 10;
export const FREE_SCAN_LIMIT = 3;

export function isThsPrice(priceId: string | undefined | null): boolean {
  return !!priceId && THS_PRO_PRICE_IDS.has(priceId);
}

export function getPlanFromPriceId(priceId: string): "free" | "pro" {
  return isThsPrice(priceId) ? "pro" : "free";
}

// Statuses that keep PRO. past_due stays PRO while Stripe retries the card;
// Stripe moves the subscription to canceled or unpaid when retries run out.
const PRO_STATUSES = new Set(["active", "trialing", "past_due"]);

export function planForSubscription(status: string, priceId: string): "free" | "pro" {
  return PRO_STATUSES.has(status) ? getPlanFromPriceId(priceId) : "free";
}
