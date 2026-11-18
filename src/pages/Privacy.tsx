
import { Helmet } from "react-helmet-async";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { ConsentLink } from "@/components/ConsentBar";

// Every tool the browser loads (manga-os-v4 docs/standards/third-party-scripts.md rule 3). Keep in step with index.html and GTM-P84WRMG9.
const TOOLS = [
  {
    name: "Google Analytics 4",
    records: "Pages viewed, scans started and completed (chain and score range only, never a wallet or token address), sign-ups, checkouts and purchases, device and browser type, approximate location. IP addresses are not stored. With cookies allowed, Google signals may link visits to signed-in Google accounts for aggregated reports.",
    cookies: "_ga and _ga_X9EQHXBVCS, 13 months. None after Decline, or before Accept inside the EU, EEA, UK and Switzerland.",
    processor: "Google LLC, USA (Google Ireland Ltd. for the EU, EEA and UK). Data Privacy Framework.",
    runs: "Every visit. Without cookies after Decline (anonymous pings, no visitor identifier).",
    basis: "Legitimate interest without cookies; consent for cookies inside the EU, EEA, UK and Switzerland; legitimate interest with the right to object elsewhere.",
  },
  {
    name: "Microsoft Clarity",
    records: "Clicks, scrolls, page layout and session replays with typed text masked, device and browser type.",
    cookies: "_clck, 1 year; _clsk, 1 day; on clarity.ms and bing.com, CLID (1 year), MUID (13 months), MR (7 days) and SM, ANONCHK (the visit). None after Decline, or before Accept inside the EU, EEA, UK and Switzerland.",
    processor: "Microsoft Corporation, USA (Microsoft Ireland Operations Ltd. for the EU, EEA and UK). Data Privacy Framework.",
    runs: "Every visit. Without cookies after Decline, so it cannot recognise you on a later visit.",
    basis: "Legitimate interest without cookies; consent for cookies inside the EU, EEA, UK and Switzerland; legitimate interest with the right to object elsewhere.",
  },
  {
    name: "TikTok pixel",
    records: "Page visits and site events, to measure and target our TikTok ads.",
    cookies: "_ttp, _tt_enable_cookie, ttcsid and ttcsid_D0IEQ6RC77U6ANESEF5G on this site, and _ttp on tiktok.com, 13 months.",
    processor: "TikTok Pte. Ltd., Singapore (TikTok Technology Ltd., Ireland, for the EU, EEA and UK). Transfers to Singapore, Malaysia and the USA under Standard Contractual Clauses.",
    runs: "Only with cookies allowed: never after Decline, never before Accept inside the EU, EEA, UK and Switzerland.",
    basis: "Consent inside the EU, EEA, UK and Switzerland; legitimate interest with the right to object elsewhere.",
  },
  {
    name: "Reddit pixel",
    records: "Page visits and site events, to measure and target our Reddit ads.",
    cookies: "_rdt_uuid on this site, 90 days; rbu on reddit.com, 13 months.",
    processor: "Reddit, Inc., USA. Standard Contractual Clauses.",
    runs: "Only with cookies allowed: never after Decline, never before Accept inside the EU, EEA, UK and Switzerland.",
    basis: "Consent inside the EU, EEA, UK and Switzerland; legitimate interest with the right to object elsewhere.",
  },
  {
    name: "X (Twitter) pixel",
    records: "Page visits, to measure and target our X ads.",
    cookies: "_twclid on this site when you arrive from an X ad; on x.com and twitter.com, muc_ads, personalization_id and guest_id; up to 13 months.",
    processor: "X Corp., USA (Twitter International Unlimited Company, Ireland, for the EU, EEA and UK). Standard Contractual Clauses.",
    runs: "Only with cookies allowed: never after Decline, never before Accept inside the EU, EEA, UK and Switzerland.",
    basis: "Consent inside the EU, EEA, UK and Switzerland; legitimate interest with the right to object elsewhere.",
  },
  {
    name: "Cloudflare Web Analytics",
    records: "Page views, load times and referring site, counted without identifying the visitor.",
    cookies: "None.",
    processor: "Cloudflare, Inc., USA. Data Privacy Framework.",
    runs: "Every visit, whatever you choose.",
    basis: "Legitimate interest in running and improving the service.",
  },
  {
    name: "What the site needs to work",
    records: "Your cookie choice, your sign-in session, protection against bots, and which version of the site you are served.",
    cookies: "ths_consent, 6 months; __cf_bm (Cloudflare bot protection), 30 minutes; __dpl (hosting, the site version), 7 days; the Supabase sign-in session in local storage, until you sign out.",
    processor: "Cloudflare, Inc., USA; Lovable (hosting); Supabase, Inc., USA. Data Privacy Framework or Standard Contractual Clauses.",
    runs: "Always: the site cannot work without them, and Decline does not remove them.",
    basis: "Contract and legitimate interest in a secure service; strictly necessary, so no consent is needed.",
  },
];

