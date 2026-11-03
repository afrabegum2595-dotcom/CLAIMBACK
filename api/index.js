/**
 * CLAIMBACK – Vercel Serverless Function
 * Handles ALL /api/* requests on Vercel.
 * req.url on Vercel contains the full path e.g. /api/stats, /api/products
 */

const fs   = require('fs');
const path = require('path');

const ProductRepository = require('../src/repository/productRepository');
const ProductService    = require('../src/services/productService');
const {
  calculateExpiryDate,
  calculateDaysRemaining,
  getWarrantyStatus
} = require('../src/services/warrantyService');

// Singleton – Vercel may reuse the same Lambda container between requests
let service;
function getService() {
  if (!service) {
    const repo = new ProductRepository();
    service = new ProductService(repo);
  }
  return service;
}

/* ---- helpers ---- */
function sendJSON(res, code, data) {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.status(code).json(data);
}

function parseBody(req) {
  return new Promise((resolve, reject) => {
    // Vercel already parses JSON bodies for us when Content-Type is application/json
    if (req.body !== undefined) return resolve(req.body || {});

    let raw = '';
    req.on('data', c => { raw += c.toString(); });
    req.on('end', () => {
      if (!raw) return resolve({});
      try { resolve(JSON.parse(raw)); }
      catch { reject(new Error('Invalid JSON')); }
    });
    req.on('error', reject);
  });
}

function getQuery(req) {
  // req.query is populated by Vercel
  if (req.query) return req.query;
  const u = new URL(req.url, 'http://localhost');
  return Object.fromEntries(u.searchParams);
}

/* ---- main handler ---- */
module.exports = async (req, res) => {
  const method = req.method.toUpperCase();

  // Preflight
  if (method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    return res.status(204).end();
  }

  const svc = getService();
  const query = getQuery(req);

  // Extract path after /api  →  "/stats", "/products", "/products/CB-0001" …
  // req.url on Vercel is the FULL original URL, e.g. "/api/products"
  let rawPath = req.url.split('?')[0];          // drop query string
  let apiPath = rawPath.replace(/^\/api/, '');  // "/stats", "/products", …
  if (!apiPath) apiPath = '/';

  try {
    /* ── GET /api/stats ── */
    if (apiPath === '/stats' && method === 'GET') {
      return sendJSON(res, 200, { success: true, data: svc.getDashboardStats() });
    }

    /* ── GET /api/products ── */
    if (apiPath === '/products' && method === 'GET') {
      const { search, status, category, sortBy, sortOrder } = query;
      const products = svc.getAll({ search, status, category, sortBy, sortOrder });
      return sendJSON(res, 200, { success: true, count: products.length, data: products });
    }

    /* ── POST /api/products ── */
    if (apiPath === '/products' && method === 'POST') {
      const body = await parseBody(req);
      const created = svc.create(body);
      return sendJSON(res, 201, { success: true, message: 'Product saved.', data: created });
    }

    /* ── single product routes /api/products/:id ── */
    const single = apiPath.match(/^\/products\/([A-Za-z0-9_-]+)$/);
    if (single) {
      const pid = single[1];

      if (method === 'GET') {
        const p = svc.getById(pid);
        if (!p) return sendJSON(res, 404, { success: false, message: `${pid} not found.` });
        return sendJSON(res, 200, { success: true, data: p });
      }

      if (method === 'PUT') {
        const body = await parseBody(req);
        const updated = svc.update(pid, body);
        return sendJSON(res, 200, { success: true, message: 'Updated.', data: updated });
      }

      if (method === 'DELETE') {
        const deleted = svc.delete(pid);
        return sendJSON(res, 200, { success: true, message: `${deleted.productName} deleted.`, data: deleted });
      }
    }

    /* ── POST /api/demo/load ── */
    if (apiPath === '/demo/load' && method === 'POST') {
      const stats = svc.loadDemoData();
      return sendJSON(res, 200, { success: true, message: '5 demo products loaded.', data: stats });
    }

    /* ── POST /api/demo/clear ── */
    if (apiPath === '/demo/clear' && method === 'POST') {
      const stats = svc.clearDemoData();
      return sendJSON(res, 200, { success: true, message: 'Demo products cleared.', data: stats });
    }

    /* ── GET /api/calculate ── */
    if (apiPath === '/calculate' && method === 'GET') {
      const { purchaseDate, duration, unit } = query;
      if (!purchaseDate || !duration)
        return sendJSON(res, 400, { success: false, message: 'Missing purchaseDate or duration.' });

      const expiryDate    = calculateExpiryDate(purchaseDate, duration, unit || 'MONTHS');
      const daysRemaining = calculateDaysRemaining(expiryDate);
      const status        = getWarrantyStatus(daysRemaining);
      return sendJSON(res, 200, {
        success: true,
        data: { purchaseDate, expiryDate, daysRemaining, statusKey: status.key, statusLabel: status.label }
      });
    }

    /* ── GET /api/export/csv ── */
    if (apiPath === '/export/csv' && method === 'GET') {
      const csv = svc.exportCSV();
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', 'attachment; filename="claimback-products.csv"');
      return res.status(200).end(csv);
    }

    /* ── GET /api  (health check) ── */
    if ((apiPath === '/' || apiPath === '') && method === 'GET') {
      return sendJSON(res, 200, {
        success: true,
        name: 'CLAIMBACK API',
        version: '1.0.0',
        status: 'operational'
      });
    }

    // Catch-all
    return sendJSON(res, 404, { success: false, message: `No API route: ${rawPath}` });

  } catch (err) {
    console.error('[API Error]', err);
    return sendJSON(res, err.statusCode || 500, {
      success: false,
      message: err.message || 'Internal server error',
      errors: err.errors || null
    });
  }
};
