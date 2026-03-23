const client = require('prom-client');

// Collect default Node.js metrics (memory, CPU, event loop lag)
client.collectDefaultMetrics({ prefix: 'collab_' });

// ── Custom metrics ────────────────────────────────────
const httpRequestDuration = new client.Histogram({
  name:    'collab_http_request_duration_seconds',
  help:    'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5],
});

const httpRequestTotal = new client.Counter({
  name:       'collab_http_requests_total',
  help:       'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code'],
});

const activeWebSockets = new client.Gauge({
  name: 'collab_active_websockets',
  help: 'Number of currently connected WebSocket clients',
});

const documentEdits = new client.Counter({
  name:       'collab_document_edits_total',
  help:       'Total number of document edit events received',
  labelNames: ['documentId'],
});

// ── Express middleware ────────────────────────────────
function metricsMiddleware(req, res, next) {
  const end = httpRequestDuration.startTimer();
  res.on('finish', () => {
    const route  = req.route?.path || req.path || 'unknown';
    const labels = { method: req.method, route, status_code: res.statusCode };
    end(labels);
    httpRequestTotal.inc(labels);
  });
  next();
}

module.exports = {
  metricsMiddleware,
  activeWebSockets,
  documentEdits,
};
