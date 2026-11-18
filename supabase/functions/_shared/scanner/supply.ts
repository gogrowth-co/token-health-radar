// Third reader for circulating supply (added 2026-10-28). When CoinGecko and CoinMarketCap disagree beyond tolerance,
// the project's own published figure (supply-sources.ts) settles it: the aggregator that agrees with it wins, the other is
// named out of date. The project's figure never overrides both aggregators, and a token without an entry stays disputed
// with "no project supply source on file" in its detail (the preflight lists those so the registry grows from real disputes).
// LINK, 2026-10: CoinMarketCap stayed one quarterly release behind for 18 days, leaving tokenomics unscored.
import { type Field, ok, relDiff, type SourceRef, unknown, usable } from './field.ts';
import type { ScanContext } from './http.ts';
import { EVM_CHAINS } from './evm.ts';
import { SUPPLY_SOURCES, type SupplySource } from './supply-sources.ts';

export const NO_PROJECT_SOURCE = 'no project supply source on file';
const AGREE = 0.02; // same tolerance as the aggregator cross-check
const API_VS_WALLETS = 0.005; // the project's two figures must match closely; a gap means the wallet list is out of date
const MULTICALL3 = '0xca11bde05977b3631167028862be2a173976ca11'; // same address on every EVM chain we scan
const AGGREGATORS: Record<string, string> = { coingecko: 'CoinGecko', coinmarketcap: 'CoinMarketCap' };

export function sourceFor(chainId: string, address: string, registry: Record<string, SupplySource> = SUPPLY_SOURCES): SupplySource | null {
  return registry[`${chainId}:${address.toLowerCase()}`] ?? null;
}

const word = (hex: string, i: number) => hex.slice(i * 64, i * 64 + 64);
const pad = (h: string) => h.padStart(64, '0');

/** ABI-encode Multicall3.aggregate((address,bytes)[]) for calls whose calldata is at most 64 bytes. */
export function encodeAggregate(calls: Array<{ target: string; data: string }>): string {
  const n = calls.length;
  let head = pad('20') + pad(n.toString(16));
  let tail = '';
  calls.forEach((c, i) => {
    head += pad((n * 32 + i * 160).toString(16));
    const d = c.data.replace(/^0x/, '');
    tail += pad(c.target.replace(/^0x/, '').toLowerCase()) + pad('40') + pad((d.length / 2).toString(16)) + d.padEnd(128, '0');
  });
  return '0x252dba42' + head + tail;
}

/** Decode aggregate's (uint256 blockNumber, bytes[] returnData) where every return is one uint256. */
export function decodeAggregate(result: string): bigint[] {
  const h = result.replace(/^0x/, '');
  const arr = parseInt(word(h, 1), 16) / 32;
  const n = parseInt(word(h, arr), 16);
  const out: bigint[] = [];
  for (let i = 0; i < n; i++) {
    const at = arr + 1 + parseInt(word(h, arr + 1 + i), 16) / 32;
    out.push(BigInt('0x' + (word(h, at + 1) || '0')));
  }
  return out;
}

const scaled = (raw: bigint, decimals: number) => Number(raw / 10n ** BigInt(Math.max(0, decimals - 6))) / 10 ** Math.min(6, decimals);

async function readApi(ctx: ScanContext, src: SupplySource): Promise<Field<number>> {
  const api = src.api!;
  const provider = `project_supply:${new URL(api.url).host}`;
  const r = await ctx.fetchJson(provider, api.url, { retries: 1, timeoutMs: 10_000, excerpt: (d) => ({ [api.field]: d?.[api.field] }) });
  if (!r.ok) return unknown(r.reason, `${src.name} supply API: ${r.detail ?? r.reason}`, [r.ref], { unit: 'tokens', scope: 'global' });
  const v = r.data?.[api.field];
  let n: number | null = null;
  if (typeof v === 'number' && Number.isFinite(v)) n = api.decimals ? scaled(BigInt(Math.round(v)), api.decimals) : v;
  else if (typeof v === 'string' && /^\d+$/.test(v)) n = scaled(BigInt(v), api.decimals);
  else if (typeof v === 'string' && Number.isFinite(Number(v))) n = Number(v);
  return n !== null && n > 0
    ? ok(n, r.ref, { unit: 'tokens', scope: 'global', confidence: 'high' })
    : unknown('no_data', `${src.name} supply API has no ${api.field}`, [r.ref], { unit: 'tokens', scope: 'global' });
}

