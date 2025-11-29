import pino from 'pino';
import { config } from './index.js';

/**
 * Create application logger
 * Functional approach - returns configured logger instance
 */
export const createLogger = (name = 'namaste-api') => {
  const transport = config.isDev
    ? {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'SYS:standard',
          ignore: 'pid,hostname',
        },
      }
    : undefined;

  return pino({
    name,
    level: config.isDev ? 'debug' : 'info',
    transport,
  });
};

// Default logger instance
export const logger = createLogger();
