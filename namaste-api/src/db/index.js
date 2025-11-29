import postgres from 'postgres';
import { config } from '../config/index.js';
import { logger } from '../config/logger.js';

/**
 * PostgreSQL connection using postgres.js
 * Functional approach - exports connection and query helpers
 */

// Create SQL connection
export const sql = postgres(config.database.url, {
  max: 10,
  idle_timeout: 20,
  connect_timeout: 10,
  transform: {
    undefined: null,
  },
});

/**
 * Test database connection
 * @returns {Promise<boolean>}
 */
export const testConnection = async () => {
  try {
    const result = await sql`SELECT NOW() as now`;
    logger.info({ time: result[0].now }, 'Database connected');
    return true;
  } catch (error) {
    logger.error({ error: error.message }, 'Database connection failed');
    return false;
  }
};

/**
 * Close database connection
 */
export const closeConnection = async () => {
  await sql.end();
  logger.info('Database connection closed');
};

/**
 * Transaction helper
 * @param {Function} fn - Function to execute in transaction
 */
export const transaction = async (fn) => {
  return sql.begin(async (tx) => {
    return fn(tx);
  });
};
