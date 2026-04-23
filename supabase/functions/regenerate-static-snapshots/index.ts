/**
 * regenerate-static-snapshots — cron entry point.
 *
 * Calls regenerate-seo-snapshot with { kind: 'all-static' } so marketing
 * routes stay fresh (date-stamped year strings, current copy edits, etc).
 *
 * Schedule via pg_cron in the Supabase dashboard:
 *   SELECT cron.schedule(
 *     'seo-static-daily', '0 4 * * *',
 *     $$ SELECT net.http_post(
 *          url := 'https://qaqebpcqespvzbfwawlp.supabase.co/functions/v1/regenerate-static-snapshots',
 *          headers := jsonb_build_object('x-cron-secret', current_setting('app.settings.cron_secret', true))
 *        ); $$
 *   );
 */

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-cron-secret, x-internal-secret",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function isAuthorized(req: Request): boolean {
  const cron = req.headers.get("x-cron-secret");
  if (cron && cron === Deno.env.get("CRON_SECRET")) return true;
  const internal = req.headers.get("x-internal-secret");
  if (internal && internal === Deno.env.get("INTERNAL_API_SECRET")) return true;
  const auth = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "");
  if (auth && auth === Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")) return true;
  return false;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders, status: 204 });
  }
  if (!isAuthorized(req)) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const url = `${Deno.env.get("SUPABASE_URL")}/functions/v1/regenerate-seo-snapshot`;
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
      },
      body: JSON.stringify({ kind: "all-static" }),
    });
    const json = await res.json();
    return new Response(JSON.stringify({ ok: res.ok, downstream: json }), {
      status: res.ok ? 200 : 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ ok: false, error: String((err as Error).message) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
