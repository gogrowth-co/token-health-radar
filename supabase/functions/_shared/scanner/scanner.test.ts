// Offline unit tests (no network): field cross-checks, failure handling,
// plausibility, null-gated scoring, and a regression test for the 2026-09-24
// bug where a failed Solana lookup became "authorities revoked, security 100".
// Run: deno test -A supabase/functions/_shared/scanner/scanner.test.ts
import { assert, assertEquals } from 'jsr:@std/assert@1';
import { crossCheckBool, crossCheckNumber, ok, unknown } from './field.ts';
import { resetBreakers, ScanContext } from './http.ts';
import { solanaAdapter } from './solana.ts';
import { computeUnlocks, datasetMatches, unlockSlugCandidates } from './market.ts';
import { classifyLabel } from './holders.ts';
import { runPlausibility } from './plausibility.ts';
import { inferNoUnlocks } from './collect.ts';
import { scoreRecord } from './scoring.ts';
import type { ScanRecord } from './types.ts';

const ref = { source: 'test', fetched_at: '2026-09-24T00:00:00Z' };
const realFetch = globalThis.fetch;
function stubFetch(handler: (url: string, body: any) => { status?: number; json?: unknown; text?: string }) {
  globalThis.fetch = ((input: string | URL | Request, init?: RequestInit) => {
    const url = String(input instanceof Request ? input.url : input);
    const body = init?.body ? JSON.parse(String(init.body)) : null;
    const r = handler(url, body);
    return Promise.resolve(new Response(r.text ?? JSON.stringify(r.json ?? {}), { status: r.status ?? 200 }));
  }) as typeof fetch;
}
const restore = () => {
  globalThis.fetch = realFetch;
  resetBreakers();
};

Deno.test('crossCheckNumber: agree -> high, disagree -> disputed, one missing -> medium', () => {
  const a = ok(100, ref);
  assertEquals(crossCheckNumber(a, ok(101, ref), { tolerance: 0.02, label: 'x' }).confidence, 'high');
  const d = crossCheckNumber(a, ok(110, ref), { tolerance: 0.02, label: 'x' });
  assertEquals(d.status, 'disputed');
  assertEquals(d.reason, 'sources_disagree');
  assertEquals(crossCheckNumber(a, unknown('timeout'), { label: 'x' }).confidence, 'medium');
  const none = crossCheckNumber(unknown('provider_failed'), unknown('timeout'), { label: 'x' });
  assertEquals(none.value, null);
  assertEquals(none.reason, 'provider_failed');
  assertEquals(crossCheckNumber(ok(60, ref), ok(66, ref), { absTolerance: 5, label: 'top10' }).status, 'disputed');
});

Deno.test('crossCheckBool: disagreement is disputed, never silently one side', () => {
  const r = crossCheckBool(ok(true, ref), ok(false, ref), 'mintable');
  assertEquals(r.status, 'disputed');
});

Deno.test('REGRESSION: Solana RPC value:null (lowercased mint) must not become "authority revoked"', async () => {
  stubFetch((url, body) => {
    if (body?.method === 'getAccountInfo') return { json: { jsonrpc: '2.0', id: 1, result: { context: { slot: 1 }, value: null } } };
    if (body?.method) return { json: { jsonrpc: '2.0', id: 1, result: { context: { slot: 1 }, value: null } } };
    if (url.includes('geckoterminal')) return { status: 404, text: '{"errors":[{"status":"404"}]}' };
    return { status: 404, text: '{}' };
  });
  try {
    const facts = await solanaAdapter.collect(new ScanContext(), 'jupyiwryjfskupiha7hker8vutaefosybkedznsdvcn', {} as any, 'solana');
    assertEquals(facts.mint_authority_active.value, null);
    assertEquals(facts.freeze_authority_active.value, null);
    assertEquals(facts.mint_authority_active.reason, 'not_found');
    assertEquals(facts.total_supply_onchain.value, null);
  } finally {
    restore();
  }
});

