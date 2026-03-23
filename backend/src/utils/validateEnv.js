const logger = require('./logger');

const REQUIRED = [
  'JWT_SECRET',
  'JWT_REFRESH_SECRET',
];

const RECOMMENDED = [
  'MONGO_URI',
  'CLIENT_URL',
];

module.exports = function validateEnv() {
  let hasError = false;

  for (const key of REQUIRED) {
    if (!process.env[key]) {
      logger.error(`Missing required environment variable: ${key}`);
      hasError = true;
    }
  }

  // Warn about insecure defaults in production
  if (process.env.NODE_ENV === 'production') {
    if (process.env.JWT_SECRET?.includes('dev_') ||
        process.env.JWT_SECRET?.length < 32) {
      logger.error('JWT_SECRET looks insecure for production. Use a random 32+ char string.');
      hasError = true;
    }
    if (process.env.JWT_REFRESH_SECRET?.includes('dev_') ||
        process.env.JWT_REFRESH_SECRET?.length < 32) {
      logger.error('JWT_REFRESH_SECRET looks insecure for production.');
      hasError = true;
    }
  }

  for (const key of RECOMMENDED) {
    if (!process.env[key]) {
      logger.warn(`Recommended env variable not set: ${key} (using default)`);
    }
  }

  if (hasError) {
    logger.error('Environment validation failed. Check your .env file.');
    process.exit(1);
  }
};
