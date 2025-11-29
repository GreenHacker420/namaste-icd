/**
 * Vector Search Service
 * 
 * pgvector-based semantic similarity search
 * Uses HNSW index for fast approximate nearest neighbor search
 */

import { getPrisma, getPool } from '../db/client.js';
import { embedQuery, embedTexts } from './llm.js';
import { logger } from '../config/logger.js';
import { getCachedEmbedding, setCachedEmbedding } from '../middleware/cache.js';
import { recordEmbeddingMetrics } from '../middleware/metrics.js';

/**
 * Check if pgvector extension is installed
 */
export const checkPgvectorInstalled = async () => {
  const pool = getPool();
  try {
    const result = await pool.query(`
      SELECT EXISTS (
        SELECT 1 FROM pg_extension WHERE extname = 'vector'
      ) as installed
    `);
    return result.rows[0]?.installed || false;
  } catch (error) {
    logger.error({ error: error.message }, 'Failed to check pgvector');
    return false;
  }
};

/**
 * Initialize pgvector extension and indexes
 */
export const initializeVectorSearch = async () => {
  const pool = getPool();
  
  try {
    // Create extension if not exists
    await pool.query('CREATE EXTENSION IF NOT EXISTS vector');
    logger.info('pgvector extension enabled');

    // Add embedding columns if not exist
    await pool.query(`
      ALTER TABLE namaste_codes 
      ADD COLUMN IF NOT EXISTS embedding vector(768)
    `);
    
    await pool.query(`
      ALTER TABLE tm2_codes 
      ADD COLUMN IF NOT EXISTS embedding vector(768)
    `);
    
    logger.info('Embedding columns added');

    // Create HNSW indexes for fast similarity search
    await pool.query(`
      CREATE INDEX IF NOT EXISTS namaste_embedding_idx 
      ON namaste_codes 
      USING hnsw (embedding vector_cosine_ops)
      WITH (m = 16, ef_construction = 64)
    `);
    
    await pool.query(`
      CREATE INDEX IF NOT EXISTS tm2_embedding_idx 
      ON tm2_codes 
      USING hnsw (embedding vector_cosine_ops)
      WITH (m = 16, ef_construction = 64)
    `);
    
    logger.info('HNSW indexes created');
    
    return true;
  } catch (error) {
    logger.error({ error: error.message }, 'Failed to initialize vector search');
    return false;
  }
};

/**
 * Generate and store embedding for a single code
 */
export const generateCodeEmbedding = async (code, type = 'namaste') => {
  const pool = getPool();
  
  try {
    // Create text for embedding
    let text;
    if (type === 'namaste') {
      text = [
        code.shortDefinition,
        code.englishName,
        code.longDefinition,
        code.term,
      ].filter(Boolean).join(' ');
    } else {
      text = [
        code.title,
        code.definition,
        code.synonyms,
      ].filter(Boolean).join(' ');
    }

    if (!text || text.trim().length < 3) {
      logger.warn({ code: code.code, type }, 'Insufficient text for embedding');
      return null;
    }

    // Check cache
    const cached = getCachedEmbedding(text);
    if (cached) {
      recordEmbeddingMetrics('cached');
      return cached;
    }

    // Generate embedding
    const embedding = await embedQuery(text);
    recordEmbeddingMetrics('generated');

    // Cache it
    setCachedEmbedding(text, embedding);

    // Store in database
    const table = type === 'namaste' ? 'namaste_codes' : 'tm2_codes';
    await pool.query(
      `UPDATE ${table} SET embedding = $1::vector WHERE id = $2`,
      [`[${embedding.join(',')}]`, code.id]
    );

    return embedding;
  } catch (error) {
    logger.error({ error: error.message, code: code.code }, 'Failed to generate embedding');
    recordEmbeddingMetrics('error');
    return null;
  }
};

/**
 * Batch generate embeddings for codes
 */
export const batchGenerateEmbeddings = async (type = 'namaste', batchSize = 50, onProgress) => {
  const pool = getPool();
  const prisma = getPrisma();
  
  const table = type === 'namaste' ? 'namaste_codes' : 'tm2_codes';
  const model = type === 'namaste' ? prisma.namasteCode : prisma.tm2Code;
  
  // Get codes without embeddings
  const codesWithoutEmbeddings = await pool.query(`
    SELECT id, code, term, short_definition, english_name, long_definition, title, definition, synonyms
    FROM ${table}
    WHERE embedding IS NULL
    ORDER BY id
  `);
  
  const total = codesWithoutEmbeddings.rows.length;
  logger.info({ type, total }, 'Starting batch embedding generation');
  
  let processed = 0;
  let errors = 0;
  
  // Process in batches
  for (let i = 0; i < total; i += batchSize) {
    const batch = codesWithoutEmbeddings.rows.slice(i, i + batchSize);
    
    // Create texts for batch embedding
    const texts = batch.map(code => {
      if (type === 'namaste') {
        return [
          code.short_definition,
          code.english_name,
          code.long_definition,
          code.term,
        ].filter(Boolean).join(' ') || code.code;
      } else {
        return [
          code.title,
          code.definition,
          code.synonyms,
        ].filter(Boolean).join(' ') || code.code;
      }
    });
    
    try {
      // Generate embeddings in batch
      const embeddings = await embedTexts(texts);
      recordEmbeddingMetrics('generated', batch.length);
      
      // Store embeddings
      for (let j = 0; j < batch.length; j++) {
        const code = batch[j];
        const embedding = embeddings[j];
        
        if (embedding && embedding.length === 768) {
          await pool.query(
            `UPDATE ${table} SET embedding = $1::vector WHERE id = $2`,
            [`[${embedding.join(',')}]`, code.id]
          );
          processed++;
        } else {
          errors++;
        }
      }
      
      // Report progress
      if (onProgress) {
        onProgress({
          processed,
          total,
          errors,
          percentage: ((processed / total) * 100).toFixed(1),
        });
      }
      
      logger.debug({ processed, total, batch: i / batchSize + 1 }, 'Batch processed');
      
      // Rate limiting - wait between batches
      await new Promise(resolve => setTimeout(resolve, 1000));
      
    } catch (error) {
      logger.error({ error: error.message, batch: i / batchSize + 1 }, 'Batch embedding failed');
      errors += batch.length;
      recordEmbeddingMetrics('error', batch.length);
    }
  }
  
  logger.info({ processed, errors, total }, 'Batch embedding generation complete');
  
  return { processed, errors, total };
};

