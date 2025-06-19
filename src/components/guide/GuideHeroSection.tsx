
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";

export default function GuideHeroSection() {
  return (
    <header className="text-center mb-12">
      <h1 className="text-4xl md:text-5xl font-bold mb-6 bg-gradient-to-r from-primary via-blue-600 to-purple-600 bg-clip-text text-transparent">
        The Complete Guide to Token Scanning (2025)
      </h1>
      <img 
        src="/lovable-uploads/9823d2dd-2bbb-4762-9882-69c6848988c4.png" 
        alt="Illustration of a token under a magnifying glass with a risk report, padlock, droplet, and warning icon, representing a comprehensive crypto token scan guide"
        className="w-full max-w-2xl mx-auto mb-8 rounded-lg shadow-lg"
        loading="eager"
      />
    </header>
  );
}
