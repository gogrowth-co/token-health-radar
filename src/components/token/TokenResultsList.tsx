
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import TokenResult from "./TokenResult";
import { TokenResult as TokenResultType } from "./types";

interface TokenResultsListProps {
  results: TokenResultType[];
  searchTerm: string;
  onSelectToken: (token: TokenResultType) => void;
}

export default function TokenResultsList({ 
  results, 
  searchTerm, 
  onSelectToken 
}: TokenResultsListProps) {
  const navigate = useNavigate();
  
  // No results case
  if (results.length === 0) {
    return (
      <div className="text-center py-12">
        {searchTerm ? (
          <p className="text-muted-foreground">No tokens found matching "{searchTerm}"</p>
        ) : (
          <p className="text-muted-foreground">Enter a token name to search</p>
        )}
        <Button 
          variant="outline" 
          className="mt-4"
          onClick={() => navigate("/")}
        >
          Try a different search
        </Button>
      </div>
    );
  }

  // Show token results
  return (
    <div className="space-y-4">
      {results.map((token) => (
        <TokenResult 
          key={token.id} 
          token={token} 
          onSelectToken={onSelectToken}
        />
      ))}
    </div>
  );
}
