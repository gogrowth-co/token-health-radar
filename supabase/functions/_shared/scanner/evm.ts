// EVM chain adapter (Ethereum, BSC, Base, Arbitrum, Polygon, Optimism).
//
// Security facts come from two independent reads each: the contract itself
// (storage slots + bytecode selectors over free public RPC) and GoPlus; taxes
// and honeypot from GoPlus and honeypot.is's buy/sell simulation. GoPlus
// answers "" (blank) for fields it could not determine (seen on proxies:
// AAVE, USDC, PAXG) — blank becomes `unknown`, never `false`.
import { crossCheckBool, crossCheckNumber, type Field, ok, type SourceRef, unknown, usable } from './field.ts';
import type { ScanContext } from './http.ts';
import { applyLabel, buildConcentration, fetchNansenLabels, type Holder, round } from './holders.ts';
import { sellImpact } from './solana.ts';
import type { ChainAdapter, ChainFacts } from './types.ts';

interface EvmChain {
  name: string;
  goplus: string;
  cg: string;
  nansen: string;
  gecko: string;
  kyber: string;
  honeypot: boolean;
  ethplorer: boolean;
  usdc: string;
  rpcs: Array<{ name: string; url: string }>;
}

// RPC endpoints verified 2026-09-24. bsc.drpc.org was ~150k blocks behind: last for BSC.
export const EVM_CHAINS: Record<string, EvmChain> = {
  '0x1': { name: 'Ethereum', goplus: '1', cg: 'ethereum', nansen: 'ethereum', gecko: 'eth', kyber: 'ethereum', honeypot: true, ethplorer: true, usdc: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', rpcs: [{ name: 'publicnode', url: 'https://ethereum-rpc.publicnode.com' }, { name: 'drpc', url: 'https://eth.drpc.org' }, { name: '1rpc', url: 'https://1rpc.io/eth' }] },
  '0x38': { name: 'BSC', goplus: '56', cg: 'binance-smart-chain', nansen: 'bnb', gecko: 'bsc', kyber: 'bsc', honeypot: true, ethplorer: false, usdc: '0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d', rpcs: [{ name: 'publicnode', url: 'https://bsc-rpc.publicnode.com' }, { name: '1rpc', url: 'https://1rpc.io/bnb' }, { name: 'drpc', url: 'https://bsc.drpc.org' }] },
  '0x2105': { name: 'Base', goplus: '8453', cg: 'base', nansen: 'base', gecko: 'base', kyber: 'base', honeypot: true, ethplorer: false, usdc: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', rpcs: [{ name: 'publicnode', url: 'https://base-rpc.publicnode.com' }, { name: 'base', url: 'https://mainnet.base.org' }, { name: 'drpc', url: 'https://base.drpc.org' }] },
  '0xa4b1': { name: 'Arbitrum', goplus: '42161', cg: 'arbitrum-one', nansen: 'arbitrum', gecko: 'arbitrum', kyber: 'arbitrum', honeypot: false, ethplorer: false, usdc: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831', rpcs: [{ name: 'publicnode', url: 'https://arbitrum-one-rpc.publicnode.com' }, { name: 'arbitrum', url: 'https://arb1.arbitrum.io/rpc' }, { name: 'drpc', url: 'https://arbitrum.drpc.org' }] },
  '0x89': { name: 'Polygon', goplus: '137', cg: 'polygon-pos', nansen: 'polygon', gecko: 'polygon_pos', kyber: 'polygon', honeypot: false, ethplorer: false, usdc: '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359', rpcs: [{ name: 'publicnode', url: 'https://polygon-bor-rpc.publicnode.com' }, { name: 'drpc', url: 'https://polygon.drpc.org' }] },
  '0xa': { name: 'Optimism', goplus: '10', cg: 'optimistic-ethereum', nansen: 'optimism', gecko: 'optimism', kyber: 'optimism', honeypot: false, ethplorer: false, usdc: '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85', rpcs: [{ name: 'publicnode', url: 'https://optimism-rpc.publicnode.com' }, { name: 'optimism', url: 'https://mainnet.optimism.io' }] },
};

const SLOTS = {
  eip1967_impl: '0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc',
  eip1967_beacon: '0xa3f0ad74e5423aebfd80d3ef4346578335a9a72aeaee59ff6cb3582b35133d50',
  eip1822_proxiable: '0xc5f16f0fcc639fa48a6947836d9850f504798523bf8c9a3a87d5876cf622bcf7',
  zos_impl: '0x7050c9e0f4ca769c69bd3a8ef740bc37934f8e2c036e5a723fd8ee048ed3f8c3',
};
// 4-byte selectors (keccak256, computed 2026-09-24). Matched as PUSH4 operands (0x63 + selector).
const SEL = {
  mint: ['40c10f19', 'a0712d68', 'cc872b66'], // mint(address,uint256), mint(uint256), issue(uint256)
  pause: ['8456cb59', '5c975abb'], // pause(), paused()
  blacklist: ['f9f92be4', '404e5129', 'fe575a87', '44337ea1', 'dbac26e9', '0ecb93c0', 'e47d6060', '153b0d1e', '16c02129'],
};
const DEAD = new Set(['0x0000000000000000000000000000000000000000', '0x000000000000000000000000000000000000dead']);

const zeroAddr = (hex: string | null | undefined) => !hex || /^0x0*$/.test(hex);
const addrFromWord = (hex: string) => '0x' + hex.slice(-40).toLowerCase();

let goplusToken: { token: string; exp: number } | null = null;
async function goplusAuth(ctx: ScanContext): Promise<Record<string, string>> {
  const key = Deno.env.get('GOPLUS_APP_KEY');
  const secret = Deno.env.get('GOPLUS_APP_SECRET');
  if (!key || !secret) return {};
  if (goplusToken && goplusToken.exp > Date.now()) return { Authorization: goplusToken.token };
  const time = Math.floor(Date.now() / 1000);
  const h = new Uint8Array(await crypto.subtle.digest('SHA-1', new TextEncoder().encode(`${key}${time}${secret}`)));
  const sign = [...h].map((b) => b.toString(16).padStart(2, '0')).join('');
  const r = await ctx.fetchJson('goplus_auth', 'https://api.gopluslabs.io/api/v1/token', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ app_key: key, time, sign }), retries: 1 });
  const t = r.ok ? r.data?.result?.access_token : null;
  if (!t) return {}; // keyless endpoint still works, just rate-limited
  goplusToken = { token: t.startsWith('Bearer ') ? t : `Bearer ${t}`, exp: Date.now() + Math.max(60, (r.data.result.expires_in ?? 3600) - 60) * 1000 };
  return { Authorization: goplusToken.token };
}

