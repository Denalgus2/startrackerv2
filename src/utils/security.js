// Security utilities and configuration
class SecurityManager {
  constructor() {
    this.isProduction = import.meta.env.PROD;
    this.contentSecurityPolicy = this.generateCSP();
  }

  // Generate Content Security Policy
  generateCSP() {
    const baseCSP = {
      'default-src': ["'self'"],
      'script-src': [
        "'self'",
        "'unsafe-inline'", // Required for Vite in development
        'https://www.googletagmanager.com',
        'https://www.google-analytics.com'
      ],
      'style-src': [
        "'self'",
        "'unsafe-inline'", // Required for Tailwind and inline styles
        'https://fonts.googleapis.com'
      ],
      'font-src': [
        "'self'",
        'https://fonts.gstatic.com'
      ],
      'img-src': [
        "'self'",
        'data:',
        'https:',
        'blob:'
      ],
      'connect-src': [
        "'self'",
        'https://*.googleapis.com',
        'https://*.firebaseio.com',
        'https://firestore.googleapis.com'
      ],
      'frame-src': ["'none'"],
      'object-src': ["'none'"],
      'base-uri': ["'self'"],
      'form-action': ["'self'"]
    };

    // Stricter policy for production
    if (this.isProduction) {
      baseCSP['script-src'] = baseCSP['script-src'].filter(src => src !== "'unsafe-inline'");
      baseCSP['upgrade-insecure-requests'] = [];
    }

    return baseCSP;
  }

  // Apply security headers
  applySecurityHeaders() {
    if (typeof document !== 'undefined') {
      // Set CSP meta tag
      const cspContent = Object.entries(this.contentSecurityPolicy)
        .map(([directive, sources]) => `${directive} ${sources.join(' ')}`)
        .join('; ');

      const meta = document.createElement('meta');
      meta.httpEquiv = 'Content-Security-Policy';
      meta.content = cspContent;
      document.head.appendChild(meta);

      // Prevent clickjacking
      if (window.self !== window.top) {
        console.warn('Application loaded in iframe - potential security risk');
      }
    }
  }

  // Sanitize user input
  sanitizeInput(input) {
    if (typeof input !== 'string') return input;

    return input
      .replace(/[<>]/g, '') // Remove potential HTML tags
      .replace(/javascript:/gi, '') // Remove javascript: protocols
      .replace(/on\w+=/gi, '') // Remove event handlers
      .trim();
  }

  // Validate file uploads
  validateFile(file, allowedTypes = [], maxSize = 5 * 1024 * 1024) { // 5MB default
    const errors = [];

    if (!file) {
      errors.push('Ingen fil valgt');
      return { valid: false, errors };
    }

    // Check file type
    if (allowedTypes.length > 0 && !allowedTypes.includes(file.type)) {
      errors.push(`Ugyldig filtype. Tillatt: ${allowedTypes.join(', ')}`);
    }

    // Check file size
    if (file.size > maxSize) {
      errors.push(`Filen er for stor. Maksimal størrelse: ${this.formatBytes(maxSize)}`);
    }

    // Check for suspicious file names
    const suspiciousPatterns = [/\.exe$/, /\.bat$/, /\.cmd$/, /\.scr$/];
    if (suspiciousPatterns.some(pattern => pattern.test(file.name))) {
      errors.push('Mistenkelig filtype oppdaget');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  // Rate limiting for API calls
  createRateLimiter(maxRequests = 100, windowMs = 60000) { // 100 requests per minute
    const requests = new Map();

    return (identifier = 'default') => {
      const now = Date.now();
      const windowStart = now - windowMs;

      // Clean old requests
      const userRequests = requests.get(identifier) || [];
      const validRequests = userRequests.filter(timestamp => timestamp > windowStart);

      if (validRequests.length >= maxRequests) {
        return {
          allowed: false,
          retryAfter: Math.ceil((validRequests[0] + windowMs - now) / 1000)
        };
      }

      validRequests.push(now);
      requests.set(identifier, validRequests);

      return { allowed: true };
    };
  }

  // Secure random string generation
  generateSecureToken(length = 32) {
    const array = new Uint8Array(length);
    crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
  }

  // Environment validation
  validateEnvironment() {
    const required = ['VITE_FIREBASE_API_KEY', 'VITE_FIREBASE_PROJECT_ID'];
    const missing = [];

    required.forEach(envVar => {
      if (!import.meta.env[envVar]) {
        missing.push(envVar);
      }
    });

    if (missing.length > 0) {
      console.error('Missing required environment variables:', missing);
      return false;
    }

    return true;
  }

  // Audit logging
  logSecurityEvent(event, details = {}) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      event,
      details,
      userAgent: navigator.userAgent,
      url: window.location.href
    };

    // In production, send to security monitoring service
    if (this.isProduction) {
      // Example: Send to security logging service
      console.warn('Security Event:', logEntry);
    } else {
      console.log('Security Event:', logEntry);
    }
  }
}

// React hooks for security features
import { useEffect, useCallback } from 'react';

export function useSecurity() {
  const security = new SecurityManager();

  useEffect(() => {
    security.applySecurityHeaders();
    security.validateEnvironment();
  }, []);

  return {
    sanitizeInput: security.sanitizeInput.bind(security),
    validateFile: security.validateFile.bind(security),
    generateToken: security.generateSecureToken.bind(security),
    logSecurityEvent: security.logSecurityEvent.bind(security),
    createRateLimiter: security.createRateLimiter.bind(security)
  };
}

// Hook for input sanitization
export function useSanitizedInput(initialValue = '') {
  const [value, setValue] = React.useState(initialValue);
  const { sanitizeInput } = useSecurity();

  const setSanitizedValue = useCallback((newValue) => {
    setValue(sanitizeInput(newValue));
  }, [sanitizeInput]);

  return [value, setSanitizedValue];
}

export default SecurityManager;
