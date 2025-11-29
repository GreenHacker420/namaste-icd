/**
 * API Client for NAMASTE-ICD Backend
 */

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

// Generic fetch wrapper
async function fetchApi(endpoint, options = {}) {
  const res = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: 'Request failed' }));
    throw new Error(error.message || `HTTP ${res.status}`);
  }

  return res.json();
}

// Dashboard
export async function getDashboard() {
  return fetchApi('/api/v1/frontend/dashboard');
}

// NAMASTE Codes
export async function getNamasteCodes(params = {}) {
  const searchParams = new URLSearchParams();
  if (params.system) searchParams.set('system', params.system);
  if (params.search) searchParams.set('search', params.search);
  if (params.hasMappings !== undefined) searchParams.set('hasMappings', String(params.hasMappings));
  if (params.page) searchParams.set('page', String(params.page));
  if (params.limit) searchParams.set('limit', String(params.limit));

  return fetchApi(`/api/v1/frontend/codes/namaste?${searchParams}`);
}

// TM2 Codes
export async function getTm2Codes(params = {}) {
  const searchParams = new URLSearchParams();
  if (params.category) searchParams.set('category', params.category);
  if (params.search) searchParams.set('search', params.search);
  if (params.page) searchParams.set('page', String(params.page));
  if (params.limit) searchParams.set('limit', String(params.limit));

  return fetchApi(`/api/v1/frontend/codes/tm2?${searchParams}`);
}

// Mappings
export async function getMappings(params = {}) {
  const searchParams = new URLSearchParams();
  if (params.system) searchParams.set('system', params.system);
  if (params.equivalence) searchParams.set('equivalence', params.equivalence);
  if (params.minConfidence) searchParams.set('minConfidence', String(params.minConfidence));
  if (params.search) searchParams.set('search', params.search);
  if (params.page) searchParams.set('page', String(params.page));
  if (params.limit) searchParams.set('limit', String(params.limit));

  return fetchApi(`/api/v1/frontend/mappings?${searchParams}`);
}

// Single Mapping
export async function getMapping(id) {
  return fetchApi(`/api/v1/frontend/mappings/${id}`);
}

// Create Mapping (AI)
export async function createMapping(code, system) {
  return fetchApi('/api/v1/mapping', {
    method: 'POST',
    body: JSON.stringify({ code, system }),
  });
}

// Autocomplete
export async function searchNamaste(query, system) {
  const params = new URLSearchParams({ q: query });
  if (system) params.set('system', system);
  return fetchApi(`/api/v1/autocomplete/namaste?${params}`);
}

export async function searchTm2(query) {
  return fetchApi(`/api/v1/autocomplete/tm2?q=${encodeURIComponent(query)}`);
}

// Quick Map
export async function quickMap(term, system = 'ayurveda') {
  return fetchApi('/api/v1/frontend/quick-map', {
    method: 'POST',
    body: JSON.stringify({ term, system }),
  });
}

// System Info
export async function getSystemInfo() {
  return fetchApi('/api/v1/frontend/system-info');
}

// Stats
export async function getStats() {
  return fetchApi('/api/v1/frontend/stats');
}

// Health Check
export async function checkHealth() {
  return fetchApi('/health');
}
