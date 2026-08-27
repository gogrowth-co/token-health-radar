import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import TokenSearchInput from "@/components/TokenSearchInput";
import AgentSearchInput from "@/components/agent-scan/AgentSearchInput";
import "@/styles/cobalt-home.css";

// Pulse-sweep mark — approved logomark, verbatim from design/reference/ths4-homepage.html
function Mark({ idSuffix, style }: { idSuffix: string; style?: React.CSSProperties }) {
  return (
    <span className="mark" style={style}>
      <svg viewBox="0 0 80 80" aria-label="Token Health Scan">
        <defs>
          <clipPath id={`nv-${idSuffix}`}>
            <circle cx="40" cy="40" r="32" />
          </clipPath>
        </defs>
        <circle cx="40" cy="40" r="32" fill="#3B66FF" opacity=".32" />
        <g clipPath={`url(#nv-${idSuffix})`}>
          <path d="M-6 44 H22 C24 44 24.5 38 27 38 S29.5 44 32 44 C34 44 34.5 22 37.5 22 S41 60 45 60 C48.5 60 49 44 53 44 H86 V-6 H-6 Z" fill="#3B66FF" />
        </g>
        <path d="M-6 44 H22 C24 44 24.5 38 27 38 S29.5 44 32 44 C34 44 34.5 22 37.5 22 S41 60 45 60 C48.5 60 49 44 53 44 H86" fill="none" stroke="#FF7A45" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      Token Health Scan
    </span>
  );
}

const DIMENSIONS = [
  { name: "Security", checks: ["Honeypot simulated on a live router", "Mint authority in storage", "Blacklist and pause functions", "Proxy resolved to implementation", "Source verification"] },
  { name: "Liquidity", checks: ["Pool depth", "LP lock share and unlock date", "Routing concentration", "Realised slippage on exit"] },
  { name: "Tokenomics", checks: ["Top-10 holder concentration", "Unlock schedule", "Team allocation", "Transfer tax, buy and sell"] },
  { name: "Community", checks: ["Holder growth", "Wallet retention", "Social engagement signal"] },
  { name: "Development", checks: ["Contract activity", "Commit frequency", "Contributor count"] },
];

const NAMED_CHECKS = [
  "Honeypot simulated against a live router",
  "Mint authority read from contract storage",
  "Blacklist and pause functions",
  "Proxy resolved to implementation",
  "Source verification status",
  "Buy and sell transfer tax",
  "LP lock share and unlock date",
  "Pool depth and routing concentration",
  "Realised slippage on a simulated exit",
  "Top-10 holder concentration",
  "Unlock schedule and team allocation",
  "Holder growth and wallet retention",
];

const DATA_SOURCES = ["GoPlus", "Moralis", "DefiLlama", "Webacy", "LunarCrush", "Telegram", "Discord", "GitHub", "CoinGecko", "CoinMarketCap", "8004scan.io", "GeckoTerminal", "Etherscan"];

const FAQS = [
  { q: "What does the health score actually mean?", a: "A 0-100 number built from five dimensions: security, liquidity, tokenomics, community and development. Each resolves to specific on-chain checks, weighted equally, so two tokens compare directly.", open: true },
  { q: "Does a high score mean a token is safe?", a: "No. It means the checks that ran passed at a specific block. It cannot account for off-chain intent, a team acting on a contract it controls, or a future governance change. Treat it as evidence, not a guarantee." },
  { q: "Do I have to connect my wallet?", a: "No. Token Health Scan reads public on-chain data about a contract address. It never needs access to your wallet, and there is nothing to approve or sign." },
  { q: "What do I get for free, and what costs money?", a: <>Three levels. With <b>no account</b> you get the overall score and all five category scores. A <b>free account</b> unlocks the per-check detail underneath, and includes 3 lifetime Pro Scans. <b>Pro</b> is $20 a month for 10 Pro Scans, or $120 a year.</> },
  { q: "What is the AI Agent Trust Score?", a: "A separate scan for ERC-8004 agents. It resolves the agent's registry record and onchain identity into a 0-100 trust score, so you can check an agent before delegating funds or signing authority to it. Three agent scans are free. Results cache for six hours." },
  { q: "Which chains are supported?", a: "Ethereum, BNB Chain, Base, Arbitrum, Polygon and Solana." },
];