/**
 * Search TM2 codes by vector similarity
 */
export const searchTm2BySimilarity = async (queryText, limit = 10, minSimilarity = 0.5) => {
  const pool = getPool();
  
  try {
    // Generate query embedding
    const queryEmbedding = await embedQuery(queryText);
    
    if (!queryEmbedding || queryEmbedding.length !== 768) {
      logger.warn('Failed to generate query embedding');
      return [];
    }
    
    // Search using cosine similarity
    const result = await pool.query(`
      SELECT 
        id,
        code,
        title,
        definition,
        category,
        synonyms,
        1 - (embedding <=> $1::vector) as similarity
      FROM tm2_codes
      WHERE embedding IS NOT NULL
        AND 1 - (embedding <=> $1::vector) >= $2
      ORDER BY embedding <=> $1::vector
      LIMIT $3
    `, [`[${queryEmbedding.join(',')}]`, minSimilarity, limit]);
    
    return result.rows.map(row => ({
      ...row,
      score: parseFloat(row.similarity),
    }));
  } catch (error) {
    logger.error({ error: error.message }, 'Vector search failed');
    return [];
  }
};

/**
 * Search NAMASTE codes by vector similarity
 */
export const searchNamasteBySimilarity = async (queryText, system, limit = 10, minSimilarity = 0.5) => {
  const pool = getPool();
  
  try {
    const queryEmbedding = await embedQuery(queryText);
    
    if (!queryEmbedding || queryEmbedding.length !== 768) {
      return [];
    }
    
    let query = `
      SELECT 
        id,
        code,
        term,
        system,
        short_definition,
        english_name,
        1 - (embedding <=> $1::vector) as similarity
      FROM namaste_codes
      WHERE embedding IS NOT NULL
        AND 1 - (embedding <=> $1::vector) >= $2
    `;
    
    const params = [`[${queryEmbedding.join(',')}]`, minSimilarity];
    
    if (system) {
      query += ` AND system = $3`;
      params.push(system.toUpperCase());
    }
    
    query += ` ORDER BY embedding <=> $1::vector LIMIT $${params.length + 1}`;
    params.push(limit);
    
    const result = await pool.query(query, params);
    
    return result.rows.map(row => ({
      ...row,
      score: parseFloat(row.similarity),
    }));
  } catch (error) {
    logger.error({ error: error.message }, 'NAMASTE vector search failed');
    return [];
  }
};

/**
 * Get embedding statistics
 */
export const getEmbeddingStats = async () => {
  const pool = getPool();
  
  try {
    const [namasteStats, tm2Stats] = await Promise.all([
      pool.query(`
        SELECT 
          COUNT(*) as total,
          COUNT(embedding) as with_embedding,
          COUNT(*) - COUNT(embedding) as without_embedding
        FROM namaste_codes
      `),
      pool.query(`
        SELECT 
          COUNT(*) as total,
          COUNT(embedding) as with_embedding,
          COUNT(*) - COUNT(embedding) as without_embedding
        FROM tm2_codes
      `),
    ]);
    
    return {
      namaste: {
        total: parseInt(namasteStats.rows[0].total),
        withEmbedding: parseInt(namasteStats.rows[0].with_embedding),
        withoutEmbedding: parseInt(namasteStats.rows[0].without_embedding),
        coverage: ((namasteStats.rows[0].with_embedding / namasteStats.rows[0].total) * 100).toFixed(1) + '%',
      },
      tm2: {
        total: parseInt(tm2Stats.rows[0].total),
        withEmbedding: parseInt(tm2Stats.rows[0].with_embedding),
        withoutEmbedding: parseInt(tm2Stats.rows[0].without_embedding),
        coverage: ((tm2Stats.rows[0].with_embedding / tm2Stats.rows[0].total) * 100).toFixed(1) + '%',
      },
    };
  } catch (error) {
    logger.error({ error: error.message }, 'Failed to get embedding stats');
    return null;
  }
};
