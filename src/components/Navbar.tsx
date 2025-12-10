
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import ThemeToggle from "./ThemeToggle";
import { Search } from "lucide-react";
import { AuthButton } from "./auth/AuthButton";
import MobileNav from "./MobileNav";

export default function Navbar() {
  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur">
      <div className="container flex h-14 sm:h-16 items-center justify-between px-3 sm:px-4 md:px-6">
        <div className="flex items-center gap-4 sm:gap-6">
          <Link to="/" className="flex items-center space-x-2">
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-gradient-to-tr from-blue-500 to-purple-500 flex items-center justify-center">
              <Search className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
            </div>
            <span className="font-bold text-base sm:text-lg md:text-xl">
              <span className="hidden sm:inline">TokenHealthScan</span>
              <span className="sm:hidden">THS</span>
            </span>
          </Link>
          
          {/* Desktop navigation */}
          <nav className="hidden md:flex gap-6">
            <Link to="/" className="text-sm font-medium transition-colors hover:text-primary">
              Home
            </Link>
            <Link to="/copilot" className="text-sm font-medium transition-colors hover:text-primary">
              Copilot
            </Link>
            <Link to="/token" className="text-sm font-medium transition-colors hover:text-primary">
              Token Reports
            </Link>
            <Link to="/pricing" className="text-sm font-medium transition-colors hover:text-primary">
              Pricing
            </Link>
          </nav>
        </div>
        
        <div className="flex items-center gap-1 sm:gap-2">
          <ThemeToggle />
          {/* Desktop auth button */}
          <div className="hidden md:block">
            <AuthButton />
          </div>
          {/* Mobile navigation */}
          <MobileNav />
        </div>
      </div>
    </header>
  );
}
