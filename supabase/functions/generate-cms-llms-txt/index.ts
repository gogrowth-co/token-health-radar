import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.7";
const corsHeaders = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type", "Access-Control-Allow-Methods": "POST, OPTIONS" };
const SITE_URL = "https://tokenhealthscan.com";
function strip(html: string) { return (html || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim(); }
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders });
  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  try {
    const { data, error } = await supabase.from("pages").select("*, page_translations(*)").eq("status", "published").eq("page_translations.language", "en").order("updated_at", { ascending: false }).limit(100);
    if (error) throw error;
    const articles = (data || []).map((page: any) => { const t = Array.isArray(page.page_translations) ? page.page_translations[0] : page.page_translations; const slug = t?.slug || page.slug; return { title: t?.title || page.slug, url: `${SITE_URL}/publications/${slug}`, description: t?.meta_description || strip(t?.content || "").slice(0, 180), content: strip(t?.content || "") }; });
    const llms = `# Token Health Scan\n\nToken Health Scan helps Web3 users evaluate crypto token health across Security, Liquidity, Tokenomics, Community, and Development.\n\n## Main routes\n- ${SITE_URL}/\n- ${SITE_URL}/token\n- ${SITE_URL}/token-scan-guide\n- ${SITE_URL}/ai-agents\n- ${SITE_URL}/publications\n\n## Publications\n${articles.map((a) => `- [${a.title}](${a.url}): ${a.description}`).join("\n") || "No published CMS articles yet."}\n`;
    const full = `${llms}\n\n## Expanded publication content\n${articles.map((a) => `\n### ${a.title}\nURL: ${a.url}\n${a.content.slice(0, 4000)}`).join("\n")}`;
    await supabase.storage.from("blog-images").upload("llms.txt", new Blob([llms], { type: "text/plain" }), { contentType: "text/plain; charset=utf-8", upsert: true });
    await supabase.storage.from("blog-images").upload("llms-full.txt", new Blob([full], { type: "text/plain" }), { contentType: "text/plain; charset=utf-8", upsert: true });
    return new Response(llms, { headers: { ...corsHeaders, "Content-Type": "text/plain; charset=utf-8" } });
  } catch (error) { return new Response(JSON.stringify({ error: String(error?.message || error) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }); }
});
