// Test Prisma Client instance for JobNaut
// This file exports a singleton instance of PrismaClient for testing

const { PrismaClient } = require('@prisma/client');

/**
 * Test Prisma Client instance
 * @type {PrismaClient}
 */
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: 'file:./test.db',
    },
  },
});

module.exports = prisma;
