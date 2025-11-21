// Prisma Client instance for JobNaut
// This file exports a singleton instance of PrismaClient

const { PrismaClient } = require('@prisma/client');

/**
 * Prisma Client instance
 * @type {PrismaClient}
 */
const prisma = new PrismaClient();

module.exports = prisma;
