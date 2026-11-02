/**
 * Product Repository
 * Implements FR-08: local JSON persistence, automatic directory/file creation,
 * atomic save with backup, and resilient error recovery.
 * Compatible with both local environments and Vercel serverless (/tmp fallback).
 */

const fs = require('fs');
const path = require('path');
const Product = require('../models/Product');
const { formatDateToISO } = require('../services/warrantyService');

class ProductRepository {
  constructor(filePath) {
    const isVercel = Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);
    this.isCustomPath = Boolean(filePath);
    
    if (filePath) {
      this.filePath = filePath;
    } else if (isVercel) {
      this.filePath = path.join('/tmp', 'products.json');
    } else {
      this.filePath = path.join(__dirname, '..', '..', 'data', 'products.json');
    }

    this.seedPath = path.join(__dirname, '..', '..', 'data', 'products.json');
    this.backupPath = `${this.filePath}.bak`;
    this.ensureDirectoryExists();
    if (!this.isCustomPath) {
      this.initializeSeedIfNeeded();
    }
  }

  ensureDirectoryExists() {
    try {
      const dir = path.dirname(this.filePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    } catch (err) {
      console.warn('[Repository] Could not ensure directory:', err.message);
    }
  }

  initializeSeedIfNeeded() {
    try {
      // If running on Vercel /tmp and file does not exist yet, copy initial seed if available
      if (this.filePath.startsWith('/tmp') && !fs.existsSync(this.filePath)) {
        if (fs.existsSync(this.seedPath)) {
          fs.copyFileSync(this.seedPath, this.filePath);
        } else {
          const demos = this.getDemoProducts();
          this.saveAll(demos);
        }
      }
    } catch (err) {
      console.warn('[Repository] Seed initialization note:', err.message);
    }
  }

  /**
   * Load all products from JSON file.
   * If file doesn't exist or is empty/corrupt, returns empty array safely.
   */
  findAll() {
    try {
      if (!fs.existsSync(this.filePath)) {
        // Fallback to seed path only if not a custom test path and seed exists
        if (!this.isCustomPath && fs.existsSync(this.seedPath)) {
          const content = fs.readFileSync(this.seedPath, 'utf-8').trim();
          if (content) {
            const raw = JSON.parse(content);
            if (Array.isArray(raw)) return raw.map(i => new Product(i));
          }
        }
        return [];
      }

      const content = fs.readFileSync(this.filePath, 'utf-8').trim();
      if (!content) {
        return [];
      }

      const rawList = JSON.parse(content);
      if (!Array.isArray(rawList)) {
        console.warn('[Repository] File content was not an array, initializing with empty list');
        return [];
      }

      return rawList.map(item => new Product(item));
    } catch (err) {
      console.error('[Repository] Error reading data file:', err.message);
      // Attempt restore from backup if available
      if (fs.existsSync(this.backupPath)) {
        try {
          const backupContent = fs.readFileSync(this.backupPath, 'utf-8').trim();
          if (backupContent) {
            const rawList = JSON.parse(backupContent);
            if (Array.isArray(rawList)) {
              console.info('[Repository] Successfully recovered from backup file');
              return rawList.map(item => new Product(item));
            }
          }
        } catch (backupErr) {
          console.error('[Repository] Backup restore failed:', backupErr.message);
        }
      }
      return [];
    }
  }

  /**
   * Save array of products to JSON file.
   * Creates a backup copy before overwriting.
   */
  saveAll(products) {
    this.ensureDirectoryExists();

    try {
      // 1. Create backup if current file exists and has content
      if (fs.existsSync(this.filePath)) {
        try {
          fs.copyFileSync(this.filePath, this.backupPath);
        } catch (copyErr) {
          console.warn('[Repository] Could not write backup copy:', copyErr.message);
        }
      }

      // 2. Prepare serialized data
      const serialized = products.map(p => (p instanceof Product ? p.toJSON() : p));
      const jsonStr = JSON.stringify(serialized, null, 2);

      // 3. Write to temp file then rename (atomic write pattern)
      const tempPath = `${this.filePath}.tmp.${Date.now()}`;
      fs.writeFileSync(tempPath, jsonStr, 'utf-8');
      fs.renameSync(tempPath, this.filePath);

      return true;
    } catch (err) {
      console.error('[Repository] Failed to save products:', err.message);
      throw new Error(`Data persistence failed: ${err.message}`);
    }
  }

  /**
   * Realistic demo data clearly labelled for testing.
   */
  getDemoProducts() {
    const today = new Date();

    const dMinus18M = new Date(today);
    dMinus18M.setMonth(dMinus18M.getMonth() - 18);

    const dMinus11M = new Date(today);
    dMinus11M.setMonth(dMinus11M.getMonth() - 11);

    const dMinus2M = new Date(today);
    dMinus2M.setMonth(dMinus2M.getMonth() - 2);

    const dMinus6M = new Date(today);
    dMinus6M.setMonth(dMinus6M.getMonth() - 6);

    return [
      new Product({
        productId: 'CB-0001',
        productName: 'MacBook Air M3 [DEMO]',
        brand: 'Apple',
        category: 'Electronics',
        purchaseDate: formatDateToISO(dMinus2M),
        warrantyDuration: 1,
        warrantyUnit: 'YEARS',
        purchasePrice: 1099.00,
        serialNumber: 'C02F48KLQ6L4',
        seller: 'Apple Store Downtown',
        notes: 'Includes AppleCare basic 1 year warranty. Keep invoice for battery service.'
      }),
      new Product({
        productId: 'CB-0002',
        productName: 'Sony WH-1000XM5 Headphones [DEMO]',
        brand: 'Sony',
        category: 'Audio',
        purchaseDate: formatDateToISO(dMinus11M),
        warrantyDuration: 12,
        warrantyUnit: 'MONTHS',
        purchasePrice: 349.99,
        serialNumber: 'SN-WH5-998124',
        seller: 'Best Buy Electronics',
        notes: 'Warranty expiring in less than 30 days! Check hinge and active noise cancelling.'
      }),
      new Product({
        productId: 'CB-0003',
        productName: 'Samsung 55" OLED 4K Smart TV [DEMO]',
        brand: 'Samsung',
        category: 'Appliances',
        purchaseDate: formatDateToISO(dMinus6M),
        warrantyDuration: 2,
        warrantyUnit: 'YEARS',
        purchasePrice: 1499.50,
        serialNumber: 'SAMS-TV-2024-88',
        seller: 'Samsung Official Online Store',
        notes: 'Panel warranty covered for 2 years with on-site technician service.'
      }),
      new Product({
        productId: 'CB-0004',
        productName: 'Instant Pot Duo 7-in-1 [DEMO]',
        brand: 'Instant Pot',
        category: 'Home & Kitchen',
        purchaseDate: formatDateToISO(dMinus18M),
        warrantyDuration: 12,
        warrantyUnit: 'MONTHS',
        purchasePrice: 89.95,
        serialNumber: 'IPD-70891',
        seller: 'Amazon Retail',
        notes: 'Expired 6 months ago. Replacement sealing ring bought separately.'
      }),
      new Product({
        productId: 'CB-0005',
        productName: 'Dyson V12 Detect Slim Vacuum [DEMO]',
        brand: 'Dyson',
        category: 'Appliances',
        purchaseDate: formatDateToISO(dMinus2M),
        warrantyDuration: 24,
        warrantyUnit: 'MONTHS',
        purchasePrice: 649.99,
        serialNumber: 'DY-V12-004523',
        seller: 'Dyson Flagship Store',
        notes: 'Full 2-year warranty with motor and battery coverage.'
      })
    ];
  }
}

module.exports = ProductRepository;
