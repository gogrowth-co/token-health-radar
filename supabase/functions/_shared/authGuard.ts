/**
 * Shared auth helpers for hardening edge functions.
 *
 * - requireAuthOrInternal: allows either a valid Supabase JWT OR a matching
 *   x-internal-secret header (used for server-to-server calls).
 * - requireJwt: enforces a valid Supabase JWT (any authenticated user).
 * - requireCronSecret: enforces a matching x-cron-secret header.
 * - getClientIp: extracts best-guess client IP for rate limiting.
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.7";

export interface AuthResult {
  ok: boolean;
  userId?: string;
  via: "jwt" | "internal" | "cron" | "none";
  status?: number;
  error?: string;
}

export function getClientIp(req: Request): string {
  return (
    req.headers.get("CF-Connecting-IP") ||
    req.headers.get("X-Forwarded-For")?.split(",")[0]?.trim() ||
    req.headers.get("X-Real-IP") ||
    "unknown"
  );
}

function unauthorized(corsHeaders: Record<string, string>, message = "Unauthorized") {
  return new Response(JSON.stringify({ error: message }), {
    status: 401,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// Project API keys (anon, service_role) are JWTs, but a function deployed with verify_jwt = false (run-token-scan) gets requests the
// gateway never checked: decoding the payload alone accepted any forged token (2026-10-27). A key now counts only when it is one of
// this project's own keys (exact match) or Supabase accepts it (a probe the gateway authenticates); the answer is cached per key.
const keyRoles = new Map<string, { role: string | null; at: number }>();
const KEY_TTL_MS = 10 * 60 * 1000;

function claims(token: string): Record<string, unknown> | null {
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  try { return JSON.parse(atob(parts[1].replace(/-/g, "+").replace(/_/g, "/"))); } catch { return null; }
}

/** "anon" or "service_role" when the token is a real key of this project, else null. */
export async function projectKeyRole(token: string, fetchImpl: typeof fetch = fetch): Promise<string | null> {
  if (token && token === Deno.env.get("SUPABASE_ANON_KEY")) return "anon";
  if (token && token === Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")) return "service_role";
  const c = claims(token);
  const role = typeof c?.role === "string" ? c.role : null;
  if (role !== "anon" && role !== "service_role") return null;
  if (typeof c?.exp === "number" && c.exp <= Math.floor(Date.now() / 1000)) return null;
  const cached = keyRoles.get(token);
  if (cached && Date.now() - cached.at < KEY_TTL_MS) return cached.role;
  const base = Deno.env.get("SUPABASE_URL")!;
  // the gateway authenticates the key on both probes; only the service role may list auth users
  const probe = role === "service_role" ? `${base}/auth/v1/admin/users?per_page=1` : `${base}/auth/v1/settings`;
  let accepted = false;
  try {
    const r = await fetchImpl(probe, { headers: { apikey: token, Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(5000) });
    accepted = r.ok;
    await r.body?.cancel();
  } catch { accepted = false; }
  const result = accepted ? role : null;
  keyRoles.set(token, { role: result, at: Date.now() });
  return result;
}

export async function verifyJwt(req: Request): Promise<{ userId?: string; valid: boolean; role?: "user" | "anon" | "service_role" }> {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return { valid: false };
  const token = authHeader.replace("Bearer ", "");

  try {
    // Path 1: a signed-in user's session; Supabase Auth verifies it.
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data, error } = await supabase.auth.getUser(token);
    if (!error && data?.user) return { userId: data.user.id, valid: true, role: "user" };

    // Path 2: a project key (the website's anon key, or the service role key of internal callers), checked as above.
    const role = await projectKeyRole(token);
    if (role === "anon" || role === "service_role") return { valid: true, role };
    return { valid: false };
  } catch {
    return { valid: false };
  }
}

/**
 * Allow either a valid JWT or an x-internal-secret header matching INTERNAL_API_SECRET.
 * Returns null when allowed, or a 401 Response when blocked.
 */
export async function requireAuthOrInternal(
  req: Request,
  corsHeaders: Record<string, string>
): Promise<{ blocked: Response | null; userId?: string; via: "jwt" | "internal" | "anon" }> {
  const internalSecret = Deno.env.get("INTERNAL_API_SECRET");
  const providedInternal = req.headers.get("x-internal-secret");
  if (internalSecret && providedInternal && providedInternal === internalSecret) {
    return { blocked: null, via: "internal" };
  }

  const { userId, valid, role } = await verifyJwt(req);
  if (valid && role === "service_role") return { blocked: null, via: "internal" };
  if (valid && role === "anon") return { blocked: null, via: "anon" };
  if (valid) return { blocked: null, userId, via: "jwt" };

  return { blocked: unauthorized(corsHeaders), via: "jwt" };
}

/** Require a valid Supabase user JWT. */
export async function requireJwt(
  req: Request,
  corsHeaders: Record<string, string>
): Promise<{ blocked: Response | null; userId?: string }> {
  const { userId, valid } = await verifyJwt(req);
  if (!valid) return { blocked: unauthorized(corsHeaders) };
  return { blocked: null, userId };
}

/** Require x-cron-secret header to match CRON_SECRET env var. */
export function requireCronSecret(
  req: Request,
  corsHeaders: Record<string, string>
): Response | null {
  const expected = Deno.env.get("CRON_SECRET");
  const provided = req.headers.get("x-cron-secret");
  if (!expected) {
    return new Response(
      JSON.stringify({ error: "CRON_SECRET not configured" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
  if (!provided || provided !== expected) {
    return unauthorized(corsHeaders, "Invalid cron secret");
  }
  return null;
}
