
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

export default function Terms() {
  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      
      <main className="flex-1">
        <div className="container mx-auto px-4 md:px-6 py-16 max-w-4xl">
          <div className="prose prose-gray max-w-none">
            <h1 className="text-4xl font-bold mb-8">Terms and Conditions</h1>
            <p className="text-muted-foreground mb-8">Last updated: May 27th, 2025</p>
            
            <p className="mb-6">
              Welcome to Token Health Scan. These Terms and Conditions ("Terms") govern your access to and use of the Token Health Scan platform ("Service", "we", "our", "us") operated by [Your Legal Entity Name].
            </p>
            
            <p className="mb-8">
              By accessing or using our Service, you agree to be bound by these Terms. If you do not agree with any part, please do not use the Service.
            </p>

            <h2 className="text-2xl font-semibold mt-8 mb-4">1. Service Description</h2>
            <p className="mb-6">
              Token Health Scan provides token health diagnostics using public data from external APIs such as CoinGecko, Etherscan, GitHub, Apify, and others. We offer both free and subscription-based plans with tiered access to data insights across five categories: Security, Liquidity, Tokenomics, Community, and Development.
            </p>

            <h2 className="text-2xl font-semibold mt-8 mb-4">2. User Eligibility</h2>
            <p className="mb-6">
              You must be at least 18 years old or the age of majority in your jurisdiction to use our Service. By using the platform, you confirm that you meet this requirement.
            </p>

            <h2 className="text-2xl font-semibold mt-8 mb-4">3. Subscription Plans</h2>
            <ul className="list-disc pl-6 mb-4 space-y-1">
              <li><strong>Free Plan:</strong> Includes 3 lifetime Pro scans.</li>
              <li><strong>Pro Plan:</strong> Subscription-based access with 10 scans/month.</li>
            </ul>
            <p className="mb-6">
              All payments are securely handled by Stripe. You agree to Stripe's Terms of Service and our Subscription Policy when purchasing.
            </p>

            <h2 className="text-2xl font-semibold mt-8 mb-4">4. Data and API Usage</h2>
            <p className="mb-6">
              Token Health Scan aggregates and presents data from third-party APIs. While we strive for accuracy, we do not guarantee the completeness, reliability, or timeliness of the data. External API outages, rate limits, or inaccuracies are outside our control.
            </p>

            <h2 className="text-2xl font-semibold mt-8 mb-4">5. No Financial Advice</h2>
            <p className="mb-6">
              All content provided by Token Health Scan is for informational purposes only. We do not provide investment, legal, tax, or financial advice. Use of the platform does not constitute an endorsement or recommendation of any token.
            </p>

            <h2 className="text-2xl font-semibold mt-8 mb-4">6. User Conduct</h2>
            <p className="mb-4">You agree not to:</p>
            <ul className="list-disc pl-6 mb-6 space-y-1">
              <li>Scrape or extract data from the Service without permission.</li>
              <li>Use the platform for illegal or malicious purposes.</li>
              <li>Attempt to reverse engineer, damage, or overload our systems.</li>
            </ul>

            <h2 className="text-2xl font-semibold mt-8 mb-4">7. Intellectual Property</h2>
            <p className="mb-6">
              All platform code, UI design, and branded assets are property of Token Health Scan. You may not reuse or distribute any part of the platform without written permission.
            </p>

            <h2 className="text-2xl font-semibold mt-8 mb-4">8. Limitation of Liability</h2>
            <p className="mb-6">
              To the fullest extent permitted by law, Token Health Scan and its operators shall not be liable for any direct or indirect loss resulting from your use of the Service.
            </p>

            <h2 className="text-2xl font-semibold mt-8 mb-4">9. Modifications</h2>
            <p className="mb-6">
              We reserve the right to update these Terms at any time. Changes will be posted on this page with the updated revision date.
            </p>

            <h2 className="text-2xl font-semibold mt-8 mb-4">10. Contact</h2>
            <p className="mb-6">
              For questions or support, please contact: <a href="mailto:team@tokenhealthscan.com" className="text-primary hover:underline">team@tokenhealthscan.com</a>
            </p>
          </div>
        </div>
      </main>
      
      <Footer />
    </div>
  );
}
