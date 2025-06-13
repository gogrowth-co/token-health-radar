
import { useState, useEffect } from "react";
import { TokenResult } from "@/components/token/types";
import { searchTokens } from "@/utils/tokenSearch";

export default function useTokenSearch(searchTerm: string, enabled: boolean = true) {
  const [results, setResults] = useState<TokenResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!searchTerm.trim() || !enabled) {
      setResults([]);
      setError(null);
      return;
    }

    const search = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        console.log("Searching for tokens:", searchTerm);
        const searchResults = await searchTokens(searchTerm);
        setResults(searchResults);
      } catch (err) {
        console.error("Token search error:", err);
        setError(err instanceof Error ? err.message : "Search failed");
        setResults([]);
      } finally {
        setIsLoading(false);
      }
    };

    // Debounce search
    const timeoutId = setTimeout(search, 300);
    return () => clearTimeout(timeoutId);
  }, [searchTerm, enabled]);

  return { results, isLoading, error };
}
