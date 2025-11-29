import 'dotenv/config';

/**
 * Application configuration - loaded from environment variables
 * Pure functional approach - no classes, just plain objects and functions
 */

export const config = Object.freeze({
  // Server
  port: parseInt(process.env.PORT || '3000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  isDev: process.env.NODE_ENV !== 'production',

  // Database
  database: {
    url: process.env.DATABASE_URL || 'postgresql://localhost:5432/namaste_icd',
  },

  // WHO ICD-11 API
  whoIcd: {
    clientId: process.env.WHO_ICD_CLIENT_ID || '',
    clientSecret: process.env.WHO_ICD_CLIENT_SECRET || '',
    tokenUrl: 'https://icdaccessmanagement.who.int/connect/token',
    apiBaseUrl: 'https://id.who.int',
    apiVersion: 'v2',
  },

  // Google AI (via LangChain)
  google: {
    apiKey: process.env.GOOGLE_API_KEY || '',
    projectId: process.env.GOOGLE_PROJECT_ID || '',
    location: process.env.GOOGLE_LOCATION || 'us-central1',
  },

  // LangSmith
  langsmith: {
    tracing: process.env.LANGSMITH_TRACING === 'true',
    apiKey: process.env.LANGSMITH_API_KEY || '',
    project: process.env.LANGSMITH_PROJECT || 'namaste-icd-mapping',
  },

  // FHIR
  fhir: {
    version: 'R4',
    baseUrl: process.env.FHIR_BASE_URL || 'http://localhost:3000/fhir',
    namaste: {
      ayurvedaSystem: 'https://namaste.ayush.gov.in/ayurveda',
      siddhaSystem: 'https://namaste.ayush.gov.in/siddha',
      unaniSystem: 'https://namaste.ayush.gov.in/unani',
    },
    icd11: {
      tm2System: 'http://id.who.int/icd/release/11/mms',
    },
  },
});

/**
 * Validate required configuration
 * @returns {{ valid: boolean, errors: string[] }}
 */
export const validateConfig = () => {
  const errors = [];

  if (!config.database.url) {
    errors.push('DATABASE_URL is required');
  }

  if (!config.whoIcd.clientId || !config.whoIcd.clientSecret) {
    errors.push('WHO_ICD_CLIENT_ID and WHO_ICD_CLIENT_SECRET are required');
  }

  if (!config.google.apiKey) {
    errors.push('GOOGLE_API_KEY is required for Gemini');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
};

/**
 * Log configuration (safe - no secrets)
 */
export const logConfig = (logger) => {
  logger.info({
    port: config.port,
    nodeEnv: config.nodeEnv,
    database: config.database.url.replace(/\/\/.*@/, '//*****@'),
    whoIcdConfigured: !!(config.whoIcd.clientId && config.whoIcd.clientSecret),
    googleConfigured: !!config.google.apiKey,
    langsmithEnabled: config.langsmith.tracing,
  }, 'Configuration loaded');
};
