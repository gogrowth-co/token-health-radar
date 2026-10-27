// @ts-nocheck: ported verbatim from token-health-scan scripts/regenerate-token-snapshots.mjs (2026-10-27): the bot-facing token page
// (seo-snapshots/token/<symbol>/index.html) the site serves to crawlers and link previews, with the scan time in <time datetime>.
const SITE_URL = "https://tokenhealthscan.com";
const SITE_NAME = "Token Health Scan";
const TWITTER_HANDLE = "@tokenhealthscan";
const DEFAULT_OG_IMAGE = `${SITE_URL}/lovable-uploads/tokenhealthscan-og.png`;

const esc = (s) =>
  String(s ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
const escJsonLd = (o) => JSON.stringify(o).replaceAll("<", "\\u003c");
const scoreClass = (s) => {
  const n = Number(s);
  if (!Number.isFinite(n)) return "";
  return n >= 70 ? "good" : n >= 40 ? "med" : "bad";
};


// Narrative buckets for "Related token reports" cross-links. A token links
// up to 4 same-bucket siblings (keyword anchors) + its chain's launchpad
// directory — this is what de-orphans /solana-launchpads and
// /ethereum-launchpads and turns hub-and-spoke token pages into clusters.
const NARRATIVE = {
  meme: ["pepe", "bonk", "trump", "pump"],
  "cex-dex": ["htx", "nexo", "cro", "leo", "okb", "bgb", "gt", "cake", "jup", "aero"],
  stablecoin: ["usde", "usd1", "gho", "frax", "usdy", "sky", "ena"],
  ai: ["fet", "virtual", "coai", "aitech", "kaito", "wld", "rndr"],
  defi: ["aave", "morpho", "pendle", "ondo", "ldo", "ethfi", "crv", "syrup", "om"],
  infra: ["arb", "pol", "mnt", "strk", "zro", "skl", "icp", "sei", "link", "api3", "pyth", "ath", "chz", "aster", "avnt", "wlfi", "iq"],
};
const BUCKET_OF = {};
for (const [b, syms] of Object.entries(NARRATIVE)) for (const s of syms) BUCKET_OF[s] = b;
const BUCKET_LABEL = { meme: "meme tokens", "cex-dex": "exchange & DEX tokens", stablecoin: "stablecoins", ai: "AI tokens", defi: "DeFi tokens", infra: "infrastructure tokens" };

function relatedLinks(sym, chain) {
  const bucket = BUCKET_OF[sym];
  const sibs = (NARRATIVE[bucket] || []).filter((x) => x !== sym).slice(0, 4);
  const items = sibs.map(
    (x) => `<li><a href="${SITE_URL}/token/${x}">Is ${x.toUpperCase()} safe? ${x.toUpperCase()} token risk analysis</a></li>`
  );
  if (chain === "solana") items.push(`<li><a href="${SITE_URL}/solana-launchpads">Solana launchpads directory</a></li>`);
  else items.push(`<li><a href="${SITE_URL}/ethereum-launchpads">Ethereum launchpads directory</a></li>`);
  const label = BUCKET_LABEL[bucket] || "tokens";
  return { items: items.join("\n      "), label };
}

function renderPage({ title, description, canonical, ogImage, jsonLd, bodyHtml }) {
  const ldBlocks = jsonLd
    .map((b) => `<script type="application/ld+json">${escJsonLd(b)}</script>`)
    .join("\n  ");
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${esc(title)}</title>
  <meta name="description" content="${esc(description)}" />
  <meta name="author" content="${SITE_NAME}" />
  <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1" />
  <link rel="canonical" href="${esc(canonical)}" />

  <meta property="og:type" content="website" />
  <meta property="og:site_name" content="${SITE_NAME}" />
  <meta property="og:title" content="${esc(title)}" />
  <meta property="og:description" content="${esc(description)}" />
  <meta property="og:url" content="${esc(canonical)}" />
  <meta property="og:image" content="${esc(ogImage || DEFAULT_OG_IMAGE)}" />
  <meta property="og:image:width" content="1200" />
  <meta property="og:image:height" content="630" />

  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:site" content="${TWITTER_HANDLE}" />
  <meta name="twitter:title" content="${esc(title)}" />
  <meta name="twitter:description" content="${esc(description)}" />
  <meta name="twitter:image" content="${esc(ogImage || DEFAULT_OG_IMAGE)}" />

  ${ldBlocks}

  <style>
    body{font-family:system-ui,-apple-system,sans-serif;max-width:900px;margin:0 auto;padding:24px;background:#0a0a0f;color:#e5e7eb;line-height:1.6}
    a{color:#a78bfa}
    nav{font-size:.9em;color:#9ca3af;margin-bottom:1.5rem}
    h1{font-size:2rem;margin:.25rem 0 .5rem}
    h2{margin-top:2rem;color:#c4b5fd;font-size:1.25rem}
    h3{margin-top:1.25rem;color:#ddd6fe;font-size:1.05rem}
    .grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:1rem;margin:1.5rem 0}
    .card{background:#161629;border-radius:8px;padding:1rem}
    .score{font-size:1.75rem;font-weight:700}
    .good{color:#22c55e}.med{color:#f59e0b}.bad{color:#ef4444}
    .label{font-size:.85rem;color:#9ca3af;margin-top:.25rem}
    .cta{background:#7c3aed;color:#fff;padding:.6rem 1.2rem;border-radius:6px;text-decoration:none;display:inline-block;margin:1rem 0}
    code{background:#161629;padding:2px 6px;border-radius:4px;font-size:.9em}
  </style>
</head>
<body>
${bodyHtml}
</body>
</html>`;
}

function sectionHtml(heading, section) {
  if (!section) return "";
  if (typeof section === "string") return `<h2>${esc(heading)}</h2><p>${esc(section)}</p>`;
  const summary = section.summary ? `<p>${esc(section.summary)}</p>` : "";
  const points = Array.isArray(section.keyPoints) && section.keyPoints.length
    ? `<ul>${section.keyPoints.map((p) => `<li>${esc(p)}</li>`).join("")}</ul>`
    : "";
  if (!summary && !points) return "";
  return `<h2>${esc(heading)}</h2>${summary}${points}`;
}

export function renderTokenPage(t) {
  const sym = (t.symbol || "").toUpperCase();
  const name = t.name || sym;
  const overall = t.overall_score ?? "—";
  const sec = t.security_score ?? "—";
  const liq = t.liquidity_score ?? "—";
  const tok = t.tokenomics_score ?? "—";
  const com = t.community_score ?? "—";
  const dev = t.development_score ?? "—";
  const canonical = `${SITE_URL}/token/${encodeURIComponent(t.symbol.toLowerCase())}`;
  const title = `${sym} Token Risk Analysis ${new Date().getFullYear()} | ${SITE_NAME}`;
  const description =
    `${name} (${sym}) health score: ${overall}/100. Security ${sec}, Liquidity ${liq}, ` +
    `Tokenomics ${tok}, Community ${com}, Development ${dev}. Independent risk audit.`;

  const faqEntities = [
    {
      "@type": "Question",
      name: `What is the ${sym} health score?`,
      acceptedAnswer: {
        "@type": "Answer",
        text: `${name} has an overall health score of ${overall}/100 — Security ${sec}, Liquidity ${liq}, Tokenomics ${tok}, Community ${com}, Development ${dev}.`,
      },
    },
    {
      "@type": "Question",
      name: `Is ${sym} safe?`,
      acceptedAnswer: {
        "@type": "Answer",
        text: `${name} received a security score of ${sec}/100. Always do your own research.`,
      },
    },
    ...(Array.isArray(t.faq)
      ? t.faq
          .filter((f) => f && (f.question || f.q) && (f.answer || f.a))
          .slice(0, 6)
          .map((f) => ({
            "@type": "Question",
            name: String(f.question || f.q),
            acceptedAnswer: { "@type": "Answer", text: String(f.answer || f.a) },
          }))
      : []),
  ];

  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "FinancialProduct",
      name: `${name} (${sym})`,
      description,
      url: canonical,
      brand: { "@type": "Brand", name: SITE_NAME },
      ...(typeof overall === "number"
        ? {
            aggregateRating: {
              "@type": "AggregateRating",
              ratingValue: overall,
              bestRating: 100,
              worstRating: 0,
              ratingCount: 1,
            },
          }
        : {}),
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
        { "@type": "ListItem", position: 2, name: "Tokens", item: `${SITE_URL}/token` },
        { "@type": "ListItem", position: 3, name: sym, item: canonical },
      ],
    },
    { "@context": "https://schema.org", "@type": "FAQPage", mainEntity: faqEntities },
  ];

  const howToBuy = Array.isArray(t.how_to_buy) && t.how_to_buy.length
    ? `<h2>How to buy ${esc(sym)}</h2><ol>${t.how_to_buy
        .map((s) => `<li><strong>${esc(s.title || "")}</strong> ${esc(s.description || "")}</li>`)
        .join("")}</ol>`
    : "";

  const faqHtml = Array.isArray(t.faq) && t.faq.length
    ? `<h2>Frequently asked questions</h2>${t.faq
        .filter((f) => f && (f.question || f.q) && (f.answer || f.a))
        .slice(0, 6)
        .map((f) => `<h3>${esc(f.question || f.q)}</h3><p>${esc(f.answer || f.a)}</p>`)
        .join("")}`
    : "";

  const body = `
  <nav><a href="${SITE_URL}">${SITE_NAME}</a> › <a href="${SITE_URL}/token">Tokens</a> › ${esc(sym)}</nav>
  <main>
    <h1>${esc(name)} (${esc(sym)}) Risk Analysis</h1>
    <p>Independent token health audit covering security, liquidity, tokenomics, community and development. ${
      t.price_usd ? `Current price: <strong>$${Number(t.price_usd).toFixed(6)}</strong>.` : ""
    } ${t.scanned_at ? `Scores from our scan of <time datetime="${esc(t.scanned_at)}">${esc(t.scanned_at.slice(0, 16).replace("T", " "))} UTC</time>.` : `Last updated ${(t.updated_at || new Date().toISOString()).split("T")[0]}.`}</p>

    <div class="grid">
      <div class="card"><div class="score ${scoreClass(overall)}">${overall}</div><div class="label">Overall</div></div>
      <div class="card"><div class="score ${scoreClass(sec)}">${sec}</div><div class="label">Security</div></div>
      <div class="card"><div class="score ${scoreClass(liq)}">${liq}</div><div class="label">Liquidity</div></div>
      <div class="card"><div class="score ${scoreClass(tok)}">${tok}</div><div class="label">Tokenomics</div></div>
      <div class="card"><div class="score ${scoreClass(com)}">${com}</div><div class="label">Community</div></div>
      <div class="card"><div class="score ${scoreClass(dev)}">${dev}</div><div class="label">Development</div></div>
    </div>

    ${t.what_is ? `<h2>What is ${esc(name)}?</h2><p>${esc(t.what_is)}</p>` : ""}
    ${t.risk_overview ? `<h2>Risk overview</h2><p>${esc(t.risk_overview)}</p>` : ""}
    ${sectionHtml("Security analysis", t.security_analysis)}
    ${sectionHtml("Liquidity analysis", t.liquidity_analysis)}
    ${sectionHtml("Tokenomics analysis", t.tokenomics_analysis)}
    ${sectionHtml("Community analysis", t.community_analysis)}
    ${sectionHtml("Development analysis", t.development_analysis)}
    ${howToBuy}
    ${faqHtml}

    ${
      t.address
        ? `<h2>Contract</h2><p>Chain: ${esc(t.chain || "ethereum")} · Address: <code>${esc(t.address)}</code></p>`
        : ""
    }

    <a class="cta" href="${SITE_URL}/scan/${esc(t.chain || "ethereum")}/${esc(t.address || sym)}">Run a fresh scan →</a>

    <h2>Related ${relatedLinks(t.symbol, t.chain).label}</h2>
    <ul>
      ${relatedLinks(t.symbol, t.chain).items}
    </ul>
    <h2>More from Token Health Scan</h2>
    <ul>
      <li><a href="${SITE_URL}/token">All token reports</a></li>
      <li><a href="${SITE_URL}/token-scan-guide">How to read a token health scan</a></li>
      <li><a href="${SITE_URL}/pricing">Pricing</a></li>
    </ul>
  </main>`;

  return renderPage({ title, description, canonical, ogImage: t.hero_image_url, jsonLd, bodyHtml: body });
}

