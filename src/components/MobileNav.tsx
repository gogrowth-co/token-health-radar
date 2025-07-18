
import { useState } from "react";
import { Menu, X } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { AuthButton } from "./auth/AuthButton";

export default function MobileNav() {
  const [isOpen, setIsOpen] = useState(false);

  const toggleNav = () => setIsOpen(!isOpen);
  const closeNav = () => setIsOpen(false);

  return (
    <>
      {/* Mobile menu button */}
      <Button
        variant="ghost"
        size="icon"
        className="md:hidden"
        onClick={toggleNav}
        aria-label="Toggle menu"
      >
        {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </Button>

      {/* Mobile menu overlay */}
      {isOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="fixed inset-0 bg-black/20" onClick={closeNav} />
          <div className="fixed top-0 right-0 bottom-0 w-64 bg-background border-l shadow-lg">
            <div className="flex items-center justify-between p-4 border-b min-h-[56px]">
              <span className="font-semibold text-base">Menu</span>
              <Button variant="ghost" size="icon" onClick={closeNav}>
                <X className="h-5 w-5" />
              </Button>
            </div>
            <nav className="flex flex-col p-4 space-y-1">
              <Link 
                to="/" 
                className="text-base font-medium py-3 px-3 rounded hover:bg-accent min-h-[44px] flex items-center"
                onClick={closeNav}
              >
                Home
              </Link>
              <Link 
                to="/token" 
                className="text-base font-medium py-3 px-3 rounded hover:bg-accent min-h-[44px] flex items-center"
                onClick={closeNav}
              >
                Token Reports
              </Link>
              <Link 
                to="/pricing" 
                className="text-base font-medium py-3 px-3 rounded hover:bg-accent min-h-[44px] flex items-center"
                onClick={closeNav}
              >
                Pricing
              </Link>
              <div className="pt-4 border-t">
                <AuthButton />
              </div>
            </nav>
          </div>
        </div>
      )}
    </>
  );
}
