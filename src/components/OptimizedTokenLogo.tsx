
import { useState, useCallback } from 'react';
import { getOptimizedImageProps } from '@/utils/imageOptimization';

interface OptimizedTokenLogoProps {
  logo: string;
  name: string;
  className?: string;
  size?: number;
}

export default function OptimizedTokenLogo({ 
  logo, 
  name, 
  className = "w-16 h-16 rounded-full",
  size = 64 
}: OptimizedTokenLogoProps) {
  const [imageSrc, setImageSrc] = useState(logo);
  const [isLoaded, setIsLoaded] = useState(false);

  const handleError = useCallback(() => {
    setImageSrc('/placeholder.svg');
  }, []);

  const handleLoad = useCallback(() => {
    setIsLoaded(true);
  }, []);

  return (
    <div className={`${className} bg-gray-100 dark:bg-gray-800 flex items-center justify-center overflow-hidden`}>
      <img
        {...getOptimizedImageProps(imageSrc, `${name} logo`)}
        className={`w-full h-full object-cover transition-opacity duration-200 ${
          isLoaded ? 'opacity-100' : 'opacity-0'
        }`}
        onError={handleError}
        onLoad={handleLoad}
        width={size}
        height={size}
      />
      {!isLoaded && (
        <div className="absolute inset-0 bg-gray-200 dark:bg-gray-700 animate-pulse" />
      )}
    </div>
  );
}
