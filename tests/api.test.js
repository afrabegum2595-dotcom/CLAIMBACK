const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const http = require('http');
const fs = require('fs');
const path = require('path');

const server = require('../server');

const TEST_PORT = 3199;
const BASE_URL = `http://localhost:${TEST_PORT}`;

function makeRequest(path, options = {}) {
  return new Promise((resolve, reject) => {
    const url = `${BASE_URL}${path}`;
    const req = http.request(url, options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        let json = null;
        try {
          json = JSON.parse(data);
        } catch (_) {}
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          data,
          json
        });
      });
    });
    req.on('error', reject);
    if (options.body) {
      req.write(typeof options.body === 'string' ? options.body : JSON.stringify(options.body));
    }
    req.end();
  });
}

describe('CLAIMBACK - API Endpoints Integration Test', () => {
  before(() => {
    return new Promise((resolve) => {
      server.listen(TEST_PORT, resolve);
    });
  });

  after(() => {
    return new Promise((resolve) => {
      server.close(resolve);
    });
  });

  it('GET /api/stats returns status counts and categories', async () => {
    const res = await makeRequest('/api/stats');
    assert.equal(res.statusCode, 200);
    assert.ok(res.json.success);
    assert.ok(res.json.data.totalProducts !== undefined);
  });

  it('POST /api/products creates product and auto-generates ID', async () => {
    const payload = {
      productName: 'Sony WH-1000XM4',
      brand: 'Sony',
      category: 'Electronics',
      purchaseDate: '2025-01-10',
      warrantyDuration: 12,
      warrantyUnit: 'MONTHS',
      purchasePrice: 299.99
    };
    const res = await makeRequest('/api/products', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: payload
    });

    assert.equal(res.statusCode, 201);
    assert.ok(res.json.success);
    assert.ok(res.json.data.productId.startsWith('CB-'));
    assert.equal(res.json.data.productName, 'Sony WH-1000XM4');
    assert.equal(res.json.data.expiryDate, '2026-01-10');
  });

  it('GET /api/products returns filtered results with search', async () => {
    const res = await makeRequest('/api/products?search=Sony');
    assert.equal(res.statusCode, 200);
    assert.ok(res.json.success);
    assert.ok(res.json.count >= 1);
  });

  it('GET /api/calculate computes live warranty without saving', async () => {
    const res = await makeRequest('/api/calculate?purchaseDate=2024-01-31&duration=1&unit=MONTHS');
    assert.equal(res.statusCode, 200);
    assert.equal(res.json.data.expiryDate, '2024-02-29'); // Leap year 2024
    assert.equal(res.json.data.statusKey, 'EXPIRED');
  });

  it('GET /api/export/csv returns valid CSV format', async () => {
    const res = await makeRequest('/api/export/csv');
    assert.equal(res.statusCode, 200);
    assert.ok(res.headers['content-type'].includes('text/csv'));
    assert.ok(res.data.includes('Product ID'));
  });
});
