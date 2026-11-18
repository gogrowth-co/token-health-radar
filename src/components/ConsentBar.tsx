import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { CONSENT_EVENT, choose, closeNotice, isInside, noticeClosed, readChoice, type Choice } from "@/lib/consent";

// The consent bar (manga-os-v4 docs/standards/third-party-scripts.md, the EkkoGreen opt-out model; Gabriel 2026-11-18).
// Inside the EU/EEA/UK/CH list it asks: nothing sets a cookie until "Accept". Outside it is a notice: the tools already run with
// cookies, and "Decline" denies every storage at once and on every later page. Either way GA4 and Clarity keep measuring without
// cookies after Decline; only the advertising pixels stop. index.html holds the defaults and the loader; src/lib/consent.ts the choice.
type Mode = "ask" | "notice" | null;

export default function ConsentBar() {
  const [mode, setMode] = useState<Mode>(null);
  useEffect(() => {
    let live = true;
    const decide = async () => {
      if (readChoice()) { if (live) setMode(null); return; }
      const inside = await isInside();
      if (!live) return;
      setMode(inside ? "ask" : noticeClosed() ? null : "notice");
    };
    decide();
    const onChange = () => { decide(); };
    window.addEventListener(CONSENT_EVENT, onChange);
    return () => { live = false; window.removeEventListener(CONSENT_EVENT, onChange); };
  }, []);
  if (!mode) return null;
  const pick = (v: Choice) => { choose(v); setMode(null); };
  return (
    <div role="region" aria-label="Cookie choice" data-consent-bar={mode}
      className="fixed inset-x-0 bottom-0 z-[60] border-t border-border bg-background/95 backdrop-blur px-4 py-3 shadow-lg">
      <div className="mx-auto flex max-w-5xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {mode === "ask" ? (
          <p className="text-sm text-muted-foreground">
            May we use cookies? Google Analytics, Microsoft Clarity and the TikTok, Reddit and X ad pixels would set them to measure the
            site and our ads. If you decline, we only measure without cookies and the ad pixels stay off.{" "}
            <Link to="/privacy#cookies" className="underline">Privacy policy</Link>
          </p>
        ) : (
          <p className="text-sm text-muted-foreground">
            We measure how the site is used with Google Analytics, Microsoft Clarity and the TikTok, Reddit and X ad pixels, which set
            cookies. Decline and we keep measuring without cookies and the pixels stop.{" "}
            <Link to="/privacy#cookies" className="underline">Privacy policy</Link>
          </p>
        )}
        <div className="flex shrink-0 gap-2">
          <button type="button" onClick={() => pick("deny")} data-consent="deny"
            className="rounded-md border border-border px-4 py-2 text-sm font-medium hover:bg-muted">Decline</button>
          {mode === "ask" ? (
            <button type="button" onClick={() => pick("allow")} data-consent="allow"
              className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90">Accept</button>
          ) : (
            <button type="button" onClick={() => { closeNotice(); setMode(null); }} data-consent="ok"
              className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90">OK</button>
          )}
        </div>
      </div>
    </div>
  );
}

/** The Decline link every visitor gets (footer, privacy page): Decline, or after it, the way back to Accept. */
export function ConsentLink({ className = "" }: { className?: string }) {
  const [choice, setChoice] = useState<Choice | null>(null);
  useEffect(() => {
    const read = () => setChoice(readChoice());
    read();
    window.addEventListener(CONSENT_EVENT, read);
    return () => window.removeEventListener(CONSENT_EVENT, read);
  }, []);
  if (choice === "deny") {
    return (
      <button type="button" data-consent-link="allow" onClick={() => choose("allow")} className={className}>
        Cookies declined (allow cookies)
      </button>
    );
  }
  return (
    <button type="button" data-consent-link="deny" onClick={() => choose("deny")} className={className}>
      Decline cookies
    </button>
  );
}
