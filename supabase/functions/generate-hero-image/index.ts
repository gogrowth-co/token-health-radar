// Supabase Edge Function: generate-hero-image
// Generates complete branded hero images with token data and scores using OpenAI
// Replaces both ai-hero-background and compose-hero with single unified function

import "https://deno.land/x/xhr@0.4.0/mod.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Content-Type": "application/json",
};

type HeroRequest = {
  chain: string;
  address: string;
  name: string;
  symbol: string;
  overallScore?: number | null;
  scores?: {
    security: number | null;
    liquidity: number | null;
    tokenomics: number | null;
    community: number | null;
    development: number | null;
  };
  lastScannedAt?: string;
  vertical?: "defi" | "gaming" | "nft" | "meme" | "infra" | "other";
  mood?: "neutral" | "bullish" | "cautious";
}

type HeroResponse = {
  ok: boolean;
  url_1200x630?: string;
  url_1080x1920?: string;
  error?: string;
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
    const overallScore = payload.overallScore ?? null;
    const scores = payload.scores || { security: null, liquidity: null, tokenomics: null, community: null, development: null };
    const vertical = payload.vertical || 'other';
    const mood = payload.mood || 'neutral';
    const lastScannedAt = payload.lastScannedAt || new Date().toISOString();

    console.log('🎨 Hero image generation started:', { chain, address, name, symbol, overallScore });

    if (!address) {
      console.error('❌ Missing address in payload');
      return json({ ok: false, error: 'invalid_payload' });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!supabaseUrl || !serviceKey) {
      return json({ ok: false, error: 'missing_env' });
    }

    const supabase = createClient(supabaseUrl, serviceKey);

    // Check cache: if both files exist and are fresh, return them
    const basePath = `${chain}/${address}`;
    const file1200 = `${basePath}/hero_1200x630.png`;
    const file1080 = `${basePath}/hero_1080x1920.png`;

    try {
      const list = await supabase.storage.from('reports').list(basePath, {limit: 100});
      const files = list.data || [];
      const f1200 = files.find(f => f.name === 'hero_1200x630.png');
      const f1080 = files.find(f => f.name === 'hero_1080x1920.png');
      const freshMs = 7 * 24 * 60 * 60 * 1000; // 7 days
      const now = Date.now();
      
      if (f1200 && f1080) {
        const u1200 = f1200.updated_at ? new Date(f1200.updated_at).getTime() : 0;
        const u1080 = f1080.updated_at ? new Date(f1080.updated_at).getTime() : 0;
        if (u1200 && u1080 && (now - Math.min(u1200, u1080)) < freshMs) {
          const { data: p1 } = supabase.storage.from('reports').getPublicUrl(file1200);
          const { data: p2 } = supabase.storage.from('reports').getPublicUrl(file1080);
          return json({ ok: true, url_1200x630: p1.publicUrl, url_1080x1920: p2.publicUrl });
        }
      }
    } catch (_) { /* ignore cache issues */ }

    const openAIKey = Deno.env.get('OPENAI_API_KEY');
    if (!openAIKey) {
      console.error('❌ Missing OpenAI API key');
      return json({ ok: false, error: 'missing_openai_key' });
    }

    console.log('🚀 Generating hero images with OpenAI...');
    
    // Generate landscape hero image with OpenAI using supported size
    const [image1200, image1080] = await Promise.all([
      generateHeroImage(openAIKey, { name, symbol, chain, overallScore, scores, vertical, mood, lastScannedAt }, '1536x1024'),
      generateHeroImage(openAIKey, { name, symbol, chain, overallScore, scores, vertical, mood, lastScannedAt }, '1536x1024')
    ]);

    if (!image1200 || !image1080) {
      console.error('❌ OpenAI image generation failed');
      return json({ ok: false, error: 'ai_generation_failed' });
    }

    console.log('✅ OpenAI images generated successfully');

    // Upload both images
    const [up1, up2] = await Promise.all([
      supabase.storage.from('reports').upload(file1200, image1200, {
        upsert: true,
        contentType: 'image/png',
        cacheControl: '604800', // 7 days
      }),
      supabase.storage.from('reports').upload(file1080, image1080, {
        upsert: true,
        contentType: 'image/png', 
        cacheControl: '604800', // 7 days
      })
    ]);

    if (up1.error || up2.error) {
      console.error('❌ Storage upload errors:', up1.error, up2.error);
      return json({ ok: false, error: 'upload_failed' });
    }

    console.log('📁 Images uploaded to storage successfully');

    const { data: p1 } = supabase.storage.from('reports').getPublicUrl(file1200);
    const { data: p2 } = supabase.storage.from('reports').getPublicUrl(file1080);

    console.log('✅ Hero image generation complete:', { 
      url_1200x630: p1.publicUrl, 
      url_1080x1920: p2.publicUrl 
    });

    return json({ ok: true, url_1200x630: p1.publicUrl, url_1080x1920: p2.publicUrl });

  } catch (e) {
    console.error('Unhandled error:', e);
    return json({ ok: false, error: 'unexpected' });
  }
});

