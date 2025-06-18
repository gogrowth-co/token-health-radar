
import { TokenResult } from "./types";
import SearchLoadingState from "./SearchLoadingState";
import SearchErrorState from "./SearchErrorState";
import TokenResultsList from "./TokenResultsList";

interface TokenSearchResultsProps {
  isLoading: boolean;
  error: string | null;
  results: TokenResult[];
  searchTerm: string;
  onSelectToken: (token: TokenResult) => void;
}

export default function TokenSearchResults({ 
  isLoading, 
  error, 
  results, 
  searchTerm, 
  onSelectToken 
}: TokenSearchResultsProps) {
  // Show loading state
  if (isLoading) {
    return <SearchLoadingState />;
  }

  // Show error state
  if (error) {
    return <SearchErrorState error={error} />;
  }

  // Show results or empty state
  return (
    <TokenResultsList 
      results={results} 
      searchTerm={searchTerm} 
      onSelectToken={onSelectToken} 
    />
  );
}
