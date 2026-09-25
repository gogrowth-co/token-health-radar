// Offline unit tests (no network): field cross-checks, failure handling,
// plausibility, null-gated scoring, and a regression test for the 2026-09-24
// bug where a failed Solana lookup became "authorities revoked, security 100".
// Run: deno test -A supabase/functions/_shared/scanner/scanner.test.ts
import { assert, assertEquals } from 'jsr:@std/assert@1';
import { crossCheckBool, crossCheckNumber, ok, unknown, usable as usable_ } from './field.ts';
import { resetBreakers, ScanContext } from './http.ts';
import { solanaAdapter } from './solana.ts';
import { evmAdapter } from './evm.ts';
import { computeUnlocks, datasetMatches, unlockSlugCandidates } from './market.ts';
import { applyLabel, buildConcentration, classifyLabel, type Holder } from './holders.ts';
import { runPlausibility } from './plausibility.ts';
import { AddressResolutionError, collectLiquidity, collectToken, inferNoUnlocks } from './collect.ts';
import { fetchUnlocks, resetUnlockCache } from './market.ts';
import { buildRows, vestingText } from './persist.ts';
import { collectGithub, communityFields } from './social.ts';
import { scoreRecord } from './scoring.ts';
import type { ScanRecord } from './types.ts';

const ref = { source: 'test', fetched_at: '2026-09-24T00:00:00Z' };
const refB = { source: 'test_b', fetched_at: '2026-09-24T00:00:00Z' }; // a second, independent source
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
  assertEquals(crossCheckNumber(a, ok(101, refB), { tolerance: 0.02, label: 'x' }).confidence, 'high');
  const d = crossCheckNumber(a, ok(110, refB), { tolerance: 0.02, label: 'x' });
  assertEquals(d.status, 'disputed');
  assertEquals(d.reason, 'sources_disagree');
  assertEquals(crossCheckNumber(a, unknown('timeout'), { label: 'x' }).confidence, 'medium');
  const none = crossCheckNumber(unknown('provider_failed'), unknown('timeout'), { label: 'x' });
  assertEquals(none.value, null);
  assertEquals(none.reason, 'provider_failed');
  assertEquals(crossCheckNumber(ok(60, ref), ok(66, refB), { absTolerance: 5, label: 'top10' }).status, 'disputed');
});

Deno.test('crossCheckBool: disagreement is disputed, never silently one side', () => {
  const r = crossCheckBool(ok(true, ref), ok(false, refB), 'mintable');
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
    unlocks: { emissions_source: u, next_unlock_date: u, next_unlock_amount: u, unlock_30d_amount: u, unlock_90d_amount: u, last_scheduled_event: u, unscheduled_supply: u },
    derived: { circulating_ratio: u, noncirculating_supply: u, max_supply_headroom: u, fdv_to_mcap: u, unlock_30d_pct_of_circ: u, unlock_90d_pct_of_circ: u },
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
  assertEquals(s.scoring_version, '2.2.0');
});

Deno.test('scoring: disputed input is excluded and blocks a required slot', () => {
  const disputed = { ...ok(false, ref), status: 'disputed' as const, reason: 'sources_disagree' as const };
  const s = scoreRecord(fakeRecord({ 'chain.mint_authority_active': disputed, 'chain.freeze_authority_active': ok(false, ref) }));
  assertEquals(s.dimensions.security.score, null);
  assert(s.dimensions.security.inputs_excluded.mint_authority_active.startsWith('disputed'));
});

Deno.test('scoring: known inputs only; optional missing inputs do not count', () => {
  const s = scoreRecord(fakeRecord({ 'chain.mint_authority_active': ok(false, ref, { corroborated: true }), 'chain.freeze_authority_active': ok(false, ref, { corroborated: true }) }));
  assertEquals(s.dimensions.security.score, 100);
});

Deno.test('plausibility: circulating > total is flagged and taken out of scoring', () => {
  const rec = fakeRecord({ 'market.circulating_supply': ok(200, ref, { confidence: 'high' }), 'market.total_supply_market': ok(100, ref) });
  const flags = runPlausibility(rec);
  assert(flags.some((f) => f.rule === 'circulating_le_total' && f.severity === 'error'));
  assertEquals(rec.market.circulating_supply.status, 'disputed');
});

