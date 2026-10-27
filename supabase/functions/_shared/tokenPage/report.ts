// @ts-nocheck: ported verbatim from token-health-scan scripts/fresh-token-page.mjs (2026-10-27) so a page built here is byte-for-byte
// the page the X QA already checks; keep the two in step until the script calls this function instead of building pages itself.
// The report for token_reports, built from the scan's own inputs (no model text).
export const DIMS = ["security", "liquidity", "tokenomics", "community", "development"];
// The scan's own start time: the scores endpoint (token-health-mcp last_scanned_at) returns exactly this.
export const scanTime = (scan) => scan.field_data?.scanned_at || scan.scanned_at;

const n = (v, d = 0) => Number(v).toLocaleString("en-US", { maximumFractionDigits: d });
const usd = (v) => (v >= 1e9 ? `$${(v / 1e9).toFixed(2)}B` : v >= 1e6 ? `$${(v / 1e6).toFixed(1)}M` : v >= 1e3 ? `$${(v / 1e3).toFixed(1)}K` : `$${n(v, 2)}`);
const yes = (v, a, b) => (v ? a : b);
const SAY = {
  honeypot: (v) => yes(v, "Flagged as a honeypot: a test sell does not go through.", "Not a honeypot: a test sell goes through."),
  pausable: (v) => yes(v, "The contract can pause transfers.", "Transfers cannot be paused."),
  blacklist: (v) => yes(v, "The contract can blacklist addresses.", "No blacklist function."),
  max_tax_pct: (v) => `Highest buy or sell tax: ${n(v, 2)}%.`,
  transfer_tax_pct: (v) => `Transfer tax: ${n(v, 2)}%.`,
  mint_authority_active: (v) => yes(v, "A mint authority is active: new supply can still be created.", "No active mint authority: new supply cannot be created by a key."),
  freeze_authority_active: (v) => yes(v, "A freeze authority is active: holder accounts can be frozen.", "No active freeze authority: holder accounts cannot be frozen."),
  permanent_delegate: (v) => yes(v, "A permanent delegate is set: it can move tokens from any account.", "No permanent delegate."),
  transfer_hook: (v) => yes(v, "A transfer hook runs custom code on every transfer.", "No transfer hook."),
  upgradeable_proxy: (v) => yes(v, "Upgradeable proxy: the contract code can be changed.", "Not upgradeable: the contract code is fixed."),
  dex_liquidity_usd: (v) => `DEX liquidity: ${usd(v)}.`,
  volume_24h_usd: (v) => `24-hour trading volume: ${usd(v)}.`,
  slippage_100k_pct: (v) => `Selling $100K moves the price ${n(v, 2)}%.`,
  liquidity_locked_pct: (v) => `Liquidity locked: ${n(v, 1)}%.`,
  top10_pct: (v) => `The top 10 holders own ${n(v, 1)}% of supply.`,
  circulating_ratio: (v) => `${n(v * 100, 1)}% of supply is circulating.`,
  unlock_90d_pct_of_circ: (v) => `Unlocks in the next 90 days: ${n(v, 1)}% of circulating supply.`,
  sentiment: (v) => `Social sentiment: ${n(v)}% positive (LunarCrush).`,
  interactions_24h: (v) => `Social interactions in the last 24 hours: ${n(v)} (LunarCrush).`,
  watchlist_users: (v) => `CoinGecko users following it: ${n(v)}.`,
  social_dominance: (v) => `Share of crypto social volume: ${n(v, 3)}%.`,
  trend: (v) => `Social trend: ${v}.`,
  discord_members: (v) => `Discord members: ${n(v)}.`,
  telegram_members: (v) => `Telegram members: ${n(v)}.`,
  commits_30d: (v) => `Commits in the last 30 days: ${n(v)}.`,
  contributors_count: (v) => `Contributors: ${n(v)}.`,
  stars: (v) => `GitHub stars: ${n(v)}.`,
  forks: (v) => `GitHub forks: ${n(v)}.`,
  issue_close_ratio: (v) => `${n(v * 100)}% of GitHub issues are closed.`,
  last_push_age_days: (v) => `Last code push: ${n(v)} days ago.`,
  // The scanner stores is_archived under this key (true scores 0 of 10): read it as "archived".
  not_archived: (v) => yes(v, "The repository is archived.", "The repository is not archived."),
};
const NAMES = { top10_pct: "top-10 holder share", circulating_ratio: "circulating share", unlock_90d_pct_of_circ: "90-day unlocks", liquidity_locked_pct: "locked liquidity",
  dex_liquidity_usd: "DEX liquidity", volume_24h_usd: "trading volume", slippage_100k_pct: "price impact of a $100K sale", upgradeable_proxy: "upgradeability",
  max_tax_pct: "taxes", transfer_tax_pct: "transfer tax", mint_authority_active: "mint authority", freeze_authority_active: "freeze authority", social_dominance: "share of social volume",
  commits_30d: "recent commits", last_push_age_days: "time since the last code push", contributors_count: "contributors", issue_close_ratio: "closed issues", not_archived: "repository status",
  discord_members: "Discord members", telegram_members: "Telegram members", interactions_24h: "social interactions", watchlist_users: "CoinGecko followers" };
