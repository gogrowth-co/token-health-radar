/**
 * Utility functions for working with blockchain addresses
 */

/**
 * Well-known contract addresses for popular tokens
 * Maps CoinGecko token ID to their primary Ethereum contract address
 */
const WELL_KNOWN_ADDRESSES: Record<string, string> = {
  // Major DeFi tokens
  'aave': '0x7Fc66500c84A76Ad7e9c93437bFc5Ac33E2DDaE9',
  'uniswap': '0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984',
  'chainlink': '0x514910771AF9Ca656af840dff83E8264EcF986CA',
  'maker': '0x9f8F72aA9304c8B593d555F12eF6589cC3A579A2',
  'compound-governance-token': '0xc00e94Cb662C3520282E6f5717214004A7f26888',
  'yearn-finance': '0x0bc529c00C6401aEF6D220BE8C6Ea1667F6Ad93e',
  'synthetix-network-token': '0xC011a73ee8576Fb46F5E1c5751cA3B9Fe0af2a6F',
  'the-graph': '0xc944E90C64B2c07662A292be6244BDf05Cda44a7',
  'balancer': '0xba100000625a3754423978a60c9317c58a424e3D',
  'bancor': '0x1F573D6Fb3F13d689FF844B4cE37794d79a7FF1C',
  
  // Stablecoins
  'dai': '0x6B175474E89094C44Da98b954EedeAC495271d0F',
  'tether': '0xdAC17F958D2ee523a2206206994597C13D831ec7',
  'usd-coin': '0xA0b86a33E6441dA85Ff29CB3F09B4d2FE9eAb8b',
  'frax': '0x853d955aCEf822Db058eb8505911ED77F175b99e',
  'true-usd': '0x0000000000085d4780B73119b644AE5ecd22b376',
  
  // Other popular tokens
  'wrapped-bitcoin': '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599',
  'shiba-inu': '0x95aD61b0a150d79219dCF64E1E6Cc01f0B64C4cE',
  'basic-attention-token': '0x0D8775F648430679A709E98d2b0Cb6250d2887EF',
  'enjincoin': '0xF629cBd94d3791C9250152BD8dfBDF380E2a3B9c',
  'decentraland': '0x0F5D2fB29fb7d3CFeE444a200298f468908cC942',
  'the-sandbox': '0x3845badAde8e6dFF049820680d1F14bD3903a5d0',
  'immutable-x': '0xF57e7e7C23978C3cAEC3C3548E3D615c346e79fF',
  'gala': '0x15D4c048F83bd7e37d49eA4C83a07267Ec4203dA',
  
  // Native tokens (use zero address or specific contract)
  'ethereum': '0x0000000000000000000000000000000000000000',
  'binancecoin': '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c',
  'matic-network': '0x0000000000000000000000000000000000001010',
  'avalanche-2': '0x0000000000000000000000000000000000000000',
};

/**
 * Get a well-known contract address for a token by its CoinGecko ID
 */
export const getWellKnownAddress = (tokenId: string): string | null => {
  const address = WELL_KNOWN_ADDRESSES[tokenId];
  if (address) {
    console.log(`[ADDRESS-UTILS] Found well-known address for ${tokenId}: ${address}`);
    return address;
  }
  return null;
};

/**
 * Extracts the first valid EVM address from token platforms with enhanced detection
 * @param platforms - Object containing blockchain platforms and their addresses
 * @returns First valid EVM address or empty string
 */
export const getFirstValidEvmAddress = (platforms: Record<string, string> | undefined): string => {
  if (!platforms) {
    console.log("[ADDRESS-UTILS] No platforms data provided");
    return "";
  }
  
  console.log("[ADDRESS-UTILS] Checking platforms for EVM addresses:", platforms);
  
  // Enhanced EVM address pattern - more flexible
  const evmAddressPattern = /^0x[a-fA-F0-9]{40}$/;
  
  // Prioritize main EVM networks with various naming conventions
  const priorityNetworks = [
    'ethereum', 'eth', 'erc20',
    'polygon-pos', 'polygon', 'matic',
    'binance-smart-chain', 'bsc', 'bnb',
    'arbitrum-one', 'arbitrum',
    'avalanche', 'avax',
    'optimistic-ethereum', 'optimism',
    'base'
  ];
  
  // First check priority networks
  for (const network of priorityNetworks) {
    if (platforms[network]) {
      const address = platforms[network];
      console.log(`[ADDRESS-UTILS] Checking priority network ${network}: ${address}`);
      
      if (typeof address === 'string') {
        // Clean the address
        const cleanAddress = address.trim();
        
        // Handle different address formats
        if (evmAddressPattern.test(cleanAddress)) {
          console.log(`[ADDRESS-UTILS] Found valid EVM address on ${network}: ${cleanAddress}`);
          return cleanAddress;
        }
        
        // Handle addresses without 0x prefix
        if (/^[a-fA-F0-9]{40}$/.test(cleanAddress)) {
          const prefixedAddress = `0x${cleanAddress}`;
          console.log(`[ADDRESS-UTILS] Found valid EVM address (added 0x prefix) on ${network}: ${prefixedAddress}`);
          return prefixedAddress;
        }
      }
    }
  }
  
  // Then check all other platforms
  for (const [network, address] of Object.entries(platforms)) {
    if (!priorityNetworks.includes(network.toLowerCase())) {
      console.log(`[ADDRESS-UTILS] Checking other network ${network}: ${address}`);
      
      if (typeof address === 'string') {
        const cleanAddress = address.trim();
        
        if (evmAddressPattern.test(cleanAddress)) {
          console.log(`[ADDRESS-UTILS] Found valid EVM address on ${network}: ${cleanAddress}`);
          return cleanAddress;
        }
        
        // Handle addresses without 0x prefix
        if (/^[a-fA-F0-9]{40}$/.test(cleanAddress)) {
          const prefixedAddress = `0x${cleanAddress}`;
          console.log(`[ADDRESS-UTILS] Found valid EVM address (added 0x prefix) on ${network}: ${prefixedAddress}`);
          return prefixedAddress;
        }
      }
    }
  }
  
  console.log("[ADDRESS-UTILS] No valid EVM address found in platforms");
  return "";
};

/**
 * Shortens an Ethereum address for display
 * @param address - Full Ethereum address
 * @returns Shortened address (e.g., 0x1234...5678)
 */
export const shortenAddress = (address: string | undefined): string => {
  if (!address) return "";
  
  if (address.length < 10) return address;
  
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
};
