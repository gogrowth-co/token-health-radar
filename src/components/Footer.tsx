
import { Link } from "react-router-dom";

export default function Footer() {
  return (
    <footer className="border-t">
      <div className="container flex flex-col items-center py-10 space-y-6">
        {/* Footer Content */}
        <div className="flex flex-col md:flex-row items-center justify-between w-full">
          <p className="text-center text-sm text-muted-foreground md:text-left">
            &copy; {new Date().getFullYear()} TokenHealthScan. All rights reserved.
          </p>
          <nav className="flex flex-col md:flex-row gap-4 md:gap-6 mt-4 md:mt-0 text-center md:text-left">
            <Link to="/token-scan-guide" className="text-sm text-muted-foreground hover:underline underline-offset-4">
              Token Scan Guide
            </Link>
            <Link to="/pricing" className="text-sm text-muted-foreground hover:underline underline-offset-4">
              Pricing
            </Link>
            <Link to="/privacy" className="text-sm text-muted-foreground hover:underline underline-offset-4">
              Privacy
            </Link>
            <Link to="/terms" className="text-sm text-muted-foreground hover:underline underline-offset-4">
              Terms
            </Link>
          </nav>
        </div>
        
        {/* Disclaimer */}
        <div className="max-w-4xl text-center">
          <p className="text-xs text-muted-foreground leading-relaxed">
            Token Health Scan provides automated token assessments using public data from third-party sources. This information is for informational purposes only and does not constitute financial, legal, or investment advice. Cryptoassets carry significant risk, including loss of capital. Always do your own research.
          </p>
        </div>
      </div>
    </footer>
  );
}
