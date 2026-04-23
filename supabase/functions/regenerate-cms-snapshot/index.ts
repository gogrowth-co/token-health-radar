import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.7";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const SITE_URL = "https://tokenhealthscan.com";
const SITE_NAME = "Token Health Scan";
const DEFAULT_IMAGE = `${SITE_URL}/lovable-uploads/tokenhealthscan-og.png`;

function esc(input: unknown) {
  return String(input ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#39;");
}
function strip(html: string) { return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim(); }
function snapshot(page: any) {
  const t = Array.isArray(page.page_translations) ? page.page_translations[0] : page.page_translations;
  const slug = t?.slug || page.slug;
  const title = t?.title || page.slug;
  const desc = t?.meta_description || strip(t?.content || "").slice(0, 155) || "Token Health Scan publication.";
  const canonical = `${SITE_URL}/publications/${encodeURIComponent(slug)}`;
  const image = page.featured_image || DEFAULT_IMAGE;
  const articleLd = t?.schema || { "@context": "https://schema.org", "@type": "Article", headline: title, description: desc, image, author: { "@type": "Organization", name: page.author_name || SITE_NAME }, publisher: { "@type": "Organization", name: SITE_NAME }, datePublished: page.created_at, dateModified: page.updated_at, mainEntityOfPage: canonical };
  const breadcrumbLd = { "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: [{ "@type": "ListItem", position: 1, name: "Home", item: SITE_URL }, { "@type": "ListItem", position: 2, name: "Publications", item: `${SITE_URL}/publications` }, { "@type": "ListItem", position: 3, name: title, item: canonical }] };
  return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/><title>${esc(title)} | ${SITE_NAME}</title><meta name="description" content="${esc(desc)}"/><link rel="canonical" href="${esc(canonical)}"/><meta property="og:type" content="article"/><meta property="og:site_name" content="${SITE_NAME}"/><meta property="og:title" content="${esc(title)}"/><meta property="og:description" content="${esc(desc)}"/><meta property="og:url" content="${esc(canonical)}"/><meta property="og:image" content="${esc(image)}"/><meta name="twitter:card" content="summary_large_image"/><meta name="twitter:title" content="${esc(title)}"/><meta name="twitter:description" content="${esc(desc)}"/><meta name="twitter:image" content="${esc(image)}"/><script type="application/ld+json">${JSON.stringify(articleLd).replaceAll("<", "\\u003c")}</script><script type="application/ld+json">${JSON.stringify(breadcrumbLd).replaceAll("<", "\\u003c")}</script><style>body{font-family:system-ui,-apple-system,sans-serif;max-width:860px;margin:0 auto;padding:28px;background:#0f172a;color:#e2e8f0;line-height:1.65}a{color:#60a5fa}img{max-width:100%;border-radius:8px}h1{font-size:2.5rem;line-height:1.1}nav,.meta{color:#94a3b8}</style></head><body><nav><a href="${SITE_URL}">${SITE_NAME}</a> › <a href="${SITE_URL}/publications">Publications</a></nav><main><h1>${esc(title)}</h1><p class="meta">${esc(page.author_name || SITE_NAME)} · ${esc(page.read_time || "")}</p>${image ? `<img src="${esc(image)}" alt="${esc(t?.featured_image_alt || title)}"/>` : ""}<p>${esc(desc)}</p><section>${t?.content || ""}</section></main></body></html>`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders });
  if (req.method !== "POST") return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  try {
    const body = await req.json().catch(() => ({}));
    if (body.remove && body.slug) {
      await supabase.storage.from("seo-snapshots").remove([`publications/${body.slug}/index.html`]);
      return new Response(JSON.stringify({ success: true, removed: body.slug }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    let query = supabase.from("pages").select("*, page_translations(*)").eq("status", "published").eq("page_translations.language", "en");
    if (body.slug) query = query.eq("slug", body.slug);
    const { data, error } = await query;
    if (error) throw error;
    const written: string[] = [];
    for (const page of data || []) {
      const t = Array.isArray(page.page_translations) ? page.page_translations[0] : page.page_translations;
      const slug = t?.slug || page.slug;
      const html = snapshot(page);
      const { error: uploadError } = await supabase.storage.from("seo-snapshots").upload(`publications/${slug}/index.html`, new Blob([html], { type: "text/html" }), { contentType: "text/html; charset=utf-8", upsert: true });
      if (uploadError) throw uploadError;
      written.push(slug);
    }
    return new Response(JSON.stringify({ success: true, written }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error) {
    return new Response(JSON.stringify({ error: String(error?.message || error) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
