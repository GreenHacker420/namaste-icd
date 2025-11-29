/**
 * Caching Middleware
 * 
 * In-memory LRU cache with optional Redis support
 */

import { logger } from '../config/logger.js';
import { config } from '../config/index.js';

// Simple LRU Cache implementation
class LRUCache {
  constructor(maxSize = 1000, ttlMs = 300000) { // 5 min default TTL
    this.maxSize = maxSize;
    this.ttlMs = ttlMs;
    this.cache = new Map();
    this.stats = { hits: 0, misses: 0, sets: 0, evictions: 0 };
  }

  get(key) {
    const item = this.cache.get(key);
    if (!item) {
      this.stats.misses++;
      return null;
    }

    if (Date.now() > item.expiresAt) {
      this.cache.delete(key);
      this.stats.misses++;
      return null;
    }

    // Move to end (most recently used)
    this.cache.delete(key);
    this.cache.set(key, item);
    this.stats.hits++;
    return item.value;
  }

  set(key, value, ttlMs = this.ttlMs) {
    // Evict oldest if at capacity
    if (this.cache.size >= this.maxSize) {
      const oldestKey = this.cache.keys().next().value;
      this.cache.delete(oldestKey);
      this.stats.evictions++;
    }

    this.cache.set(key, {
      value,
      expiresAt: Date.now() + ttlMs,
    });
    this.stats.sets++;
  }

  delete(key) {
    return this.cache.delete(key);
  }

  clear() {
    this.cache.clear();
  }

  getStats() {
    const hitRate = this.stats.hits + this.stats.misses > 0
      ? (this.stats.hits / (this.stats.hits + this.stats.misses) * 100).toFixed(2)
      : 0;
    return {
      ...this.stats,
      size: this.cache.size,
      maxSize: this.maxSize,
      hitRate: `${hitRate}%`,
    };
  }
}

// Cache instances for different purposes
const caches = {
  mappings: new LRUCache(500, 3600000),    // 1 hour for mappings
  embeddings: new LRUCache(1000, 86400000), // 24 hours for embeddings
  search: new LRUCache(200, 300000),        // 5 min for search results
  fhir: new LRUCache(100, 600000),          // 10 min for FHIR resources
};

/**
 * Generate cache key from request
 */
const generateCacheKey = (c, prefix = 'req') => {
  const path = c.req.path;
  const query = JSON.stringify(c.req.query());
  const body = c.req.method === 'POST' ? JSON.stringify(c.get('requestBody')) : '';
  return `${prefix}:${path}:${query}:${body}`;
};

/**
 * Cache middleware for GET requests
 */
export const cacheMiddleware = (options = {}) => {
  const {
    ttl = 300000,
    keyPrefix = 'http',
    cacheName = 'search',
    condition = () => true,
  } = options;

  return async (c, next) => {
    // Only cache GET requests
    if (c.req.method !== 'GET') {
      await next();
      return;
    }

    // Check condition
    if (!condition(c)) {
      await next();
      return;
    }

    const cache = caches[cacheName] || caches.search;
    const key = generateCacheKey(c, keyPrefix);

    // Try to get from cache
    const cached = cache.get(key);
    if (cached) {
      c.header('X-Cache', 'HIT');
      return c.json(cached);
    }

    // Execute handler
    await next();

    // Cache successful responses
    if (c.res.status === 200) {
      try {
        const body = await c.res.clone().json();
        cache.set(key, body, ttl);
        c.header('X-Cache', 'MISS');
      } catch (e) {
        // Response wasn't JSON, skip caching
      }
    }
  };
};

/**
 * Get cached mapping
 */
export const getCachedMapping = (namasteCode, system) => {
  const key = `mapping:${system}:${namasteCode}`;
  return caches.mappings.get(key);
};

/**
 * Set cached mapping
 */
export const setCachedMapping = (namasteCode, system, mapping) => {
  const key = `mapping:${system}:${namasteCode}`;
  caches.mappings.set(key, mapping);
};

/**
 * Get cached embedding
 */
export const getCachedEmbedding = (text) => {
  const key = `emb:${text.substring(0, 100)}`;
  return caches.embeddings.get(key);
};

/**
 * Set cached embedding
 */
export const setCachedEmbedding = (text, embedding) => {
  const key = `emb:${text.substring(0, 100)}`;
  caches.embeddings.set(key, embedding);
};

/**
 * Invalidate cache entries by pattern
 */
export const invalidateCache = (pattern, cacheName = 'all') => {
  const targetCaches = cacheName === 'all' ? Object.values(caches) : [caches[cacheName]];
  
  let invalidated = 0;
  for (const cache of targetCaches) {
    if (!cache) continue;
    for (const key of cache.cache.keys()) {
      if (key.includes(pattern)) {
        cache.delete(key);
        invalidated++;
      }
    }
  }
  
  logger.debug({ pattern, invalidated }, 'Cache invalidated');
  return invalidated;
};

/**
 * Get cache statistics
 */
export const getCacheStats = () => {
  const stats = {};
  for (const [name, cache] of Object.entries(caches)) {
    stats[name] = cache.getStats();
  }
  return stats;
};

/**
 * Clear all caches
 */
export const clearAllCaches = () => {
  for (const cache of Object.values(caches)) {
    cache.clear();
  }
  logger.info('All caches cleared');
};

export { caches };
