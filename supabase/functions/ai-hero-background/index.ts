// Supabase Edge Function: ai-hero-background
// Generates an AI hero background illustration using OpenAI gpt-image-1
// Saves two crops to Storage and returns public URLs with ok:true. Always 200.

import "https://deno.land/x/xhr@0.4.0/mod.ts"; // ensure fetch compatibility
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Content-Type": "application/json",
};

type HeroRequest = {
  chain: string
  address: string
  name: string
  symbol: string
  vertical?: "defi" | "gaming" | "nft" | "meme" | "infra" | "other"
  mood?: "neutral" | "bullish" | "cautious"
}

type HeroResponse = {
  ok: boolean
  url_1200x630?: string
  url_1080x1920?: string
  error?: string
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (req.method !== 'POST') {
      return json({ ok: false, error: 'invalid_method' });
    }

    const payload = (await req.json()) as HeroRequest;
    const chain = payload.chain || 'ethereum';
    const address = (payload.address || '').toLowerCase();
    const name = payload.name || 'Unknown Token';
    const symbol = payload.symbol || 'TKN';
    const vertical = payload.vertical || 'other';
    const mood = payload.mood || 'neutral';

    if (!address) {
      return json({ ok: false, error: 'invalid_payload' });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!supabaseUrl || !serviceKey) {
      return json({ ok: false, error: 'missing_env' });
    }

    const supabase = createClient(supabaseUrl, serviceKey);

    // Simple cache: if 1200x630 exists and is < 7 days old, return it
    const basePath = `reports/${chain}/${address}`;
    const file1200 = `${basePath}/hero_bg_1200x630.png`;
    const file1080 = `${basePath}/hero_bg_1080x1920.png`;

    try {
      const list = await supabase.storage.from('reports').list(`${basePath.replace(/^reports\//, '')}`, {limit: 100});
      const files = list.data || [];
      const f1200 = files.find(f => f.name === 'hero_bg_1200x630.png');
      const f1080 = files.find(f => f.name === 'hero_bg_1080x1920.png');
      const freshMs = 7 * 24 * 60 * 60 * 1000;
      const now = Date.now();
      if (f1200 && f1080) {
        const u1 = f1200.updated_at ? new Date(f1200.updated_at).getTime() : 0;
        if (u1 && (now - u1) < freshMs) {
          const { data: p1 } = supabase.storage.from('reports').getPublicUrl(file1200);
          const { data: p2 } = supabase.storage.from('reports').getPublicUrl(file1080);
          return json({ ok: true, url_1200x630: p1.publicUrl, url_1080x1920: p2.publicUrl });
        }
      }
    } catch (_) { /* ignore cache issues */ }

    const openAIKey = Deno.env.get('OPENAI_API_KEY');
    if (!openAIKey) {
      return json({ ok: false, error: 'missing_openai_key' });
    }

    const prompt = buildPrompt({ name, symbol, chain, vertical, mood });

    // Generate square image with OpenAI (gpt-image-1). Use larger size for better crops.
    const genRes = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-image-1',
        prompt,
        size: '1536x1536',
      }),
    });

    if (!genRes.ok) {
      const errTxt = await genRes.text().catch(() => '');
      console.error('OpenAI error:', errTxt);
      return json({ ok: false, error: 'ai_failed' });
    }

    const genJson = await genRes.json();
    const b64 = genJson?.data?.[0]?.b64_json as string | undefined;
    if (!b64) {
      return json({ ok: false, error: 'ai_failed' });
    }

    // For now, use the image as-is without cropping until we fix canvas issues
    const imageBytes = Uint8Array.from(atob(b64), c => c.charCodeAt(0));
    
    // Use the same image for both sizes (will be properly cropped later when canvas is fixed)
    const out1200 = imageBytes;
    const out1080 = imageBytes;

    // Upload
    const up1 = await supabase.storage.from('reports').upload(file1200, out1200, {
      upsert: true,
      contentType: 'image/png',
      cacheControl: '604800',
    });
    if (up1.error) {
      console.error('Upload 1200 error', up1.error);
      return json({ ok: false, error: 'upload_failed' });
    }

    const up2 = await supabase.storage.from('reports').upload(file1080, out1080, {
      upsert: true,
      contentType: 'image/png',
      cacheControl: '604800',
    });
    if (up2.error) {
      console.error('Upload 1080 error', up2.error);
      return json({ ok: false, error: 'upload_failed' });
    }

    const { data: p1 } = supabase.storage.from('reports').getPublicUrl(file1200);
    const { data: p2 } = supabase.storage.from('reports').getPublicUrl(file1080);

    return json({ ok: true, url_1200x630: p1.publicUrl, url_1080x1920: p2.publicUrl });
  } catch (e) {
    console.error('Unhandled', e);
    return json({ ok: false, error: 'unexpected' });
  }
});

function json(obj: HeroResponse | Record<string, unknown>) {
  return new Response(JSON.stringify(obj), { headers: corsHeaders, status: 200 });
}

function buildPrompt({ name, symbol, chain, vertical, mood }: { name: string; symbol: string; chain: string; vertical: string; mood: string; }) {
  return `Create a high-quality crypto editorial illustration in a bold vector style with thick outlines and flat colors.
Subject: The ${name} token (${symbol}) on ${chain}.
Theme: ${vertical} category.
Mood: ${mood}. Clean background, no text. Leave safe margins for top/bottom overlays.
Focus: recognizable central emblem or abstract symbol for ${symbol}. Subtle chain motif (e.g., ${chain} logo silhouettes).
Color direction: vibrant but not neon, high contrast, modern Web3 aesthetic.
Avoid: photorealism, text labels, screenshots, logotypes with trademarks overlaid.`;
}

// Temporarily disabled until canvas library is fixed
// function cropTo(img: Image, targetW: number, targetH: number): Uint8Array {
//   // Canvas implementation temporarily disabled
//   return new Uint8Array();
// }
