
import { useState } from 'react';

interface TokenLogoProps {
  logo: string;
  symbol: string;
  className?: string;
}

export default function TokenLogo({ logo, symbol, className = "w-10 h-10" }: TokenLogoProps) {
  const [imageError, setImageError] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);

  const handleImageError = () => {
    setImageError(true);
  };

  const handleImageLoad = () => {
    setImageLoaded(true);
  };

  // Show fallback if no logo provided or image failed to load
  const showFallback = !logo || imageError;

  return (
    <div className={`${className} rounded-full bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-800 flex items-center justify-center overflow-hidden shadow-sm border border-gray-200 dark:border-gray-600 relative`}>
      {!showFallback && (
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
      {showFallback && (
        <div className="w-full h-full flex items-center justify-center text-sm font-bold text-gray-600 dark:text-gray-300">
          {symbol.slice(0, 2).toUpperCase()}
        </div>
      )}
      {!showFallback && !imageLoaded && (
        <div className="absolute inset-0 bg-gray-200 dark:bg-gray-700 animate-pulse flex items-center justify-center">
          <div className="text-xs font-bold text-gray-500 dark:text-gray-400">
            {symbol.slice(0, 2).toUpperCase()}
          </div>
        </div>
      )}
    </div>
  );
}