export default function Landing() {
  return (
    <div className="cobalt dark cobalt-home">
      <Helmet>
        <title>Token Health Scan — Your token is struggling. Find out why.</title>
        <meta name="description" content="Get a 0–100 health score across all 5 dimensions for your protocol's token in 60 seconds — plus a ranked list of what to fix. Free scan, no login." />
        <meta name="keywords" content="token health, protocol diagnostics, token score, remediation checklist, DeFi token scan, smart contract analysis" />
        <link rel="canonical" href="https://tokenhealthscan.com/" />
        <meta property="og:title" content="Token Health Scan — Your token is struggling. Find out why." />
        <meta property="og:description" content="A 0–100 score across all 5 dimensions, plus a ranked fix list — in 60 seconds. Built for protocol founders." />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://tokenhealthscan.com/" />
        <meta property="og:image" content="https://tokenhealthscan.com/lovable-uploads/tokenhealthscan-og.png" />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta property="og:site_name" content="TokenHealthScan" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Token Health Scan — Your token is struggling. Find out why." />
        <meta name="twitter:description" content="A 0–100 score across all 5 dimensions, plus a ranked fix list — in 60 seconds. Built for protocol founders." />
        <meta name="twitter:image" content="https://tokenhealthscan.com/lovable-uploads/tokenhealthscan-og.png" />
        <meta name="twitter:site" content="@tokenhealthscan" />
        <meta name="robots" content="index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1" />
        <meta name="author" content="Token Health Scan" />
      </Helmet>

      <div className="shell">
        <header>
          <nav>
            <Mark idSuffix="nav" />
            <span className="navlinks">
              <Link className="l" to="/copilot">Copilot</Link>
              <Link className="l" to="/agent-scan">Agent Scan</Link>
              <a className="l" href="#api">API</a>
              <a className="l" href="#faq">Methodology</a>
              <a className="l" href="#pricing">Pricing</a>
            </span>
            <Link className="ghost" to="/auth">Sign in</Link>
          </nav>
        </header>

        <main>
          {/* Hero */}
          <div className="hero">
            <div className="hc">
              <span className="lab">Contract risk / 5 dimensions / 6 chains</span>
              <h1>Know what a token<br />is <b>hiding</b>.</h1>
              <p className="promise"><b>Paste an address. You get a 0-100 score and every check behind it, in about 60 seconds.</b></p>

              <div className="searchbox">
                <Tabs defaultValue="token" className="w-full">
                  <TabsList className="grid w-full grid-cols-2 mb-3">
                    <TabsTrigger value="token">Scan a token</TabsTrigger>
                    <TabsTrigger value="agent">Scan an agent</TabsTrigger>
                  </TabsList>
                  <TabsContent value="token">
                    <TokenSearchInput large placeholder="$PENDLE, $ARB, 0x1234…" />
                    <p className="searchhelp">Free scan · Top 3 issues · No account needed · Pro unlocks full report</p>
                  </TabsContent>
                  <TabsContent value="agent">
                    <AgentSearchInput large />
                    <p className="searchhelp">Scan any ERC-8004 AI agent. 3 free scans included.</p>
                  </TabsContent>
                </Tabs>
              </div>

              <p className="caveat"><i></i><span><b>A clean score is not a guarantee.</b> It means the checks passed at one block. It cannot see off-chain intent or a team acting on a contract it controls.</span></p>
            </div>

            {/* Illustrative sample result — clearly labeled, not live data */}
            <div className="panel">
              <div className="prow phead">
                <div className="cell"><span className="lab">Scan target</span><span className="v">0x2170Ed0880ac9A755fd29B2688956BD959F933F8</span></div>
                <div className="cell" style={{ display: "flex", alignItems: "center" }}><span className="chip">ETH / MAINNET</span></div>
              </div>
              <div className="prow">
                <div className="sw">
                  <div>
                    <span className="lab">Overall health</span>
                    <div className="score" style={{ marginTop: 8 }}><span className="n">62</span><span className="d">/100</span></div>
                    <div className="band"><span></span><span></span><span className="on"></span><span></span><span></span></div>
                    <div className="bandlab"><span>CRITICAL</span><span>HEALTHY</span></div>
                    <div className="verdict">At risk</div>
                  </div>
                  <div className="flags">
                    <span className="lab" style={{ marginBottom: 2 }}>Open flags</span>
                    <span className="flag"><em className="bg-r"></em>Mint authority not revoked</span>
                    <span className="flag"><em className="bg-w"></em>Top 10 hold 41.7%</span>
                    <span className="flag"><em className="bg-w"></em>LP unlock in 18 days</span>
                    <span className="flag"><em className="bg-g"></em>No honeypot logic</span>
                  </div>
                </div>
              </div>
              <div className="dims">
                <div className="dim" style={{ ["--i" as string]: 0 }}><span className="nm">Security</span><span className="tr"><b className="bg-w" style={{ width: "58%" }}></b></span><span className="vv w">58</span></div>
                <div className="dim" style={{ ["--i" as string]: 1 }}><span className="nm">Liquidity</span><span className="tr"><b className="bg-w" style={{ width: "44%" }}></b></span><span className="vv w">44</span></div>
                <div className="dim" style={{ ["--i" as string]: 2 }}><span className="nm">Tokenomics</span><span className="tr"><b className="bg-r" style={{ width: "31%" }}></b></span><span className="vv r">31</span></div>
                <div className="dim" style={{ ["--i" as string]: 3 }}><span className="nm">Community</span><span className="tr"><b className="bg-g" style={{ width: "79%" }}></b></span><span className="vv g">79</span></div>
                <div className="dim" style={{ ["--i" as string]: 4 }}><span className="nm">Development</span><span className="tr"><b className="bg-g" style={{ width: "81%" }}></b></span><span className="vv g">81</span></div>
              </div>
              <div className="stamp">
                <span className="lab" style={{ color: "var(--amber)" }}>Sample result — illustrative, not a live scan</span>
              </div>
            </div>
          </div>

          {/* Live, verified facts — design/blueprint + product-info.md reconciliation */}
          <div className="live">
            <div className="lv"><span className="lab">Live data sources</span><span className="n2">13</span></div>
            <div className="lv"><span className="lab">Chains live</span><span className="n2">6</span></div>
            <div className="lv"><span className="lab">Named checks per scan</span><span className="n2">12</span></div>
            <div className="lv"><span className="lab">Typical scan time</span><span className="n2">~60 seconds</span></div>
          </div>

          {/* Five dimensions — equal-weighted, matches the real scoring formula (simple average, not a tiered weight) */}
          <section className="blk">
            <span className="lab eyebrow">The five dimensions</span>
            <h2>One score, and <b>the reason behind it</b>.</h2>
            <p className="lede">A number nobody can audit is worth nothing. Every dimension resolves to named on-chain checks, weighs equally in the overall score, and reports the block it was read at.</p>
            <div className="dimgrid">
              {DIMENSIONS.map((d) => (
                <div className="dc" key={d.name}>
                  <h3>{d.name}</h3>
                  <div className="wt">20<span className="wl">Weight</span></div>
                  <ul>{d.checks.map((c) => <li key={c}>{c}</li>)}</ul>
                </div>
              ))}
            </div>
            <div className="limitbox">
              <p><strong style={{ color: "var(--amber)", fontWeight: 500 }}>What a scan cannot tell you.</strong> A clean score means the checks above passed at a specific block. It cannot see off-chain intent, a team that rugs a contract it fully controls, or a governance vote that has not happened yet. Anyone selling you certainty about a token is selling you something else.</p>
            </div>
          </section>

          <section className="blk alt">
            <span className="lab eyebrow">What runs on every scan</span>
            <h2>Twelve named checks, <b>same order, every time</b>.</h2>
            <p className="lede">You can see which tests ran and what each returned. Nothing in the score is a judgement call you cannot inspect.</p>
            <p className="lede" style={{ marginTop: 12, color: "var(--ink-3)", fontSize: ".92rem" }}>The category scores are visible without an account. The per-check detail below opens with a free account.</p>
            <div className="chk">
              {NAMED_CHECKS.map((c) => (
                <div className="ck" key={c}><i></i><span>{c}</span></div>
              ))}
            </div>
            <div className="srcs">
              {DATA_SOURCES.map((s) => <span key={s}>{s}</span>)}
            </div>
          </section>

          <section className="blk">
            <span className="lab eyebrow">How this differs</span>
            <h2>Most scanners return a verdict. <b>This returns a reading.</b></h2>
            <p className="lede">Free contract scanners are common. What varies is whether you can audit the answer, compare two tokens on the same basis, or see when the picture changed.</p>
            <div className="cmp"><table>
              <thead><tr><th>&nbsp;</th><th>A typical free scanner</th><th className="us">Token Health Scan</th></tr></thead>
              <tbody>
                <tr><td>Output</td><td>Pass / fail, or one risk label</td><td className="us">0-100 across all 5 dimensions</td></tr>
                <tr><td>Auditability</td><td>Result only</td><td className="us">Every check listed, with its block</td></tr>
                <tr><td>Comparability</td><td>Not designed for it</td><td className="us">Equal weights, so two tokens compare directly</td></tr>
                <tr><td>Programmatic access</td><td>Rare or paid-only</td><td className="us">Same score, one request (waitlist)</td></tr>
                <tr><td>Limitations</td><td>Rarely stated</td><td className="us">Published, and shown on the scan itself</td></tr>
              </tbody>
            </table></div>
          </section>

          {/* Agent Scan teaser */}
          <div className="two" id="agents">
            <div className="tx2">
              <span className="lab eyebrow">Second product</span>
              <h2>Tokens are not the only thing <b>you have to trust</b>.</h2>
              <p className="lede">An ERC-8004 agent can hold funds, sign transactions and act on your behalf. Agent Scan gives one the same treatment a token gets: onchain metadata and registry data, resolved into a trust score you can read before you delegate anything to it.</p>
              <p className="lede" style={{ marginTop: 14 }}>Three agent scans are free, same as tokens. Results cache for six hours rather than being read live, because agent registry data does not move at block speed.</p>
              <div style={{ marginTop: 26, display: "flex", gap: 10, flexWrap: "wrap" }}>
                <Link className="btn btn-p" to="/agent-scan" style={{ fontSize: 14, padding: "11px 19px" }}>Scan an agent</Link>
                <Link className="ghost" to="/agent-directory" style={{ alignSelf: "center" }}>Browse the agent directory</Link>
              </div>
            </div>
            <div className="pv2"><div className="mini2">
              <div className="m2h"><span className="lab">Agent trust score</span><span className="prodtag">ERC-8004</span></div>
              <div className="m2r"><span className="k2">Registry record</span><span className="v2 g">RESOLVED</span></div>
              <div className="m2r"><span className="k2">Onchain identity</span><span className="v2 g">VERIFIED</span></div>
              <div className="m2r"><span className="k2">Funds custody</span><span className="v2 w">DELEGATED</span></div>
              <div className="m2r"><span className="k2">Cache window</span><span className="v2" style={{ color: "var(--ink-3)" }}>6 HOURS</span></div>
            </div></div>
          </div>

          {/* API teaser — honest: waitlist only, not a live endpoint */}
          <div className="api" id="api">
            <div className="tx">
              <span className="lab">API</span>
              <h2>Same score, <b>one request</b>.</h2>
              <p className="lede">Every field on this page would be in the response, including the block it was read at. Currently waitlist-only — see Pricing.</p>
            </div>
            <div className="cd"><pre><span className="c">$</span> curl https://api.tokenhealthscan.com/v1/scan \{"\n"}    -d <span className="s">{`'{"chain":"eth","address":"0x2170Ed08…"}'`}</span>{"\n\n"}{"{"}{"\n"}  <span className="k">"score"</span>: 62,{"\n"}  <span className="k">"verdict"</span>: <span className="s">"at_risk"</span>,{"\n"}  <span className="k">"block"</span>: 21904776,{"\n"}  <span className="k">"dimensions"</span>: {"{"}{"\n"}    <span className="k">"security"</span>: 58, <span className="k">"liquidity"</span>: 44,{"\n"}    <span className="k">"tokenomics"</span>: 31, <span className="k">"community"</span>: 79,{"\n"}    <span className="k">"development"</span>: 81{"\n"}  {"}"}{"\n"}{"}"}</pre></div>
          </div>

          {/* Copilot teaser */}
          <div className="copilot" id="copilot">
            <div className="cp"><div className="chat">
              <div className="msg q">why did liquidity drop this week?</div>
              <div className="msg a">Pool depth fell <b>18%</b> since Monday, and routing concentrated into a single pool at <b>94%</b>. Realised slippage on a $10k exit moved from 1.9% to <b>3.1%</b>.</div>
              <div className="askbar"><span>Ask about price, 7d trend, or top pools…</span><em>Ask</em></div>
            </div></div>
            <div className="tx2" style={{ padding: "clamp(40px,5vw,74px) var(--pad)" }}>
              <span className="lab eyebrow">Copilot</span>
              <h2>The score tells you what. <b>Copilot tells you why.</b></h2>
              <p className="lede">A scan is a verdict at a moment. Copilot sits on the result and answers against the scan's own data, so the reasoning traces back to the same checks and the same block.</p>
              <p className="lede" style={{ marginTop: 14 }}>It runs on the scan result page, not as a separate destination you have to go and find.</p>
              <div style={{ marginTop: 22 }}>
                <Link className="ghost" to="/copilot">See Copilot &rarr;</Link>
              </div>
            </div>
          </div>

          {/* Token directory teaser — explicitly illustrative rows, real directory linked */}
          <section className="dir" id="directory">
            <span className="lab eyebrow">Token directory</span>
            <h2>Every token we scan gets <b>a permanent page</b>.</h2>
            <p className="lede">Scores, checks and history for a token, at a stable URL you can link, cite or send to your team.</p>
            <div className="dirgrid">
              <div className="dt"><span className="sym">$CAKE</span><span className="sc g">75</span></div>
              <div className="dt"><span className="sym">$WETH</span><span className="sc g">88</span></div>
              <div className="dt"><span className="sym">$ARB</span><span className="sc w">61</span></div>
              <div className="dt"><span className="sym">$MATIC</span><span className="sc g">79</span></div>
            </div>
            <p style={{ marginTop: 16, fontFamily: "var(--mono)", fontSize: "10.5px", color: "var(--ink-3)" }}>
              Illustrative rows. Live directory at <Link to="/token" style={{ color: "var(--cobalt-hi)" }}>/token</Link>, per-token reports at /token/&lt;symbol&gt;.
            </p>
          </section>

          {/* Pricing — reconciled against live site + Stripe, 2026-08-26 */}
          <section className="blk alt" id="pricing">
            <span className="lab eyebrow">Pricing</span>
            <h2>Scan free. <b>Pay when you scan often.</b></h2>
            <p className="lede">Every plan returns the same score and the same checks. What changes is how many Pro Scans you get, and whether you get them programmatically.</p>
            <div className="price">
              <div className="pc">
                <h3>Free</h3><div className="amt">$0<small> forever</small></div>
                <ul>
                  <li>Score + 5 category scores, <span style={{ color: "var(--ink-3)" }}>no account</span></li>
                  <li>Per-check detail with a free account</li>
                  <li>3 lifetime Pro Scans</li>
                  <li>Token metadata analysis</li>
                  <li>Shareable scan results</li>
                </ul>
                <div className="btn2"><a href="#top">Scan a contract</a></div>
              </div>
              <div className="pc feat">
                <h3>Pro Monthly</h3><div className="amt">$20<small>/mo</small></div>
                <ul>
                  <li>10 Pro Scans per month</li>
                  <li>All five dimensions</li>
                  <li>Tokenomics deep dive</li>
                  <li>Community + developer signals</li>
                  <li>Export as PDF or CSV</li>
                </ul>
                <div className="btn2"><Link to="/pricing">Upgrade now</Link></div>
              </div>
              <div className="pc">
                <h3>Pro Annual</h3><div className="amt">$120<small>/yr</small></div>
                <ul>
                  <li>Everything in Pro Monthly</li>
                  <li>10 Pro Scans per month</li>
                  <li>Priority support</li>
                  <li><span style={{ color: "var(--green)" }}>Save $120 (50%)</span></li>
                </ul>
                <div className="btn2"><Link to="/pricing">Upgrade &amp; save</Link></div>
              </div>
              <div className="pc">
                <h3>API <span className="tbd2" style={{ color: "var(--cobalt-hi)", borderColor: "rgba(110,140,255,.35)" }}>WAITLIST</span></h3><div className="amt">$99<small>/mo</small></div>
                <ul>
                  <li>1,000 scans per month</li>
                  <li>5-dimension JSON per scan</li>
                  <li>Bulk: up to 50 per request</li>
                  <li>ERC-8004 agent trust score</li>
                </ul>
                <div className="btn2"><Link to="/pricing">Join waitlist</Link></div>
              </div>
            </div>
            <p style={{ marginTop: 18, fontFamily: "var(--mono)", fontSize: "10.5px", color: "var(--ink-3)" }}>Comparing multiple tokens is on the roadmap and is not included yet.</p>
          </section>

          {/* FAQ */}
          <section className="faqwrap" id="faq">
            <span className="lab">Methodology</span>
            <h2>Before you paste an address.</h2>
            <div className="faq">
              {FAQS.map((f) => (
                <details key={f.q} open={f.open}>
                  <summary>{f.q}</summary>
                  <div className="ans">{f.a}</div>
                </details>
              ))}
            </div>
          </section>

          {/* Final CTA */}
          <section className="band2" id="top">
            <span className="lab eyebrow">Free, no wallet</span>
            <h2>Scan a contract <b>now</b>.</h2>
            <p className="lede">Paste an address and you get a 0-100 score plus every check behind it, in about 60 seconds. No account, no wallet, no signature.</p>
            <div className="searchbox" style={{ marginTop: 26 }}>
              <Tabs defaultValue="token" className="w-full">
                <TabsList className="grid w-full grid-cols-2 mb-3">
                  <TabsTrigger value="token">Scan a token</TabsTrigger>
                  <TabsTrigger value="agent">Scan an agent</TabsTrigger>
                </TabsList>
                <TabsContent value="token">
                  <TokenSearchInput large placeholder="$PENDLE, $ARB, 0x1234…" />
                </TabsContent>
                <TabsContent value="agent">
                  <AgentSearchInput large />
                </TabsContent>
              </Tabs>
            </div>
          </section>
        </main>

        <footer>
          <div className="fg">
            <div className="fc">
              <Mark idSuffix="foot" style={{ margin: "0 0 10px" }} />
              <p style={{ color: "var(--ink-3)", fontSize: "12.5px", maxWidth: "30ch", margin: 0 }}>Contract risk scoring for people who have to decide today.</p>
            </div>
            <div className="fc"><h4>Product</h4><ul>
              <li><Link to="/agent-scan">Agent Scan</Link></li>
              <li><Link to="/copilot">Copilot</Link></li>
              <li><Link to="/token">Token directory</Link></li>
              <li><a href="#api">API</a></li>
              <li><Link to="/pricing">Pricing</Link></li>
            </ul></div>
            <div className="fc"><h4>Methodology</h4><ul>
              <li><a href="#faq">Scoring model</a></li>
              <li><a href="#faq">Limitations</a></li>
            </ul></div>
            <div className="fc"><h4>Company</h4><ul>
              <li><Link to="/publications">Publications</Link></li>
            </ul></div>
          </div>
          <div className="legal">
            <span>&copy; 2026 Token Health Scan</span>
            <Link to="/privacy">Privacy</Link>
            <Link to="/terms">Terms</Link>
            <span><span className="dot"></span>All systems operational</span>
          </div>
        </footer>
      </div>
    </div>
  );
}
