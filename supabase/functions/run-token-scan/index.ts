// Full token scan, rebuilt 2026-09-24 on the scanner reliability layer
// (_shared/scanner/). Data collection, provenance, cross-checks and
// plausibility live in collectToken(); scoring (v2, null-gated) in
// scoreRecord(); row mapping in buildRows(). This file only does auth, the
// social/GitHub fetches, and database writes (every write's error is checked).
//
// Behaviour changes vs the pre-2026-09-24 version:
// - Solana addresses are resolved to their exact case (a lowercased mint used
//   to read as "authorities revoked" and score security 100).
// - Circulating supply comes from CoinGecko + CoinMarketCap, never from total supply.
// - Unknown inputs are null with a reason; a dimension missing a required input
//   is not scored, and the overall score says which dimensions it excludes.
// - Cache rows get a real updated_at, and all rows of a scan are written in one transaction (persist_token_scan).
// - The SEO snapshot is only regenerated when the caller passes
//   `regenerate_snapshot: true` (bot-facing HTML is published content).
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { fetchTelegramMembers } from '../_shared/apifyAPI.ts';
import { fetchLunarCrushWithCache } from '../_shared/lunarcrushAPI.ts';
import { fetchDiscordMemberCount } from '../_shared/discordAPI.ts';
import { requireAuthOrInternal, getClientIp } from '../_shared/authGuard.ts';
import { checkRateLimit, createRateLimitError } from '../_shared/rateLimit.ts';
import { AddressResolutionError, collectToken, normalizeChain, quality } from '../_shared/scanner/collect.ts';
import { scoreRecord } from '../_shared/scanner/scoring.ts';
import { buildRows } from '../_shared/scanner/persist.ts';
import { usable } from '../_shared/scanner/field.ts';
import { ScanContext } from '../_shared/scanner/http.ts';
import { collectGithub, communityFields } from '../_shared/scanner/social.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-internal-secret',
};
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

