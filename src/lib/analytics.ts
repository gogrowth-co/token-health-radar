// GA4 product events (2026-11-18). They go through the gtag queue that index.html starts (window.dataLayer + window.gtag,
// configured for G-X9EQHXBVCS before the deferred gtag.js loads), so an event fired before the library arrives is sent once it does.
// A gtag command is an Arguments object, not an {event} object, so the GTM container's custom-event triggers (Reddit, Clarity)
// do not fire on these. Never send a wallet, an email or a token address: chain, score bucket and plan only.
type Params = Record<string, string | number | boolean | null | undefined>;

export function track(event: string, params: Params = {}): void {
  try {
    const w = window as unknown as { dataLayer?: unknown[]; gtag?: (...args: unknown[]) => void };
    if (typeof w.gtag === "function") { w.gtag("event", event, params); return; }
    w.dataLayer = w.dataLayer || [];
    // the same shape gtag() pushes, for a page that runs before index.html's queue exists
    (function gtagPush(..._args: unknown[]) { w.dataLayer!.push(arguments); })("event", event, params);
  } catch {
    // analytics never breaks the product
  }
}

/** A score as a coarse bucket: enough to read funnels, never the token itself. */
export function scoreBucket(score: number | null | undefined): string {
  if (score == null || !Number.isFinite(score)) return "unscored";
  if (score >= 80) return "80-100";
  if (score >= 60) return "60-79";
  if (score >= 40) return "40-59";
  return "0-39";
}

const PENDING_CHECKOUT = "ths_pending_checkout";

/** begin_checkout, and remember the plan so the return page can send purchase once. */
export function trackBeginCheckout(plan: string, priceId: string): void {
  track("begin_checkout", { plan, price_id: priceId, currency: "USD" });
  try { sessionStorage.setItem(PENDING_CHECKOUT, JSON.stringify({ plan, priceId })); } catch { /* storage blocked */ }
}

/** purchase on the checkout return page; at most once per checkout that this browser started. */
export function trackPurchaseOnce(): void {
  let pending: { plan?: string; priceId?: string } | null = null;
  try {
    pending = JSON.parse(sessionStorage.getItem(PENDING_CHECKOUT) || "null");
    sessionStorage.removeItem(PENDING_CHECKOUT);
  } catch { /* storage blocked */ }
  if (!pending) return;
  track("purchase", { plan: pending.plan, price_id: pending.priceId, currency: "USD", transaction_id: `${pending.priceId}-${Date.now()}` });
}
