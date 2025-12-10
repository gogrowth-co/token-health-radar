// CoinMarketCap fallback APIs - extracted to reduce main function size

export async function fetchCoinMarketCapGithubUrl(tokenAddress: string, chainId?: string): Promise<string> {
  try {
    const cmcApiKey = Deno.env.get('COINMARKETCAP_API_KEY');
    if (!cmcApiKey) return '';

    const platformParam = chainId === '0x2105' ? '&platform=base' : '';
    
    const response = await fetch(
      `https://pro-api.coinmarketcap.com/v2/cryptocurrency/info?address=${tokenAddress}${platformParam}&aux=urls`,
      {
        headers: {
          'X-CMC_PRO_API_KEY': cmcApiKey,
          'Accept': 'application/json'
        }
      }
    );

    if (!response.ok) return '';

    const data = await response.json();
    if (data.status?.error_code !== 0) return '';

    const tokenData = Object.values(data.data || {})[0] as any;
    if (!tokenData) return '';

    const sourceCodeUrls = tokenData.urls?.source_code || [];
    const githubUrl = sourceCodeUrls.find((url: string) => url?.includes('github.com'));
    
    return githubUrl || '';
  } catch {
    return '';
  }
}

export async function fetchCoinMarketCapLogoUrl(tokenAddress: string): Promise<string> {
  try {
    const cmcApiKey = Deno.env.get('COINMARKETCAP_API_KEY');
    if (!cmcApiKey) return '';
    
    const response = await fetch(
      `https://pro-api.coinmarketcap.com/v2/cryptocurrency/info?address=${tokenAddress}&aux=logo`,
      {
        headers: {
          'X-CMC_PRO_API_KEY': cmcApiKey,
          'Accept': 'application/json'
        }
      }
    );

    if (!response.ok) return '';

    const data = await response.json();
    if (data.status?.error_code !== 0) return '';

    const tokenData = Object.values(data.data || {})[0] as any;
    return tokenData?.logo?.trim() || '';
  } catch {
    return '';
  }
}
