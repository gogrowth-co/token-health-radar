
import { Helmet } from "react-helmet-async";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

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
            </ul>
            <p className="mb-6">
              These services may collect data in accordance with their own privacy policies.
            </p>

            <h2 id="cookies" className="text-2xl font-semibold mt-8 mb-4">5. Cookies and Tracking</h2>
            <p className="mb-4">
              We measure how the site is used so we can improve it, and we use advertising pixels to measure our campaigns. These tools load for every
              visitor once the page has finished loading. Outside the EU, EEA, UK and Switzerland they set cookies from the first visit until you
              choose "Refuse" in the cookie bar. Inside those regions they set no cookies unless you choose "Accept". If you refuse, Google Analytics
              and Microsoft Clarity keep measuring without cookies, the advertising pixels stop, and we remember your choice for 6 months
              (cookie <code>ths_consent</code>). To change it, delete that cookie and choose again in the bar.
            </p>
            <ul className="list-disc pl-6 mb-4 space-y-2">
              <li><strong>Google Analytics 4</strong> (Google LLC, USA): pages viewed, scans started and completed (chain and score range only), sign-ups and checkouts. Cookies <code>_ga</code>, <code>_ga_*</code>, up to 2 years.</li>
              <li><strong>Microsoft Clarity</strong> (Microsoft Corporation, USA): clicks, scrolls and anonymised session replays. Cookies <code>_clck</code> (1 year) and <code>_clsk</code> (1 day).</li>
              <li><strong>TikTok pixel</strong> (TikTok Pte. Ltd.), <strong>Reddit pixel</strong> (Reddit, Inc., USA) and <strong>X (Twitter) pixel</strong> (X Corp., USA): page visits and site events, to measure ads. Cookies such as <code>_ttp</code>, <code>_rdt_uuid</code>, <code>_twclid</code> and <code>muc_ads</code>, up to 13 months. They only run with cookie consent.</li>
              <li><strong>Session and preferences</strong>: our own local storage for sign-in and settings, kept until you sign out or clear it.</li>
            </ul>
            <p className="mb-6">
              These providers process data outside your country, including in the United States. Measurement without cookies is based on our
              legitimate interest in running and improving the service (LGPD art. 7, IX; GDPR art. 6(1)(f)); cookies and pixels are based on your
              consent where the law requires it (LGPD art. 7, I; GDPR art. 6(1)(a)), and you can object at any time with "Refuse".
            </p>

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