Deno.test('provider failure: retries, then a typed reason; circuit opens after repeated failures', async () => {
  let calls = 0;
  stubFetch(() => {
    calls++;
    return { status: 503, text: 'unavailable' };
  });
  try {
    const ctx = new ScanContext();
    const r1 = await ctx.fetchJson('flaky', 'https://x.test/a', { retries: 1 });
    assertEquals(r1.ok, false);
    assertEquals(calls, 2);
    await ctx.fetchJson('flaky', 'https://x.test/a', { retries: 0 });
    await ctx.fetchJson('flaky', 'https://x.test/a', { retries: 0 });
    const r4 = await ctx.fetchJson('flaky', 'https://x.test/a', { retries: 0 });
    assertEquals(r4.ok ? null : r4.reason, 'circuit_open');
    assertEquals(calls, 4);
  } finally {
    restore();
  }
});

Deno.test('HTML bot-challenge body is a provider failure, not data', async () => {
  stubFetch(() => ({ status: 200, text: '<!DOCTYPE html><title>Challenge</title>' }));
  try {
    const r = await new ScanContext().fetchJson('gt', 'https://x.test', { retries: 0 });
    assertEquals(r.ok ? null : r.reason, 'provider_failed');
  } finally {
    restore();
  }
});

Deno.test('budget: paid credits capped per scan', async () => {
  stubFetch(() => ({ json: { ok: 1 } }));
  try {
    const ctx = new ScanContext({ maxCalls: 100, maxPaidCredits: 6 });
    assert((await ctx.fetchJson('nansen', 'https://x.test', { credits: 5 })).ok);
    const r = await ctx.fetchJson('nansen', 'https://x.test', { credits: 5 });
    assertEquals(r.ok ? null : r.reason, 'budget_exhausted');
  } finally {
    restore();
  }
});

Deno.test('unlocks: dataset with no future events = none_scheduled; cumulative series drives windows', () => {
  const now = new Date('2026-09-24T00:00:00Z');
  const t = now.getTime() / 1000;
  const data = {
    metadata: { events: [{ timestamp: t + 10 * 86400, noOfTokens: [100], unlockType: 'cliff' }] },
    documentedData: { data: [{ label: 'a', data: [{ timestamp: t - 86400, unlocked: 0 }, { timestamp: t + 10 * 86400, unlocked: 100 }, { timestamp: t + 200 * 86400, unlocked: 100 }] }] },
  };
  const u = computeUnlocks(data, 'x', ref, now);
  assertEquals(u.next_unlock_amount.value, 100);
  assertEquals(u.unlock_30d_amount.value, 100);
  const none = computeUnlocks({ metadata: { events: [] }, documentedData: { data: [] } }, 'x', ref, now);
  assertEquals(none.next_unlock_date.value, 'none_scheduled');
});

Deno.test('labels: conservative classification', () => {
  assertEquals(classifyLabel('jupiter_dao_wallet.sol', 'nansen').category, 'project_controlled');
  assertEquals(classifyLabel('jup_team_cold.sol', 'nansen').confidence, 'medium');
  assertEquals(classifyLabel('Token Millionaire', 'nansen').category, 'unknown');
  assertEquals(classifyLabel('Jupiter Exchange: Router', 'nansen').category === 'cex', false);
  assertEquals(classifyLabel('Binance 14', 'nansen').category, 'cex');
});