const LABEL = (k) => NAMES[k] || k.replace(/_/g, " ");
const WHY = { missing_input: "no data", no_data: "no data", not_found: "not found", provider_failed: "data provider failed", rate_limited: "data provider busy", timeout: "data provider timed out", not_supported_on_chain: "not available on this chain", sources_disagree: "sources disagree", failed_plausibility: "failed our plausibility check", link_dead: "the listed link is dead", not_listed: "not tracked by the source", not_published: "not published by the project", blocked: "the site blocks automated reads" };
const why = (r) => WHY[r] || (/^not_corroborated/.test(r) ? "only one source, we need two" : /^disputed/.test(r) ? "sources disagree" : String(r).replace(/_/g, " "));
const TITLE = { security: "Security", liquidity: "Liquidity", tokenomics: "Tokenomics", community: "Community", development: "Development" };

function notScoredWhy(d) {
  const m = String(d?.reason || "").match(/required input not usable: (.*)/);
  if (!m) return "too little data";
  return m[1].replace(/\s*\([^)]*\)/g, "").split("; ").map((p) => { const [k, r] = p.split(": "); return `${LABEL(k)}: ${why(r)}`; }).join(", ");
}
function dimensionSection(dim, d) {
  if (!d || d.status !== "scored") {
    const missing = Object.entries(d?.inputs_excluded || {}).map(([k, r]) => `${LABEL(k)} (${why(r)})`).join(", ");
    return { summary: `${TITLE[dim]} is not scored in this scan (${notScoredWhy(d)}). We do not score a dimension without its required data, and missing data is not a weakness of the token.`, keyPoints: Object.entries(d?.inputs_used || {}).map(([k, x]) => (SAY[k] || ((v) => `${LABEL(k)}: ${v}.`))(x.value)) };
  }
  const used = Object.entries(d.inputs_used || {});
  const points = used.map(([k, x]) => `${(SAY[k] || ((v) => `${LABEL(k)}: ${v}.`))(x.value)} (${x.points} of ${x.max} points)`);
  for (const [k, r] of Object.entries(d.inputs_excluded || {})) points.push(`Not counted: ${LABEL(k)} (${why(r)}).`);
  const weakest = [...used].sort((a, b) => (b[1].max - b[1].points) - (a[1].max - a[1].points))[0];
  const lead = weakest && weakest[1].points < weakest[1].max ? ` The most points were lost on ${LABEL(weakest[0])}.` : " Every input scored full points.";
  return { summary: `${TITLE[dim]} scores ${d.score}/100 from ${used.length} input${used.length === 1 ? "" : "s"} read in this scan.${lead}`, keyPoints: points };
}

