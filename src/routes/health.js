// Enhanced Health Check Endpoints for JobNaut
// Provides detailed health status for monitoring and orchestration

const express = require('express');
const router = express.Router();
const logger = require('../utils/logger');

// Import database client if available
let prisma;
try {
  const { PrismaClient } = require('@prisma/client');
  prisma = new PrismaClient();
} catch (error) {
  logger.warn('Prisma client not available for health checks');
}

// Import Redis client if available
let redisClient;
try {
  redisClient = require('../utils/redisClient');
} catch (error) {
  logger.warn('Redis client not available for health checks');
}

/**
 * Check database connection health
 */
async function checkDatabase() {
  if (!prisma) {
    return {
      status: 'unknown',
      message: 'Database client not configured',
    };
  }

  try {
    // Simple query to check database connectivity
    await prisma.$queryRaw`SELECT 1`;
    return {
      status: 'healthy',
      message: 'Database connection successful',
      responseTime: Date.now(),
    };
  } catch (error) {
    logger.error('Database health check failed', { error: error.message });
    return {
      status: 'unhealthy',
      message: 'Database connection failed',
      error: error.message,
    };
  }
}

/**
 * Check Redis connection health
 */
async function checkRedis() {
  if (!redisClient) {
    return {
      status: 'unknown',
      message: 'Redis client not configured',
    };
  }

  try {
    const start = Date.now();
    await redisClient.ping();
    const responseTime = Date.now() - start;

    return {
      status: 'healthy',
      message: 'Redis connection successful',
      responseTime: `${responseTime}ms`,
    };
  } catch (error) {
    logger.error('Redis health check failed', { error: error.message });
    return {
      status: 'unhealthy',
      message: 'Redis connection failed',
      error: error.message,
    };
  }
}

/**
 * Check external services health (optional)
 */
async function checkExternalServices() {
  const services = {};

  // Check AI providers if configured
  const aiProvider = process.env.AI_PROVIDER;
  if (aiProvider && aiProvider !== 'mock') {
    services.aiProvider = {
      name: aiProvider,
      status: 'unknown',
      message: 'External service check not implemented',
    };
  }

  return services;
}

/**
 * Check backup status
 */
async function checkBackupStatus() {
  const fs = require('fs').promises;
  const path = require('path');

  try {
    const backupDir = process.env.BACKUP_DIR || '/var/backups/jobnaut/postgresql';

    // Check if backup directory exists
    try {
      await fs.access(backupDir);
    } catch {
      return {
        status: 'unknown',
        message: 'Backup directory not accessible',
        path: backupDir,
      };
    }

    // Find most recent backup
    const files = await fs.readdir(backupDir);
    const backupFiles = files.filter((f) => f.startsWith('jobnaut_db_') && f.endsWith('.sql.gz'));

    if (backupFiles.length === 0) {
      return {
        status: 'warning',
        message: 'No backups found',
        backupCount: 0,
      };
    }

    // Get stats for most recent backup
    const backupStats = await Promise.all(
      backupFiles.map(async (file) => {
        const filePath = path.join(backupDir, file);
        const stats = await fs.stat(filePath);
        return { file, mtime: stats.mtime, size: stats.size };
      })
    );

    // Sort by modification time (newest first)
    backupStats.sort((a, b) => b.mtime - a.mtime);
    const mostRecent = backupStats[0];

    // Calculate age in hours
    const ageMs = Date.now() - mostRecent.mtime.getTime();
    const ageHours = Math.floor(ageMs / (1000 * 60 * 60));

    // Determine status based on backup age
    let status = 'healthy';
    let message = 'Backups are up to date';

    if (ageHours > 48) {
      status = 'unhealthy';
      message = 'Backup is too old';
    } else if (ageHours > 24) {
      status = 'warning';
      message = 'Backup is older than 24 hours';
    }

    return {
      status,
      message,
      lastBackup: mostRecent.mtime.toISOString(),
      lastBackupFile: mostRecent.file,
      backupAge: `${ageHours} hours`,
      backupSize: `${Math.round(mostRecent.size / 1024 / 1024)} MB`,
      backupCount: backupFiles.length,
    };
  } catch (error) {
    logger.error('Backup status check failed', { error: error.message });
    return {
      status: 'unknown',
      message: 'Backup check failed',
      error: error.message,
    };
  }
}

