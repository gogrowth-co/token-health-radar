const APP_ORIGINS = new Set([
  'https://tokenhealthscan.com',
  'https://www.tokenhealthscan.com',
  'https://token-health-radar.lovable.app',
  'https://id-preview--77bad5d3-4413-4c36-8c05-5c134751e1f5.lovable.app',
]);

/** Billing only returns to this app, never a caller-selected website. */
export function billingReturnUrl(value: unknown): string | null {
  if (typeof value !== 'string' || value.length > 2048) return null;
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:' || url.username || url.password || !APP_ORIGINS.has(url.origin)) return null;
    return url.href;
  } catch {
    return null;
  }
}