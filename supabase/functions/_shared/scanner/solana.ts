// Solana (SPL / Token-2022) chain adapter.
//
// Every RPC/provider call uses the EXACT-CASE mint. The DB stores addresses
// lowercased (normalize_token_address trigger), and a lowercased base58 mint
// is a different, nonexistent account: Solana RPC answers `value: null` and
// GeckoTerminal 404s. Before 2026-09-24 the scanner read that null as "mint
// and freeze authority revoked" (security 100) — see the 2026-09-24 handoff.
import { crossCheckBool, crossCheckNumber, type Field, ok, type SourceRef, unknown, usable } from './field.ts';
import type { ScanContext } from './http.ts';
import { applyLabel, buildConcentration, emptyConcentration, fetchNansenLabels, type Holder, round } from './holders.ts';
import type { ChainAdapter, ChainFacts } from './types.ts';

const SYSTEM_PROGRAM = '11111111111111111111111111111111';
const TOKEN_PROGRAM = 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA';
const TOKEN_2022 = 'TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb';
// Programs whose PDAs hold token accounts we can classify without a label
// provider. Only ids verified against live data go here.
const KNOWN_PROGRAM_OWNERS: Record<string, { name: string; category: Holder['category'] }> = {
  '6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P': { name: 'pump.fun bonding curve', category: 'bonding_curve' }, // verified 2026-09-24 (TBR top holder)
};
const USDC_MINT = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';

function endpoints(forMethod: 'default' | 'largest') {
  const helius = Deno.env.get('HELIUS_API_KEY');
  const list: Array<{ name: string; url: string }> = [];
  if (helius) list.push({ name: 'helius', url: `https://mainnet.helius-rpc.com/?api-key=${helius}` });
  // getTokenLargestAccounts is rate-limited or blocked on most free endpoints (verified 2026-09-23/24);
  // solanavibestation answered it reliably.
  if (forMethod === 'largest') list.push({ name: 'solanavibestation', url: 'https://public.rpc.solanavibestation.com' });
  list.push({ name: 'mainnet_beta', url: 'https://api.mainnet-beta.solana.com' }, { name: 'publicnode', url: 'https://solana-rpc.publicnode.com' });
  if (forMethod === 'default') list.push({ name: 'solanavibestation', url: 'https://public.rpc.solanavibestation.com' });
  return list;
}

export function isValidSolanaAddress(a: string) {
  return /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(a);
}

