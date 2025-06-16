
// Image optimization utilities
export const getOptimizedImageProps = (src: string, alt: string) => {
  return {
    src,
    alt,
    loading: 'lazy' as const,
    decoding: 'async' as const,
    style: { contentVisibility: 'auto' as const }
  };
};

export const preloadImage = (src: string) => {
  const link = document.createElement('link');
  link.rel = 'preload';
  link.as = 'image';
  link.href = src;
  document.head.appendChild(link);
};

export const createImageWithFallback = (src: string, fallback: string) => {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(src);
    img.onerror = () => resolve(fallback);
    img.src = src;
  });
};
