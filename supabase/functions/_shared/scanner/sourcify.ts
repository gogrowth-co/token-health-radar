// Sourcify (free, no key): verified contract source -> ABI. This is the AFFIRMATIVE evidence the bytecode-selector
// check and GoPlus cannot give: it lists what a contract can actually do, so "no mint function" becomes a statement
// about the verified interface rather than "we did not spot one" (Codex review 2026-09-25, rounds 2-3).
//
// Rules:
// - A capability is PRESENT when a state-changing function with a matching name is in the verified ABI.
// - A capability is ABSENT only when the contract AND every implementation it delegates to have a verified ABI,
//   no unresolved proxy remains, and none of those ABIs has a matching function.
// - Anything else (not verified, provider down, nested proxy, a fallback() that may delegate) is unknown.
import { type Field, ok, type SourceRef, unknown } from './field.ts';
import type { ScanContext } from './http.ts';

type AbiItem = { type?: string; name?: string; stateMutability?: string };

// Name patterns for state-changing functions. Kept narrow on purpose: a false "present" lowers a score.
// Functions that switch a capability OFF (disableMinting, renounce..., unpause) are not the capability itself.
const REDUCES = /^(disable|renounce|remove|revoke|stop|lock|finish)/i;
const MINT = /mint|^issue(tokens?)?$/i;
const PAUSE = /pause/i;
const BLACKLIST = /blacklist|blocklist|denylist|(block|ban|deny|freeze)(address|account|user|wallet)|^freeze(account|address)?$|sanction|(set|add|remove|update)bots?$|^isbot$/i;

export interface SourcifyCapabilities {
  mint: Field<boolean>;
  pause: Field<boolean>;
  blacklist: Field<boolean>;
}

export function matchingFunctions(abi: AbiItem[], re: RegExp): string[] {
  return [...new Set(abi.filter((x) => x?.type === 'function' && typeof x.name === 'string' && x.stateMutability !== 'view' && x.stateMutability !== 'pure' && re.test(x.name) && !REDUCES.test(x.name) && !/^unpause$/i.test(x.name)).map((x) => x.name as string))];
}

interface Verified {
  ok: true;
  abi: AbiItem[];
  isProxy: boolean;
  implementations: string[];
  match: string;
  ref: SourceRef;
}
interface NotVerified {
  ok: false;
  reason: 'not_found' | 'provider_failed' | 'no_data' | 'timeout' | 'rate_limited' | 'circuit_open' | 'budget_exhausted';
  detail: string;
  ref: SourceRef;
}

async function fetchVerified(ctx: ScanContext, chainId: string, address: string): Promise<Verified | NotVerified> {
  const r = await ctx.fetchJson('sourcify', `https://sourcify.dev/server/v2/contract/${chainId}/${address}?fields=abi,proxyResolution,runtimeMatch,creationMatch`, {
    retries: 2,
    excerpt: (d) => ({ runtimeMatch: d?.runtimeMatch, creationMatch: d?.creationMatch, abi_entries: Array.isArray(d?.abi) ? d.abi.length : null, isProxy: d?.proxyResolution?.isProxy }),
  });
  if (!r.ok) return { ok: false, reason: r.reason === 'not_found' ? 'not_found' : (r.reason as NotVerified['reason']), detail: r.reason === 'not_found' ? 'contract is not verified on Sourcify' : r.detail ?? r.reason, ref: r.ref };
  const d = r.data;
  // The verification must be of the RUNTIME code (creation-only matches say nothing about what is deployed now) and be for this exact chain/address.
  const match = d?.runtimeMatch === 'match' || d?.runtimeMatch === 'exact_match' ? d.runtimeMatch : null;
  if (String(d?.address ?? '').toLowerCase() !== address.toLowerCase() || String(d?.chainId ?? '') !== chainId) return { ok: false, reason: 'no_data', detail: 'Sourcify answered for a different chain or address', ref: r.ref };
  if (!Array.isArray(d?.abi) || d.abi.length === 0 || !match) return { ok: false, reason: 'no_data', detail: `Sourcify has no runtime-verified ABI (runtimeMatch=${d?.runtimeMatch ?? 'null'})`, ref: r.ref };
  const impls: string[] = Array.isArray(d?.proxyResolution?.implementations) ? d.proxyResolution.implementations.map((i: any) => String(i?.address ?? '').toLowerCase()).filter(Boolean) : [];
  return { ok: true, abi: d.abi, isProxy: d?.proxyResolution?.isProxy === true, implementations: impls, match: String(match), ref: r.ref };
}

