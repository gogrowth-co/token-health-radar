
// Performance monitoring utilities
export const trackPageLoad = (pageName: string) => {
  if (typeof window === 'undefined') return;
  
  // Track Core Web Vitals
  const observer = new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) {
      if (entry.entryType === 'largest-contentful-paint') {
        console.log(`LCP for ${pageName}:`, entry.startTime);
      }
      if (entry.entryType === 'first-input') {
        console.log(`FID for ${pageName}:`, entry.processingStart - entry.startTime);
      }
      if (entry.entryType === 'layout-shift') {
        console.log(`CLS for ${pageName}:`, entry.value);
      }
    }
  });

  try {
    observer.observe({ entryTypes: ['largest-contentful-paint', 'first-input', 'layout-shift'] });
  } catch (e) {
    // Browser doesn't support some metrics
  }

  // Track navigation timing
  window.addEventListener('load', () => {
    const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
    if (navigation) {
      console.log(`Page Load Metrics for ${pageName}:`, {
        domContentLoaded: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
        loadComplete: navigation.loadEventEnd - navigation.loadEventStart,
        totalTime: navigation.loadEventEnd - navigation.fetchStart
      });
    }
  });
};

export const preloadCriticalResources = () => {
  // Preload critical fonts
  const fontLink = document.createElement('link');
  fontLink.rel = 'preload';
  fontLink.as = 'font';
  fontLink.type = 'font/woff2';
  fontLink.crossOrigin = 'anonymous';
  fontLink.href = '/fonts/inter-var.woff2'; // Adjust path as needed
  document.head.appendChild(fontLink);
};
