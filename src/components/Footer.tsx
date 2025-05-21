
import { Link } from "react-router-dom";

export default function Footer() {
  return (
    <footer className="border-t">
      <div className="container flex flex-col md:flex-row items-center justify-between py-10 md:h-24">
        <p className="text-center text-sm text-muted-foreground md:text-left">
          &copy; {new Date().getFullYear()} TokenHealthScan. All rights reserved.
        </p>
        <nav className="flex flex-col md:flex-row gap-4 md:gap-6 mt-4 md:mt-0 text-center md:text-left">
          <Link to="/pricing" className="text-sm text-muted-foreground hover:underline underline-offset-4">
            Pricing
          </Link>
          <Link to="/" className="text-sm text-muted-foreground hover:underline underline-offset-4">
            Privacy
          </Link>
          <Link to="/" className="text-sm text-muted-foreground hover:underline underline-offset-4">
            Terms
          </Link>
        </nav>
      </div>
    </footer>
  );
}
