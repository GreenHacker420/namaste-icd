/**
 * Compression Middleware
 * 
 * Gzip/Brotli compression for responses
 */

import { compress } from 'hono/compress';

/**
 * Create compression middleware with options
 */
export const compressionMiddleware = compress({
  encoding: 'gzip',
});

/**
 * Check if response should be compressed
 */
export const shouldCompress = (contentType, size) => {
  // Don't compress small responses
  if (size < 1024) return false;
  
  // Compress text-based content types
  const compressibleTypes = [
    'application/json',
    'application/fhir+json',
    'text/html',
    'text/plain',
    'text/css',
    'text/javascript',
    'application/javascript',
    'application/xml',
    'text/xml',
  ];
  
  return compressibleTypes.some(type => contentType?.includes(type));
};
