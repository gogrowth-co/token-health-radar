/**
 * scan-report — the PRO "Download PDF" report.
 *
 * GET/POST { token_address, chain_id } with the user's Authorization header.
 * Only PRO, lifetime and admin users get the report; everyone else gets 403.
 * Returns a print-ready HTML page built from the latest token_scans row for that
 * token. The browser opens it and saves it as PDF (vector text, A4).
 * Every number comes from the scan row; nothing is typed in by hand.
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getChainConfigByMoralisId } from "../_shared/chainConfig.ts";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const PAID_PLANS = ["pro", "lifetime", "admin"];

const MARK =
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 80"><defs><clipPath id="c"><circle cx="40" cy="40" r="32"/></clipPath></defs><circle cx="40" cy="40" r="32" fill="#AFC0F5"/><g clip-path="url(#c)"><path d="M-6 44 H22 C24 44 24.5 38 27 38 S29.5 44 32 44 C34 44 34.5 22 37.5 22 S41 60 45 60 C48.5 60 49 44 53 44 H86 V-6 H-6 Z" fill="#3B66FF"/></g><path d="M-6 44 H22 C24 44 24.5 38 27 38 S29.5 44 32 44 C34 44 34.5 22 37.5 22 S41 60 45 60 C48.5 60 49 44 53 44 H86" fill="none" stroke="#E85A20" stroke-width="4.4" stroke-linecap="round" stroke-linejoin="round"/></svg>`;

const DIM_ORDER = ["security", "liquidity", "tokenomics", "community", "development"];
const DIM_TITLE: Record<string, string> = {
  security: "Security", liquidity: "Liquidity", tokenomics: "Tokenomics",
  community: "Community", development: "Development",
};
const INPUT_LABEL: Record<string, string> = {
  honeypot: "Honeypot (can't sell)", pausable: "Transfers can be paused", blacklist: "Blacklist function",
  max_tax_pct: "Highest buy/sell tax", upgradeable_proxy: "Upgradeable proxy contract",
  mint_authority_active: "Active mint function", freeze_authority_active: "Active freeze authority",
  volume_24h_usd: "24h trading volume", dex_liquidity_usd: "DEX liquidity",
  slippage_100k_pct: "Price impact of a $100K sell", liquidity_locked_pct: "Liquidity locked",
  top10_pct: "Top 10 wallets hold", circulating_ratio: "Circulating / total supply",
  unlock_90d_pct_of_circ: "Unlocks in next 90 days",
  sentiment: "Social sentiment", discord_members: "Discord members", telegram_members: "Telegram members",
  trend: "Social trend", social_dominance: "Social dominance",
  commits_30d: "Commits in last 30 days", last_push_age_days: "Days since last code push",
  contributors_count: "Contributors", stars: "GitHub stars", forks: "GitHub forks",
  issue_close_ratio: "Issues closed", not_archived: "Repository active",
};

// deno-lint-ignore no-explicit-any
type Any = any;

const esc = (s: unknown) =>
  String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

function money(v: number | null | undefined): string {
  if (v === null || v === undefined || isNaN(Number(v))) return "n/a";
  const n = Number(v);
  if (n >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(2)}M`;
  if (n >= 1e3) return `$${(n / 1e3).toFixed(1)}K`;
  if (n >= 1) return `$${n.toFixed(2)}`;
  return `$${n.toPrecision(5)}`;
}
function num(v: number): string {
  if (v >= 1e9) return `${(v / 1e9).toFixed(2)}B`;
  if (v >= 1e6) return `${(v / 1e6).toFixed(2)}M`;
  return Math.round(v).toLocaleString("en-US");
}
function fmtInput(key: string, val: Any): string {
  if (typeof val === "boolean") return val ? "Yes" : "No";
  if (val === null || val === undefined) return "n/a";
  if (key.endsWith("_usd")) return money(val);
  if (key.endsWith("_pct") || key.endsWith("_pct_of_circ") || key === "issue_close_ratio") return `${Number(val).toFixed(1)}%`;
  if (key === "circulating_ratio") return `${Math.round(Number(val) * 100)}%`;
  if (key === "sentiment") return `${val}/100`;
  if (typeof val === "number") return Math.round(val).toLocaleString("en-US");
  return esc(val);
}
const tone = (s: number | null) => (s === null ? "na" : s >= 70 ? "good" : s >= 40 ? "warn" : "bad");

function field(fd: Any, group: string, key: string): Any {
  const x = fd?.[group]?.[key];
  return x && x.status === "ok" ? x.value : null;
}

function findings(dims: Any, fd: Any, symbol: string): { t: string; h: string; b: string }[] {
  const out: { t: string; h: string; b: string; s: number }[] = [];
  const sec = dims.security;
  if (sec?.score !== null && sec?.score !== undefined) {
    const lost = Object.entries(sec.inputs_used || {}).filter(([, v]: Any) => v.points < v.max).map(([k]) => INPUT_LABEL[k] || k);
    out.push({
      s: sec.score, t: tone(sec.score),
      h: lost.length ? "Contract has risk flags" : "Contract checks passed",
      b: lost.length
        ? `Points lost on: ${lost.join(", ")}. Check these before trading.`
        : "No honeypot, no active mint function, transfers can't be paused, no blacklist, not an upgradeable proxy, and no buy/sell tax.",
    });
  }
  const liq = dims.liquidity;
  if (liq?.score !== null && liq?.score !== undefined) {
    const dexLiq = field(fd, "liquidity", "dex_liquidity_usd"), pools = field(fd, "liquidity", "pool_count");
    const s10 = field(fd, "liquidity", "slippage_10k_pct"), s100 = field(fd, "liquidity", "slippage_100k_pct");
    const dexVol = field(fd, "liquidity", "dex_volume_24h_usd"), vol = field(fd, "market", "volume_24h_usd");
    const parts: string[] = [];
    if (dexLiq !== null) parts.push(`DEX liquidity is ${money(dexLiq)}${pools ? ` across ${pools} pools` : ""}.`);
    if (s10 !== null && s100 !== null) parts.push(`Selling $10K moves the price about ${Number(s10).toFixed(1)}%; selling $100K moves it about ${Number(s100).toFixed(1)}%.`);
    if (dexVol !== null && vol !== null && vol > dexVol * 5) parts.push(`On-chain DEX volume was ${money(dexVol)} in 24h against ${money(vol)} total, so most trading happens on exchanges.`);
    const locked = liq.inputs_used?.liquidity_locked_pct?.value;
    if (locked !== undefined && locked !== null) parts.push(`Locked liquidity found: ${Number(locked).toFixed(0)}%.`);
    out.push({ s: liq.score, t: tone(liq.score), h: `Liquidity scores ${liq.score}/100`, b: parts.join(" ") || "Liquidity data was limited for this token." });
  }
  const tk = dims.tokenomics;
  if (tk?.score !== null && tk?.score !== undefined) {
    const top1 = field(fd, "chain", "top1_pct"), top10 = field(fd, "chain", "top10_pct");
    const circ = field(fd, "market", "circulating_supply"), ratio = field(fd, "derived", "circulating_ratio");
    const u365 = field(fd, "derived", "unlock_365d_pct_of_circ");
    const parts: string[] = [];
    if (top1 !== null && top10 !== null) parts.push(`The largest wallet holds ${Number(top1).toFixed(1)}% of supply and the top 10 hold ${Number(top10).toFixed(1)}%.`);
    if (ratio !== null) parts.push(`${Math.round(Number(ratio) * 100)}% of supply is circulating${circ ? ` (${num(Number(circ))} ${esc(symbol)})` : ""}.`);
    if (u365 !== null) parts.push(Number(u365) === 0 ? "No unlocks are scheduled in the next 365 days." : `Unlocks in the next 365 days: ${Number(u365).toFixed(1)}% of circulating supply.`);
    out.push({ s: tk.score, t: top1 !== null && top1 >= 15 ? "warn" : tone(tk.score), h: top1 !== null && top1 >= 15 ? "One wallet holds a large share" : `Tokenomics scores ${tk.score}/100`, b: parts.join(" ") });
  }
  const cm = dims.community;
  if (cm?.score !== null && cm?.score !== undefined) {
    const i = cm.inputs_used || {};
    const parts: string[] = [];
    if (i.sentiment) parts.push(`Social sentiment ${i.sentiment.value}/100`);
    if (i.discord_members) parts.push(`${Number(i.discord_members.value).toLocaleString("en-US")} Discord members`);
    if (i.telegram_members) parts.push(`${Number(i.telegram_members.value).toLocaleString("en-US")} Telegram members`);
    out.push({ s: cm.score, t: tone(cm.score), h: `Community scores ${cm.score}/100`, b: parts.length ? parts.join(", ") + "." : "Limited community data." });
  }
  const dv = dims.development;
  if (dv?.score === null || dv?.score === undefined) {
    out.push({ s: 1000, t: "na", h: "Development not scored", b: "No usable GitHub activity was found for this token, so development is left out of the overall score instead of being guessed." });
  } else {
    out.push({ s: dv.score, t: tone(dv.score), h: `Development scores ${dv.score}/100`, b: "Based on recent commits, contributors and repository activity." });
  }
  return out.sort((a, b) => a.s - b.s).map(({ t, h, b }) => ({ t, h, b }));
}

function build(row: Any): string {
  const ds = row.dimension_scores, fd = row.field_data || {}, dq = row.data_quality || {};
  const dims = ds.dimensions;
  const name = field(fd, "market", "name") || "Token";
  const symbol = field(fd, "market", "symbol") || "";
  const chain = getChainConfigByMoralisId(row.chain_id)?.name || row.chain_id;
  const when = new Date(row.scanned_at).toISOString().replace("T", " ").slice(0, 16) + " UTC";

  const bars = DIM_ORDER.map((d) => {
    const s = dims[d]?.score;
    return s === null || s === undefined
      ? `<div class="bar"><span class="bl">${DIM_TITLE[d]}</span><span class="bt na-t">Not scored</span><span class="bv na-v">n/a</span></div>`
      : `<div class="bar"><span class="bl">${DIM_TITLE[d]}</span><span class="bt"><i class="${tone(s)}" style="width:${s}%"></i></span><span class="bv">${s}</span></div>`;
  }).join("");

  const fhtml = findings(dims, fd, symbol).map((x) => `<div class="fd ${x.t}"><b>${esc(x.h)}</b><p>${esc(x.b)}</p></div>`).join("");

  const tables = DIM_ORDER.filter((d) => dims[d]?.score !== null && dims[d]?.score !== undefined).map((d) => {
    const dd = dims[d];
    const rows = Object.entries(dd.inputs_used || {}).map(([k, v]: Any) =>
      `<tr><td>${INPUT_LABEL[k] || esc(k)}</td><td class="r">${fmtInput(k, v.value)}</td><td class="r">${v.points} / ${v.max}</td></tr>`
    ).join("");
    const excl = Object.keys(dd.inputs_excluded || {}).map((k) => INPUT_LABEL[k] || k).join(", ");
    return `<div class="dt"><h3>${DIM_TITLE[d]} <span class="pill ${tone(dd.score)}">${dd.score}/100</span></h3>` +
      `<table><tr><th>Check</th><th class="r">Value</th><th class="r">Points</th></tr>${rows}</table>` +
      (excl ? `<p class="note">No data, left out of the score: ${esc(excl)}.</p>` : "") + `</div>`;
  }).join("");

  const pools = (field(fd, "liquidity", "top_pools") || []).slice(0, 8);
  const poolHtml = pools.length
    ? `<h2>Largest liquidity pools</h2><table><tr><th>Pool</th><th>DEX</th><th class="r">Liquidity</th><th class="r">24h volume</th></tr>` +
      pools.map((p: Any) => `<tr><td>${esc(p.name)}</td><td>${esc(p.dex)}</td><td class="r">${money(p.liquidity_usd)}</td><td class="r">${money(p.volume_24h_usd)}</td></tr>`).join("") + `</table>`
    : "";
  const holders = (field(fd, "chain", "top_holders") || []).slice(0, 10);
  const holderHtml = holders.length
    ? `<h2>Top 10 holders</h2><table><tr><th>#</th><th>Wallet</th><th>Label</th><th class="r">Share of supply</th></tr>` +
      holders.map((h: Any, i: number) => `<tr><td>${i + 1}</td><td class="mono">${esc(String(h.address).slice(0, 8))}…${esc(String(h.address).slice(-6))}</td><td>${esc(h.label || "")}</td><td class="r">${Number(h.pct).toFixed(2)}%</td></tr>`).join("") + `</table>`
    : "";

  const holderCount = field(fd, "chain", "holder_count");
  const sources = Object.keys(dq.provider_calls || {}).sort().join(", ");
  const quality = dq.fields_total ? `Data quality: ${dq.fields_ok} of ${dq.fields_total} data points resolved (${row.completeness_pct}%). Sources: ${esc(sources)}. ` : "";
  const fileName = `${symbol || name}-Token-Health-Report-${String(row.scanned_at).slice(0, 10)}`.replace(/[^A-Za-z0-9._-]+/g, "-");

  return `<!doctype html><html><head><meta charset="utf-8"><title>${esc(fileName)}</title>
<link href="https://fonts.googleapis.com/css2?family=Archivo:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400&display=swap" rel="stylesheet">
<style>
@page { size: A4; margin: 14mm 14mm 16mm; }
* { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
body { font-family: Archivo, Helvetica, Arial, sans-serif; color: #10131A; font-size: 10.5pt; line-height: 1.5; margin: 0 auto; max-width: 182mm; }
.top { display:flex; align-items:center; justify-content:space-between; border-bottom:2px solid #3B66FF; padding-bottom:10px; }
.lock { display:flex; align-items:center; gap:8px; font-weight:600; letter-spacing:-0.025em; font-size:13pt; }
.lock svg { width:26px; height:26px; }
.lab { font-size:8pt; font-weight:600; letter-spacing:0.11em; text-transform:uppercase; color:#5B6475; }
h1 { font-weight:400; letter-spacing:-0.035em; font-size:24pt; margin:16px 0 2px; }
.meta { color:#5B6475; font-size:9pt; }
.mono { font-family:'JetBrains Mono', monospace; font-size:8.5pt; }
.hero { display:grid; grid-template-columns:170px 1fr; gap:22px; margin:18px 0 8px; align-items:center; }
.score { border:1px solid #E3E7F0; border-radius:12px; padding:14px; text-align:center; }
.score b { display:block; font-size:54pt; font-weight:300; letter-spacing:-0.04em; line-height:1; }
.bar { display:grid; grid-template-columns:96px 1fr 34px; align-items:center; gap:10px; margin:7px 0; }
.bl { font-weight:500; } .bv { text-align:right; font-weight:700; font-variant-numeric:tabular-nums; }
.bt { height:9px; background:#EEF1F7; border-radius:5px; overflow:hidden; } .bt i { display:block; height:100%; border-radius:5px; }
.na-t { background:none; font-size:8.5pt; color:#8A93A5; height:auto; } .na-v { color:#8A93A5; font-weight:400; }
i.good { background:#22C55E; } i.warn { background:#FFC53D; } i.bad { background:#EF4444; }
.mk { display:grid; grid-template-columns:repeat(4,1fr); gap:8px; margin:12px 0 4px; }
.mk div { border:1px solid #E3E7F0; border-radius:8px; padding:8px 10px; } .mk b { display:block; font-size:12.5pt; font-weight:700; font-variant-numeric:tabular-nums; }
h2 { font-size:13pt; font-weight:500; margin:18px 0 8px; }
.fd { border:1px solid #E3E7F0; background:#FAFBFD; padding:8px 12px; margin:7px 0; border-radius:8px; break-inside:avoid; }
.fd b::before { content:""; display:inline-block; width:8px; height:8px; border-radius:50%; margin-right:8px; vertical-align:1px; background:#3B66FF; }
.fd.good b::before { background:#22C55E; } .fd.warn b::before { background:#FFC53D; } .fd.bad b::before { background:#EF4444; } .fd.na b::before { background:#B6BDCB; }
.fd p { margin:2px 0 0; }
.dt { break-inside:avoid; margin-bottom:10px; }
h3 { font-size:11pt; font-weight:600; margin:12px 0 4px; }
.pill { font-size:8.5pt; padding:1px 8px; border-radius:10px; margin-left:6px; font-weight:700; }
.pill.good { background:#DCFCE7; color:#166534; } .pill.warn { background:#FEF3C7; color:#92400E; } .pill.bad { background:#FEE2E2; color:#991B1B; }
table { width:100%; border-collapse:collapse; font-size:9.5pt; }
th { text-align:left; font-size:7.5pt; letter-spacing:0.08em; text-transform:uppercase; color:#5B6475; border-bottom:1px solid #D7DCE6; padding:5px 6px; }
td { border-bottom:1px solid #EEF1F7; padding:5px 6px; font-variant-numeric:tabular-nums; } .r { text-align:right; }
.note { font-size:8.5pt; color:#5B6475; margin:4px 0 0; }
.pb { break-before:page; }
.foot { margin-top:18px; border-top:1px solid #E3E7F0; padding-top:8px; font-size:8pt; color:#5B6475; }
@media screen { body { padding:24px 16px; } }
</style></head><body>
<div class="top"><div class="lock">${MARK}Token Health Scan</div><div class="lab">Token Health Report</div></div>
<h1>${esc(name)} <span style="color:#5B6475">(${esc(symbol)})</span></h1>
<div class="meta">${esc(chain)} · <span class="mono">${esc(row.token_address)}</span><br>Scanned ${when} · scoring model v${esc(ds.scoring_version)}</div>
<div class="hero">
  <div class="score"><div class="lab">Health score</div><b>${ds.overall ?? "n/a"}</b><div class="meta">out of 100</div></div>
  <div>${bars}</div>
</div>
<div class="mk">
  <div><span class="lab">Price</span><b>${money(field(fd, "market", "price_usd"))}</b></div>
  <div><span class="lab">Market cap</span><b>${money(field(fd, "market", "market_cap_usd"))}</b></div>
  <div><span class="lab">24h volume</span><b>${money(field(fd, "market", "volume_24h_usd"))}</b></div>
  <div><span class="lab">Holders</span><b>${holderCount !== null ? Number(holderCount).toLocaleString("en-US") : "n/a"}</b></div>
</div>
<h2>What the scan found</h2>
${fhtml}
<div class="pb"></div>
<h2>Score breakdown</h2>
${tables}
${poolHtml}
${holderHtml}
<div class="foot">${quality}Values are as of the scan time above and change with the market. This report is information, not financial advice.<br>tokenhealthscan.com · team@tokenhealthscan.com</div>
</body></html>`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders, status: 204 });
  const json = (body: unknown, status: number) =>
    new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  try {
    const token = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "");
    const { data: { user } } = await supabase.auth.getUser(token);
    if (!user) return json({ error: "Sign in to download reports." }, 401);

    const [{ data: sub }, { data: role }] = await Promise.all([
      supabase.from("subscribers").select("plan").eq("id", user.id).maybeSingle(),
      supabase.rpc("get_user_role", { _user_id: user.id }),
    ]);
    if (!PAID_PLANS.includes(sub?.plan) && role !== "admin") {
      return json({ error: "PDF reports are a PRO feature.", upgrade: true }, 403);
    }

    const body = req.method === "POST" ? await req.json().catch(() => ({})) : {};
    const url = new URL(req.url);
    const address = String(body.token_address || url.searchParams.get("token_address") || "").trim();
    const chainId = String(body.chain_id || url.searchParams.get("chain_id") || "0x1").trim();
    if (!address) return json({ error: "token_address is required" }, 400);

    const { data: rows, error } = await supabase
      .from("token_scans")
      .select("token_address, chain_id, scanned_at, scoring_version, dimension_scores, field_data, data_quality, completeness_pct")
      .in("token_address", [...new Set([address, address.toLowerCase()])])
      .eq("chain_id", chainId)
      .not("field_data", "is", null)
      .order("scanned_at", { ascending: false })
      .limit(1);
    if (error) throw new Error(error.message);
    if (!rows?.length || !rows[0].dimension_scores?.dimensions) {
      return json({ error: "No full scan found for this token yet. Run a scan first." }, 404);
    }

    return new Response(build(rows[0]), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "text/html; charset=utf-8" },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error(`[scan-report] ${msg}`);
    return json({ error: "Could not build the report. Please try again." }, 500);
  }
});
