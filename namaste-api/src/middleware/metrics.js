/**
 * Prometheus Metrics Middleware
 * 
 * Collects and exposes metrics for monitoring
 */

import { logger } from '../config/logger.js';

// In-memory metrics store (replace with prom-client in production)
const metrics = {
  requests: {
    total: 0,
    byMethod: {},
    byPath: {},
    byStatus: {},
  },
  latency: {
    sum: 0,
    count: 0,
    buckets: {
      '50': 0,
      '100': 0,
      '250': 0,
      '500': 0,
      '1000': 0,
      '2500': 0,
      '5000': 0,
      '10000': 0,
      'Inf': 0,
    },
  },
  mappings: {
    total: 0,
    successful: 0,
    failed: 0,
    byEquivalence: {},
    avgConfidence: 0,
    totalConfidence: 0,
  },
  embeddings: {
    generated: 0,
    cached: 0,
    errors: 0,
  },
  database: {
    queries: 0,
    errors: 0,
    avgLatency: 0,
  },
  ai: {
    requests: 0,
    tokens: 0,
    errors: 0,
    avgLatency: 0,
  },
  startTime: Date.now(),
};

/**
 * Record latency in histogram buckets
 */
const recordLatency = (ms) => {
  metrics.latency.sum += ms;
  metrics.latency.count++;
  
  const buckets = [50, 100, 250, 500, 1000, 2500, 5000, 10000];
  for (const bucket of buckets) {
    if (ms <= bucket) {
      metrics.latency.buckets[bucket.toString()]++;
      return;
    }
  }
  metrics.latency.buckets['Inf']++;
};

/**
 * Metrics collection middleware
 */
export const metricsMiddleware = async (c, next) => {
  const start = Date.now();
  const method = c.req.method;
  const path = c.req.path;
  
  await next();
  
  const duration = Date.now() - start;
  const status = c.res.status;
  
  // Update counters
  metrics.requests.total++;
  metrics.requests.byMethod[method] = (metrics.requests.byMethod[method] || 0) + 1;
  metrics.requests.byStatus[status] = (metrics.requests.byStatus[status] || 0) + 1;
  
  // Normalize path for grouping (remove IDs)
  const normalizedPath = path.replace(/\/[a-f0-9-]{36}/g, '/:id');
  metrics.requests.byPath[normalizedPath] = (metrics.requests.byPath[normalizedPath] || 0) + 1;
  
  // Record latency
  recordLatency(duration);
};

/**
 * Record mapping metrics
 */
export const recordMappingMetrics = (result) => {
  metrics.mappings.total++;
  
  if (result.success) {
    metrics.mappings.successful++;
    metrics.mappings.totalConfidence += result.confidence || 0;
    metrics.mappings.avgConfidence = metrics.mappings.totalConfidence / metrics.mappings.successful;
    
    const eq = result.equivalence || 'UNKNOWN';
    metrics.mappings.byEquivalence[eq] = (metrics.mappings.byEquivalence[eq] || 0) + 1;
  } else {
    metrics.mappings.failed++;
  }
};

/**
 * Record embedding metrics
 */
export const recordEmbeddingMetrics = (type, count = 1) => {
  if (type === 'generated') metrics.embeddings.generated += count;
  else if (type === 'cached') metrics.embeddings.cached += count;
  else if (type === 'error') metrics.embeddings.errors += count;
};

/**
 * Record AI metrics
 */
export const recordAiMetrics = (tokens, latency, error = false) => {
  metrics.ai.requests++;
  metrics.ai.tokens += tokens || 0;
  if (error) metrics.ai.errors++;
  
  const totalLatency = metrics.ai.avgLatency * (metrics.ai.requests - 1) + latency;
  metrics.ai.avgLatency = totalLatency / metrics.ai.requests;
};

/**
 * Get current metrics in Prometheus format
 */
