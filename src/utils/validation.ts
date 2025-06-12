
/**
 * Enhanced input validation utilities for security
 */

// Token address validation
export const validateTokenAddress = (address: string): boolean => {
  if (!address || typeof address !== 'string') {
    return false;
  }
  
  // Ethereum address format (0x followed by 40 hex characters)
  const ethAddressRegex = /^0x[a-fA-F0-9]{40}$/;
  
  // Special cases for native tokens
  const specialAddresses = [
    '0x0000000000000000000000000000000000000000', // ETH native
    '0x0000000000000000000000000000000000001010'  // MATIC native
  ];
  
  return ethAddressRegex.test(address) || specialAddresses.includes(address);
};

// Token name/symbol validation
export const validateTokenName = (name: string): boolean => {
  if (!name || typeof name !== 'string') {
    return false;
  }
  
  // Allow alphanumeric, spaces, hyphens, and common symbols
  const nameRegex = /^[a-zA-Z0-9\s\-_.()]+$/;
  
  return nameRegex.test(name) && name.length >= 1 && name.length <= 100;
};

// Sanitize input to prevent XSS
export const sanitizeInput = (input: string): string => {
  if (!input || typeof input !== 'string') {
    return '';
  }
  
  return input
    .replace(/[<>\"'&]/g, '') // Remove potentially dangerous characters
    .trim()
    .slice(0, 500); // Limit length
};

// Rate limiting helper
export const createRateLimiter = (maxRequests: number, windowMs: number) => {
  const requests = new Map<string, number[]>();
  
  return (identifier: string): boolean => {
    const now = Date.now();
    const windowStart = now - windowMs;
    
    // Get existing requests for this identifier
    const userRequests = requests.get(identifier) || [];
    
    // Filter out old requests
    const recentRequests = userRequests.filter(time => time > windowStart);
    
    // Check if limit exceeded
    if (recentRequests.length >= maxRequests) {
      return false;
    }
    
    // Add current request
    recentRequests.push(now);
    requests.set(identifier, recentRequests);
    
    return true;
  };
};

// Validate scan request data
export const validateScanRequest = (data: any): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];
  
  if (!data) {
    errors.push('Request data is required');
    return { isValid: false, errors };
  }
  
  if (data.token_address && !validateTokenAddress(data.token_address)) {
    errors.push('Invalid token address format');
  }
  
  if (data.token_name && !validateTokenName(data.token_name)) {
    errors.push('Invalid token name format');
  }
  
  if (data.pro_scan !== undefined && typeof data.pro_scan !== 'boolean') {
    errors.push('Invalid pro_scan value');
  }
  
  return { isValid: errors.length === 0, errors };
};

// Create secure error messages that don't leak sensitive information
export const createSecureErrorMessage = (error: any, fallback: string = 'An error occurred'): string => {
  // In production, don't expose internal error details
  if (process.env.NODE_ENV === 'production') {
    return fallback;
  }
  
  // In development, provide more details but sanitize them
  if (error && typeof error === 'object' && error.message) {
    return sanitizeInput(error.message);
  }
  
  return fallback;
};
