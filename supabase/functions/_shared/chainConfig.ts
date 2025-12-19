
// Unified chain configuration for all API services
export const CHAIN_MAP = {
  ethereum: {
    name: 'Ethereum',
    moralis: '0x1',
    goplus: '1',
    gecko: 'eth',
    etherscan: 'https://api.etherscan.io',
    symbol: 'ETH',
    isEVM: true
  },
  bsc: {
    name: 'BNB Chain',
    moralis: '0x38',
    goplus: '56',
    gecko: 'bsc',
    etherscan: 'https://api.bscscan.com',
    symbol: 'BNB',
    isEVM: true
  },
  arbitrum: {
    name: 'Arbitrum',
    moralis: '0xa4b1',
    goplus: '42161',
    gecko: 'arbitrum',
    etherscan: 'https://api.arbiscan.io',
    symbol: 'ETH',
    isEVM: true
  },
  optimism: {
    name: 'Optimism',
    moralis: '0xa',
    goplus: '10',
    gecko: 'optimism',
    etherscan: 'https://api-optimistic.etherscan.io',
    symbol: 'ETH',
    isEVM: true
  },
  base: {
    name: 'Base',
    moralis: '0x2105',
    goplus: '8453',
    gecko: 'base',
    etherscan: 'https://api.basescan.org',
    symbol: 'ETH',
    isEVM: true
  },
  polygon: {
    name: 'Polygon',
    moralis: '0x89',
    goplus: '137',
    gecko: 'polygon_pos',
    etherscan: 'https://api.polygonscan.com',
    symbol: 'MATIC',
    isEVM: true
  },
  solana: {
    name: 'Solana',
    moralis: null,
    goplus: null,
    gecko: 'solana',
    etherscan: null,
    symbol: 'SOL',
    isEVM: false,
    rpc: 'https://api.mainnet-beta.solana.com'
  }
};

// Check if chain is Solana
export const isSolanaChain = (chainId: string): boolean => {
  return chainId === 'solana' || chainId === 'sol';
};

// Get chain config by moralis chain ID
export const getChainConfigByMoralisId = (chainId: string): any => {
  return Object.values(CHAIN_MAP).find(chain => chain.moralis === chainId);
};

// Get chain config by name
export const getChainConfigByName = (name: string): any => {
  return CHAIN_MAP[name.toLowerCase() as keyof typeof CHAIN_MAP];
};

// Normalize chain ID to moralis format (or 'solana' for Solana)
export const normalizeChainId = (chainId: string): string => {
  // If already in hex format, return as is
  if (chainId.startsWith('0x')) {
    return chainId;
  }
  
  // Handle Solana explicitly
  if (chainId.toLowerCase() === 'solana' || chainId.toLowerCase() === 'sol') {
    return 'solana';
  }
  
  // Convert common formats
  const chainMap: Record<string, string> = {
    '1': '0x1',
    'eth': '0x1',
    'ethereum': '0x1',
    '56': '0x38',
    'bsc': '0x38',
    '137': '0x89',
    'polygon': '0x89',
    '42161': '0xa4b1',
    'arbitrum': '0xa4b1',
    '10': '0xa',
    'optimism': '0xa',
    '8453': '0x2105',
    'base': '0x2105'
  };
  
  return chainMap[chainId.toLowerCase()] || chainId;
};