export const solanaAdapter: ChainAdapter = {
  family: 'solana',
  cgPlatform: () => 'solana',
  nansenChain: () => 'solana',

  async collect(ctx: ScanContext, mint: string, market): Promise<ChainFacts> {
    // `exclude` = an endpoint's source id (e.g. 'solana_rpc:helius') to skip, so a second read of the same
    // fact comes from a different operator and counts as an independent source.
    const rpc = (method: string, params: unknown[], which: 'default' | 'largest' = 'default', exclude?: string) =>
      ctx.rpc<any>('solana_rpc', endpoints(which).filter((e) => `solana_rpc:${e.name}` !== exclude), method, params);

    // ---- mint account: decimals, supply, authorities, program, Token-2022 extensions
    const acct = await rpc('getAccountInfo', [mint, { encoding: 'jsonParsed' }]);
    const parsed = acct.ok ? acct.data?.value?.data?.parsed : null;
    const program = acct.ok ? acct.data?.value?.owner : null;
    const info = parsed?.type === 'mint' ? parsed.info : null;
    const acctRef: SourceRef = acct.ref;
    if (acct.ok) acctRef.raw_excerpt = { method: 'getAccountInfo', program, decimals: info?.decimals, supply: info?.supply, mintAuthority: info?.mintAuthority, freezeAuthority: info?.freezeAuthority };

    const acctMissing = (label: string): Field<any> =>
      !acct.ok
        ? unknown(acct.reason, `${label}: ${acct.detail ?? 'RPC failed'}`, [acctRef])
        : !acct.data?.value
        ? unknown('not_found', `${label}: no account at this exact-case address (a lowercased mint is a different address)`, [acctRef])
        : unknown('no_data', `${label}: account is not an SPL mint (program ${program})`, [acctRef]);

    // ---- second source for authorities: GeckoTerminal token info (also holder count + top-10 share)
    const gt = await ctx.fetchJson('geckoterminal', `https://api.geckoterminal.com/api/v2/networks/solana/tokens/${mint}/info`, {
      headers: { Accept: 'application/json' },
      retries: 3,
      excerpt: (d) => ({ holders: d?.data?.attributes?.holders, mint_authority: d?.data?.attributes?.mint_authority, freeze_authority: d?.data?.attributes?.freeze_authority }),
    });
    const gta = gt.ok ? gt.data?.data?.attributes : null;
    const gtBool = (v: unknown, label: string): Field<boolean> =>
      !gt.ok ? unknown(gt.reason, gt.detail, [gt.ref], { unit: 'bool' }) : v === 'yes' ? ok(true, gt.ref, { unit: 'bool' }) : v === 'no' ? ok(false, gt.ref, { unit: 'bool' }) : unknown('no_data', `GeckoTerminal has no ${label}`, [gt.ref], { unit: 'bool' });

    const decimals = info && Number.isInteger(Number(info.decimals)) && Number(info.decimals) >= 0 && Number(info.decimals) <= 36 ? Number(info.decimals) : null;
    // An authority is REVOKED only when the parsed account says so explicitly (`null`). A property that is
    // missing from the response is unknown, never "revoked" (Codex review 2026-09-25, finding 5).
    const authorityOf = (i: any, r: SourceRef, key: 'mintAuthority' | 'freezeAuthority', label: string): Field<boolean> => {
      const raw = i[key];
      if (raw === null) return ok(false, r, { unit: 'bool' });
      if (typeof raw === 'string' && raw.length > 0) return ok(true, r, { unit: 'bool' });
      return unknown('no_data', `${label}: "${key}" is ${raw === undefined ? 'absent from' : 'malformed in'} the parsed mint account; absent is not the same as revoked`, [r], { unit: 'bool' });
    };
    const authority = (key: 'mintAuthority' | 'freezeAuthority', label: string): Field<boolean> => (info ? authorityOf(info, acctRef, key, label) : acctMissing(label));
    const mintActive = authority('mintAuthority', 'mint authority');
    const freezeActive = authority('freezeAuthority', 'freeze authority');
    // Second, independent reading of the authorities: GeckoTerminal when it answered, otherwise the same account
    // read from a DIFFERENT RPC operator (so a GeckoTerminal outage does not leave the value uncorroborated).
    const gtMint = gtBool(gta?.mint_authority, 'mint authority');
    const gtFreeze = gtBool(gta?.freeze_authority, 'freeze authority');
    let rpc2Mint: Field<boolean> = unknown('no_data', 'second RPC read not needed or unavailable', [], { unit: 'bool' });
    let rpc2Freeze: Field<boolean> = rpc2Mint;
    if (info && (!usable(gtMint) || !usable(gtFreeze))) {
      const acct2 = await rpc('getAccountInfo', [mint, { encoding: 'jsonParsed' }], 'default', acct.ref.source);
      const p2 = acct2.ok ? acct2.data?.value?.data?.parsed : null;
      const i2 = p2?.type === 'mint' ? p2.info : null;
      const r2: SourceRef = { ...acct2.ref, raw_excerpt: { method: 'getAccountInfo', mintAuthority: i2?.mintAuthority, freezeAuthority: i2?.freezeAuthority } };
      if (i2) {
        rpc2Mint = authorityOf(i2, r2, 'mintAuthority', 'mint authority (second RPC)');
        rpc2Freeze = authorityOf(i2, r2, 'freezeAuthority', 'freeze authority (second RPC)');
      } else rpc2Mint = rpc2Freeze = unknown(acct2.ok ? 'no_data' : acct2.reason, 'second RPC operator returned no parsed mint account', [r2], { unit: 'bool' });
    }

    // Token-2022 extensions that change holder risk. The decoder omits `extensions` when a mint has none;
    // a present-but-malformed list, or an extension the RPC could not decode, means we cannot rule an extension out.
    const is2022 = program === TOKEN_2022;
    const rawExts = info?.extensions;
    const extsMalformed = rawExts !== undefined && !Array.isArray(rawExts);
    const exts: Array<{ extension: string; state: any }> = Array.isArray(rawExts) ? rawExts : [];
    const extUndecoded = is2022 && (extsMalformed || exts.some((e) => e.extension === 'unparseableExtension'));
    const ext = (name: string) => exts.find((e) => e.extension === name)?.state;
    // A recognised extension whose state is missing the fields we read is malformed: unknown, not "disabled".
    const badState = (name: string, valid: (st: any) => boolean): boolean => {
      const e = exts.find((x) => x.extension === name);
      return !!e && !valid(e.state);
    };
    const isObj = (st: any) => typeof st === 'object' && st !== null;
    const hasKey = (st: any, k: string) => isObj(st) && k in st && (st[k] === null || typeof st[k] === 'string');
    const feeOk = (st: any) => isObj(st) && [st.newerTransferFee, st.olderTransferFee].some((f: any) => isObj(f) && Number.isFinite(Number(f.transferFeeBasisPoints)));
    const malformed: Record<string, boolean> = {
      permanentDelegate: badState('permanentDelegate', (st) => hasKey(st, 'delegate')),
      transferHook: badState('transferHook', (st) => hasKey(st, 'programId')),
      transferFeeConfig: badState('transferFeeConfig', feeOk),
      pausableConfig: badState('pausableConfig', isObj),
    };
    const extField = <T>(label: string, read: () => Field<T>, extName?: string): Field<T> =>
      !info
        ? acctMissing(label)
        : extUndecoded
        ? unknown('no_data', `${label}: Token-2022 extensions could not be fully decoded, so the absence of this extension cannot be confirmed`, [acctRef])
        : extName && malformed[extName]
        ? unknown('no_data', `${label}: the ${extName} extension is present but its state is malformed or incomplete`, [acctRef])
        : read();
    const fee = ext('transferFeeConfig');
    const transferTax: Field<number> = extField('transfer fee', () =>
      ok(fee ? Number(fee.newerTransferFee?.transferFeeBasisPoints ?? fee.olderTransferFee?.transferFeeBasisPoints ?? 0) / 100 : 0, acctRef, {
        unit: 'pct',
        confidence: 'high',
        detail: is2022 ? (fee ? 'Token-2022 transferFeeConfig' : 'Token-2022 mint without transfer fee') : 'SPL Token program has no transfer-fee mechanism',
      }), 'transferFeeConfig');

    // ---- supply (on-chain, chain scope)
    const supplyRes = await rpc('getTokenSupply', [mint], 'default', acct.ok ? acct.ref.source : undefined); // different operator than the mint-account read
    let totalOnchain: Field<number>;
    if (supplyRes.ok && supplyRes.data?.value) {
      const v = supplyRes.data.value;
      supplyRes.ref.raw_excerpt = { method: 'getTokenSupply', amount: v.amount, decimals: v.decimals };
      totalOnchain = ok(Number(BigInt(v.amount)) / 10 ** v.decimals, supplyRes.ref, { unit: 'tokens', decimals: v.decimals, scope: 'chain', confidence: 'medium' });
    } else totalOnchain = supplyRes.ok ? unknown('not_found', 'getTokenSupply returned no value', [supplyRes.ref]) : unknown(supplyRes.reason, supplyRes.detail, [supplyRes.ref]);
    // Second read of supply from the mint account (may be a different endpoint).
    const mintSupply: Field<number> = info && decimals !== null && typeof info.supply === 'string' && /^\d+$/.test(info.supply) ? ok(Number(BigInt(info.supply)) / 10 ** decimals, acctRef, { unit: 'tokens', decimals, scope: 'chain' }) : acctMissing('supply');

    // ---- holders: top 20 token accounts (free RPC limit), owners, owner programs
    const largest = await rpc('getTokenLargestAccounts', [mint], 'largest');
    let concentration;
    const holderCount: Field<number> = gta?.holders?.count ? ok(Number(gta.holders.count), gt.ref, { unit: 'holders', detail: `GeckoTerminal, as of ${gta.holders.last_updated ?? 'unknown'}` }) : unknown(gt.ok ? 'no_data' : gt.reason, 'holder count unavailable', [gt.ref]);
    const gtTop10: Field<number> = gta?.holders?.distribution_percentage?.top_10 != null ? ok(Number(gta.holders.distribution_percentage.top_10), gt.ref, { unit: 'pct' }) : unknown(gt.ok ? 'no_data' : gt.reason, 'GeckoTerminal top-10 share unavailable', [gt.ref], { unit: 'pct' });
    if (largest.ok && Array.isArray(largest.data?.value) && usable(totalOnchain)) {
      const accts: Array<{ address: string; amount: string; decimals: number }> = largest.data.value;
      largest.ref.raw_excerpt = { method: 'getTokenLargestAccounts', count: accts.length };
      const holders: Holder[] = accts.map((a) => ({ address: a.address, amount: Number(BigInt(a.amount)) / 10 ** a.decimals, pct: round((Number(BigInt(a.amount)) / 10 ** a.decimals / totalOnchain.value) * 100), category: 'unknown' }));
      const refs: SourceRef[] = [largest.ref, supplyRes.ref];
      // Owners of the token accounts, then the program that owns each owner.
      const tok = await rpc('getMultipleAccounts', [holders.map((h) => h.address), { encoding: 'jsonParsed' }]);
      if (tok.ok) {
        (tok.data?.value ?? []).forEach((v: any, i: number) => (holders[i].owner = v?.data?.parsed?.info?.owner));
        const owners = [...new Set(holders.map((h) => h.owner).filter(Boolean))] as string[];
        const own = owners.length ? await rpc('getMultipleAccounts', [owners, { encoding: 'base64', dataSlice: { offset: 0, length: 0 } }]) : null;
        if (own?.ok) {
          const progOf = new Map(owners.map((o, i) => [o, own.data?.value?.[i]?.owner as string | undefined]));
          for (const h of holders) {
            const p = h.owner ? progOf.get(h.owner) : undefined;
            if (p && p !== SYSTEM_PROGRAM) {
              const known = KNOWN_PROGRAM_OWNERS[p];
              h.category = known?.category ?? 'contract';
              h.category_confidence = known ? 'high' : 'low';
              h.label = known?.name ?? `program-owned (${p})`;
              h.label_source = 'onchain_program';
            }
          }
          refs.push(tok.ref, own.ref);
        }
      }
      // Labels (paid, small): Nansen labels wallet OWNERS on Solana.
      const nl = await fetchNansenLabels(ctx, 'solana', mint);
      if (nl.ref) refs.push(nl.ref);
      for (const h of holders) applyLabel(h, h.owner ? nl.labels.get(h.owner.toLowerCase()) : undefined, 'nansen');
      // Second top-10 reading: GeckoTerminal's own figure, or (when it is down/rate-limited) Nansen's per-wallet balances.
      const nansenTop10: Field<number> | null = nl.ref && nl.amounts.length >= 10
        ? ok(round((nl.amounts.slice(0, 10).reduce((x, y) => x + y, 0) / totalOnchain.value) * 100), nl.ref, { unit: 'pct', detail: 'Nansen per-wallet balances (top 10 wallets / on-chain supply)' })
        : null;
      concentration = buildConcentration({ holders, holdersRef: refs, secondTop10: usable(gtTop10) || !nansenTop10 ? gtTop10 : nansenTop10, holderCount, maxListed: 20 });
    } else {
      concentration = buildConcentration({
        holders: null,
        holdersRef: [largest.ref],
        holdersReason: !largest.ok ? largest.reason : usable(totalOnchain) ? 'no_data' : 'missing_input',
        holdersDetail: !largest.ok ? largest.detail : 'on-chain total supply unavailable, cannot compute shares',
        secondTop10: gtTop10,
        holderCount,
        maxListed: 20,
      });
    }
    if (!concentration) concentration = emptyConcentration('no_data', 'holder data unavailable');

    return {
      decimals: decimals !== null ? ok(decimals, acctRef, { unit: 'decimals', confidence: 'high' }) : acctMissing('decimals'),
      total_supply_onchain: crossCheckNumber(totalOnchain, mintSupply, { tolerance: 0.0001, unit: 'tokens', label: 'on-chain supply (getTokenSupply vs mint account)' }),
      token_standard: info ? ok(is2022 ? 'spl-token-2022' : program === TOKEN_PROGRAM ? 'spl-token' : String(program), acctRef) : acctMissing('token program'),
      mint_authority_active: crossCheckBool(mintActive, usable(gtMint) ? gtMint : rpc2Mint, 'mint authority'),
      freeze_authority_active: crossCheckBool(freezeActive, usable(gtFreeze) ? gtFreeze : rpc2Freeze, 'freeze authority'),
      permanent_delegate: extField('permanent delegate', () => ok(!!ext('permanentDelegate')?.delegate, acctRef, { unit: 'bool', confidence: 'high', detail: is2022 ? undefined : 'not possible on SPL Token program' }), 'permanentDelegate'),
      transfer_hook: extField('transfer hook', () => ok(!!ext('transferHook')?.programId, acctRef, { unit: 'bool', confidence: 'high' }), 'transferHook'),
      transfer_tax_pct: transferTax,
      buy_tax_pct: unknown('not_applicable', 'Solana has no per-direction buy tax; see transfer_tax_pct', [], { unit: 'pct' }),
      sell_tax_pct: unknown('not_applicable', 'Solana has no per-direction sell tax; see transfer_tax_pct', [], { unit: 'pct' }),
      honeypot: unknown('not_applicable', 'EVM honeypot simulation does not apply; freeze authority, permanent delegate and transfer hook cover the Solana equivalents', [], { unit: 'bool' }),
      upgradeable_proxy: unknown('not_applicable', 'SPL mints have no per-token contract code to upgrade', [], { unit: 'bool' }),
      owner_address: unknown('not_applicable', 'SPL mints have no owner; see mint/freeze authority', []),
      pausable: extField('pausable', () => ok(!!ext('pausableConfig'), acctRef, { unit: 'bool', confidence: 'high', detail: 'Token-2022 pausable extension (the pause authority can halt all transfers)' }), 'pausableConfig'),
      blacklist: unknown('not_applicable', 'SPL has no blacklist; a freeze authority is the equivalent control', [], { unit: 'bool' }),
      ...concentration,
      liquidity_locked_pct: unknown('not_supported_on_chain', 'no free Solana source for LP lock status', [], { unit: 'pct' }),
      creator_holding_pct: unknown('not_supported_on_chain', 'needs an indexer to identify the deployer wallet', [], { unit: 'pct' }),
    };
  },

  async sellQuotes(ctx, mint, decimals, priceUsd) {
    // Real sell quotes from Jupiter; slippage relative to a $100 reference quote on the same route.
    const quote = async (usd: number) => {
      const amount = BigInt(Math.floor((usd / priceUsd) * 10 ** decimals));
      return ctx.fetchJson('jupiter_quote', `https://lite-api.jup.ag/swap/v1/quote?inputMint=${mint}&outputMint=${USDC_MINT}&amount=${amount}&slippageBps=5000`, {
        excerpt: (d) => ({ inAmount: d.inAmount, outAmount: d.outAmount }),
        retries: 3,
      }).then((r) => (r.ok && r.data?.outAmount ? { ok: true as const, rate: Number(r.data.outAmount) / 1e6 / (Number(amount) / 10 ** decimals), ref: r.ref } : { ok: false as const, reason: r.ok ? 'no_data' : r.reason, ref: r.ref }));
    };
    return sellImpact(quote, mint === USDC_MINT);
  },
};

