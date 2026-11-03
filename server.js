/**
 * CLAIMBACK – Local Development Server
 * Runs the app locally at http://localhost:3000
 * On Vercel, api/index.js handles API requests and static files are served natively.
 */

const http = require('http');
const fs   = require('fs');
const path = require('path');

const ProductRepository = require('./src/repository/productRepository');
const ProductService    = require('./src/services/productService');
const {
  calculateExpiryDate,
  calculateDaysRemaining,
  getWarrantyStatus
} = require('./src/services/warrantyService');

const PORT       = process.env.PORT || 3000;
const PUBLIC_DIR = path.join(__dirname, 'public');

const repo    = new ProductRepository();
const service = new ProductService(repo);

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css':  'text/css; charset=utf-8',
  '.js':   'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg':  'image/svg+xml',
  '.png':  'image/png',
  '.ico':  'image/x-icon'
};

function sendJSON(res, code, data) {
  res.writeHead(code, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  });
  res.end(JSON.stringify(data));
}

function parseBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', c => {
      body += c.toString();
      if (body.length > 5e6) reject(new Error('Payload too large'));
    });
    req.on('end', () => {
      if (!body) return resolve({});
      try { resolve(JSON.parse(body)); }
      catch { reject(new Error('Invalid JSON')); }
    });
    req.on('error', reject);
  });
}

function serveStatic(res, filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const ct  = MIME[ext] || 'application/octet-stream';
  res.writeHead(200, { 'Content-Type': ct });
  fs.createReadStream(filePath).pipe(res);
}

function serveSPA(res) {
  const idx = path.join(PUBLIC_DIR, 'index.html');
  if (fs.existsSync(idx)) {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    fs.createReadStream(idx).pipe(res);
  } else {
    res.writeHead(404);
    res.end('Not found');
  }
}

const server = http.createServer(async (req, res) => {
  const u      = new URL(req.url, `http://localhost`);
  const pn     = u.pathname;
  const method = req.method.toUpperCase();
  const query  = Object.fromEntries(u.searchParams);

  /* ---------- CORS Preflight ---------- */
  if (method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    });
    return res.end();
  }

  /* ---------- API Routes ---------- */
  if (pn.startsWith('/api')) {
    const ap = pn.replace(/^\/api/, '') || '/';
    try {
      if (ap === '/stats' && method === 'GET')
        return sendJSON(res, 200, { success: true, data: service.getDashboardStats() });

      if (ap === '/products' && method === 'GET') {
        const { search, status, category, sortBy, sortOrder } = query;
        const products = service.getAll({ search, status, category, sortBy, sortOrder });
        return sendJSON(res, 200, { success: true, count: products.length, data: products });
      }

      if (ap === '/products' && method === 'POST') {
        const body = await parseBody(req);
        return sendJSON(res, 201, { success: true, message: 'Saved.', data: service.create(body) });
      }

      const single = ap.match(/^\/products\/([A-Za-z0-9_-]+)$/);
      if (single) {
        const pid = single[1];
        if (method === 'GET') {
          const p = service.getById(pid);
          if (!p) return sendJSON(res, 404, { success: false, message: `${pid} not found.` });
          return sendJSON(res, 200, { success: true, data: p });
        }
        if (method === 'PUT') {
          const body = await parseBody(req);
          return sendJSON(res, 200, { success: true, message: 'Updated.', data: service.update(pid, body) });
        }
        if (method === 'DELETE') {
          const d = service.delete(pid);
          return sendJSON(res, 200, { success: true, message: `${d.productName} deleted.`, data: d });
        }
      }

      if (ap === '/demo/load' && method === 'POST')
        return sendJSON(res, 200, { success: true, message: '5 demo products loaded.', data: service.loadDemoData() });

      if (ap === '/demo/clear' && method === 'POST')
        return sendJSON(res, 200, { success: true, message: 'Demo cleared.', data: service.clearDemoData() });

      if (ap === '/calculate' && method === 'GET') {
        const { purchaseDate, duration, unit } = query;
        if (!purchaseDate || !duration)
          return sendJSON(res, 400, { success: false, message: 'Missing purchaseDate or duration.' });
        const expiryDate    = calculateExpiryDate(purchaseDate, duration, unit || 'MONTHS');
        const daysRemaining = calculateDaysRemaining(expiryDate);
        const status        = getWarrantyStatus(daysRemaining);
        return sendJSON(res, 200, { success: true, data: { purchaseDate, expiryDate, daysRemaining, statusKey: status.key, statusLabel: status.label } });
      }

      if (ap === '/export/csv' && method === 'GET') {
        const csv = service.exportCSV();
        res.writeHead(200, { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': 'attachment; filename="claimback-products.csv"' });
        return res.end(csv);
      }

      if ((ap === '/' || ap === '') && method === 'GET')
        return sendJSON(res, 200, { success: true, name: 'CLAIMBACK API', version: '1.0.0', status: 'operational' });

      return sendJSON(res, 404, { success: false, message: `No route: ${pn}` });
    } catch (err) {
      return sendJSON(res, err.statusCode || 500, {
        success: false, message: err.message || 'Internal error', errors: err.errors || null
      });
    }
  }

  /* ---------- Static Files ---------- */
  const candidates = [
    path.join(PUBLIC_DIR, pn === '/' ? 'index.html' : pn),
    path.join(__dirname, pn === '/' ? 'index.html' : pn)
  ];

  for (const fp of candidates) {
    if (fs.existsSync(fp) && fs.statSync(fp).isFile()) {
      return serveStatic(res, fp);
    }
  }

  // SPA Fallback
  serveSPA(res);
});

/* ---- Export so api.test.js can call server.listen / server.close ---- */
function appHandler(req, res) { return server.emit('request', req, res); }
appHandler.listen  = (...a) => server.listen(...a);
appHandler.close   = (...a) => server.close(...a);
appHandler.server  = server;

module.exports = appHandler;

if (require.main === module) {
  server.listen(PORT, () => {
    console.log('====================================================');
    console.log(' CLAIMBACK – Smart Warranty & Purchase Tracker');
    console.log(` Server running at: http://localhost:${PORT}`);
    console.log('====================================================');
  });
}
