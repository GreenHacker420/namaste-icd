import { config } from '../config/index.js';
import { logger } from '../config/logger.js';

/**
 * WHO ICD-11 API Client
 * Functional approach - pure functions for API interactions
 */

// Token cache
let tokenCache = {
  accessToken: null,
  expiresAt: null,
};

/**
 * Get OAuth 2.0 access token from WHO ICD API
 * @returns {Promise<string>} Access token
 */
export const getAccessToken = async () => {
  // Return cached token if still valid (with 5 min buffer)
  if (tokenCache.accessToken && tokenCache.expiresAt > Date.now() + 300000) {
    return tokenCache.accessToken;
  }

  const { clientId, clientSecret, tokenUrl } = config.whoIcd;

  if (!clientId || !clientSecret) {
    throw new Error('WHO ICD API credentials not configured');
  }

  const params = new URLSearchParams({
    grant_type: 'client_credentials',
    client_id: clientId,
    client_secret: clientSecret,
    scope: 'icdapi_access',
  });

  const response = await fetch(tokenUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params.toString(),
  });

  if (!response.ok) {
    const error = await response.text();
    logger.error({ status: response.status, error }, 'Failed to get ICD API token');
    throw new Error(`Failed to get ICD API token: ${response.status}`);
  }

  const data = await response.json();
  
  // Cache the token
  tokenCache = {
    accessToken: data.access_token,
    expiresAt: Date.now() + (data.expires_in * 1000),
  };

  logger.info('ICD API token obtained successfully');
  return tokenCache.accessToken;
};

/**
 * Make authenticated request to WHO ICD-11 API
 * @param {string} endpoint - API endpoint path
 * @param {Object} options - Fetch options
 * @returns {Promise<Object>} API response
 */
export const icdApiRequest = async (endpoint, options = {}) => {
  const token = await getAccessToken();
  const url = `${config.whoIcd.apiBaseUrl}${endpoint}`;

  const response = await fetch(url, {
    ...options,
    headers: {
      'Authorization': `Bearer ${token}`,
      'API-Version': config.whoIcd.apiVersion,
      'Accept': 'application/json',
      'Accept-Language': 'en',
      ...options.headers,
    },
  });

  if (!response.ok) {
    const error = await response.text();
    logger.error({ url, status: response.status, error }, 'ICD API request failed');
    throw new Error(`ICD API request failed: ${response.status}`);
  }

  return response.json();
};

/**
 * Get ICD-11 entity by ID
 * @param {string} entityId - Entity ID
 * @returns {Promise<Object>} Entity data
 */
export const getEntity = async (entityId) => {
  return icdApiRequest(`/icd/entity/${entityId}`);
};

/**
 * Search ICD-11 codes
 * @param {string} query - Search query
 * @param {Object} options - Search options
 * @returns {Promise<Object>} Search results
 */
export const searchCodes = async (query, options = {}) => {
  const params = new URLSearchParams({
    q: query,
    subtreeFilterUsesFoundationDescendants: 'false',
    includeKeywordResult: 'true',
    useFlexisearch: 'true',
    flatResults: 'true',
    highlightingEnabled: 'false',
    ...options,
  });

  return icdApiRequest(`/icd/release/11/2024-01/mms/search?${params}`);
};

/**
 * Get TM2 (Traditional Medicine Module 2) root entity
 * Chapter 26 - Supplementary Chapter Traditional Medicine Conditions
 * @returns {Promise<Object>} TM2 root data
 */
export const getTm2Root = async () => {
  // TM2 is in Chapter 26 of ICD-11
  return icdApiRequest('/icd/release/11/2024-01/mms/26');
};

/**
 * Get TM2 entity by code
 * @param {string} code - TM2 code (e.g., 'SK00', 'SM10')
 * @returns {Promise<Object>} TM2 entity data
 */
export const getTm2ByCode = async (code) => {
  const searchResult = await searchCodes(code, {
    chapterFilter: '26', // TM2 is in Chapter 26
  });
  
  if (searchResult.destinationEntities?.length > 0) {
    const entityId = searchResult.destinationEntities[0].id;
    return getEntity(entityId);
  }
  
  return null;
};

/**
 * Get all TM2 disorder categories
 * @returns {Promise<Array>} List of TM2 disorder categories
 */
export const getTm2DisorderCategories = async () => {
  const categories = [
    { range: 'SK00-SK5Z', name: 'Head, brain, nerve and movement disorders' },
    { range: 'SK60-SL2Z', name: 'Eye, ear, nose, throat and neck disorders' },
    { range: 'SL40-SL4Z', name: 'Respiratory system disorders' },
    { range: 'SL60-SM0Z', name: 'Heart, blood and circulatory disorders' },
    { range: 'SM10-SM7Z', name: 'Gastro-intestinal disorders' },
    { range: 'SM80-SN3Z', name: 'Urinary and reproductive system disorders' },
    { range: 'SN40-SN9Z', name: 'Skin, nail and hair disorders' },
    { range: 'SP00-SP4Z', name: 'Bone, joint and muscle disorders' },
    { range: 'SP50-SP9Z', name: 'Disorders affecting the whole body' },
    { range: 'SQ00-SQ4Z', name: 'Mental, emotional and behavioural disorders' },
    { range: 'SQ50-SQ8Z', name: 'External factors disorders' },
    { range: 'SR00-SR0Z', name: 'Childhood disorders' },
  ];

  return categories;
};

/**
 * Get TM2 pattern categories
 * @returns {Promise<Array>} List of TM2 pattern categories
 */
export const getTm2PatternCategories = async () => {
  const categories = [
    { range: 'SS00-SS4Z', name: 'Constitution patterns' },
    { range: 'SS50-SS9Z', name: 'Personality and temperament patterns' },
    { range: 'ST00-ST2Z', name: 'Abnormal temperament patterns' },
  ];

  return categories;
};

/**
 * Fetch all children of a TM2 entity
 * @param {string} entityUri - Entity URI
 * @returns {Promise<Array>} List of child entities
 */
export const getTm2Children = async (entityUri) => {
  const entity = await icdApiRequest(entityUri.replace(config.whoIcd.apiBaseUrl, ''));
  
  if (!entity.child || entity.child.length === 0) {
    return [];
  }

  const children = await Promise.all(
    entity.child.map(async (childUri) => {
      try {
        return await icdApiRequest(childUri.replace(config.whoIcd.apiBaseUrl, ''));
      } catch (error) {
        logger.warn({ childUri, error: error.message }, 'Failed to fetch child entity');
        return null;
      }
    })
  );

  return children.filter(Boolean);
};

/**
 * Test API connection
 * @returns {Promise<boolean>} Connection status
 */
export const testConnection = async () => {
  try {
    await getAccessToken();
    const root = await icdApiRequest('/icd/release/11/2024-01/mms');
    logger.info({ title: root.title }, 'ICD-11 API connection successful');
    return true;
  } catch (error) {
    logger.error({ error: error.message }, 'ICD-11 API connection failed');
    return false;
  }
};