function fakeRecord(over: Partial<Record<string, any>> = {}): ScanRecord {
  const u = unknown<any>('no_data');
  const chainKeys = ['decimals', 'total_supply_onchain', 'token_standard', 'mint_authority_active', 'freeze_authority_active', 'permanent_delegate', 'transfer_hook', 'transfer_tax_pct', 'buy_tax_pct', 'sell_tax_pct', 'honeypot', 'upgradeable_proxy', 'owner_address', 'pausable', 'blacklist', 'liquidity_locked_pct', 'creator_holding_pct', 'holder_count', 'top1_pct', 'top5_pct', 'top10_pct', 'top20_pct', 'top10_excl_noncirculating_pct', 'noncirculating_labeled_pct', 'gini_coefficient', 'top_holders'];
  const marketKeys = ['coingecko_id', 'name', 'symbol', 'logo_url', 'links', 'categories', 'platform_count', 'canonical_address', 'price_usd', 'market_cap_usd', 'fdv_usd', 'volume_24h_usd', 'circulating_supply', 'total_supply_market', 'max_supply'];
  const rec: any = {
    schema_version: 1,
    scanned_at: '2026-09-24T00:00:00Z',
    chain_id: 'solana',
    address_input: 'x',
    address_canonical: ok('x', ref),
    address_key: 'x',
    market: Object.fromEntries(marketKeys.map((k) => [k, u])),
    chain: Object.fromEntries(chainKeys.map((k) => [k, u])),
    liquidity: { dex_liquidity_usd: u, pool_count: u, top_pools: u, dex_volume_24h_usd: u, slippage_10k_pct: u, slippage_100k_pct: u },
    unlocks: { emissions_source: u, next_unlock_date: u, next_unlock_amount: u, unlock_30d_amount: u, unlock_90d_amount: u, last_scheduled_event: u },
    derived: { circulating_ratio: u, noncirculating_supply: u, burned_since_max: u, fdv_to_mcap: u, unlock_30d_pct_of_circ: u, unlock_90d_pct_of_circ: u },
    quality: { flags: [] },
  };
  for (const [k, v] of Object.entries(over)) {
    const [g, f] = k.split('.');
    rec[g][f] = v;
  }
  return rec;
}

Deno.test('scoring: missing required inputs -> dimension not scored, overall null; no points for unknowns', () => {
  const s = scoreRecord(fakeRecord());
  assertEquals(s.dimensions.security.score, null);
  assertEquals(s.dimensions.tokenomics.score, null);
  assertEquals(s.dimensions.community.score, null);
  assertEquals(s.dimensions.development.score, null);
  assertEquals(s.overall, null);
  assertEquals(s.scoring_version, '2.0.0');
});

Deno.test('scoring: disputed input is excluded and blocks a required slot', () => {
  const disputed = { ...ok(false, ref), status: 'disputed' as const, reason: 'sources_disagree' as const };
  const s = scoreRecord(fakeRecord({ 'chain.mint_authority_active': disputed, 'chain.freeze_authority_active': ok(false, ref) }));
  assertEquals(s.dimensions.security.score, null);
  assert(s.dimensions.security.inputs_excluded.mint_authority_active.startsWith('disputed'));
});

Deno.test('scoring: known inputs only; optional missing inputs do not count', () => {
  const s = scoreRecord(fakeRecord({ 'chain.mint_authority_active': ok(false, ref), 'chain.freeze_authority_active': ok(false, ref) }));
  assertEquals(s.dimensions.security.score, 100);
});

Deno.test('plausibility: circulating > total is flagged and taken out of scoring', () => {
  const rec = fakeRecord({ 'market.circulating_supply': ok(200, ref, { confidence: 'high' }), 'market.total_supply_market': ok(100, ref) });
  const flags = runPlausibility(rec);
  assert(flags.some((f) => f.rule === 'circulating_le_total' && f.severity === 'error'));
  assertEquals(rec.market.circulating_supply.status, 'disputed');
});

Deno.test('plausibility: circulating == total confirmed by two sources is info only (WBTC case)', () => {
  const rec = fakeRecord({ 'market.circulating_supply': ok(100, ref, { confidence: 'high' }), 'market.total_supply_market': ok(100, ref) });
  const flags = runPlausibility(rec);
  assert(flags.every((f) => f.severity === 'info'));
});

Deno.test('plausibility: decimals misapplied (10^6 gap) is an error', () => {
  const rec = fakeRecord({ 'chain.total_supply_onchain': ok(6.86e15, ref), 'market.total_supply_market': ok(6.86e9, ref), 'market.platform_count': ok(1, ref) });
  const flags = runPlausibility(rec);
  assert(flags.some((f) => f.rule === 'decimals_order_of_magnitude'));
  assertEquals(rec.chain.total_supply_onchain.status, 'disputed');
});