Deno.test('plausibility: circulating == total confirmed by two sources is info only (WBTC case)', () => {
  const rec = fakeRecord({ 'market.circulating_supply': ok(100, ref, { confidence: 'high', corroborated: true }), 'market.total_supply_market': ok(100, ref) });
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

// ---- Finding 10 (Codex review 2026-09-25): exact-case Solana recovery
const EXACT_L_MINT = 'LmWq' + 'L'.repeat(20) + 'abc' + '9'.repeat(12); // contains capital L: lowercases to an invalid base58 char

Deno.test('address: a lowercased mint containing L is recovered from CoinGecko and every provider gets the exact case', async () => {
  const rpcAddresses: string[] = [];
  stubFetch((url, body) => {
    if (url.includes('api.coingecko.com')) return { json: { id: 'l-token', name: 'L Token', symbol: 'ltk', detail_platforms: { solana: { contract_address: EXACT_L_MINT } }, platforms: { solana: EXACT_L_MINT }, market_data: {} } };
    if (body?.method) {
      if (['getAccountInfo', 'getTokenSupply', 'getTokenLargestAccounts'].includes(body.method)) rpcAddresses.push(String(body.params?.[0]));
      if (body.method === 'getAccountInfo' && body.params?.[0] === EXACT_L_MINT) return { json: { jsonrpc: '2.0', id: 1, result: { context: { slot: 1 }, value: { owner: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA', data: { parsed: { type: 'mint', info: { decimals: 6, supply: '1000', mintAuthority: null, freezeAuthority: null } } } } } } };
      return { json: { jsonrpc: '2.0', id: 1, result: { context: { slot: 1 }, value: null } } };
    }
    return { status: 404, text: '{}' };
  });
  try {
    const rec = await collectToken(EXACT_L_MINT.toLowerCase(), 'solana');
    assertEquals(rec.address_canonical.value, EXACT_L_MINT);
    assert(rpcAddresses.length >= 2, 'expected mint-level RPC calls');
    assert(rpcAddresses.every((a) => a === EXACT_L_MINT), `RPC must only see the exact-case mint, saw ${rpcAddresses.join(', ')}`);
  } finally {
    restore();
  }
});

Deno.test('address: an unresolvable lowercase mint stops the scan before any chain provider is called', async () => {
  const urls: string[] = [];
  stubFetch((url, body) => {
    urls.push(body?.method ? `rpc:${body.method}` : url);
    return { status: 404, text: '{}' };
  });
  try {
    let err: unknown = null;
    try {
      await collectToken(EXACT_L_MINT.toLowerCase(), 'solana');
    } catch (e) {
      err = e;
    }
    assert(err instanceof AddressResolutionError);
    assert(urls.every((u) => u.includes('coingecko')), `only CoinGecko may be queried, saw: ${urls.join(', ')}`);
  } finally {
    restore();
  }
});

Deno.test('address: a stored exact-case address is used without any lookup guess', async () => {
  const seen: string[] = [];
  stubFetch((url, body) => {
    seen.push(body?.method ? `rpc:${body.params?.[0]}` : url);
    if (body?.method === 'getAccountInfo') return { json: { jsonrpc: '2.0', id: 1, result: { context: { slot: 1 }, value: { owner: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA', data: { parsed: { type: 'mint', info: { decimals: 6, supply: '1000', mintAuthority: null, freezeAuthority: null } } } } } } };
    return { status: 404, text: '{}' };
  });
  try {
    const rec = await collectToken(EXACT_L_MINT.toLowerCase(), 'solana', { canonicalHint: EXACT_L_MINT });
    assertEquals(rec.address_canonical.value, EXACT_L_MINT);
    assertEquals(rec.address_canonical.sources[0].source, 'stored_canonical_address');
  } finally {
    restore();
  }
});

// ---- Finding 5: Solana authorities read from a missing field, and pausable ignored in security
const TOKEN_2022_PROGRAM = 'TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb';
function stubSolanaMint(info: Record<string, unknown>, program = 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA') {
  stubFetch((url, body) => {
    if (body?.method === 'getAccountInfo') return { json: { jsonrpc: '2.0', id: 1, result: { context: { slot: 1 }, value: { owner: program, data: { parsed: { type: 'mint', info } } } } } };
    if (body?.method === 'getTokenSupply') return { json: { jsonrpc: '2.0', id: 1, result: { context: { slot: 1 }, value: { amount: '1000000000', decimals: 6 } } } };
    if (body?.method) return { json: { jsonrpc: '2.0', id: 1, result: { context: { slot: 1 }, value: null } } };
    return { status: 404, text: '{}' };
  });
}

Deno.test('solana: authority property ABSENT from the parsed mint is unknown, explicit null is revoked, a string is active', async () => {
  stubSolanaMint({ decimals: 6, supply: '1000000000', freezeAuthority: null }); // mintAuthority missing entirely
  try {
    const f = await solanaAdapter.collect(new ScanContext(), EXACT_L_MINT, {} as any, 'solana');
    assertEquals(f.mint_authority_active.value, null);
    assertEquals(f.mint_authority_active.status, 'unknown');
    assertEquals(f.freeze_authority_active.value, false); // explicit null = revoked
  } finally {
    restore();
  }
  stubSolanaMint({ decimals: 6, supply: '1000000000', mintAuthority: 'Auth1111111111111111111111111111111111111', freezeAuthority: null });
  try {
    const f = await solanaAdapter.collect(new ScanContext(), EXACT_L_MINT, {} as any, 'solana');
    assertEquals(f.mint_authority_active.value, true);
  } finally {
    restore();
  }
});

Deno.test('solana: an undecodable Token-2022 extension makes extension-derived fields unknown, not "none"', async () => {
  stubSolanaMint({ decimals: 6, supply: '1000000000', mintAuthority: null, freezeAuthority: null, extensions: [{ extension: 'unparseableExtension' }] }, TOKEN_2022_PROGRAM);
  try {
    const f = await solanaAdapter.collect(new ScanContext(), EXACT_L_MINT, {} as any, 'solana');
    for (const k of ['permanent_delegate', 'transfer_hook', 'pausable', 'transfer_tax_pct'] as const) assertEquals(f[k].status, 'unknown', k);
    assertEquals(f.mint_authority_active.value, false);
  } finally {
    restore();
  }
});

Deno.test('scoring: a pausable Token-2022 mint with revoked authorities no longer scores 100', async () => {
  stubSolanaMint({ decimals: 6, supply: '1000000000', mintAuthority: null, freezeAuthority: null, extensions: [{ extension: 'pausableConfig', state: { authority: 'PauseAuth', paused: false } }] }, TOKEN_2022_PROGRAM);
  try {
    const f = await solanaAdapter.collect(new ScanContext(), EXACT_L_MINT, {} as any, 'solana');
    assertEquals(f.pausable.value, true);
    const rec = fakeRecord(Object.fromEntries(Object.entries(f).map(([k, v]) => [`chain.${k}`, v])));
    const s = scoreRecord(rec);
    assert((s.dimensions.security.score ?? 100) < 100, `security ${s.dimensions.security.score}`);
    assertEquals(s.dimensions.security.inputs_used.pausable.points, 0);
  } finally {
    restore();
  }
});

// ---- Finding 1: EVM bytecode inspection must be complete before "not present" counts
const EVM_TOKEN = '0x1111111111111111111111111111111111111111';
const EVM_IMPL = '0x2222222222222222222222222222222222222222';
const IMPL_SLOT = '0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc';
const ZERO_WORD = '0x' + '0'.repeat(64);
function stubEvm(opts: { proxy: boolean; implCodeOk: boolean; tokenCode: string; implCode?: string }) {
  stubFetch((_url, body) => {
    const rpc = (result: unknown) => ({ json: { jsonrpc: '2.0', id: 1, result } });
    if (!body?.method) return { status: 404, text: '{}' };
    if (body.method === 'eth_call') return body.params[0].data === '0x313ce567' ? rpc('0x' + (18).toString(16).padStart(64, '0')) : body.params[0].data === '0x18160ddd' ? rpc('0x' + (10n ** 24n).toString(16).padStart(64, '0')) : rpc('0x');
    if (body.method === 'eth_getStorageAt') return rpc(opts.proxy && body.params[1] === IMPL_SLOT ? '0x' + '0'.repeat(24) + EVM_IMPL.slice(2) : ZERO_WORD);
    if (body.method === 'eth_getCode') {
      if (body.params[0] === EVM_TOKEN) return rpc(opts.tokenCode);
      return opts.implCodeOk ? rpc(opts.implCode ?? '0x6080') : { json: { jsonrpc: '2.0', id: 1, error: { code: -32000, message: 'boom' } } };
    }
    return rpc('0x');
  });
}

Deno.test('evm: proxy whose implementation bytecode cannot be read is unknown, never "not mintable"', async () => {
  stubEvm({ proxy: true, implCodeOk: false, tokenCode: '0x60806040' });
  try {
    const f = await evmAdapter.collect(new ScanContext(), EVM_TOKEN, {} as any, '0x1');
    for (const k of ['mint_authority_active', 'pausable', 'blacklist'] as const) {
      assertEquals(f[k].value, null, k);
      assertEquals(f[k].status, 'unknown', k);
    }
  } finally {
    restore();
  }
});

Deno.test('evm: a selector found in the token bytecode proves the capability even when the implementation read failed', async () => {
  stubEvm({ proxy: true, implCodeOk: false, tokenCode: '0x608060406340c10f19' });
  try {
    const f = await evmAdapter.collect(new ScanContext(), EVM_TOKEN, {} as any, '0x1');
    assertEquals(f.mint_authority_active.value, true);
  } finally {
    restore();
  }
});

Deno.test('evm: complete inspection with no known selector reads as absent, but on one source only (medium confidence)', async () => {
  stubEvm({ proxy: false, implCodeOk: true, tokenCode: '0x60806040' });
  try {
    const f = await evmAdapter.collect(new ScanContext(), EVM_TOKEN, {} as any, '0x1');
    assertEquals(f.mint_authority_active.value, false);
    assertEquals(f.mint_authority_active.confidence, 'medium');
  } finally {
    restore();
  }
});

Deno.test('evm: proxy with a readable implementation finds selectors in the implementation', async () => {
  stubEvm({ proxy: true, implCodeOk: true, tokenCode: '0x60806040', implCode: '0x6080604063a0712d68' });
  try {
    const f = await evmAdapter.collect(new ScanContext(), EVM_TOKEN, {} as any, '0x1');
    assertEquals(f.mint_authority_active.value, true);
  } finally {
    restore();
  }
});

// ---- Finding 2: two independent sources are required for the score-driving fields
Deno.test('cross-checks: one source is ok but NOT corroborated; two agreeing sources are; a dispute is not', () => {
  const single = crossCheckNumber(ok(100, ref), unknown('timeout'), { label: 'x' });
  assertEquals([single.status, single.corroborated], ['ok', false]);
  assertEquals(crossCheckNumber(ok(100, ref), ok(100.5, refB), { label: 'x' }).corroborated, true);
  assertEquals(crossCheckNumber(ok(100, ref), ok(100, ref), { label: 'x' }).corroborated, false); // same source twice is one observation
  assertEquals(crossCheckBool(ok(false, ref), ok(false, ref), 'm').corroborated, false);
  assertEquals(crossCheckNumber(ok(100, ref), ok(150, refB), { label: 'x' }).corroborated, false);
  assertEquals(crossCheckBool(ok(false, ref), unknown('rate_limited'), 'm').corroborated, false);
  assertEquals(crossCheckBool(ok(false, ref), ok(false, refB), 'm').corroborated, true);
});

Deno.test('scoring: a single-source mint/freeze authority earns no points and blocks the security score', () => {
  const single = crossCheckBool(ok(false, ref), unknown('rate_limited'), 'mint');
  const s = scoreRecord(fakeRecord({ 'chain.mint_authority_active': single, 'chain.freeze_authority_active': ok(false, ref, { corroborated: true }) }));
  assertEquals(s.dimensions.security.score, null);
  assert(s.dimensions.security.inputs_excluded.mint_authority_active.startsWith('not_corroborated'));
});

Deno.test('scoring: single-source circulating supply or top-10 share cannot score tokenomics', () => {
  const twoSrc = { corroborated: true, confidence: 'high' as const };
  const good = { 'derived.circulating_ratio': ok(0.5, ref, twoSrc), 'chain.top10_pct': ok(30, ref, twoSrc), 'chain.total_supply_onchain': ok(1e9, ref, twoSrc) };
  assert(scoreRecord(fakeRecord(good)).dimensions.tokenomics.score !== null);
  assertEquals(scoreRecord(fakeRecord({ ...good, 'derived.circulating_ratio': ok(0.5, ref, { corroborated: false }) })).dimensions.tokenomics.score, null);
  assertEquals(scoreRecord(fakeRecord({ ...good, 'chain.top10_pct': ok(30, ref, { corroborated: false }) })).dimensions.tokenomics.score, null);
  assertEquals(scoreRecord(fakeRecord({ ...good, 'chain.total_supply_onchain': ok(1e9, ref, { corroborated: false }) })).dimensions.tokenomics.score, null); // shared denominator must be corroborated too
});

Deno.test('solana: authorities and supply are read from a different RPC operator when GeckoTerminal is down', async () => {
  const served: Record<string, string[]> = {};
  stubFetch((url, body) => {
    if (body?.method) (served[body.method] ??= []).push(url);
    if (body?.method === 'getAccountInfo') return { json: { jsonrpc: '2.0', id: 1, result: { context: { slot: 1 }, value: { owner: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA', data: { parsed: { type: 'mint', info: { decimals: 6, supply: '1000000000', mintAuthority: null, freezeAuthority: null } } } } } } };
    if (body?.method === 'getTokenSupply') return { json: { jsonrpc: '2.0', id: 1, result: { context: { slot: 1 }, value: { amount: '1000000000', decimals: 6 } } } };
    if (body?.method) return { json: { jsonrpc: '2.0', id: 1, result: { context: { slot: 1 }, value: null } } };
    return { status: 503, text: 'down' }; // GeckoTerminal unavailable
  });
  try {
    const f = await solanaAdapter.collect(new ScanContext(), EXACT_L_MINT, {} as any, 'solana');
    assertEquals(f.mint_authority_active.corroborated, true);
    assertEquals(f.freeze_authority_active.corroborated, true);
    assertEquals(f.total_supply_onchain.corroborated, true);
    assert(served.getAccountInfo.length >= 2 && new Set(served.getAccountInfo).size >= 2, 'the two mint-account reads must hit different endpoints');
    assert(served.getTokenSupply[0] !== served.getAccountInfo[0], 'supply read must use a different endpoint than the first mint-account read');
  } finally {
    restore();
  }
});

// ---- Findings 3 and 4: holder denominators and unverified labels
const holderList = (n: number, pct: number): Holder[] => Array.from({ length: n }, (_, i) => ({ address: `h${i}`, amount: pct, pct, category: 'unknown' as const }));
const conc = (holders: Holder[]) => buildConcentration({ holders, holdersRef: [ref], secondTop10: unknown('no_data'), holderCount: unknown('no_data'), maxListed: 20 });

Deno.test('holders: a self-registered .sol label does not remove a whale from the external top-10', () => {
  const hs = holderList(20, 2); // 20 holders at 2%
  hs[0].pct = 30;
  applyLabel(hs[0], 'team_cold.sol', 'nansen'); // medium confidence (self-named)
  const c = conc(hs);
  assert(usable_(c.top10_excl_noncirculating_pct));
  assert((c.top10_excl_noncirculating_pct.value as number) >= 30 + 9 * 2 - 0.01, 'whale must still count');
});

Deno.test('holders: a curated Nansen exchange label is excluded, when ten external holders remain', () => {
  const hs = holderList(20, 2);
  hs[0].pct = 30;
  applyLabel(hs[0], 'Binance 14', 'nansen'); // named exchange from a curated label: high confidence
  const c = conc(hs);
  assert(usable_(c.top10_excl_noncirculating_pct));
  assertEquals(c.top10_excl_noncirculating_pct.value, 20); // 10 x 2%
});

Deno.test('holders: if fewer than ten holders remain after exclusions the external share is unknown, not 0%', () => {
  const hs = holderList(20, 5);
  for (const h of hs.slice(0, 12)) applyLabel(h, 'Binance 14', 'nansen');
  const c = conc(hs);
  assertEquals(c.top10_excl_noncirculating_pct.status, 'unknown');
  const all = holderList(20, 5);
  for (const h of all) applyLabel(h, 'Binance 14', 'nansen');
  assertEquals(conc(all).top10_excl_noncirculating_pct.value, null);
});

Deno.test('plausibility: a disputed on-chain total invalidates every holder share derived from it', () => {
  const twoSrc = { corroborated: true, confidence: 'high' as const };
  const rec = fakeRecord({
    'chain.total_supply_onchain': ok(2e9, ref), // twice the real supply
    'market.total_supply_market': ok(1e9, ref),
    'market.platform_count': ok(1, ref),
    'chain.top1_pct': ok(10, ref), 'chain.top5_pct': ok(20, ref), 'chain.top10_pct': ok(30, ref, twoSrc), 'chain.top20_pct': ok(40, ref),
    'chain.top10_excl_noncirculating_pct': ok(25, ref),
  });
  const flags = runPlausibility(rec);
  assertEquals(rec.chain.total_supply_onchain.status, 'disputed');
  for (const k of ['top1_pct', 'top5_pct', 'top10_pct', 'top20_pct', 'top10_excl_noncirculating_pct'] as const) assertEquals(rec.chain[k].status, 'unknown', k);
  assert(flags.some((f) => f.rule === 'holder_shares_need_valid_supply'));
  assertEquals(scoreRecord(rec).dimensions.tokenomics.score, null);
});

// ---- Findings 6 and 7: unlock schedules
const NOW = new Date('2026-09-24T00:00:00Z');
const NOW_S = NOW.getTime() / 1000;
const DAY = 86400;
const series = (pts: Array<[number, number]>) => ({ documentedData: { data: [{ label: 'a', data: pts.map(([t, u]) => ({ timestamp: NOW_S + t * DAY, unlocked: u })) }] } });

Deno.test('unlocks: a finished schedule reported complete (nothing unscheduled) is 0 / none_scheduled', () => {
  const data = { metadata: { events: [{ timestamp: NOW_S - 211 * DAY, noOfTokens: [1000], unlockType: 'cliff' }] }, supplyMetrics: { maxSupply: 1000, tbdAmount: 0 }, ...series([[-300, 0], [-211, 1000], [-210, 1000]]) };
  const u = computeUnlocks(data, 'x', ref, NOW);
  assertEquals(u.unlock_90d_amount.value, 0);
  assertEquals(u.next_unlock_date.value, 'none_scheduled');
  assertEquals(u.unscheduled_supply.value, 0);
});

Deno.test('unlocks: JUP case - no future events but ~50% of supply is unscheduled ("tbd") is UNKNOWN, not "none"', () => {
  const data = { metadata: { events: [{ timestamp: NOW_S - 211 * DAY, noOfTokens: [500], unlockType: 'cliff' }] }, supplyMetrics: { maxSupply: 7e9, tbdAmount: 3.54e9 }, ...series([[-300, 0], [-211, 500], [-210, 500]]) };
  const u = computeUnlocks(data, 'jup', ref, NOW);
  for (const k of ['next_unlock_date', 'next_unlock_amount', 'unlock_30d_amount', 'unlock_90d_amount'] as const) assertEquals(u[k].status, 'unknown', k);
  assertEquals(u.unscheduled_supply.value, 3.54e9);
});

Deno.test('unlocks: a dataset that does not report unscheduled supply, or lacks events/series, is never "none"', () => {
  const noTbd = computeUnlocks({ metadata: { events: [] }, ...series([[-10, 0], [-9, 0]]) }, 'x', ref, NOW);
  assertEquals(noTbd.next_unlock_date.status, 'unknown');
  const noEvents = computeUnlocks({ metadata: {}, supplyMetrics: { maxSupply: 1, tbdAmount: 0 }, ...series([[-10, 0]]) }, 'x', ref, NOW);
  assertEquals(noEvents.next_unlock_date.status, 'unknown');
  const emptySeries = computeUnlocks({ metadata: { events: [] }, supplyMetrics: { maxSupply: 1, tbdAmount: 0 }, documentedData: { data: [] } }, 'x', ref, NOW);
  assertEquals(emptySeries.unlock_90d_amount.status, 'unknown');
});

Deno.test('unlocks: future dated event is a fact; windows only when the schedule is complete', () => {
  const complete = computeUnlocks({ metadata: { events: [{ timestamp: NOW_S + 10 * DAY, noOfTokens: [100], unlockType: 'cliff' }] }, supplyMetrics: { maxSupply: 100, tbdAmount: 0 }, ...series([[-1, 0], [10, 100], [200, 100]]) }, 'x', ref, NOW);
  assertEquals(complete.next_unlock_amount.value, 100);
  assertEquals(complete.unlock_30d_amount.value, 100);
  const partial = computeUnlocks({ metadata: { events: [{ timestamp: NOW_S + 10 * DAY, noOfTokens: [100], unlockType: 'cliff' }] }, supplyMetrics: { maxSupply: 1000, tbdAmount: 300 }, ...series([[-1, 0], [10, 100], [200, 100]]) }, 'x', ref, NOW);
  assertEquals(partial.next_unlock_amount.value, 100);
  assertEquals(partial.unlock_30d_amount.status, 'unknown');
});

Deno.test('unlocks: a series that stops while still emitting is unknown even when tbd is 0 (AERO case)', () => {
  const drip = Array.from({ length: 40 }, (_, i) => [-(39 - i), i * 1000] as [number, number]);
  const u = computeUnlocks({ metadata: { events: [] }, supplyMetrics: { maxSupply: 1e6, tbdAmount: 0 }, ...series(drip) }, 'aero', ref, NOW);
  assertEquals(u.unlock_90d_amount.status, 'unknown');
  assertEquals(u.next_unlock_date.status, 'unknown');
});

Deno.test('unlocks: linear vesting still running has no "none_scheduled" date but its windows are measured', () => {
  const u = computeUnlocks({ metadata: { events: [] }, supplyMetrics: { maxSupply: 365, tbdAmount: 0 }, ...series(Array.from({ length: 411 }, (_, i) => [i - 10, Math.max(0, Math.min(365, i - 10))] as [number, number])) }, 'x', ref, NOW);
  assertEquals(u.next_unlock_date.status, 'unknown');
  assert((u.unlock_90d_amount.value as number) > 0);
});

Deno.test('unlocks: "no unlocks" inferred from full circulation is an UPPER BOUND, never zero, never a scheduled amount', () => {
  const nf = unknown<any>('not_found');
  const unl = { emissions_source: nf, next_unlock_date: nf, next_unlock_amount: nf, unlock_30d_amount: nf, unlock_90d_amount: nf, last_scheduled_event: nf, unscheduled_supply: nf };
  const two = { corroborated: true, confidence: 'high' as const };
  const base = { 'market.circulating_supply': ok(996, ref, two), 'market.total_supply_market': ok(1000, ref), 'chain.mint_authority_active': ok(false, ref, two) };
  const rec = fakeRecord(base);
  rec.unlocks = unl;
  const inferred = inferNoUnlocks(rec);
  assertEquals(inferred.unlock_90d_amount.value, 4); // 0.4% locked stays visible
  assertEquals(inferred.unlock_90d_amount.bound, 'upper');
  assertEquals(inferred.next_unlock_date.status, 'unknown');
  const mintable = fakeRecord({ ...base, 'chain.mint_authority_active': ok(true, ref, two) });
  mintable.unlocks = unl;
  assertEquals(inferNoUnlocks(mintable).unlock_90d_amount.status, 'unknown');
  const oneSource = fakeRecord({ ...base, 'market.circulating_supply': ok(996, ref, { confidence: 'medium', corroborated: false }) });
  oneSource.unlocks = unl;
  assertEquals(inferNoUnlocks(oneSource).unlock_90d_amount.status, 'unknown');
  const singleMint = fakeRecord({ ...base, 'chain.mint_authority_active': ok(false, ref, { corroborated: false }) });
  singleMint.unlocks = unl;
  assertEquals(inferNoUnlocks(singleMint).unlock_90d_amount.status, 'unknown');
  const locked = fakeRecord({ ...base, 'market.circulating_supply': ok(800, ref, two) });
  locked.unlocks = unl;
  assertEquals(inferNoUnlocks(locked).unlock_90d_amount.status, 'unknown');
});

Deno.test('cache: the RAW dataset is cached 24h from its ORIGINAL fetch and time-dependent values are recomputed each scan', async () => {
  resetUnlockCache();
  let fetches = 0;
  const dataset = { gecko_id: 'tok', metadata: { events: [{ timestamp: NOW_S + 10 * DAY, noOfTokens: [100], unlockType: 'cliff' }], token: 'coingecko:tok' }, supplyMetrics: { maxSupply: 100, tbdAmount: 0 }, ...series([[-1, 0], [10, 100], [200, 100]]) };
  stubFetch(() => {
    fetches++;
    return { json: dataset };
  });
  try {
    const first = await fetchUnlocks(new ScanContext(), 'tok', 'Tok', '0x1', '0xabc', NOW);
    assertEquals(first.next_unlock_date.value, new Date((NOW_S + 10 * DAY) * 1000).toISOString().slice(0, 10));
    assertEquals(fetches, 1);
    // 12h later: served from cache (no fetch), values recomputed for the new "now", original fetched_at kept
    const later = new Date(NOW.getTime() + 12 * 3600_000);
    const second = await fetchUnlocks(new ScanContext(), 'tok', 'Tok', '0x1', '0xabc', later);
    assertEquals(fetches, 1);
    assertEquals(second.emissions_source.sources[0].fetched_at, first.emissions_source.sources[0].fetched_at);
    // after the cliff has passed the "next" date must not linger: 20 days later, but still inside...
    // ...the 24h TTL is measured from the ORIGINAL fetch, so a scan 25h later refetches instead of renewing forever
    const stale = new Date(NOW.getTime() + 25 * 3600_000);
    await fetchUnlocks(new ScanContext(), 'tok', 'Tok', '0x1', '0xabc', stale);
    assertEquals(fetches, 2);
    // recomputation: a scan after the cliff (cache entry from the refetch at +25h, so within TTL) shows no future event
    const afterCliff = new Date(NOW.getTime() + 25 * 3600_000 + 11 * DAY * 1000);
    const third = await fetchUnlocks(new ScanContext(), 'tok', 'Tok', '0x1', '0xabc', afterCliff);
    assertEquals(fetches, 3); // >24h since the +25h fetch, so refetched; values are for the new date
    assertEquals(third.next_unlock_date.value, 'none_scheduled');
  } finally {
    restore();
    resetUnlockCache();
  }
});

Deno.test('vesting text: each date/amount renders only when usable; unknown never prints as "null" or "0"', () => {
  const two = { corroborated: true, confidence: 'high' as const };
  void two;
  const rec = fakeRecord();
  rec.unlocks = { ...rec.unlocks, emissions_source: ok('jupiter', ref), next_unlock_date: unknown('no_data'), next_unlock_amount: unknown('no_data'), unscheduled_supply: ok(3.54e9, ref) };
  const t = vestingText(rec)!;
  assert(!/null|: 0 tokens|Next unlock/.test(t), t);
  assert(t.includes('3,540,000,000'));
  rec.unlocks = { ...rec.unlocks, next_unlock_date: ok('2026-10-01', ref), next_unlock_amount: unknown('no_data') };
  assert(!/null|: 0 tokens/.test(vestingText(rec)!));
  rec.unlocks = { ...rec.unlocks, emissions_source: unknown('not_found') };
  assertEquals(vestingText(rec), null);
});

// ---- Finding 9: legacy storage must not resurrect rejected supply or mix scopes
Deno.test('persist: multichain token stores the GLOBAL total next to global circulating (USDC would otherwise read ~150%)', () => {
  const rec = fakeRecord({
    'market.platform_count': ok(5, ref),
    'market.circulating_supply': ok(75.2e9, ref, { corroborated: true }),
    'market.total_supply_market': ok(75.2e9, ref),
    'chain.total_supply_onchain': ok(50.2e9, ref, { scope: 'chain' }),
  });
  rec.chain_id = '0x1';
  const t = buildRows(rec, scoreRecord(rec), null).token_tokenomics_cache as any;
  assertEquals(t.total_supply, 75.2e9);
  assertEquals(t.circulating_supply / t.total_supply, 1);
});

Deno.test('persist: single-chain token keeps the on-chain total; a rejected circulating value is written as null everywhere, including the legacy fallback column', () => {
  const rec = fakeRecord({
    'market.platform_count': ok(1, ref),
    'market.circulating_supply': { ...ok(5, ref), status: 'disputed' as const, reason: 'sources_disagree' as const },
    'chain.total_supply_onchain': ok(1e9, ref),
  });
  const t = buildRows(rec, scoreRecord(rec), null).token_tokenomics_cache as any;
  assertEquals(t.total_supply, 1e9);
  assertEquals(t.circulating_supply, null);
  assert('actual_circulating_supply' in t && t.actual_circulating_supply === null, 'stale fallback column must be explicitly nulled');
});

Deno.test('persist: multichain token with no usable global total stores null, never the chain-local total', () => {
  const rec = fakeRecord({ 'market.platform_count': ok(4, ref), 'chain.total_supply_onchain': ok(50.2e9, ref) });
  assertEquals((buildRows(rec, scoreRecord(rec), null).token_tokenomics_cache as any).total_supply, null);
});

// ---- Finding 8: community and development go through the reliability layer
function stubGithub(over: { commits?: number; issues?: number; contributors?: number; pushedAt?: string } = {}) {
  Deno.env.set('GITHUB_API_KEY', 'test-key-not-real');
  stubFetch((url) => {
    const fail = { status: 503, text: 'unavailable' };
    if (/\/commits\?/.test(url)) return over.commits === 0 ? fail : { json: Array.from({ length: over.commits ?? 12 }, () => ({ sha: 'x' })) };
    if (/\/issues\?/.test(url)) return over.issues === 0 ? fail : { json: [{ state: 'closed' }, { state: 'closed' }, { state: 'open' }, { state: 'open', pull_request: {} }] };
    if (/\/contributors\?/.test(url)) return over.contributors === 0 ? fail : { json: Array.from({ length: over.contributors ?? 8 }, () => ({ login: 'a' })) };
    return { json: { stargazers_count: 500, forks_count: 40, pushed_at: over.pushedAt ?? '2026-09-20T00:00:00Z', archived: false, fork: false, language: 'Rust', created_at: '2022-01-01T00:00:00Z' } };
  });
}

Deno.test('github: sub-request failures are unknown with a reason, never zero counts, and a required input blocks the score', async () => {
  stubGithub({ commits: 0, issues: 0, contributors: 0 });
  try {
    const gh = await collectGithub(new ScanContext(), 'https://github.com/acme/tok', NOW);
    for (const k of ['commits_30d', 'issue_close_ratio', 'open_issues', 'contributors_count'] as const) {
      assertEquals(gh[k].value, null, k);
      assertEquals(gh[k].status, 'unknown', k);
    }
    assertEquals(gh.stars.value, 500); // metadata call succeeded
    const rec = fakeRecord();
    rec.social = { github: gh, community: communityFields({ symbol: null, lunar: null, discordLinked: false, discordMembers: null, telegramLinked: false, telegramMembers: null }, NOW.toISOString()) };
    const s = scoreRecord(rec);
    assertEquals(s.dimensions.development.score, null);
    assert(s.dimensions.development.reason!.includes('commits_30d'));
  } finally {
    restore();
    Deno.env.delete('GITHUB_API_KEY');
  }
});

Deno.test('github: healthy repo scores from real values; a future pushed_at earns nothing', async () => {
  stubGithub();
  try {
    const gh = await collectGithub(new ScanContext(), 'https://github.com/acme/tok', NOW);
    assertEquals(gh.commits_30d.value, 12);
    assertEquals(gh.issue_close_ratio.value, 2 / 3); // the pull request is not an issue
    const rec = fakeRecord();
    rec.social = { github: gh, community: communityFields({ symbol: null, lunar: null, discordLinked: false, discordMembers: null, telegramLinked: false, telegramMembers: null }, NOW.toISOString()) };
    assert((scoreRecord(rec).dimensions.development.score ?? 0) > 50);
  } finally {
    restore();
  }
  stubGithub({ pushedAt: '2030-01-01T00:00:00Z' });
  try {
    const gh = await collectGithub(new ScanContext(), 'https://github.com/acme/tok', NOW);
    assertEquals(gh.last_push_age_days.status, 'unknown');
    const rec = fakeRecord();
    rec.social = { github: gh, community: communityFields({ symbol: null, lunar: null, discordLinked: false, discordMembers: null, telegramLinked: false, telegramMembers: null }, NOW.toISOString()) };
    assertEquals(scoreRecord(rec).dimensions.development.score, null);
  } finally {
    restore();
    Deno.env.delete('GITHUB_API_KEY');
  }
});

Deno.test('github: no link and no key are unknown with a reason', async () => {
  assertEquals((await collectGithub(new ScanContext(), undefined, NOW)).commits_30d.reason, 'not_found');
  Deno.env.delete('GITHUB_API_KEY');
  assertEquals((await collectGithub(new ScanContext(), 'https://github.com/a/b', NOW)).commits_30d.reason, 'provider_failed');
});

Deno.test('community: missing providers are unknown, a single input is not enough, a measured zero is a reading', () => {
  const rec = fakeRecord();
  const mk = (over: Record<string, unknown>) => ({ symbol: 'TOK', lunar: null, discordLinked: false, discordMembers: null, telegramLinked: false, telegramMembers: null, ...over }) as any;
  rec.social = { github: undefined as any, community: communityFields(mk({ telegramLinked: true, telegramMembers: 50_000 }), NOW.toISOString()) };
  const one = scoreRecord(rec).dimensions.community;
  assertEquals(one.score, null);
  assert(one.reason!.includes('at least 2'));
  rec.social.community = communityFields(mk({ lunar: { sentiment: 80, social_dominance: 1, trend: 'up' } }), NOW.toISOString());
  const three = scoreRecord(rec).dimensions.community;
  assertEquals(three.score, Math.round(((35 + 15 + 10) / 70) * 100));
  // A measured zero is a reading and scores 0 points; it must not be dropped (that used to leave only full-point inputs).
  rec.social.community = communityFields(mk({ lunar: { sentiment: 0, social_dominance: 0, trend: 'up' }, discordLinked: true, discordMembers: 100_000 }), NOW.toISOString());
  assertEquals(rec.social.community.sentiment.value, 0);
  assertEquals(scoreRecord(rec).dimensions.community.score, Math.round(((0 + 0 + 10 + 18) / (35 + 25 + 10 + 18)) * 100));
  // Missing / null / out-of-range is unknown.
  rec.social.community = communityFields(mk({ lunar: { sentiment: null, social_dominance: -1, trend: null } }), NOW.toISOString());
  assertEquals(rec.social.community.sentiment.status, 'unknown');
  assertEquals(rec.social.community.social_dominance.status, 'unknown');
  assertEquals(scoreRecord(rec).dimensions.community.score, null);
  // A cached answer keeps its original fetch time.
  const cached = communityFields(mk({ lunar: { sentiment: 60, social_dominance: 1, trend: 'up', fetched_at: '2026-09-23T18:00:00Z' } }), NOW.toISOString());
  assertEquals(cached.sentiment.sources[0].fetched_at, '2026-09-23T18:00:00Z');
  // A future provider timestamp is invalid provenance: the reading is dropped, not reused as fresh.
  const future = communityFields(mk({ lunar: { sentiment: 60, social_dominance: 1, trend: 'up', fetched_at: '2030-01-01T00:00:00Z' } }), NOW.toISOString());
  assertEquals(future.sentiment.status, 'unknown');
});

Deno.test('rpc: a JSON-RPC error under HTTP 200 is counted as a provider failure and opens the breaker', async () => {
  stubFetch(() => ({ json: { jsonrpc: '2.0', id: 1, error: { code: -32602, message: 'Request blocked' } } }));
  try {
    const ctx = new ScanContext();
    const eps = [{ name: 'a', url: 'https://rpc-a.test' }];
    for (let i = 0; i < 3; i++) await ctx.rpc('fam', eps, 'getX', []);
    assertEquals(ctx.failures()['fam:a'], 'provider_failed');
    const r = await ctx.rpc('fam', eps, 'getX', []);
    assertEquals(r.ok ? null : r.reason, 'circuit_open');
  } finally {
    restore();
  }
});

Deno.test('scoring: concentration is scored on the raw top-10 (adjusted share is displayed only)', () => {
  const two = { corroborated: true, confidence: 'high' as const };
  const rec = fakeRecord({ 'derived.circulating_ratio': ok(0.5, ref, two), 'chain.total_supply_onchain': ok(1e9, ref, two), 'chain.top10_pct': ok(40, ref, two), 'chain.top10_excl_noncirculating_pct': ok(5, ref, { confidence: 'medium' }) });
  const t = scoreRecord(rec).dimensions.tokenomics;
  assert(t.score !== null);
  assert('top10_pct' in t.inputs_used && !('top10_excl_noncirculating_pct' in t.inputs_used));
  assertEquals(t.inputs_used.top10_pct.value, 40);
});

Deno.test('labels: substring matches do not classify investors as locks (BlockTower / Blockchain Capital); only named exchanges and burns are high confidence', () => {
  assertEquals(classifyLabel('BlockTower Capital', 'nansen').category, 'unknown');
  assertEquals(classifyLabel('Blockchain Capital', 'nansen').category, 'unknown');
  assertEquals(classifyLabel('Token Locker', 'nansen').category, 'lock_or_vesting');
  assertEquals(classifyLabel('Token Locker', 'nansen').confidence, 'medium'); // a name does not verify a lock
  assertEquals(classifyLabel('Binance 14', 'nansen').confidence, 'high');
  const h: Holder = { address: 'x', amount: 1, pct: 50, category: 'unknown' };
  applyLabel(h, 'Foundation Treasury', 'nansen');
  assertEquals(h.category_confidence, 'medium');
});

// ---- Finding 11: missing liquidity fields are not measured zeros
Deno.test('liquidity: pools without reserve data are not $0 liquidity; DexScreener is tried, and if it has none the result is unknown', async () => {
  stubFetch((url) => {
    if (url.includes('geckoterminal')) return { json: { data: [{ attributes: { name: 'A / B', address: 'p1' } }] } }; // no reserve_in_usd
    if (url.includes('dexscreener')) return { json: [{ dexId: 'x', pairAddress: 'p2', baseToken: { symbol: 'A' }, quoteToken: { symbol: 'B' }, liquidity: { usd: 250000 }, volume: { h24: 1000 } }] };
    return { status: 404, text: '{}' };
  });
  try {
    const noDec = unknown<number>('missing_input');
    const l = await collectLiquidity(new ScanContext(), '0x1', '0xabc', {} as any, noDec, noDec);
    assertEquals(l.dex_liquidity_usd.value, 250000);
    assert(String(l.dex_liquidity_usd.sources[0].source).includes('dexscreener'));
  } finally {
    restore();
  }
  stubFetch((url) => (url.includes('geckoterminal') ? { json: { data: [{ attributes: { name: 'A / B' } }] } } : { json: [{ dexId: 'x', pairAddress: 'p2' }] }));
  try {
    const noDec = unknown<number>('missing_input');
    const l = await collectLiquidity(new ScanContext(), '0x1', '0xabc', {} as any, noDec, noDec);
    assertEquals(l.dex_liquidity_usd.status, 'unknown');
    assertEquals(l.dex_liquidity_usd.value, null);
  } finally {
    restore();
  }
  stubFetch((url) => (url.includes('geckoterminal') ? { json: { data: [] } } : { status: 404, text: '{}' })); // a real, empty answer
  try {
    const noDec = unknown<number>('missing_input');
    const l = await collectLiquidity(new ScanContext(), '0x1', '0xabc', {} as any, noDec, noDec);
    assertEquals(l.dex_liquidity_usd.value, 0); // measured: no pools
  } finally {
    restore();
  }
});

// ---- Codex round 2: finding 6 (identity verification) and finding 5 (malformed extension states)
Deno.test('address: a mint with no account at that exact case stops the scan (typo / bad stored hint), nothing is written', async () => {
  stubFetch((_url, body) => (body?.method ? { json: { jsonrpc: '2.0', id: 1, result: { context: { slot: 1 }, value: null } } } : { status: 404, text: '{}' }));
  try {
    let err: unknown = null;
    try {
      await collectToken(EXACT_L_MINT, 'solana');
    } catch (e) {
      err = e;
    }
    assert(err instanceof AddressResolutionError, 'a mixed-case address with no mint account must not produce a record');
  } finally {
    restore();
  }
});

Deno.test('address: a wrong stored hint is dropped and the exact case is recovered from CoinGecko instead', async () => {
  const wrong = EXACT_L_MINT.replace('LmWq', 'Lmwq'); // typo'd hint: same lowercase, different case
  const seen: string[] = [];
  stubFetch((url, body) => {
    if (url.includes('api.coingecko.com')) return { json: { id: 'l-token', name: 'L Token', symbol: 'ltk', detail_platforms: { solana: { contract_address: EXACT_L_MINT } }, platforms: { solana: EXACT_L_MINT }, market_data: {} } };
    if (body?.method === 'getAccountInfo') {
      seen.push(String(body.params[0]));
      return { json: { jsonrpc: '2.0', id: 1, result: { context: { slot: 1 }, value: body.params[0] === EXACT_L_MINT ? { owner: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA', data: { parsed: { type: 'mint', info: { decimals: 6, supply: '1000', mintAuthority: null, freezeAuthority: null } } } } : null } } };
    }
    if (body?.method) return { json: { jsonrpc: '2.0', id: 1, result: { context: { slot: 1 }, value: null } } };
    return { status: 404, text: '{}' };
  });
  try {
    const rec = await collectToken(EXACT_L_MINT.toLowerCase(), 'solana', { canonicalHint: wrong });
    assertEquals(rec.address_canonical.value, EXACT_L_MINT);
    assert(seen.includes(wrong), 'the hint was tried first');
  } finally {
    restore();
  }
});

Deno.test('solana: recognised Token-2022 extensions with missing/malformed state are unknown, never "no delegate / no hook / no fee / not pausable"', async () => {
  stubSolanaMint({ decimals: 6, supply: '1000000000', mintAuthority: null, freezeAuthority: null, extensions: [{ extension: 'permanentDelegate', state: {} }, { extension: 'transferHook', state: {} }, { extension: 'transferFeeConfig' }, { extension: 'pausableConfig' }] }, TOKEN_2022_PROGRAM);
  try {
    const f = await solanaAdapter.collect(new ScanContext(), EXACT_L_MINT, {} as any, 'solana');
    for (const k of ['permanent_delegate', 'transfer_hook', 'transfer_tax_pct', 'pausable'] as const) assertEquals(f[k].status, 'unknown', k);
    const rec = fakeRecord(Object.fromEntries(Object.entries(f).map(([k, v]) => [`chain.${k}`, v])));
    assertEquals(scoreRecord(rec).dimensions.security.inputs_used.permanent_delegate, undefined);
  } finally {
    restore();
  }
  stubSolanaMint({ decimals: 6, supply: '1000000000', mintAuthority: null, freezeAuthority: null, extensions: [{ extension: 'permanentDelegate', state: { delegate: null } }, { extension: 'transferHook', state: { programId: null, authority: null } }, { extension: 'pausableConfig', state: { authority: null, paused: false } }] }, TOKEN_2022_PROGRAM);
  try {
    const f = await solanaAdapter.collect(new ScanContext(), EXACT_L_MINT, {} as any, 'solana');
    assertEquals(f.permanent_delegate.value, false);
    assertEquals(f.transfer_hook.value, false);
  } finally {
    restore();
  }
});

// ---- Codex round 2: finding 1 (slot reads) and finding 2 (shared decimals)
Deno.test('evm: failed proxy-slot reads make inspection incomplete, so "no selector" is unknown, not false', async () => {
  stubFetch((_url, body) => {
    const rpc = (result: unknown) => ({ json: { jsonrpc: '2.0', id: 1, result } });
    if (body?.method === 'eth_getStorageAt') return { json: { jsonrpc: '2.0', id: 1, error: { code: -32000, message: 'boom' } } };
    if (body?.method === 'eth_getCode') return rpc('0x60806040');
    if (body?.method === 'eth_call') return rpc('0x' + (18).toString(16).padStart(64, '0'));
    return { status: 404, text: '{}' };
  });
  try {
    const f = await evmAdapter.collect(new ScanContext(), EVM_TOKEN, {} as any, '0x1');
    for (const k of ['mint_authority_active', 'pausable', 'blacklist'] as const) assertEquals(f[k].status, 'unknown', k);
  } finally {
    restore();
  }
});

Deno.test('evm: decimals disagreeing between two RPC operators leave decimals and supply unknown', async () => {
  let n = 0;
  stubFetch((_url, body) => {
    const rpc = (result: unknown) => ({ json: { jsonrpc: '2.0', id: 1, result } });
    if (body?.method === 'eth_call' && body.params[0].data === '0x313ce567') return rpc('0x' + (n++ % 2 === 0 ? 18 : 6).toString(16).padStart(64, '0'));
    if (body?.method === 'eth_call' && body.params[0].data === '0x18160ddd') return rpc('0x' + (10n ** 24n).toString(16).padStart(64, '0'));
    if (body?.method === 'eth_getStorageAt') return rpc(ZERO_WORD);
    if (body?.method === 'eth_getCode') return rpc('0x60806040');
    return rpc('0x');
  });
  try {
    const f = await evmAdapter.collect(new ScanContext(), EVM_TOKEN, {} as any, '0x1');
    assertEquals(f.decimals.status, 'disputed');
    assertEquals(f.total_supply_onchain.value, null);
  } finally {
    restore();
  }
});

Deno.test('evm: two agreeing operators corroborate decimals and supply', async () => {
  stubEvm({ proxy: false, implCodeOk: true, tokenCode: '0x60806040' });
  try {
    const f = await evmAdapter.collect(new ScanContext(), EVM_TOKEN, {} as any, '0x1');
    assertEquals(f.decimals.corroborated, true);
    assertEquals(f.total_supply_onchain.corroborated, true);
  } finally {
    restore();
  }
});

// ---- Codex round 2: finding 4 (completeness cannot fabricate zero exposure)
Deno.test('unlocks: any unscheduled supply (even 0.4%) means "not complete", a truncated series is not complete, an empty component is not a schedule', () => {
  const ev = { metadata: { events: [{ timestamp: NOW_S - 30 * DAY, noOfTokens: [996], unlockType: 'cliff' }] } };
  const tiny = computeUnlocks({ ...ev, supplyMetrics: { maxSupply: 1000, tbdAmount: 4 }, ...series([[-60, 0], [-30, 996], [-29, 996]]) }, 'x', ref, NOW);
  assertEquals(tiny.next_unlock_date.status, 'unknown');
  assertEquals(tiny.unlock_90d_amount.status, 'unknown');
  assertEquals(tiny.unscheduled_supply.value, 4);
  const truncated = computeUnlocks({ ...ev, supplyMetrics: { maxSupply: 1000, tbdAmount: 0 }, ...series([[-60, 0], [-45, 100], [-30, 200]]) }, 'x', ref, NOW); // monthly unlocks stop early
  assertEquals(truncated.next_unlock_date.status, 'unknown');
  const emptyComponent = computeUnlocks({ ...ev, supplyMetrics: { maxSupply: 1000, tbdAmount: 0 }, documentedData: { data: [{ label: 'a', data: [] }] } }, 'x', ref, NOW);
  assertEquals(emptyComponent.next_unlock_date.status, 'unknown');
  const unordered = computeUnlocks({ ...ev, supplyMetrics: { maxSupply: 1000, tbdAmount: 0 }, ...series([[-30, 1000], [-60, 0]]) }, 'x', ref, NOW);
  assertEquals(unordered.next_unlock_date.status, 'unknown');
});

// ---- Codex round 2: finding 9 (partial pool data)
Deno.test('liquidity: a pool without reserves makes the total a LOWER BOUND; pool 11 with data is not lost; missing volume stays null', async () => {
  const pool = (i: number, reserve?: string, vol?: string) => ({ attributes: { name: `P${i}`, address: `a${i}`, ...(reserve ? { reserve_in_usd: reserve } : {}), ...(vol ? { volume_usd: { h24: vol } } : {}) } });
  stubFetch(() => ({ json: { data: [pool(1, '1000', '10'), pool(2)] } }));
  try {
    const noDec = unknown<number>('missing_input');
    const l = await collectLiquidity(new ScanContext(), '0x1', '0xabc', {} as any, noDec, noDec);
    assertEquals(l.dex_liquidity_usd.value, 1000);
    assertEquals(l.dex_liquidity_usd.bound, 'lower');
    assertEquals(l.top_pools.value!.length, 1);
  } finally {
    restore();
  }
  const rows = [...Array.from({ length: 10 }, (_, i) => pool(i)), pool(11, '5000', '7')];
  stubFetch(() => ({ json: { data: rows } }));
  try {
    const noDec = unknown<number>('missing_input');
    const l = await collectLiquidity(new ScanContext(), '0x1', '0xabc', {} as any, noDec, noDec);
    assertEquals(l.dex_liquidity_usd.value, 5000); // not $0 with 0 pools
    assertEquals(l.top_pools.value![0].volume_24h_usd, 7);
  } finally {
    restore();
  }
  stubFetch(() => ({ json: { data: [pool(1, '1000')] } }));
  try {
    const noDec = unknown<number>('missing_input');
    const l = await collectLiquidity(new ScanContext(), '0x1', '0xabc', {} as any, noDec, noDec);
    assertEquals(l.top_pools.value![0].volume_24h_usd, null);
    assertEquals(l.dex_volume_24h_usd.bound, 'lower');
  } finally {
    restore();
  }
});

// ---- Codex round 2: finding 12
Deno.test('plausibility: a future source timestamp quarantines the field (unknown, not corroborated), not just a flag', () => {
  const rec = fakeRecord({ 'market.circulating_supply': ok(100, { source: 't', fetched_at: '2030-01-01T00:00:00Z' }, { corroborated: true, confidence: 'high' }) });
  runPlausibility(rec);
  assertEquals(rec.market.circulating_supply.status, 'unknown');
  assertEquals(rec.market.circulating_supply.corroborated, false);
});

Deno.test('plausibility: a chain holding ~1% of a multichain supply is legitimate; a clean 10^k gap is still a decimals error', () => {
  const legit = fakeRecord({ 'chain.total_supply_onchain': ok(1e7, ref), 'market.total_supply_market': ok(1e9, ref), 'market.platform_count': ok(6, ref) });
  runPlausibility(legit);
  assertEquals(legit.chain.total_supply_onchain.status, 'ok');
  const decimals = fakeRecord({ 'chain.total_supply_onchain': ok(1e15, ref), 'market.total_supply_market': ok(1e9, ref), 'market.platform_count': ok(6, ref) });
  runPlausibility(decimals);
  assertEquals(decimals.chain.total_supply_onchain.status, 'disputed');
});

// ---- Codex round 2: findings 14 and 18 (budget across retries, redaction)
Deno.test('budget: a paid call that fails does not retry past the credit budget', async () => {
  let calls = 0;
  stubFetch(() => {
    calls++;
    return { status: 503, text: 'unavailable' };
  });
  try {
    const ctx = new ScanContext({ maxCalls: 100, maxPaidCredits: 6 });
    const r = await ctx.fetchJson('nansen', 'https://x.test', { credits: 5, retries: 2 });
    assertEquals(calls, 1);
    assert(ctx.credits <= 6, `spent ${ctx.credits}`);
    assertEquals(r.ok ? null : r.reason, 'provider_failed'); // the real failure, not budget_exhausted
  } finally {
    restore();
  }
});

Deno.test('redaction: keys echoed in provider text or URLs are stripped before they are stored', async () => {
  stubFetch(() => ({ status: 500, text: 'error calling https://rpc.test/?api-key=SECRETVALUE123&x=1 with Bearer abc.def-ghi and {"apikey":"ZZZ999"}' }));
  try {
    const r = await new ScanContext().fetchJson('p', 'https://x.test', { retries: 0 });
    const d = r.ok ? '' : r.detail ?? '';
    assert(!/SECRETVALUE123|abc\.def-ghi|ZZZ999/.test(d), d);
    assert(d.includes('[redacted]'));
  } finally {
    restore();
  }
});

// ---- Codex round 3
import { ABSENCE_CORROBORATES, hasDelegatecall } from './evm.ts';

Deno.test('evm: DELEGATECALL is found by decoding instructions, not by an "f4" substring inside PUSH data', () => {
  assertEquals(hasDelegatecall('0x60f45000'), false); // PUSH1 0xf4; POP; STOP
  assertEquals(hasDelegatecall('0x6080f4'), true); // PUSH1 0x80; DELEGATECALL
  assertEquals(hasDelegatecall('0x7f' + 'f4'.repeat(32) + '00'), false); // PUSH32 of f4 bytes
  assertEquals(hasDelegatecall('0x00fe' + 'f4f4'), false); // after INVALID = metadata
});

Deno.test('evm: "no known function found" + GoPlus "0" is NOT corroborated, earns no security points, and supports no supply inference', async () => {
  assertEquals(ABSENCE_CORROBORATES, false);
  const two = (v: boolean) => ok(v, ref, { corroborated: true, confidence: 'high' as const });
  stubEvm({ proxy: false, implCodeOk: true, tokenCode: '0x60806040' });
  const realGp = globalThis.fetch;
  const wrapped = ((input: any, init?: any) => (String(input).includes('gopluslabs') ? Promise.resolve(new Response(JSON.stringify({ code: 1, result: { [EVM_TOKEN]: { is_mintable: '0', transfer_pausable: '0', is_blacklisted: '0' } } }), { status: 200 })) : realGp(input, init))) as typeof fetch;
  globalThis.fetch = wrapped;
  try {
    const f = await evmAdapter.collect(new ScanContext(), EVM_TOKEN, {} as any, '0x1');
    for (const k of ['mint_authority_active', 'pausable', 'blacklist'] as const) {
      assertEquals(f[k].value, false, k);
      assertEquals(f[k].corroborated, false, k);
    }
    const rec = fakeRecord({ 'chain.mint_authority_active': f.mint_authority_active, 'chain.honeypot': two(false), 'chain.pausable': f.pausable, 'chain.blacklist': f.blacklist });
    rec.chain_id = '0x1';
    const sec = scoreRecord(rec).dimensions.security;
    assertEquals(sec.score, null); // mint is required and cannot be established
    assert(!('pausable' in sec.inputs_used) && !('blacklist' in sec.inputs_used));
  } finally {
    restore();
  }
});

Deno.test('evm: a positive finding still counts even from one source (a warning is not flattering)', () => {
  const rec = fakeRecord({ 'chain.mint_authority_active': ok(true, ref, { corroborated: true }), 'chain.honeypot': ok(false, ref, { corroborated: false }), 'chain.pausable': ok(true, ref, { corroborated: false }) });
  rec.chain_id = '0x1';
  const sec = scoreRecord(rec).dimensions.security;
  assert('pausable' in sec.inputs_used);
  assertEquals(sec.inputs_used.pausable.points, 3);
});

Deno.test('solana: empty-string addresses and null/non-integer fee bps in Token-2022 extensions are malformed, not "none"', async () => {
  stubSolanaMint({ decimals: 6, supply: '1000000000', mintAuthority: null, freezeAuthority: null, extensions: [{ extension: 'permanentDelegate', state: { delegate: '' } }, { extension: 'transferHook', state: { programId: '' } }, { extension: 'transferFeeConfig', state: { newerTransferFee: { transferFeeBasisPoints: null } } }] }, TOKEN_2022_PROGRAM);
  try {
    const f = await solanaAdapter.collect(new ScanContext(), EXACT_L_MINT, {} as any, 'solana');
    for (const k of ['permanent_delegate', 'transfer_hook', 'transfer_tax_pct'] as const) assertEquals(f[k].status, 'unknown', k);
  } finally {
    restore();
  }
});

Deno.test('address: an RPC failure or a non-mint account never confirms Solana identity', async () => {
  stubFetch((_u, body) => (body?.method ? { status: 503, text: 'down' } : { status: 404, text: '{}' }));
  try {
    let err: unknown = null;
    try {
      await collectToken(EXACT_L_MINT, 'solana');
    } catch (e) {
      err = e;
    }
    assert(err instanceof AddressResolutionError);
  } finally {
    restore();
  }
  stubFetch((_u, body) => (body?.method === 'getAccountInfo' ? { json: { jsonrpc: '2.0', id: 1, result: { context: { slot: 1 }, value: { owner: '11111111111111111111111111111111', data: ['', 'base64'] } } } } : { status: 404, text: '{}' }));
  try {
    let err: unknown = null;
    try {
      await collectToken(EXACT_L_MINT, 'solana');
    } catch (e) {
      err = e;
    }
    assert(err instanceof AddressResolutionError, 'a non-mint account must not be accepted');
  } finally {
    restore();
  }
});

Deno.test('unlocks: coverage must be full (996 of 1000 is not complete); a bad series does not hide a valid dated event or the unscheduled supply', () => {
  const nearly = computeUnlocks({ metadata: { events: [{ timestamp: NOW_S - 30 * DAY, noOfTokens: [996], unlockType: 'cliff' }] }, supplyMetrics: { maxSupply: 1000, tbdAmount: 0 }, ...series([[-60, 0], [-30, 996], [-29, 996]]) }, 'x', ref, NOW);
  assertEquals(nearly.next_unlock_date.status, 'unknown');
  const decreasing = computeUnlocks({ metadata: { events: [] }, supplyMetrics: { maxSupply: 1000, tbdAmount: 0 }, ...series([[-60, 500], [-30, 100], [-29, 1000]]) }, 'x', ref, NOW);
  assertEquals(decreasing.unlock_90d_amount.status, 'unknown');
  const badSeries = computeUnlocks({ metadata: { events: [{ timestamp: NOW_S + 10 * DAY, noOfTokens: [100], unlockType: 'cliff' }] }, supplyMetrics: { maxSupply: 1000, tbdAmount: 300 }, documentedData: { data: [{ label: 'a', data: [] }] } }, 'x', ref, NOW);
  assertEquals(badSeries.next_unlock_amount.value, 100);
  assertEquals(badSeries.unscheduled_supply.value, 300);
  assertEquals(badSeries.unlock_30d_amount.status, 'unknown');
});

Deno.test('labels: "Coinbase Ventures" and "Burn Capital" are not exchange/burn wallets', () => {
  assertEquals(classifyLabel('Coinbase Ventures', 'nansen').confidence, 'medium');
  assertEquals(classifyLabel('Burn Capital', 'nansen').confidence, 'medium');
  assertEquals(classifyLabel('Coinbase 12', 'nansen').confidence, 'high');
  assertEquals(classifyLabel('Binance Hot Wallet', 'nansen').confidence, 'high');
  assertEquals(classifyLabel('Burn Address', 'nansen').confidence, 'high');
});

Deno.test('budget: concurrent retries share one budget (no spending past it while another attempt is in backoff)', async () => {
  stubFetch(() => ({ status: 503, text: 'down' }));
  try {
    const ctx = new ScanContext({ maxCalls: 3, maxPaidCredits: 15 });
    await Promise.all([1, 2, 3, 4].map(() => ctx.fetchJson('paid', 'https://x.test', { credits: 5, retries: 2 })));
    assert(ctx.calls <= 3, `calls ${ctx.calls}`);
    assert(ctx.credits <= 15, `credits ${ctx.credits}`);
  } finally {
    restore();
  }
});

Deno.test('redaction: header-style and JSON key/token fields are stripped too', async () => {
  stubFetch(() => ({ status: 500, text: 'x-api-key: HDRSECRET99 and {"auth_token":"JSONSECRET77"}' }));
  try {
    const r = await new ScanContext().fetchJson('p', 'https://x.test', { retries: 0 });
    const d = r.ok ? '' : r.detail ?? '';
    assert(!/HDRSECRET99|JSONSECRET77/.test(d), d);
  } finally {
    restore();
  }
});

Deno.test('plausibility: future-dated supply invalidates dependents in the same pass; a 1% multichain share is not a decimals error', () => {
  const two = { corroborated: true, confidence: 'high' as const };
  const rec = fakeRecord({
    'chain.total_supply_onchain': ok(1e9, { source: 't', fetched_at: '2030-01-01T00:00:00Z' }, two),
    'chain.top10_pct': ok(30, ref, two),
    'market.platform_count': ok(5, ref),
  });
  runPlausibility(rec);
  assertEquals(rec.chain.total_supply_onchain.status, 'unknown');
  assertEquals(rec.chain.top10_pct.status, 'unknown');
  const legit = fakeRecord({ 'chain.total_supply_onchain': ok(1e6, ref), 'market.total_supply_market': ok(1e9, ref), 'market.platform_count': ok(6, ref) });
  runPlausibility(legit);
  assertEquals(legit.chain.total_supply_onchain.status, 'ok'); // exactly 10^-3 of the global supply
});

// ---- Sourcify: verified source as the affirmative second source for EVM capabilities
import { sourcifyCapabilities, matchingFunctions } from './sourcify.ts';
import { withSourcify } from './evm.ts';

const fn = (name: string, stateMutability = 'nonpayable') => ({ type: 'function', name, stateMutability });
const sfReply = (abi: unknown[], proxy?: { impls: string[] }) => ({ json: { runtimeMatch: 'match', creationMatch: 'match', abi, proxyResolution: { isProxy: !!proxy, proxyType: proxy ? 'EIP1967Proxy' : null, implementations: (proxy?.impls ?? []).map((address) => ({ address })) } } });

Deno.test('sourcify: function-name matching counts only state-changing functions', () => {
  assertEquals(matchingFunctions([fn('mint'), fn('paused', 'view'), fn('pause'), fn('blacklist'), fn('transfer')], /mint/i), ['mint']);
  assertEquals(matchingFunctions([fn('paused', 'view'), fn('isBlacklisted', 'view')], /pause|blacklist/i), []);
});

Deno.test('sourcify: verified plain token with no mint/pause/blacklist function = absent (affirmative)', async () => {
  stubFetch(() => sfReply([fn('transfer'), fn('approve'), fn('balanceOf', 'view')]));
  try {
    const c = await sourcifyCapabilities(new ScanContext(), '1', EVM_TOKEN, []);
    for (const k of ['mint', 'pause', 'blacklist'] as const) {
      assertEquals(c[k].value, false, k);
      assertEquals(c[k].status, 'ok', k);
    }
  } finally {
    restore();
  }
});

Deno.test('sourcify: a proxy is judged by its IMPLEMENTATION abi; an unverified implementation leaves it unknown', async () => {
  const proxyReply = sfReply([fn('upgradeTo'), fn('admin')], { impls: [EVM_IMPL] });
  stubFetch((url) => (url.includes(`/${EVM_IMPL}`) ? { status: 404, text: '{}' } : proxyReply));
  try {
    const c = await sourcifyCapabilities(new ScanContext(), '1', EVM_TOKEN, [EVM_IMPL]);
    assertEquals(c.mint.status, 'unknown');
  } finally {
    restore();
  }
  stubFetch((url) => (url.includes(`/${EVM_IMPL}`) ? sfReply([fn('mint'), fn('pause'), fn('transfer')]) : proxyReply));
  try {
    const c = await sourcifyCapabilities(new ScanContext(), '1', EVM_TOKEN, [EVM_IMPL]);
    assertEquals(c.mint.value, true);
    assertEquals(c.pause.value, true);
    assertEquals(c.blacklist.value, false);
  } finally {
    restore();
  }
});

Deno.test('sourcify: a delegation our chain reads found that Sourcify did not resolve, or a fallback(), leaves the answer unknown', async () => {
  stubFetch(() => sfReply([fn('transfer')])); // Sourcify says: not a proxy
  try {
    const c = await sourcifyCapabilities(new ScanContext(), '1', EVM_TOKEN, [EVM_IMPL]); // but the chain has an implementation slot
    assertEquals(c.mint.status, 'unknown');
  } finally {
    restore();
  }
  stubFetch(() => sfReply([fn('transfer'), { type: 'fallback', stateMutability: 'payable' }]));
  try {
    assertEquals((await sourcifyCapabilities(new ScanContext(), '1', EVM_TOKEN, [])).mint.status, 'unknown');
  } finally {
    restore();
  }
});

Deno.test('sourcify: unverified contract or provider failure = unknown, never absent', async () => {
  stubFetch(() => ({ status: 404, text: '{"customCode":"contract_not_found"}' }));
  try {
    assertEquals((await sourcifyCapabilities(new ScanContext(), '1', EVM_TOKEN, [])).mint.reason, 'not_found');
  } finally {
    restore();
  }
  stubFetch(() => ({ status: 503, text: 'down' }));
  try {
    assertEquals((await sourcifyCapabilities(new ScanContext(), '1', EVM_TOKEN, [])).mint.status, 'unknown');
  } finally {
    restore();
  }
});

Deno.test('withSourcify: verified absence + one agreeing reading is corroborated; GoPlus dissent loses; bytecode selector vs ABI is disputed', () => {
  const sfFalse = ok(false, { source: 'sourcify', fetched_at: NOW.toISOString() }, { confidence: 'high' });
  const sfTrue = ok(true, { source: 'sourcify', fetched_at: NOW.toISOString() }, { confidence: 'high' });
  const sel = (v: boolean) => ok(v, { source: 'evm_rpc_1:x', fetched_at: NOW.toISOString() });
  const gp = (v: boolean) => ok(v, { source: 'goplus', fetched_at: NOW.toISOString() });
  const gpBlank = unknown<boolean>('no_data');
  const a = withSourcify(sel(false), gp(false), sfFalse, 'mint');
  assertEquals([a.value, a.status, a.corroborated], [false, 'ok', true]);
  const dissent = withSourcify(sel(false), gp(true), sfFalse, 'pause'); // PEPE case
  assertEquals([dissent.value, dissent.status, dissent.corroborated], [false, 'ok', true]);
  const blankGp = withSourcify(sel(false), gpBlank, sfFalse, 'mint'); // AAVE/USDC-style proxy with blank GoPlus
  assertEquals(blankGp.corroborated, true);
  const onlySf = withSourcify(unknown<boolean>('no_data'), gpBlank, sfFalse, 'mint');
  assertEquals([onlySf.status, onlySf.corroborated], ['ok', false]);
  const conflict = withSourcify(sel(true), gp(false), sfFalse, 'mint');
  assertEquals(conflict.status, 'disputed');
  const present = withSourcify(sel(false), gp(false), sfTrue, 'mint'); // UNI case: GoPlus 0 was wrong
  assertEquals([present.value, present.status, present.corroborated], [true, 'ok', false]);
  const presentAgreed = withSourcify(sel(true), gp(false), sfTrue, 'mint');
  assertEquals([presentAgreed.value, presentAgreed.corroborated], [true, true]);
  const noSf = withSourcify(sel(false), gp(false), unknown<boolean>('not_found'), 'mint'); // no verified code: weak negative stays uncorroborated
  assertEquals([noSf.value, noSf.corroborated], [false, false]);
});
