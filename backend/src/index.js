require('dotenv').config();
const http = require('http');
const app  = require('./app');
const { initSocket }    = require('./socket');
const { connectDB }     = require('./utils/db');
const { connectRedis }  = require('./utils/redis');
const logger            = require('./utils/logger');
const validateEnv       = require('./utils/validateEnv');
const { startSnapshotJob } = require('./utils/snapshotJob');

const PORT = process.env.PORT || 5000;

async function bootstrap() {
  // Validate env vars before doing anything
  validateEnv();

  try {
    // MongoDB is required
    await connectDB();

    // Redis is optional — app runs single-instance without it
    await connectRedis();

    const server = http.createServer(app);
    initSocket(server);
    startSnapshotJob();

    server.listen(PORT, () => {
      logger.info(`Server running on port ${PORT} [${process.env.NODE_ENV || 'development'}]`);
      logger.info(`API:    http://localhost:${PORT}/api`);
      logger.info(`Health: http://localhost:${PORT}/healthz`);
    });

    const shutdown = (signal) => {
      logger.info(`${signal} received — shutting down gracefully`);
      server.close(() => process.exit(0));
    };
    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT',  () => shutdown('SIGINT'));

  } catch (err) {
    logger.error('Bootstrap failed: ' + err.message);
    logger.error(err.stack);
    process.exit(1);
  }
}

bootstrap();
