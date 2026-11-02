const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const Product = require('../src/models/Product');
const ProductRepository = require('../src/repository/productRepository');
const ProductService = require('../src/services/productService');
const {
  calculateExpiryDate,
  calculateDaysRemaining,
  getWarrantyStatus,
  WarrantyStatus,
  formatDateToISO
} = require('../src/services/warrantyService');
const { validateProductInput } = require('../src/utils/validator');

const TEST_DB_PATH = path.join(__dirname, 'test-products.json');

describe('CLAIMBACK - Test Scenarios & Acceptance Criteria', () => {
  let repo;
  let service;

  beforeEach(() => {
    // Clear test db file
    if (fs.existsSync(TEST_DB_PATH)) fs.unlinkSync(TEST_DB_PATH);
    if (fs.existsSync(`${TEST_DB_PATH}.bak`)) fs.unlinkSync(`${TEST_DB_PATH}.bak`);
    repo = new ProductRepository(TEST_DB_PATH);
    service = new ProductService(repo);
  });

  afterEach(() => {
    if (fs.existsSync(TEST_DB_PATH)) fs.unlinkSync(TEST_DB_PATH);
    if (fs.existsSync(`${TEST_DB_PATH}.bak`)) fs.unlinkSync(`${TEST_DB_PATH}.bak`);
  });

  // Section 14: Test Scenario 1 - Add product
  it('Scenario 1: Add product with valid details saves and returns CB-0001', () => {
    const product = service.create({
      productName: 'Dell XPS 15',
      brand: 'Dell',
      category: 'Electronics',
      purchaseDate: '2025-01-15',
      warrantyDuration: 12,
      warrantyUnit: 'MONTHS',
      purchasePrice: 1599.99,
      serialNumber: 'DELL-998822',
      seller: 'Dell Direct',
      notes: 'Premium support included'
    });

    assert.equal(product.productId, 'CB-0001');
    assert.equal(product.productName, 'Dell XPS 15');
    assert.equal(product.expiryDate, '2026-01-15');
    assert.ok(product.daysRemaining !== undefined);

    const all = service.getAll();
    assert.equal(all.length, 1);
    assert.equal(all[0].productId, 'CB-0001');
  });

  // Section 14: Test Scenario 2 - Missing required fields
  it('Scenario 2: Missing name is rejected with clear error', () => {
    assert.throws(
      () => {
        service.create({
          productName: '   ',
          brand: 'Dell',
          purchaseDate: '2025-01-15',
          warrantyDuration: 12,
          warrantyUnit: 'MONTHS'
        });
      },
      (err) => {
        assert.ok(err.errors.productName);
        return true;
      }
    );
  });

  // Section 14: Test Scenario 3 - Future purchase date
  it('Scenario 3: Future purchase date is rejected with validation message', () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 2);
    const futureDateStr = formatDateToISO(tomorrow);

    const validation = validateProductInput({
      productName: 'iPad Pro',
      brand: 'Apple',
      purchaseDate: futureDateStr,
      warrantyDuration: 12,
      warrantyUnit: 'MONTHS'
    });

    assert.equal(validation.isValid, false);
    assert.ok(validation.errors.purchaseDate.includes('future'));
  });

  // Section 14: Test Scenario 4 - Active status (> 30 days remaining)
  it('Scenario 4: Active status when days remaining is > 30', () => {
    const status = getWarrantyStatus(45);
    assert.equal(status.key, WarrantyStatus.ACTIVE);
    assert.equal(status.label, 'Active');
  });

  // Section 14: Test Scenario 5 - Expiring soon (0-30 days remaining)
  it('Scenario 5: Expiring soon when expiry date is 15 days away', () => {
    const status = getWarrantyStatus(15);
    assert.equal(status.key, WarrantyStatus.EXPIRING_SOON);
    assert.equal(status.label, 'Expiring Soon');
  });

  // Section 14: Test Scenario 6 - Expiry today (0 days remaining)
  it('Scenario 6: Expiry date today shows Expiring Soon with 0 days remaining', () => {
    const todayStr = formatDateToISO(new Date());
    const days = calculateDaysRemaining(todayStr, todayStr);
    assert.equal(days, 0);

    const status = getWarrantyStatus(days);
    assert.equal(status.key, WarrantyStatus.EXPIRING_SOON);
    assert.equal(status.label, 'Expiring Soon');
  });

  // Section 14: Test Scenario 7 - Expired status (yesterday or earlier)
  it('Scenario 7: Expired status when expiry date was yesterday', () => {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = formatDateToISO(yesterday);
    const todayStr = formatDateToISO(today);

    const days = calculateDaysRemaining(yesterdayStr, todayStr);
    assert.equal(days, -1);

    const status = getWarrantyStatus(days);
    assert.equal(status.key, WarrantyStatus.EXPIRED);
    assert.equal(status.label, 'Expired');
  });

  // Section 14: Test Scenario 8 - Search functionality
  it('Scenario 8: Search matches product name, brand, or ID case-insensitively', () => {
    service.create({
      productName: 'Logitech MX Master 3S',
      brand: 'Logitech',
      purchaseDate: '2025-01-01',
      warrantyDuration: 12,
      warrantyUnit: 'MONTHS'
    });
    service.create({
      productName: 'Keychron Q1 Pro',
      brand: 'Keychron',
      purchaseDate: '2025-01-01',
      warrantyDuration: 12,
      warrantyUnit: 'MONTHS'
    });

    const searchByName = service.getAll({ search: 'logitech' });
    assert.equal(searchByName.length, 1);
    assert.equal(searchByName[0].productName, 'Logitech MX Master 3S');

    const searchById = service.getAll({ search: 'cb-0002' });
    assert.equal(searchById.length, 1);
    assert.equal(searchById[0].productName, 'Keychron Q1 Pro');
  });

  // Section 14: Test Scenario 9 - Delete product
  it('Scenario 9: Confirm deletion removes record from list and file', () => {
    const p1 = service.create({
      productName: 'Kindle Paperwhite',
      brand: 'Amazon',
      purchaseDate: '2025-01-01',
      warrantyDuration: 1,
      warrantyUnit: 'YEARS'
    });

    assert.equal(service.getAll().length, 1);
    service.delete(p1.productId);
    assert.equal(service.getAll().length, 0);

    // Verify file content on disk is empty array
    const freshRepo = new ProductRepository(TEST_DB_PATH);
    assert.equal(freshRepo.findAll().length, 0);
  });

  // Section 14: Test Scenario 10 - Persistence survives restarts
  it('Scenario 10: Records persist after closing and reopening repo', () => {
    service.create({
      productName: 'Bose QuietComfort 45',
      brand: 'Bose',
      purchaseDate: '2025-01-01',
      warrantyDuration: 24,
      warrantyUnit: 'MONTHS'
    });

    // Simulate new app instance / restart
    const restartedRepo = new ProductRepository(TEST_DB_PATH);
    const restartedService = new ProductService(restartedRepo);
    const list = restartedService.getAll();

    assert.equal(list.length, 1);
    assert.equal(list[0].productId, 'CB-0001');
    assert.equal(list[0].productName, 'Bose QuietComfort 45');
  });

  // Section 7: Month arithmetic edge cases (e.g. Jan 31 + 1 month)
  it('Date Arithmetic: Jan 31 + 1 month correctly adjusts to Feb 28 or 29', () => {
    // 2024 is leap year: Jan 31 + 1 month = Feb 29
    const leapRes = calculateExpiryDate('2024-01-31', 1, 'MONTHS');
    assert.equal(leapRes, '2024-02-29');

    // 2025 is non-leap: Jan 31 + 1 month = Feb 28
    const nonLeapRes = calculateExpiryDate('2025-01-31', 1, 'MONTHS');
    assert.equal(nonLeapRes, '2025-02-28');

    // Years calculation: 2 years on 2024-05-10 = 2026-05-10
    const yearsRes = calculateExpiryDate('2024-05-10', 2, 'YEARS');
    assert.equal(yearsRes, '2026-05-10');
  });

  // Dashboard Aggregations
  it('Dashboard stats correctly aggregate totals and categories', () => {
    service.loadDemoData();
    const stats = service.getDashboardStats();

    assert.ok(stats.totalProducts >= 5);
    assert.equal(stats.totalProducts, stats.activeCount + stats.expiringSoonCount + stats.expiredCount);
    assert.ok(stats.upcomingExpirations.length > 0);
    assert.ok(stats.categories.length > 0);
  });
});