/**
 * Calculate overall health status
 */
function calculateOverallStatus(checks) {
  const statuses = Object.values(checks).map((check) =>
    typeof check === 'object' && 'status' in check ? check.status : 'unknown'
  );

  if (statuses.includes('unhealthy')) {
    return 'unhealthy';
  }
  if (statuses.includes('degraded')) {
    return 'degraded';
  }
  if (statuses.every((status) => status === 'healthy' || status === 'unknown')) {
    return 'healthy';
  }
  return 'unknown';
}

/**
 * Basic health check endpoint
 * Returns simple OK status for load balancers
 */
router.get('/', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    service: 'JobNaut API',
    version: '1.0.0',
  });
});

/**
 * Liveness probe endpoint
 * Indicates if the application is running
 */
router.get('/live', (req, res) => {
  res.status(200).json({
    status: 'alive',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

/**
 * Readiness probe endpoint
 * Indicates if the application is ready to serve traffic
 */
router.get('/ready', async (req, res) => {
  try {
    const checks = {
      database: await checkDatabase(),
      redis: await checkRedis(),
    };

    const overallStatus = calculateOverallStatus(checks);
    const isReady = overallStatus === 'healthy' || overallStatus === 'degraded';

    res.status(isReady ? 200 : 503).json({
      status: overallStatus,
      timestamp: new Date().toISOString(),
      checks,
    });
  } catch (error) {
    logger.error('Readiness check failed', { error: error.message });
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error.message,
    });
  }
});

/**
 * Backup status endpoint
 * Provides backup health information
 */
router.get('/backup', async (req, res) => {
  try {
    const backupStatus = await checkBackupStatus();

    const isHealthy = backupStatus.status === 'healthy';
    const statusCode = isHealthy ? 200 : backupStatus.status === 'warning' ? 200 : 503;

    res.status(statusCode).json({
      status: backupStatus.status,
      timestamp: new Date().toISOString(),
      backup: backupStatus,
    });
  } catch (error) {
    logger.error('Backup health check failed', { error: error.message });
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error.message,
    });
  }
});

/**
 * Detailed health check endpoint
 * Provides comprehensive health information
 */
router.get('/detailed', async (req, res) => {
  try {
    const [database, redis, externalServices, backup] = await Promise.all([
      checkDatabase(),
      checkRedis(),
      checkExternalServices(),
      checkBackupStatus(),
    ]);

    const checks = {
      database,
      redis,
      externalServices,
      backup,
    };

    const overallStatus = calculateOverallStatus(checks);

    // System information
    const systemInfo = {
      platform: process.platform,
      nodeVersion: process.version,
      memory: {
        total: `${Math.round(process.memoryUsage().heapTotal / 1024 / 1024)}MB`,
        used: `${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB`,
        external: `${Math.round(process.memoryUsage().external / 1024 / 1024)}MB`,
      },
      uptime: `${Math.round(process.uptime())}s`,
      pid: process.pid,
    };

    const statusCode = overallStatus === 'healthy' || overallStatus === 'degraded' ? 200 : 503;

    res.status(statusCode).json({
      status: overallStatus,
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      system: systemInfo,
      checks,
    });
  } catch (error) {
    logger.error('Detailed health check failed', { error: error.message, stack: error.stack });
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error.message,
    });
  }
});

/**
 * Startup probe endpoint
 * Indicates if the application has started successfully
 */
router.get('/startup', async (req, res) => {
  try {
    // Check if critical services are available
    const database = await checkDatabase();

    const isStarted = database.status === 'healthy' || database.status === 'unknown';

    res.status(isStarted ? 200 : 503).json({
      status: isStarted ? 'started' : 'starting',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    });
  } catch (error) {
    logger.error('Startup check failed', { error: error.message });
    res.status(503).json({
      status: 'starting',
      timestamp: new Date().toISOString(),
      error: error.message,
    });
  }
});

module.exports = router;
