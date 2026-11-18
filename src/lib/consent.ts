// Consent choice (manga-os-v4 docs/standards/third-party-scripts.md, the EkkoGreen opt-out model; Gabriel 2026-11-18).
// index.html sets the Consent Mode defaults and window.__thsConsent before any tag loads; this module records the visitor's choice
// (cookie ths_consent, 6 months) and tells Google, Clarity and the loaded pixels at once.
// Decline takes away cookies, never measurement (rule 0): GA4 and Clarity keep running without cookies; only the cookie-only pixels
// (TikTok, Reddit, X) stop, through their ad_storage consent check in GTM-P84WRMG9 and, on the page where they already ran, their own
// consent call. This is a single-page app, so "the next page" is often a route change on the same document.
export const CONSENT_COOKIE = "ths_consent";
const SIX_MONTHS = 60 * 60 * 24 * 182;
export const CONSENT_EVENT = "ths-consent-change";

export type Choice = "allow" | "deny";

type ThsConsent = { choice: Choice | null; inside: boolean; ready: Promise<boolean> | null };
type W = Window & {
  __thsConsent?: ThsConsent;
  gtag?: (...a: unknown[]) => void;
  clarity?: (...a: unknown[]) => void;
  ttq?: { revokeConsent?: () => void; grantConsent?: () => void; disableCookie?: () => void; enableCookie?: () => void };
};

/** A visitor outside the list closed the notice with "OK" (same cookie; it grants nothing the default had not). */
export function noticeClosed(): boolean {
  return /(?:^|; )ths_consent=ok(?:;|$)/.test(document.cookie);
}

export function closeNotice(): void {
  document.cookie = `${CONSENT_COOKIE}=ok; Max-Age=${SIX_MONTHS}; Path=/; SameSite=Lax; Secure`;
  window.dispatchEvent(new CustomEvent(CONSENT_EVENT, { detail: "ok" }));
}

export function readChoice(): Choice | null {
  const m = /(?:^|; )ths_consent=(deny|allow)/.exec(document.cookie);
  return m ? (m[1] as Choice) : null;
}

/** Whether this visitor is inside the EU/EEA/UK/CH list (time zone at once, Cloudflare's country when it answers). */
export async function isInside(): Promise<boolean> {
  const s = (window as W).__thsConsent;
  if (!s) return false;
  if (s.inside) return true;
  // the head script's fetch has no timeout of its own; never hold the bar longer than the loader waits
  const late = new Promise<boolean>((r) => setTimeout(() => r(s.inside), 1500));
  try { return s.ready ? await Promise.race([s.ready, late]) : s.inside; } catch { return s.inside; }
}

// first-party cookies the tools set; Decline removes the ones already set on this visit
const TOOL_COOKIES = /^(_ga|_gid|_gcl|_clck|_clsk|_ttp|_rdt_uuid|_rdt_em|_twclid|_tt_enable_cookie|ttcsid|muc_ads|personalization_id|guest_id)/;

function clearToolCookies() {
  const host = location.hostname.replace(/^www\./, "");
  for (const c of document.cookie.split("; ")) {
    const name = c.split("=")[0];
    if (!TOOL_COOKIES.test(name)) continue;
    for (const domain of ["", `; Domain=.${host}`, `; Domain=${host}`]) document.cookie = `${name}=; Max-Age=0; Path=/${domain}`;
  }
}

export function choose(value: Choice): void {
  document.cookie = `${CONSENT_COOKIE}=${value}; Max-Age=${SIX_MONTHS}; Path=/; SameSite=Lax; Secure`;
  const w = window as W;
  const v = value === "allow" ? "granted" : "denied";
  try {
    w.gtag?.("consent", "update", { ad_storage: v, analytics_storage: v, ad_user_data: v, ad_personalization: v });
    w.clarity?.("consentv2", { ad_Storage: v, analytics_Storage: v });
    if (value === "deny") {
      // a pixel that already ran on this document stops here too (route changes do not reload the page)
      w.ttq?.revokeConsent?.();
      w.ttq?.disableCookie?.();
      clearToolCookies();
      // TikTok writes its session cookies again a moment after revoke; clear once more after it settles
      setTimeout(clearToolCookies, 1500);
    } else {
      w.ttq?.enableCookie?.();
      w.ttq?.grantConsent?.();
      // GTM-P84WRMG9 fires the TikTok and X pixels on this event too (once per document), so an Accept starts them without a reload
      (w as unknown as { dataLayer?: unknown[] }).dataLayer?.push({ event: "ths_consent_allow" });
    }
  } catch {
    // consent signalling never breaks the page
  }
  if (w.__thsConsent) w.__thsConsent.choice = value;
  window.dispatchEvent(new CustomEvent(CONSENT_EVENT, { detail: value }));
}
