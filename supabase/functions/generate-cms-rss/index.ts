import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.7";
const corsHeaders = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type", "Access-Control-Allow-Methods": "POST, OPTIONS" };
const SITE_URL = "https://tokenhealthscan.com";
function esc(s: unknown) { return String(s ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;"); }
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders });
  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  try {
    const { data, error } = await supabase.from("pages").select("*, page_translations(*)").eq("status", "published").eq("page_translations.language", "en").order("updated_at", { ascending: false }).limit(100);
    if (error) throw error;
    const items = (data || []).map((page: any) => { const t = Array.isArray(page.page_translations) ? page.page_translations[0] : page.page_translations; const slug = t?.slug || page.slug; return `<item><title>${esc(t?.title)}</title><link>${SITE_URL}/publications/${esc(slug)}</link><guid>${SITE_URL}/publications/${esc(slug)}</guid><description>${esc(t?.meta_description)}</description><pubDate>${new Date(page.updated_at || page.created_at).toUTCString()}</pubDate><author>${esc(page.author_name || "Token Health Scan")}</author>${page.category ? `<category>${esc(page.category)}</category>` : ""}${page.featured_image ? `<enclosure url="${esc(page.featured_image)}" type="image/jpeg"/>` : ""}</item>`; }).join("\n");
    const rss = `<?xml version="1.0" encoding="UTF-8"?><rss version="2.0"><channel><title>Token Health Scan Publications</title><link>${SITE_URL}/publications</link><description>Token research guides and risk analysis.</description><language>en</language>${items}</channel></rss>`;
    for (const path of ["rss.xml", "rss-en.xml", "rss/en.xml"]) await supabase.storage.from("blog-images").upload(path, new Blob([rss], { type: "application/rss+xml" }), { contentType: "application/rss+xml", upsert: true });
    return new Response(rss, { headers: { ...corsHeaders, "Content-Type": "application/rss+xml" } });
  } catch (error) { return new Response(JSON.stringify({ error: String(error?.message || error) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }); }
});