function json(obj: HeroResponse | Record<string, unknown>) {
  return new Response(JSON.stringify(obj), { headers: corsHeaders, status: 200 });
}

async function generateHeroImage(
  openAIKey: string, 
  data: {
    name: string;
    symbol: string;
    chain: string;
    overallScore: number | null;
    scores: { security: number | null; liquidity: number | null; tokenomics: number | null; community: number | null; development: number | null; };
    vertical: string;
    mood: string;
    lastScannedAt: string;
  },
  size: string
): Promise<Uint8Array | null> {
  
  const aspectRatio = size === '1536x1024' ? 'landscape (1200x630 aspect ratio)' : 'portrait (1080x1920 aspect ratio)';
  const isLandscape = size === '1536x1024';
  
  const prompt = `Create a professional crypto token branded hero image in ${aspectRatio} format.

TOKEN: ${data.name} (${data.symbol}) on ${data.chain} blockchain
CATEGORY: ${data.vertical}
MOOD: ${data.mood}

DESIGN REQUIREMENTS:
- Modern Web3 dashboard aesthetic with dark background (#0f1419 to #1a1f36 gradient)
- Prominent display of overall score: ${data.overallScore || 0}/100 with large, readable typography
- Include category breakdown scores:
  • Security: ${data.scores.security || 'N/A'}
  • Liquidity: ${data.scores.liquidity || 'N/A'} 
  • Tokenomics: ${data.scores.tokenomics || 'N/A'}
  • Community: ${data.scores.community || 'N/A'}
  • Development: ${data.scores.development || 'N/A'}
- Token symbol "${data.symbol}" prominently featured
- Clean, professional layout with good contrast
- No text cutoffs, ensure all content fits within frame
- Include "TokenHealthScan" branding subtly
- Use appropriate blockchain visual motifs for ${data.chain}

LAYOUT: ${isLandscape ? 
  'Horizontal layout: token info left, scores center, categories right' : 
  'Vertical layout: header with token info, large score display center, category scores bottom'
}

COLORS: Use green for high scores (70+), yellow for medium (40-69), red for low (<40), gray for N/A
STYLE: Professional, clean, high-contrast, suitable for social media sharing`;

  try {
    const promptSnippet = prompt.substring(0, 100) + '...';
    console.log(`🎯 OpenAI call initiated for size: ${size}, symbol: ${data.symbol}, prompt: ${promptSnippet}`);
    
    const genRes = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-image-1',
        prompt,
        size,
        quality: 'high'
      }),
    });

    const requestId = genRes.headers.get('x-request-id') || 'unknown';
    console.log(`📡 OpenAI response: status ${genRes.status}, x-request-id: ${requestId}`);

    if (!genRes.ok) {
      const errTxt = await genRes.text().catch(() => '');
      console.error(`❌ OpenAI API error for ${size}:`, { status: genRes.status, requestId, error: errTxt });
      return null;
    }

    const genJson = await genRes.json();
    const b64 = genJson?.data?.[0]?.b64_json as string | undefined;
    if (!b64) {
      console.error(`❌ OpenAI response missing b64_json for ${size}:`, { requestId, response: genJson });
      return null;
    }

    console.log(`✅ OpenAI generated ${size} image successfully for ${data.symbol}, request-id: ${requestId}`);
    return Uint8Array.from(atob(b64), c => c.charCodeAt(0));

  } catch (e) {
    console.error('OpenAI generation error:', e);
    return null;
  }
}