/**
 * @param ourImplementations implementation addresses our own chain reads found (slots, beacon, clone). They must be covered by
 *        Sourcify's proxy resolution, otherwise a delegation exists that the ABI check would not see.
 */
export async function sourcifyCapabilities(ctx: ScanContext, chainId: string, address: string, ourImplementations: string[], localInspectionProblems: string[] = []): Promise<SourcifyCapabilities> {
  const none = (reason: any, detail: string, refs: SourceRef[] = []): SourcifyCapabilities => {
    const f = unknown<boolean>(reason, detail, refs, { unit: 'bool' });
    return { mint: f, pause: f, blacklist: f };
  };
  // If our own read of the code could not follow every delegation (failed slot read, unrecognised proxy...), an ABI
  // list cannot establish what is reachable: unknown, never absent (Codex round 4, finding 3).
  if (localInspectionProblems.length) return none('no_data', `Sourcify not used for absence: local code inspection incomplete (${localInspectionProblems.join('; ')})`);
  const main = await fetchVerified(ctx, chainId, address.toLowerCase());
  if (!main.ok) return none(main.reason, `Sourcify: ${main.detail}`, [main.ref]);

  const refs: SourceRef[] = [main.ref];
  const abis: Array<{ label: string; abi: AbiItem[] }> = [];
  const implAddrs = new Set(main.implementations);
  // Every delegation our own chain reads found must be one Sourcify resolved too.
  const uncovered = ourImplementations.map((a) => a.toLowerCase()).filter((a) => !implAddrs.has(a));
  if (uncovered.length) return none('no_data', `Sourcify: a delegation found on chain (${uncovered.join(', ')}) is not in Sourcify's proxy resolution, so the interface is incomplete`, refs);
  if (main.isProxy && implAddrs.size === 0) return none('no_data', 'Sourcify: proxy without a resolved implementation', refs);
  if (main.isProxy) {
    const impls = [...implAddrs].slice(0, 3);
    if (implAddrs.size > 3) return none('no_data', `Sourcify: ${implAddrs.size} implementations (more than we inspect)`, refs);
    const got = await Promise.all(impls.map((a) => fetchVerified(ctx, chainId, a)));
    for (let i = 0; i < got.length; i++) {
      const g = got[i];
      refs.push(g.ref);
      if (!g.ok) return none(g.reason, `Sourcify: implementation ${impls[i]} is not verified (${g.detail})`, refs);
      if (g.isProxy) return none('no_data', `Sourcify: implementation ${impls[i]} is itself a proxy; nested delegation is not inspected`, refs);
      if (g.abi.some((x) => x?.type === 'fallback')) return none('no_data', `Sourcify: implementation ${impls[i]} has a fallback() that may delegate`, refs);
      abis.push({ label: `implementation ${impls[i]}`, abi: g.abi });
    }
    abis.push({ label: 'proxy', abi: main.abi }); // the proxy's OWN functions count too (a pause on the proxy itself)
  } else {
    // A plain token whose ABI has a fallback() could still delegate somewhere Sourcify did not resolve.
    if (main.abi.some((x) => x?.type === 'fallback')) return none('no_data', 'Sourcify: contract has a fallback() that may delegate and no proxy was resolved', refs);
    abis.push({ label: 'contract', abi: main.abi });
  }

  const build = (re: RegExp, what: string): Field<boolean> => {
    const hits = abis.flatMap((a) => matchingFunctions(a.abi, re).map((n) => `${n} (${a.label})`));
    const ref: SourceRef = { ...main.ref, raw_excerpt: { ...main.ref.raw_excerpt, matched: hits, inspected: abis.map((a) => a.label), match: main.match } };
    const allRefs = [ref, ...refs.slice(1)];
    return hits.length
      ? ok(true, allRefs, { unit: 'bool', confidence: 'high', detail: `verified source (Sourcify) lists ${what} function(s): ${hits.join(', ')}` })
      : ok(false, allRefs, { unit: 'bool', confidence: 'high', detail: `verified source (Sourcify, ${main.match}) of ${abis.map((a) => a.label).join(' + ')} has no ${what} function` });
  };
  return { mint: build(MINT, 'mint'), pause: build(PAUSE, 'pause'), blacklist: build(BLACKLIST, 'blacklist') };
}
