/**
 * CLAIMBACK Server
 * Standalone, lightweight HTTP server powered by Node.js built-in modules.
 * Zero external dependencies required.
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

const ProductRepository = require('./src/repository/productRepository');
const ProductService = require('./src/services/productService');
const { calculateExpiryDate, calculateDaysRemaining, getWarrantyStatus } = require('./src/services/warrantyService');

const PORT = process.env.PORT || 3000;
const PUBLIC_DIR = path.join(__dirname, 'public');
const DATA_FILE = path.join(__dirname, 'data', 'products.json');

const repo = new ProductRepository(DATA_FILE);
const service = new ProductService(repo);

// MIME types for static assets
const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon'
};

function sendJSON(res, statusCode, data) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  });
  res.end(JSON.stringify(data));
}

function parseBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
      // Guard against huge payloads (> 5MB)
      if (body.length > 5 * 1024 * 1024) {
        reject(new Error('Payload too large'));
      }
    });
    req.on('end', () => {
      if (!body) return resolve({});
      try {
        resolve(JSON.parse(body));
      } catch (err) {
        reject(new Error('Invalid JSON format'));
      }
    });
    req.on('error', reject);
  });
}

const server = http.createServer(async (req, res) => {
  const reqUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathname = reqUrl.pathname;
  const method = req.method.toUpperCase();
  const query = Object.fromEntries(reqUrl.searchParams);

  // Handle CORS preflight
  if (method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    });
    return res.end();
  }

  // --- API ROUTES ---
  if (pathname.startsWith('/api/')) {
    try {
      // 1. Dashboard Stats: GET /api/stats
      if (pathname === '/api/stats' && method === 'GET') {
        const stats = service.getDashboardStats();
        return sendJSON(res, 200, { success: true, data: stats });
      }

      // 2. Products List: GET /api/products
      if (pathname === '/api/products' && method === 'GET') {
        const { search, status, category, sortBy, sortOrder } = query;
        const products = service.getAll({ search, status, category, sortBy, sortOrder });
        return sendJSON(res, 200, { success: true, count: products.length, data: products });
      }

      // 3. Single Product: GET /api/products/:id
      const singleMatch = pathname.match(/^\/api\/products\/([A-Za-z0-9_-]+)$/);
      if (singleMatch && method === 'GET') {
        const productId = singleMatch[1];
        const product = service.getById(productId);
        if (!product) {
          return sendJSON(res, 404, { success: false, message: `Product ${productId} not found.` });
        }
        return sendJSON(res, 200, { success: true, data: product });
      }

      // 4. Create Product: POST /api/products
      if (pathname === '/api/products' && method === 'POST') {
        const body = await parseBody(req);
        const created = service.create(body);
        return sendJSON(res, 201, { success: true, message: 'Product saved successfully.', data: created });
      }

      // 5. Update Product: PUT /api/products/:id
      if (singleMatch && method === 'PUT') {
        const productId = singleMatch[1];
        const body = await parseBody(req);
        const updated = service.update(productId, body);
        return sendJSON(res, 200, { success: true, message: 'Product updated successfully.', data: updated });
      }

      // 6. Delete Product: DELETE /api/products/:id
      if (singleMatch && method === 'DELETE') {
        const productId = singleMatch[1];
        const deleted = service.delete(productId);
        return sendJSON(res, 200, { success: true, message: `Product ${deleted.productName} deleted.`, data: deleted });
      }

      // 7. Load Demo Data: POST /api/demo/load
      if (pathname === '/api/demo/load' && method === 'POST') {
        const stats = service.loadDemoData();
        return sendJSON(res, 200, { success: true, message: 'Sample demo products loaded.', data: stats });
      }

      // 8. Clear Demo Data: POST /api/demo/clear
      if (pathname === '/api/demo/clear' && method === 'POST') {
        const stats = service.clearDemoData();
        return sendJSON(res, 200, { success: true, message: 'Demo products removed.', data: stats });
      }

      // 9. Live Calculator Endpoint: GET /api/calculate?purchaseDate=...&duration=...&unit=...
      if (pathname === '/api/calculate' && method === 'GET') {
        const { purchaseDate, duration, unit } = query;
        if (!purchaseDate || !duration) {
          return sendJSON(res, 400, { success: false, message: 'Missing purchaseDate or duration query parameter.' });
        }
        const expiryDate = calculateExpiryDate(purchaseDate, duration, unit || 'MONTHS');
        const daysRemaining = calculateDaysRemaining(expiryDate);
        const status = getWarrantyStatus(daysRemaining);
        return sendJSON(res, 200, {
          success: true,
          data: {
            purchaseDate,
            expiryDate,
            daysRemaining,
            statusKey: status.key,
            statusLabel: status.label
          }
        });
      }

      // 10. Export to CSV: GET /api/export/csv
      if (pathname === '/api/export/csv' && method === 'GET') {
        const csvContent = service.exportCSV();
        res.writeHead(200, {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': 'attachment; filename="claimback-products.csv"'
        });
        return res.end(csvContent);
      }

      // Route not found in API
      return sendJSON(res, 404, { success: false, message: 'Endpoint not found' });
    } catch (err) {
      const statusCode = err.statusCode || 500;
      return sendJSON(res, statusCode, {
        success: false,
        message: err.message || 'Internal server error',
        errors: err.errors || null
      });
    }
  }

  // --- STATIC FILE SERVING ---
  let filePath = path.join(PUBLIC_DIR, pathname === '/' ? 'index.html' : pathname);
  const ext = path.extname(filePath).toLowerCase();

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      // Fallback to index.html for SPA routing if requested non-api path
      const indexPath = path.join(PUBLIC_DIR, 'index.html');
      fs.readFile(indexPath, (readErr, content) => {
        if (readErr) {
          res.writeHead(404, { 'Content-Type': 'text/plain' });
          return res.end('404 Not Found');
        }
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(content);
      });
      return;
    }

    const contentType = MIME_TYPES[ext] || 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': contentType });
    fs.createReadStream(filePath).pipe(res);
  });
});

if (require.main === module) {
  server.listen(PORT, () => {
    console.log(`====================================================`);
    console.log(` CLAIMBACK – Smart Warranty & Purchase Tracker`);
    console.log(` Server running locally at: http://localhost:${PORT}`);
    console.log(` Open your browser and navigate to http://localhost:${PORT}`);
    console.log(`====================================================`);
  });
}

module.exports = server;
