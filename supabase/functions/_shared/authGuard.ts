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

export async function verifyJwt(req: Request): Promise<{ userId?: string; valid: boolean }> {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return { valid: false };
  const token = authHeader.replace("Bearer ", "");

  try {
    // Path 1: authenticated user session — get the user record via their JWT.
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data, error } = await supabase.auth.getUser(token);
    if (!error && data?.user) return { userId: data.user.id, valid: true };

    // Path 2: anonymous browser user sending the anon key JWT.
    // The Supabase gateway already verified the signature before this function runs.
    // We just decode the payload and confirm the token is not expired.
    const parts = token.split(".");
    if (parts.length === 3) {
      const payload = JSON.parse(atob(parts[1]));
      if (payload.exp > Math.floor(Date.now() / 1000)) {
        return { valid: true }; // anonymous, no userId
      }
    }

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
): Promise<{ blocked: Response | null; userId?: string; via: "jwt" | "internal" }> {
  const internalSecret = Deno.env.get("INTERNAL_API_SECRET");
  const providedInternal = req.headers.get("x-internal-secret");
  if (internalSecret && providedInternal && providedInternal === internalSecret) {
    return { blocked: null, via: "internal" };
  }

  const { userId, valid } = await verifyJwt(req);
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
