
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import ThemeToggle from "./ThemeToggle";
import { Search } from "lucide-react";
import { AuthButton } from "./auth/AuthButton";
import MobileNav from "./MobileNav";

export default function Navbar() {
  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur">
      <div className="container flex h-16 items-center justify-between px-4 md:px-6">
        <div className="flex items-center gap-6">
          <Link to="/" className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-500 to-purple-500 flex items-center justify-center">
              <Search className="h-5 w-5 text-white" />
            </div>
            <span className="font-bold text-lg md:text-xl">TokenHealthScan</span>
          </Link>
          
          {/* Desktop navigation */}
          <nav className="hidden md:flex gap-6">
            <Link to="/" className="text-sm font-medium transition-colors hover:text-primary">
              Home
            </Link>
            <Link to="/pricing" className="text-sm font-medium transition-colors hover:text-primary">
              Pricing
            </Link>
          </nav>
        </div>
        
        <div className="flex items-center gap-2">
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
