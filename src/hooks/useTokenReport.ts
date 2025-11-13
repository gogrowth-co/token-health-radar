import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { normalizeAddress } from '@/utils/addressUtils';

interface TokenCacheData {
  name?: string;
  symbol?: string;
  logo_url?: string;
  description?: string;
  website_url?: string;
  twitter_handle?: string;
  coingecko_id?: string;
  current_price_usd?: number;
  market_cap_usd?: number;
}

interface AnalysisSection {
  keyPoints?: string[];
  summary?: string;
}

interface HowToBuyStep {
  step: number;
  title: string;
  description: string;
  icon?: string;
}

interface ReportData {
  whatIsToken: string;
  riskOverview: string;
  securityAnalysis: string | AnalysisSection;
  liquidityAnalysis: string | AnalysisSection;
  tokenomicsAnalysis: string | AnalysisSection;
  communityAnalysis: string | AnalysisSection;
  developmentAnalysis: string | AnalysisSection;
  howToBuy: string | HowToBuyStep[];
  faq: Array<{
    question: string;
    answer: string;
  }>;
  metadata: {
    tokenAddress: string;
    chainId: string;
    tokenName: string;
    tokenSymbol: string;
    currentPrice: number;
    marketCap: number;
    overallScore: number;
    scores: {
      security: number;
      tokenomics: number;
      liquidity: number;
      community: number;
      development: number;
    };
    generatedAt: string;
  };
}

export interface TokenReportResponse {
  reportData: ReportData | null;
  tokenCacheData: TokenCacheData | null;
}

async function fetchTokenReport(symbol: string): Promise<TokenReportResponse> {
  if (!symbol) {
    throw new Error('No token symbol provided');
  }

  // Normalize symbol to lowercase for consistent lookups
  const normalizedSymbol = symbol.toLowerCase().trim();

  // Load report data
  const { data: reportResult, error: reportError } = await supabase
    .from('token_reports')
    .select('*')
    .eq('token_symbol', normalizedSymbol) // Use exact match since DB triggers enforce lowercase
    .single();

  if (reportError) {
    console.error('Error loading report:', reportError);
    if (reportError.code === 'PGRST116') {
      throw new Error('not_found');
    }
    throw new Error('Failed to load report');
  }

  let tokenCacheData: TokenCacheData | null = null;

  if (reportResult) {
    // Normalize token address for consistent cache lookup
    const normalizedAddress = normalizeAddress(reportResult.token_address);
    
    // Load additional token cache data for SEO
    const { data: cacheResult } = await supabase
      .from('token_data_cache')
      .select('name, symbol, logo_url, description, website_url, twitter_handle, coingecko_id, current_price_usd, market_cap_usd')
      .eq('token_address', normalizedAddress)
      .eq('chain_id', reportResult.chain_id)
      .maybeSingle();

    if (cacheResult) {
      tokenCacheData = cacheResult;
    }
  }

  return {
    reportData: reportResult ? (reportResult.report_content as unknown as ReportData) : null,
    tokenCacheData,
  };
}

export function useTokenReport(symbol: string | undefined) {
  return useQuery<TokenReportResponse>({
    queryKey: ['token-report', symbol],
    queryFn: () => fetchTokenReport(symbol!),
    enabled: !!symbol,
    staleTime: 60 * 60 * 1000, // 1 hour
    gcTime: 24 * 60 * 60 * 1000, // 24 hours
    retry: (failureCount, error: any) => {
      // Don't retry on not found errors
      if (error?.message === 'not_found') {
        return false;
      }
      // Retry network errors up to 3 times
      return failureCount < 3;
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000), // Exponential backoff
  });
}
