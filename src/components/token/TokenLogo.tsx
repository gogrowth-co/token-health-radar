
import { useState } from 'react';

interface TokenLogoProps {
  logo: string;
  symbol: string;
  chain?: string;
  className?: string;
  showChainBadge?: boolean;
}

// Updated chain logos mapping with hex chain IDs
const CHAIN_LOGOS: Record<string, string> = {
  eth: 'https://cryptologos.cc/logos/ethereum-eth-logo.png',
  ethereum: 'https://cryptologos.cc/logos/ethereum-eth-logo.png',
  polygon: 'https://cryptologos.cc/logos/polygon-matic-logo.png',
  'polygon-pos': 'https://cryptologos.cc/logos/polygon-matic-logo.png',
  bsc: 'https://cryptologos.cc/logos/bnb-bnb-logo.png',
  'binance-smart-chain': 'https://cryptologos.cc/logos/bnb-bnb-logo.png',
  arbitrum: 'https://cryptologos.cc/logos/arbitrum-arb-logo.png',
  'arbitrum-one': 'https://cryptologos.cc/logos/arbitrum-arb-logo.png',
  '0xa4b1': 'https://cryptologos.cc/logos/arbitrum-arb-logo.png', // Arbitrum hex ID
  avalanche: 'https://cryptologos.cc/logos/avalanche-avax-logo.png',
  optimism: 'https://assets.coingecko.com/coins/images/25244/small/Optimism.png',
  'optimistic-ethereum': 'https://assets.coingecko.com/coins/images/25244/small/Optimism.png',
  '0xa': 'https://assets.coingecko.com/coins/images/25244/small/Optimism.png', // Optimism hex ID
  base: 'https://assets.coingecko.com/coins/images/35845/small/coinbase-base-logo.png',
  '0x2105': 'https://assets.coingecko.com/coins/images/35845/small/coinbase-base-logo.png', // Base hex ID
  fantom: 'https://cryptologos.cc/logos/fantom-ftm-logo.png'
};

export default function TokenLogo({ 
  logo, 
  symbol, 
  chain, 
  className = "w-10 h-10",
  showChainBadge = true
}: TokenLogoProps) {
  const [imageError, setImageError] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [chainImageError, setChainImageError] = useState(false);

  const handleImageError = () => {
    setImageError(true);
  };

  const handleImageLoad = () => {
    setImageLoaded(true);
  };

  const handleChainImageError = () => {
    setChainImageError(true);
  };

  // Determine what to show based on priority: token logo → chain logo → initials
  const hasTokenLogo = logo && !imageError;
  const chainLogo = chain ? CHAIN_LOGOS[chain.toLowerCase()] : null;
  const hasChainLogo = chainLogo && !chainImageError;
  const showFallback = !hasTokenLogo && !hasChainLogo;

  return (
    <div className={`${className} rounded-full bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-800 flex items-center justify-center overflow-hidden shadow-sm border border-gray-200 dark:border-gray-600 relative`}>
      {/* Token logo (highest priority) */}
      {hasTokenLogo && (
        <img 
          src={logo} 
          alt={`${symbol} logo`}
          className={`w-full h-full object-cover transition-opacity duration-200 ${
            imageLoaded ? 'opacity-100' : 'opacity-0'
          }`}
          onError={handleImageError}
          onLoad={handleImageLoad}
        />
      )}
      
      {/* Chain logo fallback (second priority) */}
      {!hasTokenLogo && hasChainLogo && (
        <img 
          src={chainLogo} 
          alt={`${chain} chain logo`}
          className="w-full h-full object-cover"
          onError={handleChainImageError}
        />
      )}
      
      {/* Initials fallback (lowest priority) */}
      {showFallback && (
        <div className="w-full h-full flex items-center justify-center text-sm font-bold text-gray-600 dark:text-gray-300">
          {symbol.slice(0, 2).toUpperCase()}
        </div>
      )}
      
      {/* Loading state for token logo */}
      {hasTokenLogo && !imageLoaded && (
        <div className="absolute inset-0 bg-gray-200 dark:bg-gray-700 animate-pulse flex items-center justify-center">
          <div className="text-xs font-bold text-gray-500 dark:text-gray-400">
            {symbol.slice(0, 2).toUpperCase()}
          </div>
        </div>
      )}

      {/* Enhanced chain badge overlay - positioned at bottom-right corner with partial overlap */}
      {hasTokenLogo && chainLogo && showChainBadge && !chainImageError && (
        <div className="absolute bottom-0 right-0 w-5 h-5 rounded-full border-2 border-white dark:border-gray-900 bg-white dark:bg-gray-900 overflow-hidden shadow-lg transform translate-x-1 translate-y-1">
          <img 
            src={chainLogo} 
            alt={`${chain} chain`}
            className="w-full h-full object-cover"
            onError={handleChainImageError}
          />
        </div>
      )}
    </div>
  );
}
