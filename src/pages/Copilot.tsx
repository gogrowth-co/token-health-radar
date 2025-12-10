import { useState } from "react";
import { Helmet } from "react-helmet-async";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MessageSquare, Sparkles } from "lucide-react";
import TokenSearchAutocomplete from "@/components/token/TokenSearchAutocomplete";
import CopilotPanel from "@/components/copilot/CopilotPanel";

interface SelectedToken {
  chain: string;
  address: string;
  coingeckoId?: string;
  symbol: string;
  name: string;
  logo?: string;
}

export default function Copilot() {
  const [selectedToken, setSelectedToken] = useState<SelectedToken | null>(null);

  const handleTokenSelect = (token: any) => {
    console.log('[COPILOT-PAGE] Token selected:', token);
    // Use the actual coingeckoId from the search result (the CoinGecko slug like "uniswap")
    setSelectedToken({
      chain: token.chain,
      address: token.address,
      coingeckoId: token.coingeckoId || token.symbol.toLowerCase(), // Prefer actual coingeckoId
      symbol: token.symbol,
      name: token.name,
      logo: token.logo
    });
  };

  const handleClearToken = () => {
    setSelectedToken(null);
  };

  return (
    <>
      <Helmet>
        <title>Token Copilot | TokenHealthScan</title>
        <meta name="description" content="Chat with AI about any cryptocurrency token. Get real-time price data, trends, and liquidity insights powered by CoinGecko." />
      </Helmet>

      <div className="min-h-screen flex flex-col bg-background">
        <Navbar />

        <main className="flex-1 container py-8 px-4">
          <div className="max-w-4xl mx-auto space-y-6">
            {/* Hero Section */}
            <div className="text-center space-y-4 mb-8">
              <div className="flex items-center justify-center gap-2">
                <div className="p-3 rounded-full bg-gradient-to-tr from-blue-500 to-purple-500">
                  <MessageSquare className="h-6 w-6 text-white" />
                </div>
              </div>
              <h1 className="text-3xl sm:text-4xl font-bold">
                Token Copilot
              </h1>
              <p className="text-muted-foreground max-w-lg mx-auto">
                Chat with AI to explore any token. Get real-time price, trends, and liquidity data powered by CoinGecko.
              </p>
              <Badge variant="secondary" className="gap-1">
                <Sparkles className="h-3 w-3" />
                Powered by CoinGecko API
              </Badge>
            </div>

            {/* Token Search */}
            {!selectedToken ? (
              <Card className="border-2 border-dashed">
                <CardHeader className="text-center pb-2">
                  <CardTitle className="text-lg">Select a Token</CardTitle>
                </CardHeader>
                <CardContent className="pb-8">
                  <div className="flex justify-center">
                    <TokenSearchAutocomplete
                      placeholder="Search by name, symbol, or address..."
                      onSelect={handleTokenSelect}
                      className="max-w-md"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground text-center mt-4">
                    Try: Ethereum, Uniswap, PEPE, or paste a contract address
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {/* Selected Token Header */}
                <Card className="bg-muted/30">
                  <CardContent className="py-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {selectedToken.logo && (
                          <img 
                            src={selectedToken.logo} 
                            alt={selectedToken.symbol}
                            className="w-10 h-10 rounded-full"
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display = 'none';
                            }}
                          />
                        )}
                        <div>
                          <h2 className="font-bold text-lg">{selectedToken.symbol}</h2>
                          <p className="text-sm text-muted-foreground">{selectedToken.name}</p>
                        </div>
                        <Badge variant="outline" className="ml-2">
                          {selectedToken.chain.toUpperCase()}
                        </Badge>
                      </div>
                      <button
                        onClick={handleClearToken}
                        className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                      >
                        Change token
                      </button>
                    </div>
                  </CardContent>
                </Card>

                {/* Copilot Chat Panel */}
                <CopilotPanel 
                  token={{
                    chain: selectedToken.chain,
                    address: selectedToken.address,
                    coingeckoId: selectedToken.coingeckoId,
                    symbol: selectedToken.symbol
                  }}
                  standalone={true}
                />
              </div>
            )}

            {/* Quick Tips */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-8">
              <div className="p-4 rounded-lg bg-muted/30 text-center">
                <p className="font-medium text-sm">💰 Price Data</p>
                <p className="text-xs text-muted-foreground mt-1">Ask "What's the price?"</p>
              </div>
              <div className="p-4 rounded-lg bg-muted/30 text-center">
                <p className="font-medium text-sm">📈 Trends</p>
                <p className="text-xs text-muted-foreground mt-1">Ask "Show me the 30d trend"</p>
              </div>
              <div className="p-4 rounded-lg bg-muted/30 text-center">
                <p className="font-medium text-sm">💧 Liquidity</p>
                <p className="text-xs text-muted-foreground mt-1">Ask "Top pools?"</p>
              </div>
            </div>
          </div>
        </main>

        <Footer />
      </div>
    </>
  );
}
