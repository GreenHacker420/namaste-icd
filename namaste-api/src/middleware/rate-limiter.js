/**
 * Rate Limiting Middleware
 * 
 * Token bucket rate limiting with per-client tracking
 */

import { logger } from '../config/logger.js';

// In-memory rate limit store
const rateLimitStore = new Map();

// Clean up expired entries every minute
setInterval(() => {
  const now = Date.now();
  for (const [key, data] of rateLimitStore.entries()) {
    if (now - data.lastRequest > 60000) {
      rateLimitStore.delete(key);
    }
  }
}, 60000);

/**
 * Create rate limiter with options
 */
export const createRateLimiter = (options = {}) => {
  const {
    windowMs = 60000,      // 1 minute window
    maxRequests = 100,     // 100 requests per window
    keyGenerator = (c) => c.req.header('x-forwarded-for') || 'anonymous',
    skipFailedRequests = false,
    skipSuccessfulRequests = false,
    message = 'Too many requests, please try again later',
  } = options;

  return async (c, next) => {
    const key = keyGenerator(c);
    const now = Date.now();

    // Get or create rate limit data
    let data = rateLimitStore.get(key);
    if (!data || now - data.windowStart > windowMs) {
      data = {
        count: 0,
        windowStart: now,
        lastRequest: now,
      };
    }

    data.count++;
    data.lastRequest = now;
    rateLimitStore.set(key, data);

    // Set rate limit headers
    const remaining = Math.max(0, maxRequests - data.count);
    const resetTime = Math.ceil((data.windowStart + windowMs - now) / 1000);
    
    c.header('X-RateLimit-Limit', maxRequests.toString());
    c.header('X-RateLimit-Remaining', remaining.toString());
    c.header('X-RateLimit-Reset', resetTime.toString());

    // Check if rate limit exceeded
    if (data.count > maxRequests) {
      c.header('Retry-After', resetTime.toString());
      logger.warn({ key, count: data.count, limit: maxRequests }, 'Rate limit exceeded');
      
      return c.json({
        error: 'Too Many Requests',
        message,
        retryAfter: resetTime,
      }, 429);
    }

    await next();

    // Optionally skip counting based on response
    if (skipFailedRequests && c.res.status >= 400) {
      data.count--;
      rateLimitStore.set(key, data);
    }
    if (skipSuccessfulRequests && c.res.status < 400) {
      data.count--;
      rateLimitStore.set(key, data);
    }
  };
};

/**
 * Pre-configured rate limiters for different endpoints
 */
export const rateLimitMiddleware = {
  // Standard API rate limit
  standard: createRateLimiter({
    windowMs: 60000,
    maxRequests: 100,
  }),

  // Stricter limit for AI mapping (expensive operations)
  mapping: createRateLimiter({
    windowMs: 60000,
    maxRequests: 20,
    message: 'Mapping rate limit exceeded. AI operations are resource-intensive.',
  }),

  // Higher limit for search/autocomplete
  search: createRateLimiter({
    windowMs: 60000,
    maxRequests: 200,
  }),

  // Very strict limit for batch operations
  batch: createRateLimiter({
    windowMs: 60000,
    maxRequests: 5,
    message: 'Batch operation rate limit exceeded.',
  }),

  // Lenient limit for health checks
  health: createRateLimiter({
    windowMs: 60000,
    maxRequests: 1000,
  }),
};

/**
 * Get current rate limit stats
 */
export const getRateLimitStats = () => {
  const stats = {
    activeClients: rateLimitStore.size,
    clients: [],
  };

  for (const [key, data] of rateLimitStore.entries()) {
    stats.clients.push({
      key: key.substring(0, 20) + '...',
      count: data.count,
      windowStart: new Date(data.windowStart).toISOString(),
    });
  }

  return stats;
};
