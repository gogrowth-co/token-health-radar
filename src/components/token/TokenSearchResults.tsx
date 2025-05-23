
import { TokenResult } from "./types";
import SearchLoadingState from "./SearchLoadingState";
import SearchErrorState from "./SearchErrorState";
import TokenResultsList from "./TokenResultsList";

// Known ERC-20 tokens that might not be correctly identified by platform data
const KNOWN_ERC20_TOKENS = [
  'ethereum', 'uniswap', 'dai', 'chainlink', 'aave', 'compound', 
  'maker', 'wrapped-bitcoin', 'tether', 'usd-coin'
];

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