export const evmAdapter: ChainAdapter = {
  family: 'evm',
  cgPlatform: (c) => EVM_CHAINS[c]?.cg ?? null,
  nansenChain: (c) => EVM_CHAINS[c]?.nansen ?? null,

  async collect(ctx, address, _market, chainId): Promise<ChainFacts> {
    const chain = EVM_CHAINS[chainId];
    const a = address.toLowerCase();
    const rpc = (method: string, params: unknown[]) => ctx.rpc<string>(`evm_rpc_${chain.goplus}`, chain.rpcs, method, params);
    const call = (data: string) => rpc('eth_call', [{ to: a, data }, 'latest']);

    // ---- on-chain reads
    const [dec, ts, own, getOwn, code, ...slots] = await Promise.all([
      call('0x313ce567'),
      call('0x18160ddd'),
      call('0x8da5cb5b'),
      call('0x893d20e8'),
      rpc('eth_getCode', [a, 'latest']),
      ...Object.values(SLOTS).map((s) => rpc('eth_getStorageAt', [a, s, 'latest'])),
    ]);
    const slotVals: Record<string, any> = Object.fromEntries(Object.keys(SLOTS).map((k, i) => [k, slots[i]]));
    const refOf = (r: any, excerpt: Record<string, unknown>): SourceRef => ({ ...r.ref, raw_excerpt: excerpt });

    // decimals feed every raw-to-token conversion (supply, holder balances): read from two operators, and a
    // disagreement leaves decimals unknown (Codex round 2, finding 2: a shared wrong decimals corroborated a wrong supply).
    const decFrom = (r: typeof dec): Field<number> => {
      const n = r.ok && r.data && r.data !== '0x' ? parseInt(r.data, 16) : null;
      return n !== null && Number.isInteger(n) && n <= 36 ? ok(n, refOf(r, { decimals: r.data }), { unit: 'decimals', confidence: 'high' }) : unknown(r.ok ? 'no_data' : r.reason, r.ok ? 'decimals() returned nothing' : r.detail, [r.ref]);
    };
    const dec2 = dec.ok ? await ctx.rpc<string>(`evm_rpc_${chain.goplus}`, chain.rpcs.filter((r) => `evm_rpc_${chain.goplus}:${r.name}` !== dec.ref.source), 'eth_call', [{ to: a, data: '0x313ce567' }, 'latest']) : dec;
    const decF: Field<number> = crossCheckNumber(decFrom(dec), decFrom(dec2), { absTolerance: 0, unit: 'decimals', label: 'decimals (two RPC operators)' });
    const decimals: number | null = usable(decF) ? decF.value : null;
    const totalFrom = (r: typeof ts): Field<number> =>
      r.ok && r.data && r.data !== '0x' && decimals !== null
        ? ok(Number(BigInt(r.data)) / 10 ** decimals, refOf(r, { totalSupply_raw: BigInt(r.data).toString(), decimals }), { unit: 'tokens', decimals, scope: 'chain', confidence: 'medium' })
        : unknown(r.ok ? (decimals === null ? 'missing_input' : 'no_data') : r.reason, r.ok ? 'totalSupply() or decimals unavailable' : r.detail, [r.ref], { unit: 'tokens', scope: 'chain' });
    // Second, independent read of totalSupply from a DIFFERENT RPC operator (Codex review finding 2).
    const ts2 = ts.ok
      ? await ctx.rpc<string>(`evm_rpc_${chain.goplus}`, chain.rpcs.filter((r) => `evm_rpc_${chain.goplus}:${r.name}` !== ts.ref.source), 'eth_call', [{ to: a, data: '0x18160ddd' }, 'latest'])
      : ts;
    const totalRaw: Field<number> = crossCheckNumber(totalFrom(ts), totalFrom(ts2), { tolerance: 0.001, unit: 'tokens', label: 'totalSupply (two RPC operators)' });
    // Supply is only corroborated when the decimals it was scaled by are too.
    const total: Field<number> = decF.corroborated === true ? totalRaw : { ...totalRaw, corroborated: false, detail: `${totalRaw.detail ?? ''} decimals not corroborated by a second operator`.trim() };

    // Proxy: any standard implementation/beacon slot set.
    const slotSet = Object.entries(slotVals).filter(([, r]) => r.ok && r.data && !zeroAddr(r.data));
    const slotsOk = Object.values(slotVals).every((r) => r.ok);
    const slotAddr = (k: string): string | null => (slotVals[k].ok && slotVals[k].data && !zeroAddr(slotVals[k].data) ? addrFromWord(slotVals[k].data) : null);
    const implAddr = slotAddr('eip1967_impl') ?? slotAddr('zos_impl') ?? slotAddr('eip1822_proxiable');
    const proxyOnchain: Field<boolean> = slotsOk || slotSet.length
      ? ok(slotSet.length > 0, refOf(slotVals.eip1967_impl, { slots_set: slotSet.map(([k]) => k), implementation: implAddr }), { unit: 'bool', detail: 'EIP-1967 / EIP-1822 / beacon / OpenZeppelin-legacy slots' })
      : unknown('provider_failed', 'storage reads failed', [slotVals.eip1967_impl.ref], { unit: 'bool' });

    // Bytecode (token + every implementation it delegates to) for selector checks. Absence of a selector only
    // means something when the WHOLE code path was read, so every step that fails is recorded (Codex review
    // 2026-09-25, finding 1): incomplete inspection can prove a capability present, never absent.
    const problems: string[] = [];
    const failedSlots = Object.keys(SLOTS).filter((k) => !slotVals[k].ok);
    if (failedSlots.length) problems.push(`proxy slot reads failed (${failedSlots.join(', ')}): a proxy cannot be ruled out`);
    if (!code.ok) problems.push(`token bytecode unavailable (${code.reason})`);
    let bytecode = code.ok ? String(code.data ?? '') : '';
    if (code.ok && bytecode.length <= 2) problems.push('token has no bytecode');
    const impls: Array<{ kind: string; addr: string }> = [];
    if (implAddr) impls.push({ kind: slotAddr('eip1967_impl') ? 'eip1967' : slotAddr('zos_impl') ? 'openzeppelin_legacy' : 'eip1822', addr: implAddr });
    const clone = /^0x363d3d373d3d3d363d73([0-9a-f]{40})5af43d82803e903d91602b57fd5bf3/i.exec(bytecode); // EIP-1167 minimal proxy
    if (clone) impls.push({ kind: 'eip1167_clone', addr: '0x' + clone[1].toLowerCase() });
    const beaconAddr = slotAddr('eip1967_beacon');
    if (beaconAddr) {
      const bi = await rpc('eth_call', [{ to: beaconAddr, data: '0x5c60da1b' }, 'latest']); // implementation()
      if (bi.ok && bi.data && bi.data !== '0x' && !zeroAddr(bi.data)) impls.push({ kind: 'beacon', addr: addrFromWord(bi.data) });
      else problems.push('beacon implementation() could not be resolved');
    }
    const implReads = await Promise.all(impls.map((i) => rpc('eth_getCode', [i.addr, 'latest'])));
    const codeRef: SourceRef = { ...code.ref, raw_excerpt: { implementations: impls.map((i, n) => ({ kind: i.kind, address: i.addr, code_read: implReads[n].ok })) } };
    impls.forEach((i, n) => {
      const r = implReads[n];
      if (r.ok && String(r.data ?? '').length > 2) bytecode += String(r.data);
      else problems.push(`${i.kind} implementation bytecode unavailable (${i.addr})`);
    });
    // A small contract that delegates (DELEGATECALL 0xf4) but matched no standard proxy pattern is an unrecognised proxy.
    if (code.ok && !impls.length && bytecode.length < 3000 && /f4/.test(bytecode.slice(2))) problems.push('small contract with DELEGATECALL but no recognised proxy slot: possible unrecognised proxy');
    const inspectionComplete = problems.length === 0;
    const has = (sels: string[]) => sels.some((s) => bytecode.includes('63' + s));
    const selField = (sels: string[], label: string): Field<boolean> => {
      if (!code.ok) return unknown(code.reason, 'bytecode unavailable', [code.ref], { unit: 'bool' });
      const matched = sels.filter((s) => bytecode.includes('63' + s));
      const ref: SourceRef = { ...codeRef, raw_excerpt: { ...codeRef.raw_excerpt, matched, inspection_problems: problems } };
      if (matched.length) return ok(true, ref, { unit: 'bool', confidence: 'medium', detail: `${label}: function selector present in bytecode (a present function may still be role-gated or disabled)` });
      if (!inspectionComplete) return unknown('no_data', `${label}: not found in the bytecode that was read, but inspection was incomplete (${problems.join('; ')}), so absence is not established`, [ref], { unit: 'bool' });
      return ok(false, ref, { unit: 'bool', confidence: 'medium', detail: `${label}: none of the known function selectors is in the complete bytecode (token${impls.length ? ' + implementation' : ''}); a differently named function would not be caught, so this needs a second source` });
    };

    // Owner: owner() or getOwner(); zero/dead = renounced.
    const ownerHex = own.ok && own.data && own.data !== '0x' ? own.data : getOwn.ok && getOwn.data && getOwn.data !== '0x' ? getOwn.data : null;
    const ownerOnchain: Field<string> = ownerHex
      ? ok(addrFromWord(ownerHex), refOf(own.ok && own.data !== '0x' ? own : getOwn, { owner: addrFromWord(ownerHex) }), { unit: 'address', confidence: 'medium' })
      : own.ok || getOwn.ok
      ? unknown('no_data', 'contract exposes no owner()/getOwner() (may use role-based access)', [own.ref], { unit: 'address' })
      : unknown(own.reason, own.detail, [own.ref], { unit: 'address' });

    // ---- GoPlus
    const gp = await ctx.fetchJson('goplus', `https://api.gopluslabs.io/api/v1/token_security/${chain.goplus}?contract_addresses=${a}`, { headers: await goplusAuth(ctx), retries: 2 });
    const g = gp.ok && gp.data?.code === 1 ? gp.data.result?.[a] : null;
    const gpRef: SourceRef = { ...gp.ref, raw_excerpt: g ? { is_proxy: g.is_proxy, is_mintable: g.is_mintable, transfer_pausable: g.transfer_pausable, is_blacklisted: g.is_blacklisted, owner_address: g.owner_address, buy_tax: g.buy_tax, sell_tax: g.sell_tax, transfer_tax: g.transfer_tax, is_honeypot: g.is_honeypot, holder_count: g.holder_count } : { code: gp.ok ? gp.data?.code : undefined } };
    const gpMiss = (label: string, unit = 'bool') => unknown<any>(gp.ok ? (g ? 'no_data' : 'not_found') : gp.reason, `GoPlus: no ${label}`, [gpRef], { unit });
    const gpBool = (v: unknown, label: string): Field<boolean> => (v === '1' ? ok(true, gpRef, { unit: 'bool' }) : v === '0' ? ok(false, gpRef, { unit: 'bool' }) : gpMiss(label));
    const gpPct = (v: unknown, label: string): Field<number> => (typeof v === 'string' && v !== '' && Number.isFinite(Number(v)) ? ok(round(Number(v) * 100, 3), gpRef, { unit: 'pct' }) : gpMiss(label, 'pct'));

    // ---- honeypot.is (buy/sell simulation)
    let hpBuy: Field<number>, hpSell: Field<number>, hpTransfer: Field<number>, hpFlag: Field<boolean>;
    if (chain.honeypot) {
      const hp = await ctx.fetchJson('honeypot_is', `https://api.honeypot.is/v2/IsHoneypot?address=${a}&chainID=${chain.goplus}`, { retries: 1, timeoutMs: 15_000, excerpt: (d) => ({ simulationSuccess: d.simulationSuccess, isHoneypot: d.honeypotResult?.isHoneypot, simulationResult: d.simulationResult }) });
      const sim = hp.ok && hp.data?.simulationSuccess ? hp.data.simulationResult : null;
      const hpN = (v: unknown, label: string): Field<number> => (sim && typeof v === 'number' ? ok(round(v, 3), hp.ref, { unit: 'pct' }) : unknown(hp.ok ? 'no_data' : hp.reason, `honeypot.is: ${label} not simulated`, [hp.ref], { unit: 'pct' }));
      hpBuy = hpN(sim?.buyTax, 'buy tax');
      hpSell = hpN(sim?.sellTax, 'sell tax');
      hpTransfer = hpN(sim?.transferTax, 'transfer tax');
      hpFlag = hp.ok && typeof hp.data?.honeypotResult?.isHoneypot === 'boolean' ? ok(hp.data.honeypotResult.isHoneypot, hp.ref, { unit: 'bool' }) : unknown(hp.ok ? 'no_data' : hp.reason, 'honeypot.is gave no verdict', [hp.ref], { unit: 'bool' });
    } else {
      hpBuy = hpSell = hpTransfer = unknown('not_supported_on_chain', `honeypot.is does not cover ${chain.name}`, [], { unit: 'pct' });
      hpFlag = unknown('not_supported_on_chain', `honeypot.is does not cover ${chain.name}`, [], { unit: 'bool' });
    }

    // ---- holders. Primary list: Chainbase (top 100, raw balances) > Ethplorer (Ethereum, 20) > GoPlus (10).
    // The second top-10 reading always comes from a different provider (Ethplorer, GoPlus, or Nansen raw amounts).
    const nl = await fetchNansenLabels(ctx, chain.nansen, a);
    const gpHolders: Holder[] | null = g?.holders?.length && usable(total)
      ? g.holders.map((h: any) => ({ address: String(h.address).toLowerCase(), amount: Number(h.balance), pct: round((Number(h.balance) / total.value) * 100), category: 'unknown' as const, label: h.tag || null, label_source: h.tag ? 'goplus' : undefined, _contract: h.is_contract === 1, _locked: h.is_locked === 1 }))
      : null;
    const fromRaw = (addr: string, raw: string): Holder => {
      const amount = Number(BigInt(raw)) / 10 ** (decimals as number);
      return { address: addr.toLowerCase(), amount, pct: round((amount / (total.value as number)) * 100), category: 'unknown' };
    };
    let cbHolders: Holder[] | null = null;
    let cbRef: SourceRef | null = null;
    let cbCount: Field<number> = unknown('provider_failed', 'CHAINBASE_API_KEY not configured', [], { unit: 'holders' });
    const cbKey = Deno.env.get('CHAINBASE_API_KEY');
    if (cbKey && usable(total) && decimals !== null) {
      const cb = await ctx.fetchJson('chainbase', `https://api.chainbase.online/v1/token/top-holders?chain_id=${chain.goplus}&contract_address=${a}&page=1&limit=100`, {
        headers: { 'x-api-key': cbKey, Accept: 'application/json' },
        retries: 2,
        excerpt: (d) => ({ code: d.code, count: d.count, holders: Array.isArray(d.data) ? d.data.length : null }),
      });
      if (cb.ok && cb.data?.code === 0 && Array.isArray(cb.data.data) && cb.data.data.length) {
        cbRef = cb.ref;
        cbHolders = cb.data.data.filter((h: any) => h.wallet_address && h.original_amount).map((h: any) => fromRaw(h.wallet_address, h.original_amount));
        if (typeof cb.data.count === 'number' && cb.data.count > 0) cbCount = ok(cb.data.count, cb.ref, { unit: 'holders' });
      } else {
        cbCount = unknown(cb.ok ? 'no_data' : cb.reason, cb.ok ? `Chainbase code ${cb.data?.code}: ${cb.data?.message ?? ''}` : cb.detail, [cb.ref], { unit: 'holders' });
      }
    }
    let epHolders: Holder[] | null = null;
    let epRef: SourceRef | null = null;
    if (chain.ethplorer && usable(total) && decimals !== null) {
      const ep = await ctx.fetchJson('ethplorer', `https://api.ethplorer.io/getTopTokenHolders/${a}?apiKey=freekey&limit=20`, { retries: 1 });
      if (ep.ok && Array.isArray(ep.data?.holders) && ep.data.holders.length) {
        epHolders = ep.data.holders.map((h: any) => fromRaw(h.address, h.rawBalance));
        epRef = { ...ep.ref, raw_excerpt: { holders: ep.data.holders.length } };
      }
    }
    const top10Of = (hs: Holder[] | null, ref: SourceRef | null): Field<number> | null =>
      hs && hs.length >= 10 && ref ? ok(round(hs.slice(0, 10).reduce((x, h) => x + h.pct, 0)), ref, { unit: 'pct' }) : null;
    const nansenTop10: Field<number> | null = nl.ref && nl.amounts.length >= 10 && usable(total)
      ? ok(round((nl.amounts.slice(0, 10).reduce((x, y) => x + y, 0) / total.value) * 100), nl.ref, { unit: 'pct' })
      : null;
    let primary: Holder[] | null;
    let primaryRef: SourceRef[];
    let maxListed: number;
    let secondTop10: Field<number> | null;
    if (cbHolders?.length) {
      primary = cbHolders;
      primaryRef = [cbRef!, total.sources[0]];
      maxListed = 100;
      secondTop10 = top10Of(epHolders, epRef) ?? top10Of(gpHolders, gpRef) ?? nansenTop10;
    } else if (epHolders?.length) {
      primary = epHolders;
      primaryRef = [epRef!, total.sources[0]];
      maxListed = 20;
      secondTop10 = top10Of(gpHolders, gpRef) ?? nansenTop10;
    } else {
      primary = gpHolders;
      primaryRef = [gpRef];
      maxListed = 10;
      secondTop10 = nansenTop10;
    }
    const secondTop10F: Field<number> = secondTop10 ?? unknown('no_data', 'no second holder source on this chain', [], { unit: 'pct' });
    if (primary) {
      const gpBy = new Map((gpHolders ?? []).map((h: any) => [h.address, h]));
      for (const h of primary) {
        if (DEAD.has(h.address)) {
          h.category = 'burn';
          h.category_confidence = 'high';
          h.label = 'burn address';
          h.label_source = 'onchain';
          continue;
        }
        const gh: any = gpBy.get(h.address);
        if (gh?._locked) {
          h.category = 'lock_or_vesting';
          h.category_confidence = 'medium';
          h.label = gh.label || 'locked (GoPlus)';
          h.label_source = 'goplus';
        } else if (gh?.label) applyLabel(h, gh.label, 'goplus');
        applyLabel(h, nl.labels.get(h.address), 'nansen');
        if (h.category === 'unknown' && gh?._contract) {
          h.category = 'contract';
          h.category_confidence = 'low';
        }
      }
      for (const h of primary as any[]) {
        delete h._contract;
        delete h._locked;
      }
    }
    // Holder counts differ by method (dust, contracts); 5% tolerance.
    const holderCount = crossCheckNumber(g?.holder_count ? ok(Number(g.holder_count), gpRef, { unit: 'holders' }) : gpMiss('holder count', 'holders'), cbCount, { tolerance: 0.05, unit: 'holders', label: 'holder count (GoPlus vs Chainbase)' });
    const conc = buildConcentration({
      holders: primary,
      holdersRef: primaryRef,
      labelRefs: nl.ref ? [nl.ref] : [],
      holdersReason: !usable(total) ? 'missing_input' : gp.ok ? 'no_data' : gp.reason,
      holdersDetail: !usable(total) ? 'on-chain total supply unavailable' : 'no holder list from Chainbase, Ethplorer or GoPlus',
      secondTop10: secondTop10F,
      holderCount,
      maxListed,
    });

    // LP lock: share of LP tokens GoPlus reports as locked.
    const lpLocked: Field<number> = g?.lp_holders?.length
      ? ok(round(g.lp_holders.filter((h: any) => h.is_locked === 1).reduce((s: number, h: any) => s + Number(h.percent || 0), 0) * 100, 2), gpRef, { unit: 'pct', confidence: 'low', detail: 'GoPlus LP-holder lock data, single source, covers V2-style LP tokens only' })
      : gpMiss('LP holder data', 'pct');

    return {
      decimals: decF,
      total_supply_onchain: total,
      token_standard: ok('erc20', code.ref),
      mint_authority_active: crossCheckBool(selField(SEL.mint, 'mint'), gpBool(g?.is_mintable, 'is_mintable'), 'mintable'),
      freeze_authority_active: unknown('not_applicable', 'EVM tokens have no freeze authority; see blacklist and pausable', [], { unit: 'bool' }),
      permanent_delegate: unknown('not_applicable', 'Solana-only concept', [], { unit: 'bool' }),
      transfer_hook: unknown('not_applicable', 'Solana-only concept', [], { unit: 'bool' }),
      buy_tax_pct: crossCheckNumber(gpPct(g?.buy_tax, 'buy tax'), hpBuy, { absTolerance: 0.5, unit: 'pct', label: 'buy tax (GoPlus vs honeypot.is)' }),
      sell_tax_pct: crossCheckNumber(gpPct(g?.sell_tax, 'sell tax'), hpSell, { absTolerance: 0.5, unit: 'pct', label: 'sell tax (GoPlus vs honeypot.is)' }),
      transfer_tax_pct: crossCheckNumber(gpPct(g?.transfer_tax, 'transfer tax'), hpTransfer, { absTolerance: 0.5, unit: 'pct', label: 'transfer tax (GoPlus vs honeypot.is)' }),
      honeypot: crossCheckBool(gpBool(g?.is_honeypot, 'is_honeypot'), hpFlag, 'honeypot'),
      upgradeable_proxy: crossCheckBool(proxyOnchain, gpBool(g?.is_proxy, 'is_proxy'), 'upgradeable proxy'),
      owner_address: crossCheckOwner(ownerOnchain, g?.owner_address, gpRef),
      pausable: crossCheckBool(selField(SEL.pause, 'pause'), gpBool(g?.transfer_pausable, 'transfer_pausable'), 'pausable'),
      blacklist: crossCheckBool(selField(SEL.blacklist, 'blacklist'), gpBool(g?.is_blacklisted, 'is_blacklisted'), 'blacklist'),
      ...conc,
      liquidity_locked_pct: lpLocked,
      creator_holding_pct: gpPct(g?.creator_percent, 'creator holding'),
    };
  },

  async sellQuotes(ctx, address, decimals, priceUsd, chainId) {
    const chain = EVM_CHAINS[chainId];
    const quote = async (usd: number) => {
      const amount = BigInt(Math.floor((usd / priceUsd) * 10 ** Math.min(decimals, 18))) * 10n ** BigInt(Math.max(0, decimals - 18));
      const r = await ctx.fetchJson('kyberswap_quote', `https://aggregator-api.kyberswap.com/${chain.kyber}/api/v1/routes?tokenIn=${address}&tokenOut=${chain.usdc}&amountIn=${amount}`, {
        headers: { 'x-client-id': 'token-health-scan' },
        excerpt: (d) => ({ amountIn: d.data?.routeSummary?.amountIn, amountOut: d.data?.routeSummary?.amountOut }),
      });
      const rs = r.ok ? r.data?.data?.routeSummary : null;
      return rs?.amountOut ? { ok: true as const, rate: Number(rs.amountOut) / 1e6 / (Number(amount) / 10 ** decimals), ref: r.ref } : { ok: false as const, reason: r.ok ? 'no_data' : r.reason, ref: r.ref };
    };
    return sellImpact(quote, address.toLowerCase() === chain.usdc.toLowerCase());
  },
};

function crossCheckOwner(onchain: Field<string>, gpOwner: unknown, gpRef: SourceRef): Field<string> {
  const gpVal = typeof gpOwner === 'string' && gpOwner !== '' ? gpOwner.toLowerCase() : null;
  const sources = [...onchain.sources.map((s) => ({ ...s, value: onchain.value })), { ...gpRef, value: gpVal }];
  if (usable(onchain) && gpVal) {
    return onchain.value === gpVal ? { ...onchain, confidence: 'high', corroborated: true, sources } : { ...onchain, status: 'disputed', reason: 'sources_disagree', confidence: 'low', detail: `owner: on-chain ${onchain.value} vs GoPlus ${gpVal}`, sources };
  }
  return { ...onchain, sources };
}

export function isRenounced(owner: Field<string>): boolean | null {
  if (!usable(owner)) return null;
  return DEAD.has(owner.value);
}
