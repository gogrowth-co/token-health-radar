
import { supabase } from "@/integrations/supabase/client";

// Rate limiting for edge function calls
let lastEdgeFunctionCallTime = 0;
export const MIN_CMC_API_CALL_INTERVAL = 1000; // 1 second between calls

// Enhanced API call function using Supabase edge function
export const callCoinMarketCapAPI = async (endpoint: string, params: Record<string, any> = {}, retryCount = 0) => {
  const now = Date.now();
  
  // Wait for the minimum interval if needed
  if (now - lastEdgeFunctionCallTime < MIN_CMC_API_CALL_INTERVAL) {
    const waitTime = MIN_CMC_API_CALL_INTERVAL - (now - lastEdgeFunctionCallTime);
    console.log(`[CMC-API] Waiting ${waitTime}ms for rate limiting...`);
    await new Promise(resolve => setTimeout(resolve, waitTime));
  }
  
  lastEdgeFunctionCallTime = Date.now();

  try {
    console.log(`[CMC-API] Making edge function request for: ${endpoint}`, params);
    
    // Determine action based on endpoint
    let action = 'search';
    let requestBody: any = {};
    
    if (endpoint.includes('/cryptocurrency/info')) {
      action = 'details';
      requestBody = {
        action,
        cmcIds: params.id ? params.id.split(',').map(Number) : []
      };
    } else if (endpoint.includes('/cryptocurrency/quotes')) {
      action = 'quotes';
      requestBody = {
        action,
        cmcIds: params.id ? params.id.split(',').map(Number) : [],
        convert: params.convert || 'USD'
      };
    } else {
      // Search action - properly pass the search term
      requestBody = {
        action,
        searchTerm: params.symbol || params.searchTerm || '',
        limit: params.limit || 10
      };
    }

    console.log(`[CMC-API] Request body:`, requestBody);

    const { data, error } = await supabase.functions.invoke('coinmarketcap-search', {
      body: requestBody
    });

    if (error) {
      console.error(`[CMC-API] Edge function error:`, error);
      throw new Error(`CoinMarketCap API Error: ${error.message}`);
    }

    if (data.error) {
      console.error(`[CMC-API] API Error:`, data.error);
      
      // Handle rate limiting with retry
      if (data.error.includes('rate limit') && retryCount < 2) {
        console.warn(`[CMC-API] Rate limit hit, retrying attempt ${retryCount + 1}`);
        await new Promise(resolve => setTimeout(resolve, 2000 * (retryCount + 1)));
        return callCoinMarketCapAPI(endpoint, params, retryCount + 1);
      }
      
      throw new Error(data.error);
    }

    console.log(`[CMC-API] Response received successfully`);
    return data;
  } catch (error: any) {
    console.error(`[CMC-API] Request failed:`, error);
    throw error;
  }
};

// Search tokens using CMC's edge function
export const searchTokensByCMC = async (searchTerm: string) => {
  try {
    console.log(`[CMC-API] Searching for tokens: ${searchTerm}`);
    
    const data = await callCoinMarketCapAPI('/cryptocurrency/map', {
      searchTerm: searchTerm,
      limit: 10
    });
    
    return data.data || [];
  } catch (error) {
    console.error(`[CMC-API] Search failed:`, error);
    throw error;
  }
};

// Get detailed token information using CMC's edge function
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

// Get token quotes using CMC's edge function
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
