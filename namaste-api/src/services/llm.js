import { ChatGoogleGenerativeAI, GoogleGenerativeAIEmbeddings } from '@langchain/google-genai';
import { config } from '../config/index.js';
import { logger } from '../config/logger.js';

/**
 * LLM and Embedding Services
 * Using LangChain.js with Google Gemini
 * 
 * Models:
 * - Chat: gemini-2.0-flash (fast), gemini-2.5-pro (reasoning)
 * - Embeddings: text-embedding-004 (768 dims), gemini-embedding-001
 * 
 * For biomedical/healthcare text, we use text-embedding-004 with
 * RETRIEVAL_DOCUMENT task type for optimal semantic matching.
 * 
 * Functional approach - factory functions for model instances
 */

/**
 * Create Gemini chat model instance
 * @param {Object} options - Model options
 * @returns {ChatGoogleGenerativeAI} Chat model instance
 */
export const createChatModel = (options = {}) => {
  const model = new ChatGoogleGenerativeAI({
    model: options.model || 'gemini-2.0-flash',
    apiKey: config.google.apiKey,
    temperature: options.temperature ?? 0.1,
    maxOutputTokens: options.maxTokens || 4096,
    ...options,
  });

  logger.debug({ model: options.model || 'gemini-2.0-flash' }, 'Chat model created');
  return model;
};

/**
 * Create Gemini Pro model for complex reasoning
 * Best for: medical terminology analysis, multi-step reasoning
 * @param {Object} options - Model options
 * @returns {ChatGoogleGenerativeAI} Chat model instance
 */
export const createGeminiPro = (options = {}) => {
  return createChatModel({
    model: 'gemini-2.5-pro-preview-06-05',
    temperature: 0,
    ...options,
  });
};

/**
 * Create Gemini Flash model for fast responses
 * Best for: preprocessing, quick lookups, simple tasks
 * @param {Object} options - Model options
 * @returns {ChatGoogleGenerativeAI} Chat model instance
 */
export const createGeminiFlash = (options = {}) => {
  return createChatModel({
    model: 'gemini-2.5-flash',
    temperature: 0.1,
    ...options,
  });
};

/**
 * Create Google AI embeddings model
 * Using text-embedding-004 (768 dimensions)
 * 
 * Task Types:
 * - RETRIEVAL_QUERY: For search queries
 * - RETRIEVAL_DOCUMENT: For documents to be searched
 * - SEMANTIC_SIMILARITY: For comparing text similarity
 * - CLASSIFICATION: For text classification
 * - CLUSTERING: For grouping similar texts
 * 
 * @param {Object} options - Embedding options
 * @returns {GoogleGenerativeAIEmbeddings} Embeddings instance
 */
export const createEmbeddings = (options = {}) => {
  const embeddings = new GoogleGenerativeAIEmbeddings({
    model: options.model || 'text-embedding-004',
    apiKey: config.google.apiKey,
    taskType: options.taskType || 'RETRIEVAL_DOCUMENT',
    ...options,
  });

  logger.debug({ 
    model: options.model || 'text-embedding-004',
    taskType: options.taskType || 'RETRIEVAL_DOCUMENT',
  }, 'Embeddings model created');
  return embeddings;
};

/**
 * Create biomedical/healthcare embeddings model
 * Optimized for medical terminology matching
 * Uses text-embedding-004 with RETRIEVAL_DOCUMENT task
 * 
 * Best for:
 * - NAMASTE code descriptions (Sanskrit/Tamil/Arabic medical terms)
 * - ICD-11 TM2 disorder definitions
 * - Traditional medicine terminology
 * 
 * @param {Object} options - Embedding options
 * @returns {GoogleGenerativeAIEmbeddings} Embeddings instance
 */
export const createBiomedicalEmbeddings = (options = {}) => {
  return createEmbeddings({
    model: 'text-embedding-004',
    taskType: 'RETRIEVAL_DOCUMENT',
    title: options.title || 'Medical Terminology',
    ...options,
  });
};

/**
 * Create query embeddings for search
 * Uses RETRIEVAL_QUERY task type for optimal search performance
 * @param {Object} options - Embedding options
 * @returns {GoogleGenerativeAIEmbeddings} Embeddings instance
 */
export const createQueryEmbeddings = (options = {}) => {
  return createEmbeddings({
    model: 'text-embedding-004',
    taskType: 'RETRIEVAL_QUERY',
    ...options,
  });
};

/**
 * Generate embeddings for text
 * @param {string|string[]} texts - Text(s) to embed
 * @param {Object} options - Embedding options
 * @returns {Promise<number[][]>} Embeddings
 */
export const embedTexts = async (texts, options = {}) => {
  const embeddings = createEmbeddings(options);
  const textArray = Array.isArray(texts) ? texts : [texts];
  
  try {
    const result = await embeddings.embedDocuments(textArray);
    logger.debug({ count: textArray.length }, 'Texts embedded');
    return result;
  } catch (error) {
    logger.error({ error: error.message }, 'Embedding failed');
    throw error;
  }
};

/**
 * Generate embedding for a single query
 * @param {string} query - Query text
 * @param {Object} options - Embedding options
 * @returns {Promise<number[]>} Embedding vector
 */
export const embedQuery = async (query, options = {}) => {
  const embeddings = createEmbeddings(options);
  
  try {
    const result = await embeddings.embedQuery(query);
    logger.debug({ queryLength: query.length }, 'Query embedded');
    return result;
  } catch (error) {
    logger.error({ error: error.message }, 'Query embedding failed');
    throw error;
  }
};

/**
 * Invoke chat model with messages
 * @param {string} prompt - User prompt
 * @param {Object} options - Model options
 * @returns {Promise<string>} Model response
 */
export const chat = async (prompt, options = {}) => {
  const model = options.model === 'pro' 
    ? createGeminiPro(options)
    : createGeminiFlash(options);

  try {
    const response = await model.invoke(prompt);
    return response.content;
  } catch (error) {
    logger.error({ error: error.message }, 'Chat invocation failed');
    throw error;
  }
};

/**
 * Invoke chat model with structured output
 * @param {string} prompt - User prompt
 * @param {Object} schema - Zod schema for output
 * @param {Object} options - Model options
 * @returns {Promise<Object>} Structured response
 */
export const chatWithStructuredOutput = async (prompt, schema, options = {}) => {
  const model = options.model === 'pro'
    ? createGeminiPro(options)
    : createGeminiFlash(options);

  const structuredModel = model.withStructuredOutput(schema);

  try {
    const response = await structuredModel.invoke(prompt);
    return response;
  } catch (error) {
    logger.error({ error: error.message }, 'Structured chat failed');
    throw error;
  }
};

// Default instances for convenience
export const defaultChatModel = createGeminiFlash();
export const defaultEmbeddings = createEmbeddings();
