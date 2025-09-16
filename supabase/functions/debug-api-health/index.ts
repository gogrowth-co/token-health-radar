import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'
import { 
  fetchGoPlusSecurity,
  fetchWebacySecurity,
  fetchGeckoTerminalData,
  fetchMoralisMetadata,
  fetchGitHubRepoData
} from '../_shared/apiClients.ts'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
)

// Test each API individually with comprehensive diagnostics
async function testApiHealth(testTokenAddress: string = '0x808507121b80c02388fad14726482e061b8da827', testChainId: string = '0x1') {
  console.log(`[API-HEALTH] === COMPREHENSIVE API HEALTH CHECK ===`);
  console.log(`[API-HEALTH] Test Token: ${testTokenAddress}`);
  console.log(`[API-HEALTH] Test Chain: ${testChainId}`);
  console.log(`[API-HEALTH] Timestamp: ${new Date().toISOString()}`);

  const results = {
    timestamp: new Date().toISOString(),
    testToken: testTokenAddress,
    testChain: testChainId,
    apiKeys: {
      webacy: !!Deno.env.get('WEBACY_API_KEY'),
      moralis: !!Deno.env.get('MORALIS_API_KEY'),
      github: !!Deno.env.get('GITHUB_API_KEY')
    },
    tests: {
      webacy: { status: 'pending', data: null, error: null, responseTime: 0 },
      goplus: { status: 'pending', data: null, error: null, responseTime: 0 },
      moralis: { status: 'pending', data: null, error: null, responseTime: 0 },
      gecko: { status: 'pending', data: null, error: null, responseTime: 0 },
      github: { status: 'pending', data: null, error: null, responseTime: 0 }
    }
  };

  // Test Webacy API
  try {
    console.log(`[API-HEALTH] Testing Webacy API...`);
    const startTime = Date.now();
    const webacyData = await fetchWebacySecurity(testTokenAddress, testChainId);
    const responseTime = Date.now() - startTime;
    
    results.tests.webacy = {
      status: webacyData ? 'success' : 'no_data',
      data: webacyData,
      error: null,
      responseTime
    };
    console.log(`[API-HEALTH] Webacy: ${results.tests.webacy.status} (${responseTime}ms)`);
  } catch (error) {
    results.tests.webacy = {
      status: 'error',
      data: null,
      error: error.message,
      responseTime: 0
    };
    console.error(`[API-HEALTH] Webacy failed:`, error);
  }

  // Test GoPlus API
  try {
    console.log(`[API-HEALTH] Testing GoPlus API...`);
    const startTime = Date.now();
    const goplusData = await fetchGoPlusSecurity(testTokenAddress, testChainId);
    const responseTime = Date.now() - startTime;
    
    results.tests.goplus = {
      status: goplusData ? 'success' : 'no_data',
      data: goplusData,
      error: null,
      responseTime
    };
    console.log(`[API-HEALTH] GoPlus: ${results.tests.goplus.status} (${responseTime}ms)`);
  } catch (error) {
    results.tests.goplus = {
      status: 'error',
      data: null,
      error: error.message,
      responseTime: 0
    };
    console.error(`[API-HEALTH] GoPlus failed:`, error);
  }

  // Test Moralis API
  try {
    console.log(`[API-HEALTH] Testing Moralis API...`);
    const startTime = Date.now();
    const moralisData = await fetchMoralisMetadata(testTokenAddress, testChainId);
    const responseTime = Date.now() - startTime;
    
    results.tests.moralis = {
      status: moralisData ? 'success' : 'no_data',
      data: moralisData,
      error: null,
      responseTime
    };
    console.log(`[API-HEALTH] Moralis: ${results.tests.moralis.status} (${responseTime}ms)`);
  } catch (error) {
    results.tests.moralis = {
      status: 'error',
      data: null,
      error: error.message,
      responseTime: 0
    };
    console.error(`[API-HEALTH] Moralis failed:`, error);
  }

  // Test GeckoTerminal API
  try {
    console.log(`[API-HEALTH] Testing GeckoTerminal API...`);
    const startTime = Date.now();
    const geckoData = await fetchGeckoTerminalData(testTokenAddress, testChainId);
    const responseTime = Date.now() - startTime;
    
    results.tests.gecko = {
      status: geckoData ? 'success' : 'no_data',
      data: geckoData,
      error: null,
      responseTime
    };
    console.log(`[API-HEALTH] GeckoTerminal: ${results.tests.gecko.status} (${responseTime}ms)`);
  } catch (error) {
    results.tests.gecko = {
      status: 'error',
      data: null,
      error: error.message,
      responseTime: 0
    };
    console.error(`[API-HEALTH] GeckoTerminal failed:`, error);
  }

  // Test GitHub API (if we have a GitHub URL)
  try {
    console.log(`[API-HEALTH] Testing GitHub API...`);
    const startTime = Date.now();
    const githubData = await fetchGitHubRepoData('https://github.com/pendle-finance/pendle-core');
    const responseTime = Date.now() - startTime;
    
    results.tests.github = {
      status: githubData ? 'success' : 'no_data',
      data: githubData,
      error: null,
      responseTime
    };
    console.log(`[API-HEALTH] GitHub: ${results.tests.github.status} (${responseTime}ms)`);
  } catch (error) {
    results.tests.github = {
      status: 'error',
      data: null,
      error: error.message,
      responseTime: 0
    };
    console.error(`[API-HEALTH] GitHub failed:`, error);
  }

  // Generate summary
  const summary = {
    totalTests: Object.keys(results.tests).length,
    successful: Object.values(results.tests).filter(t => t.status === 'success').length,
    noData: Object.values(results.tests).filter(t => t.status === 'no_data').length,
    errors: Object.values(results.tests).filter(t => t.status === 'error').length,
    avgResponseTime: Object.values(results.tests).reduce((acc, t) => acc + t.responseTime, 0) / Object.keys(results.tests).length
  };

  console.log(`[API-HEALTH] === HEALTH CHECK COMPLETE ===`);
  console.log(`[API-HEALTH] Summary:`, summary);

  return { ...results, summary };
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const { testToken, testChain, testTokenAddress, testChainId } = body;
    
    // Support both naming conventions - prefer the newer naming if provided
    const tokenAddress = testTokenAddress || testToken || '0x808507121b80c02388fad14726482e061b8da827';
    const chainId = testChainId || testChain || '0x1';
    
    console.log(`[API-HEALTH] Starting comprehensive API health check...`);
    console.log(`[API-HEALTH] Parsed parameters - Token: ${tokenAddress}, Chain: ${chainId}`);
    
    const healthResults = await testApiHealth(tokenAddress, chainId);
    
    return new Response(
      JSON.stringify(healthResults, null, 2),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('[API-HEALTH] Error during health check:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});