async function readWallets(ctx: ScanContext, chainId: string, address: string, decimals: number, src: SupplySource): Promise<Field<number>> {
  const chain = EVM_CHAINS[chainId];
  if (!chain) return unknown('not_supported_on_chain', 'wallet sums are read on EVM chains only', [], { unit: 'tokens' });
  const token = address.toLowerCase();
  const calls = [{ target: token, data: '0x18160ddd' }, ...src.wallets!.map((w) => ({ target: token, data: '0x70a08231' + pad(w.replace(/^0x/, '').toLowerCase()) }))];
  const r = await ctx.rpc<string>(`evm_rpc_${chain.goplus}`, chain.rpcs, 'eth_call', [{ to: MULTICALL3, data: encodeAggregate(calls) }, 'latest']);
  if (!r.ok || typeof r.data !== 'string') return unknown(r.ok ? 'no_data' : r.reason, `${src.name} wallet balances: ${r.ok ? 'empty answer' : r.detail ?? r.reason}`, [r.ref], { unit: 'tokens' });
  let vals: bigint[];
  try { vals = decodeAggregate(r.data); } catch { vals = []; }
  if (vals.length !== calls.length) return unknown('no_data', `${src.name} wallet balances: could not decode the multicall answer`, [r.ref], { unit: 'tokens' });
  const [total, ...held] = vals;
  const circ = total - held.reduce((a, b) => a + b, 0n);
  const ref: SourceRef = { ...r.ref, source: `project_wallets:${r.ref.source}`, raw_excerpt: { totalSupply_raw: total.toString(), noncirculating_raw: (total - circ).toString(), wallets: src.wallets!.length } };
  return circ > 0n
    ? ok(scaled(circ, decimals), ref, { unit: 'tokens', scope: 'chain', decimals, confidence: 'high' })
    : unknown('failed_plausibility', `${src.name} wallets hold the whole supply`, [ref], { unit: 'tokens' });
}

/** The project's own circulating figure: its API and/or its wallet sum. When both answer they must agree. */
export async function projectSupply(ctx: ScanContext, chainId: string, address: string, decimals: number | null, src: SupplySource): Promise<Field<number>> {
  const api = src.api ? await readApi(ctx, src) : null;
  const wal = src.wallets?.length && decimals !== null ? await readWallets(ctx, chainId, address, decimals, src) : null;
  const sources = [api, wal].filter(Boolean).flatMap((f) => f!.sources.map((s) => ({ ...s, value: f!.value })));
  if (api && wal && usable(api) && usable(wal)) {
    if (relDiff(api.value, wal.value) > API_VS_WALLETS) {
      return unknown('sources_disagree', `${src.name}: supply API ${Math.round(api.value)} vs wallet sum ${Math.round(wal.value)}: the published wallet list may be out of date (verified ${src.verified_at})`, sources, { unit: 'tokens' });
    }
    return { ...api, sources, detail: `${src.name} supply API and wallet sum agree` };
  }
  const one = [api, wal].find((f) => f && usable(f));
  if (one) return { ...one, sources };
  const first = api ?? wal;
  return first ?? unknown('no_data', `${src.name}: no supply reader configured`, [], { unit: 'tokens' });
}

const fmtM = (n: number) => `${(n / 1e6).toFixed(2)}M`;

/**
 * Settle a CoinGecko/CoinMarketCap dispute with the project's own figure. Only a `sources_disagree` field changes:
 * - the project's figure agrees (within 2%) with one aggregator -> ok, corroborated, that aggregator's value
 * - it agrees with neither, or could not be read -> still disputed, with the reason added to the detail
 */
export function tiebreak(field: Field<number>, primary: Field<number> | null, name: string): Field<number> {
  if (field.status !== 'disputed' || field.reason !== 'sources_disagree') return field;
  if (!primary) return { ...field, detail: `${field.detail}; ${NO_PROJECT_SOURCE}` };
  const sources = [...field.sources, ...primary.sources.filter((s) => !field.sources.some((f) => f.source === s.source))];
  if (!usable(primary)) return { ...field, sources, detail: `${field.detail}; ${name}'s own figure unavailable: ${primary.detail ?? primary.reason}` };
  const readings = field.sources
    .filter((s) => AGGREGATORS[s.source] && typeof s.value === 'number')
    .map((s) => ({ name: AGGREGATORS[s.source], value: s.value as number, diff: relDiff(s.value as number, primary.value) }));
  const agree = readings.filter((r) => r.diff <= AGREE).sort((a, b) => a.diff - b.diff);
  if (!agree.length) return { ...field, sources, detail: `${field.detail}; ${name}'s own figure ${fmtM(primary.value)} agrees with neither` };
  const win = agree[0];
  const stale = readings.filter((r) => r.name !== win.name).map((r) => `${r.name} ${fmtM(r.value)}`).join(', ');
  return {
    ...field,
    value: win.value,
    status: 'ok',
    reason: undefined,
    confidence: 'high',
    corroborated: true,
    detail: `circulating supply: ${name}'s own figure ${fmtM(primary.value)} agrees with ${win.name} ${fmtM(win.value)}; ${stale || 'the other source'} is out of date`,
    sources,
  };
}

/** Called once per scan, after the chain facts (decimals) are known. Reads the project only when the aggregators disagree. */
export async function settleCirculating(ctx: ScanContext, chainId: string, address: string, field: Field<number>, decimals: Field<number>): Promise<Field<number>> {
  if (field.status !== 'disputed' || field.reason !== 'sources_disagree') return field;
  const src = sourceFor(chainId, address);
  if (!src) return tiebreak(field, null, '');
  const primary = await projectSupply(ctx, chainId, address, usable(decimals) ? decimals.value : null, src);
  return tiebreak(field, primary, src.name);
}