Deno.serve(async (req) => {
  const startTime = Date.now();
  const requestId = `scan_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  if (req.method === 'GET') return json({ success: true, message: 'Full token scan edge function running' });

  const auth = await requireAuthOrInternal(req, corsHeaders);
  if (auth.blocked) return auth.blocked;
  const rl = await checkRateLimit({ maxRequests: auth.via === 'internal' ? 1000 : 30, windowSeconds: 3600, identifier: auth.userId || getClientIp(req), namespace: 'run-token-scan' });
  if (!rl.allowed) return createRateLimitError(rl, corsHeaders);

  try {
    const bodyText = await req.text();
    if (!bodyText.trim()) return json({ success: false, error: 'Empty body' }, 400);
    const { token_address: rawAddress, chain_id, user_id, force_refresh, regenerate_snapshot, dry_run } = JSON.parse(bodyText);
    const chainId = normalizeChain(chain_id || '0x1');
    if (!chainId) return json({ success: false, error: 'Unsupported chain' }, 400);
    if (!rawAddress || typeof rawAddress !== 'string') return json({ success: false, error: 'Invalid token address' }, 400);

    // Previous scan (for the supply-jump plausibility rule). Tolerates the v2 columns not existing yet.
    const prev = await supabase.from('token_scans').select('field_data, scanned_at').eq('token_address', rawAddress.trim().toLowerCase()).eq('chain_id', chainId).not('field_data', 'is', null).order('scanned_at', { ascending: false }).limit(1).maybeSingle();
    const previous = prev.data?.field_data ? { total_supply_onchain: prev.data.field_data?.chain?.total_supply_onchain?.value ?? null, scanned_at: prev.data.scanned_at, record: prev.data.field_data } : null;

    // Exact-case Solana mint stored by an earlier scan (the DB lowercases addresses). Ignored if the column doesn't exist yet.
    const canon = chainId === 'solana'
      ? await supabase.from('token_scans').select('canonical_address').eq('token_address', rawAddress.trim().toLowerCase()).eq('chain_id', chainId).not('canonical_address', 'is', null).order('scanned_at', { ascending: false }).limit(1).maybeSingle()
      : null;
    const canonicalHint: string | null = canon?.data?.canonical_address ?? null;

    const ctx = new ScanContext();
    let rec;
    try {
      rec = await collectToken(rawAddress, chainId, { ctx, previous, canonicalHint });
    } catch (e) {
      // Nothing is written when the address cannot be resolved: a failed scan must not replace cached data.
      const unresolved = e instanceof AddressResolutionError;
      return json({ success: false, error: (e as Error).message, error_code: unresolved ? 'address_not_resolved' : 'invalid_request', request_id: requestId }, unresolved ? 422 : 400);
    }

    // Social + GitHub inputs for the community/development dimensions (unchanged providers).
    const links = usable(rec.market.links) ? rec.market.links.value : {};
    const symbol = usable(rec.market.symbol) ? rec.market.symbol.value : null;
    const [lunar, telegram, discord, github] = await Promise.all([
      symbol ? fetchLunarCrushWithCache(symbol, rec.address_key, chainId, supabase, !!force_refresh).catch(() => null) : Promise.resolve(null),
      links.telegram ? fetchTelegramMembers(links.telegram).catch(() => ({ members: null })) : Promise.resolve({ members: null }),
      links.discord ? fetchDiscordMemberCount(links.discord).catch(() => null) : Promise.resolve(null),
      collectGithub(ctx, links.github),
    ]);
    // Community and development are Fields like everything else: a failed call is unknown with a reason, not 0 (Codex finding 8).
    rec.social = {
      github,
      community: communityFields({ symbol, lunar, discordLinked: !!links.discord, discordMembers: discord ?? null, telegramLinked: !!links.telegram, telegramMembers: telegram?.members ?? null }, rec.scanned_at),
    };
    rec.quality = quality(rec, ctx, rec.quality.flags);
    const score = scoreRecord(rec);
    const rows = buildRows(rec, score, user_id || null);

    const writeErrors: Array<{ table: string; error: string }> = [];
    let scanId: string | null = null;
    if (!dry_run) {
      const key = { token_address: rec.address_key, chain_id: chainId };
      const caches = {
        token_data_cache: rows.token_data_cache,
        token_security_cache: rows.token_security_cache,
        token_tokenomics_cache: rows.token_tokenomics_cache,
        token_liquidity_cache: rows.token_liquidity_cache,
        token_community_cache: {
          ...key,
          discord_members: usable(rec.social.community.discord_members) ? rec.social.community.discord_members.value : null,
          telegram_members: usable(rec.social.community.telegram_members) ? rec.social.community.telegram_members.value : null,
          galaxy_score: lunar?.galaxy_score ?? null,
          alt_rank: lunar?.alt_rank ?? null,
          sentiment: lunar?.sentiment ?? null,
          interactions_24h: lunar?.interactions_24h ?? null,
          posts_active: lunar?.posts_active ?? null,
          contributors_active: lunar?.contributors_active ?? null,
          social_dominance: lunar?.social_dominance ?? null,
          trend: lunar?.trend ?? null,
          lunarcrush_fetched_at: lunar ? (lunar.fetched_at ?? rec.scanned_at) : null, // a cache hit must not look freshly fetched
          active_channels: [lunar ? 'lunarcrush' : null, usable(rec.social.community.telegram_members) ? 'telegram' : null, usable(rec.social.community.discord_members) ? 'discord' : null].filter(Boolean),
          score: score.dimensions.community.score,
          updated_at: rec.scanned_at,
        },
        token_development_cache: {
          ...key,
          github_repo: usable(github.repo) ? github.repo.value : null,
          is_open_source: usable(github.repo) ? true : null,
          stars: usable(github.stars) ? github.stars.value : null,
          forks: usable(github.forks) ? github.forks.value : null,
          commits_30d: usable(github.commits_30d) ? github.commits_30d.value : null,
          contributors_count: usable(github.contributors_count) ? github.contributors_count.value : null,
          open_issues: usable(github.open_issues) ? github.open_issues.value : null,
          last_commit: usable(github.last_push) ? github.last_push.value : null,
          language: usable(github.language) ? github.language.value : null,
          is_archived: usable(github.is_archived) ? github.is_archived.value : null,
          repo_created_at: usable(github.repo_created_at) ? github.repo_created_at.value : null,
          score: score.dimensions.development.score,
          updated_at: rec.scanned_at,
        },
      };
      // ONE transaction (migration 20260925120000): every cache row and the history row land together, or none do.
      const { data: id, error } = await supabase.rpc('persist_token_scan', { p_caches: caches, p_scan: { ...rows.token_scans, ...rows.token_scans_v2 } });
      if (error) writeErrors.push({ table: 'persist_token_scan', error: error.message });
      else scanId = id as string;

      // Bot-facing snapshot only after a scan was actually stored.
      if (!error && regenerate_snapshot === true && symbol) {
        fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/regenerate-seo-snapshot`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}` },
          body: JSON.stringify({ kind: 'token', symbol }),
        }).catch((e) => console.warn(`[${requestId}] snapshot regen failed:`, e?.message));
      }
    }
    if (writeErrors.length) console.error(`[${requestId}] write errors`, JSON.stringify(writeErrors));

    const d = score.dimensions;
    const writeFailed = writeErrors.length > 0;
    return json({
      success: !writeFailed,
      token_address: rec.address_key,
      canonical_address: rec.address_canonical.value,
      chain_id: chainId,
      overall_score: score.overall,
      overall_reason: score.overall_reason,
      excluded_dimensions: score.excluded_dimensions,
      scoring_version: score.scoring_version,
      token_name: usable(rec.market.name) ? rec.market.name.value : null,
      token_symbol: symbol,
      scores: { security: d.security.score, liquidity: d.liquidity.score, tokenomics: d.tokenomics.score, community: d.community.score, development: d.development.score },
      data_quality: { completeness_pct: rec.quality.completeness_pct, required_missing: rec.quality.required_missing, provider_failures: rec.quality.provider_failures, flags: rec.quality.flags, paid_credits: rec.quality.paid_credits },
      write_errors: writeErrors,
      scan_id: scanId,
      dry_run: !!dry_run,
      ...(dry_run ? { record: rec, rows } : {}),
      processing_time_ms: Date.now() - startTime,
    }, writeFailed ? 500 : 200); // callers (weekly refresh) key off the HTTP status
  } catch (error) {
    console.error(`[${requestId}] Error:`, error);
    return json({ success: false, error: (error as Error).message || 'Scan failed', request_id: requestId, processing_time_ms: Date.now() - startTime }, 500);
  }
});
