const mongoose = require('mongoose');
const logger   = require('./logger');

async function connectDB() {
  const uri = process.env.MONGO_URI || 'mongodb://localhost:27017/collab-editor';
  await mongoose.connect(uri);
  logger.info(`MongoDB connected: ${mongoose.connection.host}`);

  mongoose.connection.on('error', (err) => logger.error('MongoDB error: ' + err));
  mongoose.connection.on('disconnected', () => logger.warn('MongoDB disconnected'));
}

module.exports = { connectDB };
