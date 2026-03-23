const Redis  = require('ioredis');
const logger = require('./logger');

let client = null;

async function connectRedis() {
  const host = process.env.REDIS_HOST || 'localhost';
  const port = parseInt(process.env.REDIS_PORT || '6379');

  client = new Redis({
    host,
    port,
    lazyConnect:    true,
    enableOfflineQueue: false,
    // Don't retry forever in dev — give up after 3 attempts
    retryStrategy: (times) => {
      if (times >= 3) {
        logger.warn(`Redis unavailable after ${times} attempts — running without Redis (single-instance mode)`);
        return null; // stop retrying
      }
      return Math.min(times * 200, 1000);
    },
  });

  // Swallow unhandled error events so they don't crash the process
  client.on('error', (err) => {
    logger.warn('Redis error (non-fatal): ' + err.message);
  });

  try {
    await client.connect();
    logger.info(`Redis connected at ${host}:${port}`);
  } catch (err) {
    logger.warn(`Redis connection failed (${err.message}) — continuing without Redis.`);
    logger.warn('NOTE: In this mode only one backend instance is supported.');
    client = null; // Mark as unavailable so code paths can check
  }
}

function getRedis() { return client; }

function isRedisAvailable() { return client !== null && client.status === 'ready'; }

module.exports = { connectRedis, getRedis, isRedisAvailable };