export const getMetrics = () => {
  const uptime = (Date.now() - metrics.startTime) / 1000;
  
  let output = '';
  
  // Help and type declarations
  output += '# HELP namaste_requests_total Total HTTP requests\n';
  output += '# TYPE namaste_requests_total counter\n';
  output += `namaste_requests_total ${metrics.requests.total}\n\n`;
  
  output += '# HELP namaste_requests_by_method HTTP requests by method\n';
  output += '# TYPE namaste_requests_by_method counter\n';
  for (const [method, count] of Object.entries(metrics.requests.byMethod)) {
    output += `namaste_requests_by_method{method="${method}"} ${count}\n`;
  }
  output += '\n';
  
  output += '# HELP namaste_requests_by_status HTTP requests by status code\n';
  output += '# TYPE namaste_requests_by_status counter\n';
  for (const [status, count] of Object.entries(metrics.requests.byStatus)) {
    output += `namaste_requests_by_status{status="${status}"} ${count}\n`;
  }
  output += '\n';
  
  output += '# HELP namaste_request_duration_seconds Request latency histogram\n';
  output += '# TYPE namaste_request_duration_seconds histogram\n';
  let cumulative = 0;
  for (const [bucket, count] of Object.entries(metrics.latency.buckets)) {
    cumulative += count;
    const le = bucket === 'Inf' ? '+Inf' : (parseInt(bucket) / 1000).toString();
    output += `namaste_request_duration_seconds_bucket{le="${le}"} ${cumulative}\n`;
  }
  output += `namaste_request_duration_seconds_sum ${metrics.latency.sum / 1000}\n`;
  output += `namaste_request_duration_seconds_count ${metrics.latency.count}\n\n`;
  
  output += '# HELP namaste_mappings_total Total mapping operations\n';
  output += '# TYPE namaste_mappings_total counter\n';
  output += `namaste_mappings_total{result="success"} ${metrics.mappings.successful}\n`;
  output += `namaste_mappings_total{result="failed"} ${metrics.mappings.failed}\n\n`;
  
  output += '# HELP namaste_mappings_by_equivalence Mappings by equivalence type\n';
  output += '# TYPE namaste_mappings_by_equivalence counter\n';
  for (const [eq, count] of Object.entries(metrics.mappings.byEquivalence)) {
    output += `namaste_mappings_by_equivalence{equivalence="${eq}"} ${count}\n`;
  }
  output += '\n';
  
  output += '# HELP namaste_mapping_confidence_avg Average mapping confidence\n';
  output += '# TYPE namaste_mapping_confidence_avg gauge\n';
  output += `namaste_mapping_confidence_avg ${metrics.mappings.avgConfidence.toFixed(4)}\n\n`;
  
  output += '# HELP namaste_embeddings_total Embedding operations\n';
  output += '# TYPE namaste_embeddings_total counter\n';
  output += `namaste_embeddings_total{type="generated"} ${metrics.embeddings.generated}\n`;
  output += `namaste_embeddings_total{type="cached"} ${metrics.embeddings.cached}\n`;
  output += `namaste_embeddings_total{type="error"} ${metrics.embeddings.errors}\n\n`;
  
  output += '# HELP namaste_ai_requests_total AI API requests\n';
  output += '# TYPE namaste_ai_requests_total counter\n';
  output += `namaste_ai_requests_total ${metrics.ai.requests}\n`;
  output += `namaste_ai_tokens_total ${metrics.ai.tokens}\n`;
  output += `namaste_ai_errors_total ${metrics.ai.errors}\n\n`;
  
  output += '# HELP namaste_uptime_seconds Server uptime\n';
  output += '# TYPE namaste_uptime_seconds gauge\n';
  output += `namaste_uptime_seconds ${uptime.toFixed(0)}\n`;
  
  return output;
};

/**
 * Get metrics as JSON
 */
export const getMetricsJson = () => ({
  ...metrics,
  uptime: (Date.now() - metrics.startTime) / 1000,
});

/**
 * Reset metrics (for testing)
 */
export const resetMetrics = () => {
  metrics.requests = { total: 0, byMethod: {}, byPath: {}, byStatus: {} };
  metrics.latency = { sum: 0, count: 0, buckets: { '50': 0, '100': 0, '250': 0, '500': 0, '1000': 0, '2500': 0, '5000': 0, '10000': 0, 'Inf': 0 } };
  metrics.mappings = { total: 0, successful: 0, failed: 0, byEquivalence: {}, avgConfidence: 0, totalConfidence: 0 };
  metrics.embeddings = { generated: 0, cached: 0, errors: 0 };
  metrics.ai = { requests: 0, tokens: 0, errors: 0, avgLatency: 0 };
  metrics.startTime = Date.now();
};
