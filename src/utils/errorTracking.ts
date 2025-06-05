
import * as Sentry from "@sentry/react";

// Initialize Sentry for error tracking
export const initializeErrorTracking = () => {
  // Only initialize in production or when SENTRY_DSN is available
  const dsn = import.meta.env.VITE_SENTRY_DSN;
  
  if (dsn) {
    Sentry.init({
      dsn,
      environment: import.meta.env.MODE,
      integrations: [
        Sentry.browserTracingIntegration(),
        Sentry.replayIntegration(),
      ],
      tracesSampleRate: 1.0,
      replaysSessionSampleRate: 0.1,
      replaysOnErrorSampleRate: 1.0,
      beforeSend(event) {
        // Filter out cross-origin script errors that we can't control
        if (event.exception?.values?.[0]?.value === "Script error.") {
          console.warn("Cross-origin script error filtered:", event);
          return null;
        }
        return event;
      }
    });
  }
  
  // Add global error handler for unhandled errors
  window.addEventListener('error', (event) => {
    console.error('Global error:', {
      message: event.message,
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
      error: event.error
    });
    
    // Track cross-origin errors with additional context
    if (event.message === "Script error.") {
      console.warn("Cross-origin script error detected from:", event.filename || "unknown source");
    }
  });
  
  // Add unhandled promise rejection handler
  window.addEventListener('unhandledrejection', (event) => {
    console.error('Unhandled promise rejection:', event.reason);
    Sentry.captureException(event.reason);
  });
};

// Enhanced error logging function
export const logError = (error: Error | string, context?: Record<string, any>) => {
  const errorMessage = typeof error === 'string' ? error : error.message;
  const errorObject = typeof error === 'string' ? new Error(error) : error;
  
  console.error('Error logged:', {
    message: errorMessage,
    stack: errorObject.stack,
    context,
    timestamp: new Date().toISOString(),
    userAgent: navigator.userAgent,
    url: window.location.href
  });
  
  if (context) {
    Sentry.setContext("error_context", context);
  }
  
  Sentry.captureException(errorObject);
};

// Performance tracking with defensive checks
export const safePerformanceTrack = (eventName: string, data?: Record<string, any>) => {
  try {
    // Defensive check for performance API
    if (typeof window !== 'undefined' && window.performance) {
      const perfData = {
        timestamp: Date.now(),
        navigationStart: window.performance.timing?.navigationStart,
        domInteractive: window.performance.timing?.domInteractive,
        loadEventEnd: window.performance.timing?.loadEventEnd,
        ...data
      };
      
      console.log(`Performance: ${eventName}`, perfData);
      
      // Only track if Sentry is initialized
      Sentry.addBreadcrumb({
        message: eventName,
        category: 'performance',
        data: perfData,
        level: 'info'
      });
    }
  } catch (error) {
    console.warn('Performance tracking failed:', error);
  }
};
