/**
 * Project API keys for edge functions (security audit F1, 2026-11-23).
 *
 * The legacy service_role JWT leaked in this public repo's history, so every caller moves to the new keys and the legacy keys
 * are switched off. The runtime injects the new keys as JSON dictionaries keyed by key name:
 *   SUPABASE_SECRET_KEYS      = {"default":"sb_secret_..."}
 *   SUPABASE_PUBLISHABLE_KEYS = {"default":"sb_publishable_..."}
 * SUPABASE_SERVICE_ROLE_KEY / SUPABASE_ANON_KEY keep carrying the legacy JWTs even after the switch-off, so they are only a
 * fallback for a runtime that has no new keys (local dev), never a key that authorizes a caller by equality (see authGuard).
 */

function dictionary(name: string): Record<string, string> {
  const raw = Deno.env.get(name);
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return {};
    const out: Record<string, string> = {};
    for (const [k, v] of Object.entries(parsed)) if (typeof v === "string" && v) out[k] = v;
    return out;
  } catch {
    return {};
  }
}

function pick(name: string): string | undefined {
  const d = dictionary(name);
  return d.default ?? Object.values(d)[0];
}

/** The project's secret key (bypasses RLS). Server side only. */
export function serviceKey(): string {
  return pick("SUPABASE_SECRET_KEYS") ?? Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
}

/** The project's publishable key (public, RLS applies). */
export function publishableKey(): string {
  return pick("SUPABASE_PUBLISHABLE_KEYS") ?? Deno.env.get("SUPABASE_ANON_KEY") ?? "";
}

/** Headers for a call to another edge function (or the REST API) as the service: the key on apikey and the same key as Bearer. */
export function serviceHeaders(extra: Record<string, string> = {}): Record<string, string> {
  const k = serviceKey();
  return { apikey: k, Authorization: `Bearer ${k}`, ...extra };
}

function sameSecret(a: string, b: string): boolean {
  if (!a || !b || a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/** "service_role" / "anon" when the token is one of this project's NEW keys (exact match), else null. Legacy JWTs are not matched here. */
export function newKeyRole(token: string | null | undefined): "service_role" | "anon" | null {
  if (!token) return null;
  for (const v of Object.values(dictionary("SUPABASE_SECRET_KEYS"))) if (sameSecret(token, v)) return "service_role";
  for (const v of Object.values(dictionary("SUPABASE_PUBLISHABLE_KEYS"))) if (sameSecret(token, v)) return "anon";
  return null;
}

/** The caller's key: the Bearer token, or the apikey header when there is no Bearer. */
export function callerToken(req: Request): string | null {
  const bearer = req.headers.get("Authorization")?.match(/^Bearer\s+(.+)$/i)?.[1]?.trim();
  if (bearer) return bearer;
  return req.headers.get("apikey")?.trim() || null;
}
