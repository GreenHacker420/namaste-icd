import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import { config } from '../config/index.js';
import { logger } from '../config/logger.js';

/**
 * Prisma client singleton with PostgreSQL adapter
 * Prisma 7 requires an adapter for database connections
 * Functional approach - single instance with helper functions
 */

let prismaInstance = null;
let pgPool = null;

/**
 * Get or create Prisma client instance
 * @returns {PrismaClient}
 */
export const getPrisma = () => {
  if (!prismaInstance) {
    // Create PostgreSQL connection pool
    pgPool = new pg.Pool({
      connectionString: config.database.url,
    });

    // Create Prisma adapter
    const adapter = new PrismaPg(pgPool);

    // Create Prisma client with adapter
    prismaInstance = new PrismaClient({
      adapter,
    });

    logger.debug('Prisma client created with PostgreSQL adapter');
  }
  return prismaInstance;
};

/**
 * Connect to database
 */
export const connectDb = async () => {
  const prisma = getPrisma();
  try {
    await prisma.$connect();
    logger.info('Database connected via Prisma');
    return true;
  } catch (error) {
    logger.error({ error: error.message }, 'Database connection failed');
    return false;
  }
};

/**
 * Disconnect from database
 */
export const disconnectDb = async () => {
  if (prismaInstance) {
    await prismaInstance.$disconnect();
    prismaInstance = null;
  }
  if (pgPool) {
    await pgPool.end();
    pgPool = null;
  }
  logger.info('Database disconnected');
};

/**
 * Transaction helper
 * @param {Function} fn - Function to execute in transaction
 */
export const withTransaction = async (fn) => {
  const prisma = getPrisma();
  return prisma.$transaction(fn);
};

/**
 * Get the raw PostgreSQL pool for direct queries
 * Useful for pgvector operations
 */
export const getPool = () => {
  if (!pgPool) {
    getPrisma(); // This initializes the pool
  }
  return pgPool;
};

// Lazy getter for prisma instance
export const prisma = {
  get client() {
    return getPrisma();
  }
};