Deno.test('plausibility: timestamps in the future are flagged', () => {
  const rec = fakeRecord({ 'market.price_usd': ok(1, { source: 't', fetched_at: '2030-01-01T00:00:00Z' }) });
  assert(runPlausibility(rec).some((f) => f.rule === 'no_future_timestamps'));
});

Deno.test('unlocks: dataset matched by contract address when it has no gecko_id (ARB), never by slug alone', () => {
  const arb = { gecko_id: null, metadata: { token: 'arbitrum:0x912ce59144191c1204e64559fe8253a0e49e6548' } };
  assertEquals(datasetMatches(arb, 'arbitrum', '0xa4b1', '0x912CE59144191C1204E64559FE8253a0e49E6548'), 'token_contract_address');
  assertEquals(datasetMatches(arb, 'arbitrum', '0x1', '0x912ce59144191c1204e64559fe8253a0e49e6548'), null);
  assertEquals(datasetMatches({ gecko_id: 'other', metadata: { token: 'ethereum:0xabc' } }, 'arbitrum', '0xa4b1', '0x912ce59144191c1204e64559fe8253a0e49e6548'), null);
  assertEquals(datasetMatches({ gecko_id: null, metadata: { token: 'coingecko:pyth-network' } }, 'pyth-network', 'solana', 'x'), 'token_coingecko_id');
  assert(unlockSlugCandidates('aerodrome-finance', 'Aerodrome Finance').includes('aerodrome'));
});

Deno.test('unlocks: a series that stops while still emitting is unknown, not 0 (AERO case); a finished schedule is 0 (JUP case)', () => {
  const now = new Date('2026-09-24T00:00:00Z');
  const t = now.getTime() / 1000;
  const day = 86400;
  const drip = Array.from({ length: 40 }, (_, i) => ({ timestamp: t - (39 - i) * day, unlocked: i * 1000 }));
  const ongoing = computeUnlocks({ metadata: { events: [] }, documentedData: { data: [{ label: 'gauge', data: drip }] } }, 'aero', ref, now);
  assertEquals(ongoing.unlock_90d_amount.status, 'unknown');
  assertEquals(ongoing.next_unlock_date.status, 'unknown');
  const finished = [{ timestamp: t - 300 * day, unlocked: 0 }, { timestamp: t - 211 * day, unlocked: 500 }, { timestamp: t - 210 * day, unlocked: 500 }];
  const done = computeUnlocks({ metadata: { events: [{ timestamp: t - 211 * day, noOfTokens: [500], unlockType: 'cliff' }] }, documentedData: { data: [{ label: 'team', data: finished }] } }, 'jup', ref, now);
  assertEquals(done.unlock_90d_amount.value, 0);
  assertEquals(done.next_unlock_date.value, 'none_scheduled');
});

Deno.test('unlocks: "none" is derived only when fully circulating per two sources AND supply cannot grow', () => {
  const nf = unknown<any>('not_found');
  const unl = { emissions_source: nf, next_unlock_date: nf, next_unlock_amount: nf, unlock_30d_amount: nf, unlock_90d_amount: nf, last_scheduled_event: nf };
  const base = { 'market.circulating_supply': ok(100, ref, { confidence: 'high' }), 'market.total_supply_market': ok(100, ref), 'chain.mint_authority_active': ok(false, ref) };
  const rec = fakeRecord(base);
  rec.unlocks = unl;
  assertEquals(inferNoUnlocks(rec).unlock_90d_amount.value, 0);
  const mintable = fakeRecord({ ...base, 'chain.mint_authority_active': ok(true, ref) });
  mintable.unlocks = unl;
  assertEquals(inferNoUnlocks(mintable).unlock_90d_amount.status, 'unknown');
  const oneSource = fakeRecord({ ...base, 'market.circulating_supply': ok(100, ref, { confidence: 'medium' }) });
  oneSource.unlocks = unl;
  assertEquals(inferNoUnlocks(oneSource).unlock_90d_amount.status, 'unknown');
  const locked = fakeRecord({ ...base, 'market.circulating_supply': ok(80, ref, { confidence: 'high' }) });
  locked.unlocks = unl;
  assertEquals(inferNoUnlocks(locked).unlock_90d_amount.status, 'unknown');
});
