// Supabase Edge Function: render-score-snapshot
// Generates a score snapshot image with overall score and category breakdowns

import "https://deno.land/x/xhr@0.4.0/mod.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Content-Type": "application/json",
};

type Scores = {
  security: number | null;
  liquidity: number | null;
  tokenomics: number | null;
  community: number | null;
  development: number | null;
};

type SnapshotRequest = {
  chain: string;
  address: string;
  name: string;
  symbol: string;
  overallScore?: number | null;
  scores?: Scores;
  lastScannedAt?: string;
  format?: 'og' | 'story';
};

type SnapshotResponse = {
  ok: boolean;
  url?: string;
  error?: string;
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (req.method !== 'POST') {
      return json({ ok: false, error: 'invalid_method' });
    }

    const payload = (await req.json()) as SnapshotRequest;
    const chain = payload.chain || 'ethereum';
    const address = (payload.address || '').toLowerCase();
    const name = payload.name || 'Unknown Token';
    const symbol = payload.symbol || 'TKN';
    const overallScore = payload.overallScore ?? 0;
    const scores = payload.scores || { security: null, liquidity: null, tokenomics: null, community: null, development: null };
    const format = payload.format || 'og';

    if (!address) {
      return json({ ok: false, error: 'invalid_payload' });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!supabaseUrl || !serviceKey) {
      return json({ ok: false, error: 'missing_env' });
    }

    const supabase = createClient(supabaseUrl, serviceKey);

    // For now, return a simple SVG-based image until we fix canvas issues
    const width = format === 'story' ? 1080 : 1200;
    const height = format === 'story' ? 1920 : 630;

    // Generate SVG
    const svgContent = generateScoreSnapshotSVG({
      name,
      symbol,
      overallScore,
      scores,
      width,
      height
    });

    // Convert SVG to PNG using a simple approach
    // For now, we'll use the OpenAI API to generate a score visualization
    const openAIKey = Deno.env.get('OPENAI_API_KEY');
    if (!openAIKey) {
      return json({ ok: false, error: 'missing_openai_key' });
    }

    const prompt = `Create a professional crypto token score visualization for ${name} (${symbol}). Show overall score of ${overallScore}/100 prominently. Include category scores: Security ${scores.security || 0}, Liquidity ${scores.liquidity || 0}, Tokenomics ${scores.tokenomics || 0}, Community ${scores.community || 0}, Development ${scores.development || 0}. Use a clean, modern dashboard style with dark background and bright accent colors. No text overlays.`;

    const genRes = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-image-1',
        prompt,
        size: width <= 1024 && height <= 1024 ? '1024x1024' : 
              width > height ? '1536x1024' : '1024x1536',
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
      console.error('OpenAI response missing b64_json:', genJson);
      return json({ ok: false, error: 'ai_no_image' });
    }

    // Upload to storage
    const fileName = format === 'story' ? 'score-snapshot_1080x1920.png' : 'score-snapshot_1200x630.png';
    const filePath = `reports/${chain}/${address}/${fileName}`;
    const imageBytes = Uint8Array.from(atob(b64), c => c.charCodeAt(0));

    const uploadRes = await supabase.storage.from('reports').upload(filePath, imageBytes, {
      upsert: true,
      contentType: 'image/png',
      cacheControl: '3600',
    });

    if (uploadRes.error) {
      console.error('Upload error:', uploadRes.error);
      return json({ ok: false, error: 'upload_failed' });
    }

    const { data } = supabase.storage.from('reports').getPublicUrl(filePath);
    return json({ ok: true, url: data.publicUrl });

  } catch (e) {
    console.error('Unhandled error:', e);
    return json({ ok: false, error: 'unexpected' });
  }
});

function json(obj: SnapshotResponse | Record<string, unknown>) {
  return new Response(JSON.stringify(obj), { headers: corsHeaders, status: 200 });
}

function generateScoreSnapshotSVG({ name, symbol, overallScore, scores, width, height }: {
  name: string;
  symbol: string;
  overallScore: number;
  scores: Scores;
  width: number;
  height: number;
}): string {
  // Simple SVG fallback
  return `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
    <rect width="100%" height="100%" fill="#1a1a1a"/>
    <text x="50%" y="50%" text-anchor="middle" fill="white" font-size="48" font-family="Arial">
      ${name} (${symbol})
    </text>
    <text x="50%" y="60%" text-anchor="middle" fill="#00ff88" font-size="72" font-family="Arial">
      ${overallScore}/100
    </text>
  </svg>`;
}