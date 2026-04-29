/**
 * Open-redirect protection.
 *
 * Validates a destination URL against an allowlist of trusted hosts before
 * navigating away from the app. Use anywhere we assign `window.location.href`
 * with a value that came from a network response or third-party API.
 */

const ALLOWED_HOSTS = new Set<string>([
  "tokenhealthscan.com",
  "www.tokenhealthscan.com",
  "checkout.stripe.com",
  "billing.stripe.com",
]);

const ALLOWED_HOST_SUFFIXES = [".lovable.app", ".stripe.com"];

export function isSafeRedirectUrl(rawUrl: string): boolean {
  try {
    const url = new URL(rawUrl, window.location.origin);
    if (url.protocol !== "https:" && url.protocol !== "http:") return false;

    // Same-origin is always fine.
    if (url.origin === window.location.origin) return true;

    const host = url.hostname.toLowerCase();
    if (ALLOWED_HOSTS.has(host)) return true;
    if (ALLOWED_HOST_SUFFIXES.some((suffix) => host.endsWith(suffix))) return true;

    return false;
  } catch {
    return false;
  }
}

/**
 * Safely navigate to an external URL. Returns true on success, false if the
 * URL was rejected by the allowlist (caller should surface an error).
 */
export function safeRedirect(rawUrl: string): boolean {
  if (!isSafeRedirectUrl(rawUrl)) {
    console.error("[safeRedirect] Blocked navigation to untrusted URL:", rawUrl);
    return false;
  }
  window.location.href = rawUrl;
  return true;
}
