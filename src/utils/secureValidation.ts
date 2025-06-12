
/**
 * Enhanced security validation utilities
 * Implements comprehensive input validation and sanitization
 */

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  sanitizedInput?: any;
}

/**
 * Validate and sanitize token addresses with enhanced security
 */
export const validateTokenAddressSecure = (address: string): ValidationResult => {
  const errors: string[] = [];
  
  if (!address || typeof address !== 'string') {
    errors.push('Token address is required');
    return { isValid: false, errors };
  }

  // Sanitize input - remove any non-hex characters except 0x prefix
  const sanitized = address.trim().toLowerCase();
  
  // Check for common injection patterns
  const injectionPatterns = [
    /[<>\"']/,  // HTML/XML injection
    /javascript:/i,  // JavaScript injection
    /data:/i,  // Data URL injection
    /vbscript:/i,  // VBScript injection
    /on\w+=/i,  // Event handler injection
  ];
  
  for (const pattern of injectionPatterns) {
    if (pattern.test(sanitized)) {
      errors.push('Invalid characters detected in token address');
      return { isValid: false, errors };
    }
  }

  // Ethereum address validation
  if (sanitized.startsWith('0x')) {
    if (!/^0x[a-f0-9]{40}$/i.test(sanitized)) {
      errors.push('Invalid Ethereum address format');
    }
  } else {
    // Could be a token name/symbol - validate length and characters
    if (sanitized.length < 2 || sanitized.length > 50) {
      errors.push('Token name must be between 2 and 50 characters');
    }
    
    if (!/^[a-z0-9\-_\s]+$/i.test(sanitized)) {
      errors.push('Token name contains invalid characters');
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    sanitizedInput: sanitized
  };
};

/**
 * Rate limiting implementation
 */
class RateLimiter {
  private requests: Map<string, number[]> = new Map();
  private readonly maxRequests: number;
  private readonly windowMs: number;

  constructor(maxRequests = 10, windowMs = 60000) {
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
  }

  isAllowed(identifier: string): boolean {
    const now = Date.now();
    const requests = this.requests.get(identifier) || [];
    
    // Remove old requests outside the window
    const validRequests = requests.filter(time => now - time < this.windowMs);
    
    if (validRequests.length >= this.maxRequests) {
      return false;
    }
    
    // Add current request
    validRequests.push(now);
    this.requests.set(identifier, validRequests);
    
    return true;
  }

  getRemainingRequests(identifier: string): number {
    const now = Date.now();
    const requests = this.requests.get(identifier) || [];
    const validRequests = requests.filter(time => now - time < this.windowMs);
    
    return Math.max(0, this.maxRequests - validRequests.length);
  }
}

// Global rate limiter instances
export const searchRateLimiter = new RateLimiter(20, 60000); // 20 searches per minute
export const scanRateLimiter = new RateLimiter(5, 60000); // 5 scans per minute

/**
 * Validate scan request with enhanced security
 */
export const validateScanRequestSecure = (request: {
  token_address: string;
  pro_scan?: boolean;
  user_id?: string;
}): ValidationResult => {
  const errors: string[] = [];
  
  // Validate token address
  const addressValidation = validateTokenAddressSecure(request.token_address);
  if (!addressValidation.isValid) {
    errors.push(...addressValidation.errors);
  }

  // Validate user_id if provided
  if (request.user_id) {
    if (typeof request.user_id !== 'string') {
      errors.push('Invalid user ID format');
    } else {
      // UUID validation
      const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      if (!uuidPattern.test(request.user_id)) {
        errors.push('Invalid user ID format');
      }
    }
  }

  // Validate pro_scan flag
  if (request.pro_scan !== undefined && typeof request.pro_scan !== 'boolean') {
    errors.push('Invalid pro_scan parameter');
  }

  return {
    isValid: errors.length === 0,
    errors,
    sanitizedInput: {
      token_address: addressValidation.sanitizedInput || request.token_address,
      pro_scan: Boolean(request.pro_scan),
      user_id: request.user_id
    }
  };
};

/**
 * Sanitize user input for display
 */
export const sanitizeForDisplay = (input: string): string => {
  if (!input || typeof input !== 'string') {
    return '';
  }
  
  return input
    .replace(/[<>\"'&]/g, (char) => {
      const escapes: Record<string, string> = {
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;',
        '&': '&amp;'
      };
      return escapes[char] || char;
    })
    .trim()
    .slice(0, 1000); // Limit length
};

/**
 * Create secure error messages that don't leak sensitive information
 */
export const createSecureErrorMessage = (error: any, context: string): string => {
  // In production, return generic messages
  if (process.env.NODE_ENV === 'production') {
    return `${context}. Please try again later.`;
  }
  
  // In development, provide more details but still sanitize
  const message = error?.message || error || 'Unknown error';
  return sanitizeForDisplay(`${context}: ${message}`);
};

/**
 * Validate environment for security requirements
 */
export const validateSecurityEnvironment = (): ValidationResult => {
  const errors: string[] = [];
  
  // Check if we're in a secure context (HTTPS in production)
  if (typeof window !== 'undefined') {
    const isSecure = window.location.protocol === 'https:' || 
                    window.location.hostname === 'localhost' || 
                    window.location.hostname === '127.0.0.1';
    
    if (!isSecure && process.env.NODE_ENV === 'production') {
      errors.push('Application must be served over HTTPS in production');
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

