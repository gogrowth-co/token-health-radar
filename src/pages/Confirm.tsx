
import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import TokenSearchForm from "@/components/token/TokenSearchForm";
import TokenSearchResults from "@/components/token/TokenSearchResults";
import useTokenSelection from "@/components/token/useTokenSelection";
import ScanLimitDialog from "@/components/token/ScanLimitDialog";
import useTokenSearch from "@/hooks/useTokenSearch";

export default function Confirm() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchTerm, setSearchTerm] = useState(searchParams.get("token") || "");
  const navigate = useNavigate();
  
  const { 
    handleSelectToken, 
    handleUpgrade, 
    showUpgradeDialog, 
    setShowUpgradeDialog,
    scanAccessData 
  } = useTokenSelection();

  // Always allow token searching, regardless of authentication status
  const { results, isLoading, error } = useTokenSearch(searchTerm, true);

  const handleSearch = (newSearchTerm: string) => {
    if (!newSearchTerm.trim()) {
      return;
    }
    
    // Update URL with new search term
    setSearchParams({ token: newSearchTerm });
    setSearchTerm(newSearchTerm);
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
            <TokenSearchForm 
              initialSearchTerm={searchTerm}
              onSearch={handleSearch}
            />
          </div>
          
          <TokenSearchResults
            isLoading={isLoading}
            error={error}
            results={results}
            searchTerm={searchTerm}
            onSelectToken={handleSelectToken}
          />
        </div>
      </main>
      
      {scanAccessData && (
        <ScanLimitDialog
          open={showUpgradeDialog}
          onOpenChange={setShowUpgradeDialog}
          onUpgrade={handleUpgrade}
          plan={scanAccessData.plan}
          scansUsed={scanAccessData.scansUsed}
          scanLimit={scanAccessData.scanLimit}
        />
      )}
      
      <Footer />
    </div>
  );
}