const noDigits = (s) => typeof s === "string" && s.trim() && !/\d/.test(s);
export function reportFromScan(t, scan, old, cache) {
  const ds = scan.dimension_scores || {};
  const dims = ds.dimensions || {};
  const fd = scan.field_data || {};
  const v = (f) => (f && f.status === "ok" ? f.value : f?.value ?? null);
  const name = v(fd.market?.name) || t.report?.token_name || cache?.name || t.symbol.toUpperCase();
  const sym = t.symbol.toUpperCase();
  const scores = Object.fromEntries(DIMS.map((k) => [k, dims[k]?.score ?? null]));
  const scored = DIMS.filter((k) => scores[k] != null);
  const excluded = ds.excluded_dimensions || [];
  const at = scanTime(scan);
  const date = at.slice(0, 10);
  const overall = ds.overall ?? scan.score_total ?? null;
  const lowest = scored.sort((a, b) => scores[a] - scores[b])[0];
  const highest = [...scored].sort((a, b) => scores[b] - scores[a])[0];
  const orc = old?.report_content || {};
  const whatIs = noDigits(orc.whatIsToken) ? orc.whatIsToken : (cache?.description || "").split(/(?<=\.)\s/).slice(0, 2).join(" ") || null;
  return {
    metadata: {
      scores, overallScore: overall, chainId: t.chain, tokenAddress: t.address.toLowerCase(),
      tokenName: name, tokenSymbol: sym, currentPrice: v(fd.market?.price_usd), marketCap: v(fd.market?.market_cap_usd),
      scannedAt: at, scanId: scan.id, scoringVersion: scan.scoring_version, excludedDimensions: excluded,
      generatedBy: "scan", generatedAt: new Date().toISOString(),
    },
    whatIsToken: whatIs,
    riskOverview: (overall != null ? `${name} (${sym}) scores ${overall}/100 in our scan of ${date}. ` : `${name} (${sym}) has no overall score in our scan of ${date}: we do not average around a dimension we could not score. `) +
      (highest && lowest && highest !== lowest ? `${TITLE[highest]} is its strongest scored dimension at ${scores[highest]}; ${TITLE[lowest]} is its weakest at ${scores[lowest]}. ` : "") +
      (excluded.length ? `Not scored: ${excluded.map((k) => `${TITLE[k]} (${notScoredWhy(dims[k])})`).join("; ")}. That is missing data, not a finding about the token. ` : "") +
      `Every number on this page comes from that scan.`,
    securityAnalysis: dimensionSection("security", dims.security),
    liquidityAnalysis: dimensionSection("liquidity", dims.liquidity),
    tokenomicsAnalysis: dimensionSection("tokenomics", dims.tokenomics),
    communityAnalysis: dimensionSection("community", dims.community),
    developmentAnalysis: dimensionSection("development", dims.development),
    howToBuy: Array.isArray(orc.howToBuy) && orc.howToBuy.every((s) => noDigits(`${s.title || ""} ${s.description || ""}`.replace(/^\s*\d+\.?/, ""))) ? orc.howToBuy : null,
    faq: [
      { question: `What is the ${sym} health score?`, answer: `${overall != null ? `${overall}/100` : "No overall score"} in our scan of ${date}: ${DIMS.map((k) => `${TITLE[k]} ${scores[k] ?? "not scored"}`).join(", ")}.` },
      { question: `How often is ${sym} scanned?`, answer: `We scan it again whenever its latest scan is more than a day old and someone needs it, and this page always shows the latest scan with its date.` },
      { question: `Where does the ${sym} security score come from?`, answer: `From on-chain contract checks read in the scan (GoPlus and chain data): honeypot, pause and blacklist functions, taxes, mint and freeze authorities, and upgradeability. It is not a code audit.` },
    ],
    hero_image_url: orc.hero_image_url || null,
  };
}

