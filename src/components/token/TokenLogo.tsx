
import { useState } from 'react';

interface TokenLogoProps {
  logo: string;
  symbol: string;
  chain?: string;
  className?: string;
  showChainBadge?: boolean;
}

// Updated chain logos mapping with your specified URLs
const CHAIN_LOGOS: Record<string, string> = {
  eth: 'https://cryptologos.cc/logos/ethereum-eth-logo.png',
  ethereum: 'https://cryptologos.cc/logos/ethereum-eth-logo.png',
  bsc: 'https://cryptologos.cc/logos/bnb-bnb-logo.png',
  'binance-smart-chain': 'https://cryptologos.cc/logos/bnb-bnb-logo.png',
  arbitrum: 'https://cryptologos.cc/logos/arbitrum-arb-logo.png',
  'arbitrum-one': 'https://cryptologos.cc/logos/arbitrum-arb-logo.png',
  '0xa4b1': 'https://cryptologos.cc/logos/arbitrum-arb-logo.png', // Arbitrum hex ID
  optimism: 'https://cryptologos.cc/logos/optimism-eth-logo.png',
  'optimistic-ethereum': 'https://cryptologos.cc/logos/optimism-eth-logo.png',
  '0xa': 'https://cryptologos.cc/logos/optimism-eth-logo.png', // Optimism hex ID
  base: 'https://cryptologos.cc/logos/base-base-logo.png',
  '0x2105': 'https://cryptologos.cc/logos/base-base-logo.png', // Base hex ID
  polygon: 'https://cryptologos.cc/logos/polygon-matic-logo.png',
  'polygon-pos': 'https://cryptologos.cc/logos/polygon-matic-logo.png',
  avalanche: 'https://cryptologos.cc/logos/avalanche-avax-logo.png',
  fantom: 'https://cryptologos.cc/logos/fantom-ftm-logo.png'
};

// Chain name abbreviations for fallback display
const CHAIN_ABBREVIATIONS: Record<string, string> = {
  eth: 'ETH',
  ethereum: 'ETH',
  bsc: 'BSC',
  'binance-smart-chain': 'BSC',
  arbitrum: 'ARB',
  'arbitrum-one': 'ARB',
  optimism: 'OP',
  'optimistic-ethereum': 'OP',
  base: 'BASE',
  polygon: 'MATIC',
  'polygon-pos': 'MATIC',
  avalanche: 'AVAX',
  fantom: 'FTM'
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

  console.log(`[TOKEN-LOGO] Rendering for ${symbol}:`);
  console.log(`  - Token logo:`, logo);
  console.log(`  - Chain:`, chain);
  console.log(`  - Show chain badge:`, showChainBadge);
  
  const chainLogo = chain ? CHAIN_LOGOS[chain.toLowerCase()] : null;
  const chainAbbr = chain ? CHAIN_ABBREVIATIONS[chain.toLowerCase()] : null;
  
  console.log(`  - Chain logo URL:`, chainLogo);
  console.log(`  - Chain abbreviation:`, chainAbbr);
  console.log(`  - Chain image error:`, chainImageError);

  const handleImageError = () => {
    console.log(`[TOKEN-LOGO] Token image failed to load for ${symbol}`);
    setImageError(true);
  };

  const handleImageLoad = () => {
    console.log(`[TOKEN-LOGO] Token image loaded successfully for ${symbol}`);
    setImageLoaded(true);
  };

  const handleChainImageError = () => {
    console.log(`[TOKEN-LOGO] Chain image failed to load for chain:`, chain);
    setChainImageError(true);
  };

  // Determine what to show based on priority: token logo → chain logo → initials
  const hasTokenLogo = logo && !imageError;
  const hasChainLogo = chainLogo && !chainImageError;
  const showFallback = !hasTokenLogo && !hasChainLogo;

  // Chain badge should show if we have a token logo AND chain data AND showChainBadge is true
  const shouldShowChainBadge = hasTokenLogo && chain && showChainBadge;

  console.log(`  - Has token logo:`, hasTokenLogo);
  console.log(`  - Should show chain badge:`, shouldShowChainBadge);

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

      {/* Chain badge overlay - ALWAYS show when conditions are met, with fallback */}
      {shouldShowChainBadge && (
        <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white dark:border-gray-900 bg-white dark:bg-gray-900 overflow-hidden shadow-md flex items-center justify-center">
          {/* Try to show chain logo first */}
          {chainLogo && !chainImageError ? (
            <img 
              src={chainLogo} 
              alt={`${chain} chain`}
              className="w-full h-full object-cover"
              onError={handleChainImageError}
            />
          ) : (
            /* Fallback to chain abbreviation */
            <div className="text-[8px] font-bold text-gray-700 dark:text-gray-300">
              {chainAbbr || chain?.slice(0, 2).toUpperCase() || '?'}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
