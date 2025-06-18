
// CoinMarketCap API rate limits: 10,000 calls/month (Basic plan)
let lastCMCApiCallTime = 0;
export const MIN_CMC_API_CALL_INTERVAL = 1000; // 1 second between calls for safety

// CMC API base URL
const CMC_API_BASE = "https://pro-api.coinmarketcap.com/v1";

// Enhanced API call function with proper rate limiting and authentication
export const callCoinMarketCapAPI = async (endpoint: string, params: Record<string, any> = {}, retryCount = 0) => {
  const now = Date.now();
  
  // Wait for the minimum interval if needed
  if (now - lastCMCApiCallTime < MIN_CMC_API_CALL_INTERVAL) {
    const waitTime = MIN_CMC_API_CALL_INTERVAL - (now - lastCMCApiCallTime);
    console.log(`[CMC-API] Waiting ${waitTime}ms for rate limiting...`);
    await new Promise(resolve => setTimeout(resolve, waitTime));
  }
  
  lastCMCApiCallTime = Date.now();

  // Build URL with query parameters
  const url = new URL(`${CMC_API_BASE}${endpoint}`);
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      url.searchParams.append(key, value.toString());
    }
  });

  const headers: Record<string, string> = {
    'Accept': 'application/json',
    'Content-Type': 'application/json',
  };

  // Add API key from Supabase secrets
  if (
    typeof window !== "undefined" &&
    "SUPABASE_CMC_API_KEY" in window &&
    (window as any).SUPABASE_CMC_API_KEY
  ) {
    const apiKey = (window as any).SUPABASE_CMC_API_KEY;
    headers['X-CMC_PRO_API_KEY'] = apiKey;
    console.log(`[CMC-API] Using CoinMarketCap API authentication`);
  } else {
    console.error(`[CMC-API] No CoinMarketCap API key found`);
    throw new Error("CoinMarketCap API key not configured");
  }

  try {
    console.log(`[CMC-API] Making request to: ${endpoint}`);
    const response = await fetch(url.toString(), { headers });

    if (response.status === 429) {
      const retryAfter = response.headers.get('retry-after');
      const waitTime = retryAfter ? parseInt(retryAfter) * 1000 : 5000;
      
      console.warn(`[CMC-API] Rate limit hit, waiting ${waitTime}ms before retry (attempt ${retryCount + 1})`);
      
      if (retryCount < 2) {
        await new Promise(resolve => setTimeout(resolve, waitTime));
        return callCoinMarketCapAPI(endpoint, params, retryCount + 1);
      } else {
        throw new Error("CoinMarketCap API rate limit reached. Please try again later.");
      }
    }
    
    if (!response.ok) {
      console.error(`[CMC-API] Error: ${response.status} ${response.statusText}`);
      throw new Error(`CoinMarketCap API Error: ${response.status}`);
    }

    const data = await response.json();
    
    if (data.status?.error_code !== 0) {
      console.error(`[CMC-API] API Error:`, data.status);
      throw new Error(`CoinMarketCap API Error: ${data.status?.error_message || 'Unknown error'}`);
    }

    console.log(`[CMC-API] Response received successfully`);
    return data;
  } catch (error) {
    console.error(`[CMC-API] Request failed:`, error);
    throw error;
  }
};

// Search tokens using CMC's /cryptocurrency/map endpoint
export const searchTokensByCMC = async (searchTerm: string) => {
  try {
    console.log(`[CMC-API] Searching for tokens: ${searchTerm}`);
    
    // Try searching by symbol first
    const data = await callCoinMarketCapAPI('/cryptocurrency/map', {
      symbol: searchTerm.toUpperCase(),
      limit: 10
    });
    
    if (data.data && data.data.length > 0) {
      return data.data;
    }
    
    // If no results by symbol, try by slug/name (requires different endpoint)
    const searchData = await callCoinMarketCapAPI('/cryptocurrency/map', {
      listing_status: 'active',
      limit: 100 // Get more results for name matching
    });
    
    // Filter results that match the search term in name or slug
    const filtered = searchData.data?.filter((token: any) => 
      token.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      token.slug?.toLowerCase().includes(searchTerm.toLowerCase())
    ).slice(0, 10);
    
    return filtered || [];
  } catch (error) {
    console.error(`[CMC-API] Search failed:`, error);
    throw error;
  }
};

// Get detailed token information using CMC's /cryptocurrency/info endpoint
export const getTokenDetails = async (cmcIds: number[]) => {
  try {
    console.log(`[CMC-API] Fetching token details for IDs: ${cmcIds.join(',')}`);
    
    const data = await callCoinMarketCapAPI('/cryptocurrency/info', {
      id: cmcIds.join(',')
    });
    
    return data.data || {};
  } catch (error) {
    console.error(`[CMC-API] Token details fetch failed:`, error);
    throw error;
  }
};

// Get token quotes using CMC's /cryptocurrency/quotes/latest endpoint
export const getTokenQuotes = async (cmcIds: number[], convert = 'USD') => {
  try {
    console.log(`[CMC-API] Fetching token quotes for IDs: ${cmcIds.join(',')}`);
    
    const data = await callCoinMarketCapAPI('/cryptocurrency/quotes/latest', {
      id: cmcIds.join(','),
      convert
    });
    
    return data.data || {};
  } catch (error) {
    console.error(`[CMC-API] Token quotes fetch failed:`, error);
    throw error;
  }
};
