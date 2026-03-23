const express = require('express');
const cors    = require('cors');
const helmet  = require('helmet');
const morgan  = require('morgan');
const cookieParser = require('cookie-parser');
const rateLimit    = require('express-rate-limit');
const { register } = require('prom-client');

const authRoutes     = require('./routes/auth');
const documentRoutes = require('./routes/documents');
const profileRoutes  = require('./routes/profile');
const logger         = require('./utils/logger');
const { metricsMiddleware } = require('./utils/metrics');

const app = express();

// ── Security ──────────────────────────────────────────
app.use(helmet());
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:3000' || 'http://192.168.1.142:3000',
  credentials: true,
}));

// ── Rate limiting ─────────────────────────────────────
// General API limiter
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 min
  max: 200,                  // generous for dev
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', limiter);

// Auth limiter — only restrict actual login/register, not refresh/logout
// 50 per 15 min is plenty for real use and won't bite during dev
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: process.env.NODE_ENV === 'production' ? 20 : 100,
  message: { error: 'Too many auth attempts, please try again later.' },
  // Only apply to login and register, not refresh or logout
  skip: (req) => {
    const path = req.path.toLowerCase();
    return path === '/refresh' || path === '/logout';
  },
});

// ── Parsing ───────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// ── Logging ───────────────────────────────────────────
app.use(morgan('combined', {
  stream: { write: (msg) => logger.http(msg.trim()) },
}));

// ── Metrics ───────────────────────────────────────────
app.use(metricsMiddleware);

// ── Health & Metrics endpoints ────────────────────────
app.get('/healthz', (_req, res) => {
  res.json({ status: 'ok', uptime: process.uptime(), ts: new Date() });
});

app.get('/metrics', async (_req, res) => {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
});

// ── Routes ────────────────────────────────────────────
app.use('/api/auth',      authLimiter, authRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/profile',   profileRoutes);

// ── 404 ───────────────────────────────────────────────
app.use((_req, res) => res.status(404).json({ error: 'Not found' }));

// ── Error handler ─────────────────────────────────────
app.use((err, _req, res, _next) => {
  logger.error(err.stack || err.message);
  const status = err.status || 500;
  res.status(status).json({
    error: process.env.NODE_ENV === 'production'
      ? 'Internal server error'
      : err.message,
  });
});

module.exports = app;