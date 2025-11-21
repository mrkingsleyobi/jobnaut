// Database configuration for JobNaut
// Using PostgreSQL with Prisma ORM as specified in the implementation plan

/**
 * Database configuration object
 * @typedef {Object} DatabaseConfig
 * @property {string} DATABASE_URL - PostgreSQL connection string
 * @property {Object} PRISMA_OPTIONS - Prisma client options
 * @property {string} ENVIRONMENT - Current environment (development, test, production)
 */

const dbConfig = {
  DATABASE_URL: process.env.DATABASE_URL || 'postgresql://user:password@localhost:5432/jobnaut',
  PRISMA_OPTIONS: {
    log: ['query', 'info', 'warn', 'error'],
    errorFormat: 'pretty',
  },
  ENVIRONMENT: process.env.NODE_ENV || 'development',
};

module.exports = dbConfig;
