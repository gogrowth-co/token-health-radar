import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

// The consent bar (2026-11-18, the EkkoGreen opt-out model of manga-os-v4 docs/standards/third-party-scripts.md). index.html sets the
// Consent Mode defaults before any tag loads; this bar only records the visitor's choice (cookie ths_consent, 6 months) and tells
// Google and Clarity at once. "Refuse" takes away cookies, never measurement: GA4 and Clarity keep running without cookies, and the
// cookie-only pixels in GTM stop (they need ad_storage).
const COOKIE = "ths_consent";
const SIX_MONTHS = 60 * 60 * 24 * 182;

type W = Window & { gtag?: (...a: unknown[]) => void; clarity?: (...a: unknown[]) => void };

function choose(value: "allow" | "deny") {
  document.cookie = `${COOKIE}=${value}; Max-Age=${SIX_MONTHS}; Path=/; SameSite=Lax; Secure`;
  const w = window as W;
  const v = value === "allow" ? "granted" : "denied";
  w.gtag?.("consent", "update", { ad_storage: v, analytics_storage: v, ad_user_data: v, ad_personalization: v });
  w.clarity?.("consentv2", { ad_Storage: v, analytics_Storage: v });
  if (value === "deny") {
    // cookies the tools already set on this visit go too; measurement continues without them
    for (const c of document.cookie.split("; ")) {
      const name = c.split("=")[0];
      if (/^(_ga|_gid|_gcl|_clck|_clsk|_ttp|_rdt_uuid|_twclid|_tt_enable_cookie|muc_ads|personalization_id|guest_id)/.test(name)) {
        for (const domain of ["", "; Domain=.tokenhealthscan.com", "; Domain=tokenhealthscan.com"]) document.cookie = `${name}=; Max-Age=0; Path=/${domain}`;
      }
    }
  }
}

export default function ConsentBar() {
  const [open, setOpen] = useState(false);
  useEffect(() => { setOpen(!new RegExp(`(?:^|; )${COOKIE}=`).test(document.cookie)); }, []);
  if (!open) return null;
  const pick = (v: "allow" | "deny") => { choose(v); setOpen(false); };
  return (
    <div role="region" aria-label="Cookie choice" data-consent-bar
      className="fixed inset-x-0 bottom-0 z-[60] border-t border-border bg-background/95 backdrop-blur px-4 py-3 shadow-lg">
      <div className="mx-auto flex max-w-5xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">
          We measure how the site is used with Google Analytics, Microsoft Clarity and the TikTok, Reddit and X pixels, which set cookies.
          If you refuse, we keep measuring without cookies and the pixels stop. <Link to="/privacy#cookies" className="underline">Privacy policy</Link>
        </p>
        <div className="flex shrink-0 gap-2">
          <button type="button" onClick={() => pick("deny")} data-consent="deny"
            className="rounded-md border border-border px-4 py-2 text-sm font-medium hover:bg-muted">Refuse</button>
          <button type="button" onClick={() => pick("allow")} data-consent="allow"
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90">Accept</button>
        </div>
      </div>
    </div>
  );
}
