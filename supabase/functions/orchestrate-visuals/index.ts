// Supabase Edge Function: orchestrate-visuals
// Coordinates visual asset generation with freshness checks & locking

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Content-Type": "application/json",
};

type Scores = { security: number | null; liquidity: number | null; tokenomics: number | null; community: number | null; development: number | null };

type RequestBody = {
  chain: string;
  address: string;
  tokenId: string;
  name: string;
  symbol: string;
  logoUrl?: string;
  overallScore?: number | null;
  scores?: Scores;
  lastScannedAt?: string;
  verticalHint?: "defi" | "gaming" | "nft" | "meme" | "infra" | "other";
  mood?: "neutral" | "bullish" | "cautious";
  force?: boolean;
};

type Resp = { ok: boolean; assets: Record<string, string>; skipped?: string[]; errors?: Array<{ step: string; error: string }> };

const FRESHNESS = {
  scoreSnapshot: 60 * 60,           // 1h
  charts:        6  * 60 * 60,      // 6h
  heroBg:        7  * 24 * 60 * 60, // 7d
  heroFinal:     24 * 60 * 60,      // 24h
} as const;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  const errors: Array<{ step: string; error: string }> = [];
  const assets: Record<string, string> = {};
  const skipped: string[] = [];

  try {
    if (req.method !== 'POST') return json({ ok: false, assets, errors: [{ step: 'orchestrate', error: 'invalid_method' }] });

    const body = (await req.json()) as RequestBody;
    const chain = body.chain || 'ethereum';
    const address = (body.address || '').toLowerCase();
    const tokenId = body.tokenId || `${chain}_${address}`;
    const name = body.name || 'Unknown Token';
    const symbol = body.symbol || 'TKN';
    const logoUrl = body.logoUrl;
    const overallScore = body.overallScore ?? null;
    const scores = body.scores || { security: null, liquidity: null, tokenomics: null, community: null, development: null };
    const lastScannedAt = body.lastScannedAt || new Date().toISOString();
    const vertical = body.verticalHint || 'other';
    const mood = body.mood || 'neutral';
    const force = !!body.force;

    if (!address) return json({ ok: false, assets, errors: [{ step: 'orchestrate', error: 'invalid_payload' }] });

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!supabaseUrl || !serviceKey) return json({ ok: false, assets, errors: [{ step: 'env', error: 'missing_env' }] });

    const supabase = createClient(supabaseUrl, serviceKey);

    const folder = `${chain}/${address}`;

    // Idempotent lock
    const lockPath = `${folder}/.lock.json`;
    const locked = await isLocked(supabase, lockPath);
    if (locked) {
      return json({ ok: false, assets, errors: [{ step: 'lock', error: 'in_progress' }] });
    }
    await setLock(supabase, lockPath);

    try {
      // Step 1: Score Snapshot
      if (await needsRebuild(supabase, folder, 'score-snapshot_1200x630.png', FRESHNESS.scoreSnapshot, force)) {
        try {
          const { data, error } = await supabase.functions.invoke('render-score-snapshot', {
            body: { chain, address, name, symbol, overallScore, scores, lastScannedAt, format: 'og' }
          });
          if (error) throw error;
          if ((data as any)?.url) assets['scoreSnapshot'] = (data as any).url;
          else skipped.push('scoreSnapshot');
        } catch (e) {
          errors.push({ step: 'scoreSnapshot', error: 'failed' });
        }
      } else {
        const { data } = supabase.storage.from('reports').getPublicUrl(`reports/${folder}/score-snapshot_1200x630.png`.replace('reports/reports','reports'));
        assets['scoreSnapshot'] = data.publicUrl;
        skipped.push('scoreSnapshot');
      }

      // Step 2: Charts
      const chartTypes = ['price_7d','tvl_90d','holders_donut'] as const;
      for (const type of chartTypes) {
        const file = `chart_${type}.png`;
        const key = `chart_${type}`;
        if (await needsRebuild(supabase, folder, file, FRESHNESS.charts, force)) {
          try {
            const { data, error } = await supabase.functions.invoke('render-chart', { body: { chain, address, tokenId, type } });
            if (error) throw error;
            const d = data as any;
            if (d?.url) assets[key] = d.url; else if (d?.error === 'no_data') skipped.push(key); else errors.push({ step: key, error: 'render_failed' });
          } catch (e) {
            errors.push({ step: key, error: 'invoke_failed' });
          }
        } else {
          const { data } = supabase.storage.from('reports').getPublicUrl(`reports/${folder}/${file}`.replace('reports/reports','reports'));
          assets[key] = data.publicUrl;
          skipped.push(key);
        }
      }

      // Step 3: Hero Background
      const bgFresh = !(await needsRebuild(supabase, folder, 'hero_bg_1200x630.png', FRESHNESS.heroBg, force)) &&
                      !(await needsRebuild(supabase, folder, 'hero_bg_1080x1920.png', FRESHNESS.heroBg, force));
      if (!bgFresh) {
        try {
          const { data, error } = await supabase.functions.invoke('ai-hero-background', {
            body: { chain, address, name, symbol, vertical, mood }
          });
          if (error) throw error;
          const d = data as any;
          if (d?.ok) {
            if (d.url_1200x630) assets['hero_bg_1200x630'] = d.url_1200x630;
            if (d.url_1080x1920) assets['hero_bg_1080x1920'] = d.url_1080x1920;
          } else {
            skipped.push('hero_bg');
          }
        } catch (e) {
          errors.push({ step: 'hero_bg', error: 'invoke_failed' });
        }
      } else {
        const { data: p1 } = supabase.storage.from('reports').getPublicUrl(`reports/${folder}/hero_bg_1200x630.png`.replace('reports/reports','reports'));
        const { data: p2 } = supabase.storage.from('reports').getPublicUrl(`reports/${folder}/hero_bg_1080x1920.png`.replace('reports/reports','reports'));
        assets['hero_bg_1200x630'] = p1.publicUrl;
        assets['hero_bg_1080x1920'] = p2.publicUrl;
        skipped.push('hero_bg');
      }

      // Step 4: Branded Hero
      const heroFresh = !(await needsRebuild(supabase, folder, 'hero_1200x630.png', FRESHNESS.heroFinal, force)) &&
                        !(await needsRebuild(supabase, folder, 'hero_1080x1920.png', FRESHNESS.heroFinal, force));
      if (!heroFresh) {
        try {
          const { data, error } = await supabase.functions.invoke('compose-hero', {
            body: { chain, address, name, symbol, logoUrl, overallScore, scores, lastScannedAt }
          });
          if (error) throw error;
          const d = data as any;
          if (d?.ok) {
            if (d.url_1200x630) assets['hero_1200x630'] = d.url_1200x630;
            if (d.url_1080x1920) assets['hero_1080x1920'] = d.url_1080x1920;
          } else {
            errors.push({ step: 'compose_hero', error: d?.error || 'compose_failed' });
          }
        } catch (e) {
          errors.push({ step: 'compose_hero', error: 'invoke_failed' });
        }
      } else {
        const { data: p1 } = supabase.storage.from('reports').getPublicUrl(`reports/${folder}/hero_1200x630.png`.replace('reports/reports','reports'));
        const { data: p2 } = supabase.storage.from('reports').getPublicUrl(`reports/${folder}/hero_1080x1920.png`.replace('reports/reports','reports'));
        assets['hero_1200x630'] = p1.publicUrl;
        assets['hero_1080x1920'] = p2.publicUrl;
        skipped.push('compose_hero');
      }

      return json({ ok: true, assets, skipped, errors });
    } finally {
      await releaseLock(supabase, lockPath);
    }
  } catch (e) {
    console.error('Unhandled', e);
    return json({ ok: false, assets, errors: [{ step: 'orchestrate', error: 'unexpected' }] });
  }
});

