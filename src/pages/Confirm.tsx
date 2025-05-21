
import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import TokenCard from "@/components/TokenCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, ArrowLeft } from "lucide-react";
import { searchResults } from "@/lib/mock-data";

export default function Confirm() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState(searchParams.get("token") || "");
  const [results, setResults] = useState(searchResults);

  useEffect(() => {
    if (!searchTerm) {
      navigate("/");
    }
    
    // Filter results based on search term (mock implementation)
    const filteredResults = searchResults.filter(
      result => result.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setResults(filteredResults);
  }, [searchTerm, navigate]);

  const handleSelectToken = (symbol: string) => {
    // In a real app, this would store the selected token ID
    // For now, just navigate to the scan loading page
    navigate(`/scan-loading?token=${symbol.toLowerCase()}`);
  };

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      
      <main className="flex-1 container px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="mb-8">
            <Button 
              variant="ghost" 
              size="sm" 
              className="flex items-center gap-1.5 mb-4" 
              onClick={() => navigate("/")}
            >
              <ArrowLeft className="h-4 w-4" /> Back to search
            </Button>
            
            <h1 className="text-3xl font-bold mb-4">Confirm Token Selection</h1>
            <p className="text-muted-foreground">
              Select the correct token from the results below to continue with your scan.
            </p>
          </div>
          
          <div className="mb-8">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search token name"
                className="pl-9"
              />
            </div>
          </div>
          
          <div className="space-y-4">
            {results.length > 0 ? (
              results.map((token, index) => (
                <TokenCard
                  key={index}
                  name={token.name}
                  symbol={token.symbol}
                  logo={token.logo}
                  marketCap={token.marketCap}
                  price={token.price}
                  onClick={() => handleSelectToken(token.symbol)}
                />
              ))
            ) : (
              <div className="text-center py-12">
                <p className="text-muted-foreground">No tokens found matching "{searchTerm}"</p>
                <Button 
                  variant="outline" 
                  className="mt-4"
                  onClick={() => navigate("/")}
                >
                  Try a different search
                </Button>
              </div>
            )}
          </div>
        </div>
      </main>
      
      <Footer />
    </div>
  );
}
