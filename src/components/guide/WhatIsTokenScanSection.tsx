
import { Shield, BarChart3, Users, Lock } from "lucide-react";

export default function WhatIsTokenScanSection() {
  return (
    <section className="mb-12">
      <h2 className="text-3xl font-bold mb-6">What is a Token Scan?</h2>
      <p className="text-lg text-muted-foreground mb-6 leading-relaxed">
        Think of a token scan as your crypto detective toolkit. It's a comprehensive, data-driven analysis that examines a cryptocurrency token from every angle – kind of like getting a full health checkup, but for digital assets instead of your body.
      </p>
      
      <img 
        src="/lovable-uploads/5522e54b-b6ba-49ea-bf0f-a540f1cdce10.png" 
        alt="Photo of a person holding a magnifying glass over a Bitcoin token, with a laptop displaying a token health report in the background, symbolizing token scanning analysis"
        className="w-full max-w-2xl mx-auto mb-8 rounded-lg shadow-lg"
        loading="lazy"
      />

      <p className="text-lg text-muted-foreground mb-4">A proper token scan digs deep into:</p>
      <div className="grid md:grid-cols-2 gap-4 mb-8">
        <div className="flex items-start space-x-3 p-4 bg-card rounded-lg border">
          <Shield className="h-6 w-6 text-red-500 mt-1 flex-shrink-0" />
          <div>
            <h4 className="font-semibold">Security vulnerabilities</h4>
            <p className="text-sm text-muted-foreground">Is this token a honeypot waiting to trap your money?</p>
          </div>
        </div>
        <div className="flex items-start space-x-3 p-4 bg-card rounded-lg border">
          <BarChart3 className="h-6 w-6 text-blue-500 mt-1 flex-shrink-0" />
          <div>
            <h4 className="font-semibold">Liquidity health</h4>
            <p className="text-sm text-muted-foreground">Can you actually sell when you want to?</p>
          </div>
        </div>
        <div className="flex items-start space-x-3 p-4 bg-card rounded-lg border">
          <Lock className="h-6 w-6 text-yellow-500 mt-1 flex-shrink-0" />
          <div>
            <h4 className="font-semibold">Tokenomics structure</h4>
            <p className="text-sm text-muted-foreground">How are the tokens distributed and controlled?</p>
          </div>
        </div>
        <div className="flex items-start space-x-3 p-4 bg-card rounded-lg border">
          <Users className="h-6 w-6 text-green-500 mt-1 flex-shrink-0" />
          <div>
            <h4 className="font-semibold">Community strength</h4>
            <p className="text-sm text-muted-foreground">Is there real buzz or just bot activity?</p>
          </div>
        </div>
      </div>

      <p className="text-lg text-muted-foreground leading-relaxed">
        Instead of relying on gut feelings or random Twitter threads, a token scan gives you hard data to make smarter decisions.
      </p>
    </section>
  );
}