export default function Privacy() {
  return (
    <div className="flex flex-col min-h-screen">
      <Helmet>
        <title>Privacy Policy - Token Health Scan</title>
        <meta name="description" content="Read how Token Health Scan collects, uses, and protects your personal information when using our token analysis services." />
        <link rel="canonical" href="https://tokenhealthscan.com/privacy" />
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>
      <Navbar />
      
      <main className="flex-1">
        <div className="container mx-auto px-4 md:px-6 py-16 max-w-4xl">
          <div className="prose prose-gray max-w-none">
            <h1 className="text-4xl font-bold mb-8">Privacy Policy</h1>
            <p className="text-muted-foreground mb-8">Last updated: November 18th, 2026</p>
            
            <p className="mb-6">
              This Privacy Policy explains how Token Health Scan ("we", "our", or "us") collects, uses, and protects your personal information when you use our website and services (the "Service").
            </p>
            
            <p className="mb-8">
              By using Token Health Scan, you consent to the practices described in this Privacy Policy.
            </p>

            <h2 className="text-2xl font-semibold mt-8 mb-4">1. Information We Collect</h2>
            <p className="mb-4">We collect two types of information:</p>
            
            <h3 className="text-xl font-medium mt-6 mb-3">a. Personal Information (you provide)</h3>
            <ul className="list-disc pl-6 mb-4 space-y-1">
              <li>Email address (for login and communication)</li>
              <li>Payment information (processed via Stripe – we do not store your credit card details)</li>
              <li>Login provider metadata (if using OAuth)</li>
            </ul>

            <h3 className="text-xl font-medium mt-6 mb-3">b. Usage Data (collected automatically)</h3>
            <ul className="list-disc pl-6 mb-4 space-y-1">
              <li>IP address, device type, browser type</li>
              <li>Pages visited and actions taken (e.g. token scans)</li>
              <li>Error logs and diagnostics</li>
              <li>API usage (e.g. scan requests)</li>
            </ul>

            <h2 className="text-2xl font-semibold mt-8 mb-4">2. How We Use Your Information</h2>
            <p className="mb-4">We use the collected information to:</p>
            <ul className="list-disc pl-6 mb-6 space-y-1">
              <li>Provide and improve the Service</li>
              <li>Authenticate users and manage accounts</li>
              <li>Track scan history and quota</li>
              <li>Respond to customer inquiries</li>
              <li>Process payments (via Stripe)</li>
              <li>Monitor and prevent misuse of the platform</li>
              <li>Analyze product performance and usage patterns</li>
            </ul>

            <h2 className="text-2xl font-semibold mt-8 mb-4">3. Data Storage and Security</h2>
            <p className="mb-4">
              We use Supabase (PostgreSQL, edge functions, auth) to securely store account, scan, and subscription data. Stripe handles all payment information on its own secure infrastructure.
            </p>
            <p className="mb-6">
              We implement standard security practices, including HTTPS, encryption, and access controls. However, no method of transmission or storage is 100% secure.
            </p>

            <h2 className="text-2xl font-semibold mt-8 mb-4">4. Third-Party Services</h2>
            <p className="mb-4">We integrate with third-party services for functionality:</p>
            <ul className="list-disc pl-6 mb-4 space-y-1">
              <li><strong>Stripe:</strong> Payment processing</li>
              <li><strong>CoinGecko, GoPlus, Etherscan, GeckoTerminal, Apify, GitHub:</strong> Data APIs</li>
              <li><strong>Supabase:</strong> Authentication, database, and user management</li>
              <li><strong>HubSpot</strong> (HubSpot, Inc., USA): your account email, name, plan and scan usage, for account and product emails</li>
            </ul>
            <p className="mb-6">
              These services may collect data in accordance with their own privacy policies.
            </p>

            <h2 id="cookies" className="text-2xl font-semibold mt-8 mb-4">5. Cookies and Tracking</h2>
            <p className="mb-4">
              We measure how the site is used so we can improve it, and we use advertising pixels to measure our campaigns. These tools load
              for every visitor once the page has finished loading (or at your first tap, scroll or key press, if that comes sooner).
            </p>
            <ul className="list-disc pl-6 mb-4 space-y-2">
              <li>
                <strong>Outside the EU, the EEA, the UK and Switzerland</strong>, they set cookies from your first visit. You can say no at
                any time with "Decline" in the notice or the "Decline cookies" link at the bottom of every page.
              </li>
              <li>
                <strong>Inside the EU, the EEA, the UK and Switzerland</strong>, they set no cookies and the advertising pixels stay off
                until you choose "Accept" in the cookie bar.
              </li>
              <li>
                <strong>After "Decline"</strong>, every cookie we control is refused at once and on every later page, and we remember the
                choice for 6 months (cookie <code>ths_consent</code>). Google Analytics and Microsoft Clarity keep measuring without cookies
                or other device storage, and the TikTok, Reddit and X pixels stop. The same link lets you change your mind later.
              </li>
            </ul>
            <p className="mb-4"><ConsentLink className="rounded-md border border-border px-3 py-1.5 text-sm font-medium hover:bg-muted" /></p>

            <h3 className="text-xl font-medium mt-6 mb-3">The tools, one by one</h3>
            <div className="space-y-4 mb-6 not-prose">
              {TOOLS.map((t) => (
                <div key={t.name} className="rounded-lg border border-border p-4 text-sm">
                  <p className="font-semibold mb-2">{t.name}</p>
                  <dl className="grid gap-1 sm:grid-cols-[10rem_1fr]">
                    <dt className="text-muted-foreground">What it records</dt><dd>{t.records}</dd>
                    <dt className="text-muted-foreground">Cookies and lifetime</dt><dd>{t.cookies}</dd>
                    <dt className="text-muted-foreground">Processor and transfer</dt><dd>{t.processor}</dd>
                    <dt className="text-muted-foreground">When it runs</dt><dd>{t.runs}</dd>
                    <dt className="text-muted-foreground">Legal basis</dt><dd>{t.basis}</dd>
                  </dl>
                </div>
              ))}
            </div>

            <h3 className="text-xl font-medium mt-6 mb-3">Legal bases</h3>
            <ul className="list-disc pl-6 mb-4 space-y-2">
              <li><strong>What the site needs to work</strong> (security, sign-in, remembering your cookie choice): performance of our contract with you and our legitimate interest in a secure service (GDPR art. 6(1)(b) and (f); LGPD art. 7, V and IX). These need no consent under the ePrivacy rules because they are strictly necessary.</li>
              <li><strong>Measurement without cookies</strong> (Google Analytics and Clarity after "Decline", or before your choice inside the EU, EEA, UK and Switzerland): our legitimate interest in running and improving the service (GDPR art. 6(1)(f); LGPD art. 7, IX, and art. 10). You can object by writing to the address below.</li>
              <li><strong>Analytics cookies and advertising pixels inside the EU, EEA, UK and Switzerland</strong>: your consent (GDPR art. 6(1)(a); ePrivacy Directive art. 5(3); UK PECR reg. 6), which you can withdraw at any time with "Decline cookies".</li>
              <li><strong>Analytics cookies and advertising pixels elsewhere</strong>: our legitimate interest in measuring the site and our campaigns (LGPD art. 7, IX, and art. 10), with your right to object at any time through "Decline" (LGPD art. 18, § 2).</li>
              <li><strong>International transfers</strong>: these providers process data outside your country, mainly in the United States (and Singapore for TikTok). They rely on the EU-US Data Privacy Framework where they are certified, or on Standard Contractual Clauses (GDPR art. 46; LGPD art. 33).</li>
            </ul>

            <h2 className="text-2xl font-semibold mt-8 mb-4">6. Your Rights</h2>
            <p className="mb-4">You may:</p>
            <ul className="list-disc pl-6 mb-4 space-y-1">
              <li>Request access to or deletion of your account data</li>
              <li>Unsubscribe from email communications</li>
              <li>Cancel your subscription at any time via your dashboard</li>
            </ul>
            <p className="mb-6">
              To request changes, contact: <a href="mailto:team@tokenhealthscan.com" className="text-primary hover:underline">team@tokenhealthscan.com</a>
            </p>

            <h2 className="text-2xl font-semibold mt-8 mb-4">7. Data Retention</h2>
            <p className="mb-6">
              We retain user data as long as your account is active. Scan logs and metadata may be kept for analytics unless deletion is requested.
            </p>

            <h2 className="text-2xl font-semibold mt-8 mb-4">8. Children's Privacy</h2>
            <p className="mb-6">
              Token Health Scan is not intended for children under 13. We do not knowingly collect personal data from minors.
            </p>

            <h2 className="text-2xl font-semibold mt-8 mb-4">9. Changes to This Policy</h2>
            <p className="mb-6">
              We may update this Privacy Policy from time to time. Changes will be posted on this page with an updated date. Continued use of the Service indicates acceptance of the changes.
            </p>

            <h2 className="text-2xl font-semibold mt-8 mb-4">10. Contact Us</h2>
            <p className="mb-6">
              For privacy-related inquiries, contact us at: <a href="mailto:team@tokenhealthscan.com" className="text-primary hover:underline">team@tokenhealthscan.com</a>
            </p>
          </div>
        </div>
      </main>
      
      <Footer />
    </div>
  );
}