export async function sellImpact(
  quote: (usd: number) => Promise<{ ok: true; rate: number; ref: SourceRef } | { ok: false; reason: any; ref: SourceRef }>,
  skip = false,
): Promise<{ slippage_10k_pct: Field<number>; slippage_100k_pct: Field<number> }> {
  if (skip) {
    const f = unknown<number>('not_applicable', 'quote asset', [], { unit: 'pct' });
    return { slippage_10k_pct: f, slippage_100k_pct: f };
  }
  // Aggregator quote APIs rate-limit bursts (Jupiter lite-api 429s on back-to-back calls): space them out.
  const ref = await quote(100);
  const at = async (usd: number): Promise<Field<number>> => {
    if (!ref.ok) return unknown(ref.reason, 'reference quote failed', [ref.ref], { unit: 'pct' });
    await new Promise((r) => setTimeout(r, 1100));
    const q = await quote(usd);
    if (!q.ok) return unknown(q.reason, `no route for a $${usd} sell`, [ref.ref, q.ref], { unit: 'pct' });
    return ok(round(Math.max(0, (1 - q.rate / ref.rate) * 100), 3), [ref.ref, q.ref], { unit: 'pct', confidence: 'medium', detail: `price impact of a $${usd} sell vs a $100 sell, same aggregator` });
  };
  return { slippage_10k_pct: await at(10_000), slippage_100k_pct: await at(100_000) };
}