function json(obj: Resp | Record<string, unknown>) {
  return new Response(JSON.stringify(obj), { headers: corsHeaders, status: 200 });
}

async function isLocked(supabase: ReturnType<typeof createClient>, lockPath: string) {
  try {
    const folder = lockPath.split('/').slice(0, -1).join('/');
    const file = lockPath.split('/').pop()!;
    const { data } = await supabase.storage.from('reports').list(folder);
    const lock = (data || []).find(f => f.name === file);
    if (!lock) return false;
    const updated = lock.updated_at ? new Date(lock.updated_at).getTime() : 0;
    return updated && (Date.now() - updated) < 60 * 1000; // 60s TTL
  } catch { return false; }
}

async function setLock(supabase: ReturnType<typeof createClient>, lockPath: string) {
  const payload = new TextEncoder().encode(JSON.stringify({ t: Date.now() }));
  await supabase.storage.from('reports').upload(lockPath, payload, { upsert: true, contentType: 'application/json', cacheControl: '60' });
}

async function releaseLock(supabase: ReturnType<typeof createClient>, lockPath: string) {
  try { await supabase.storage.from('reports').remove([lockPath]); } catch {}
}

async function needsRebuild(supabase: ReturnType<typeof createClient>, folder: string, file: string, freshnessSec: number, force: boolean) {
  if (force) return true;
  try {
    const { data } = await supabase.storage.from('reports').list(folder);
    const f = (data || []).find(x => x.name === file);
    if (!f) return true;
    const updated = f.updated_at ? new Date(f.updated_at).getTime() : 0;
    if (!updated) return true;
    return (Date.now() - updated) > freshnessSec * 1000;
  } catch { return true; }
}
