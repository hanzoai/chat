const { resolveAllowedOrigin } = require('~/server/utils/allowedOrigins');

function setHeaders(req, res, next) {
  // SSE streams answer the same origins as every other route — see
  // `server/utils/allowedOrigins`, which is the one place that decides.
  const allowedOrigin = resolveAllowedOrigin(req.headers.origin);
  const headers = {
    Connection: 'keep-alive',
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    'X-Accel-Buffering': 'no',
  };
  if (allowedOrigin) {
    headers['Access-Control-Allow-Origin'] = allowedOrigin;
    headers['Vary'] = 'Origin';
  }
  res.writeHead(200, headers);
  next();
}

module.exports = setHeaders;
