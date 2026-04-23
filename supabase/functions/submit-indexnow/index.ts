const corsHeaders = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type", "Access-Control-Allow-Methods": "POST, OPTIONS" };
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders });
  try {
    const key = Deno.env.get("INDEXNOW_API_KEY");
    const body = await req.json().catch(() => ({}));
    const urls = body.urls || (body.url ? [body.url] : []);
    if (!key) return new Response(JSON.stringify({ success: true, skipped: true, reason: "INDEXNOW_API_KEY not configured" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    if (!urls.length) return new Response(JSON.stringify({ success: true, skipped: true, reason: "No URLs provided" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    const response = await fetch("https://api.indexnow.org/indexnow", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ host: "tokenhealthscan.com", key, urlList: urls }) });
    return new Response(JSON.stringify({ success: response.ok, status: response.status, urls }), { status: response.ok ? 200 : 502, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error) { return new Response(JSON.stringify({ error: String(error?.message || error) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }); }
});
