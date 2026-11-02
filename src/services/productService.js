/**
 * Product Service
 * Handles business logic, CRUD operations, search & filtering,
 * validation enforcement, and dashboard aggregations.
 */

const Product = require('../models/Product');
const { generateProductId } = require('../utils/idGenerator');
const { validateProductInput } = require('../utils/validator');
const {
  WarrantyStatus,
  decorateProduct
} = require('./warrantyService');

class ProductService {
  constructor(productRepository) {
    this.repo = productRepository;
  }

  /**
   * Retrieve all products with warranty calculations and optional search/filter/sort
   */
  getAll({ search = '', status = 'ALL', category = 'ALL', sortBy = 'expiryDate', sortOrder = 'asc' } = {}) {
    const products = this.repo.findAll();
    const decorated = products.map(p => decorateProduct(p));

    const searchLower = (search || '').trim().toLowerCase();
    const statusUpper = (status || 'ALL').toUpperCase();
    const categoryUpper = (category || 'ALL').toUpperCase();

    const filtered = decorated.filter(item => {
      // 1. Search filter: productId, productName, brand, serialNumber
      if (searchLower) {
        const matchesId = (item.productId || '').toLowerCase().includes(searchLower);
        const matchesName = (item.productName || '').toLowerCase().includes(searchLower);
        const matchesBrand = (item.brand || '').toLowerCase().includes(searchLower);
        const matchesSerial = (item.serialNumber || '').toLowerCase().includes(searchLower);
        if (!matchesId && !matchesName && !matchesBrand && !matchesSerial) {
          return false;
        }
      }

      // 2. Status filter
      if (statusUpper !== 'ALL') {
        if (item.statusKey !== statusUpper) {
          return false;
        }
      }

      // 3. Category filter
      if (categoryUpper !== 'ALL') {
        if ((item.category || '').toUpperCase() !== categoryUpper) {
          return false;
        }
      }

      return true;
    });

    // Sorting
    filtered.sort((a, b) => {
      let valA = a[sortBy];
      let valB = b[sortBy];

      if (sortBy === 'daysRemaining') {
        valA = a.daysRemaining;
        valB = b.daysRemaining;
      } else if (sortBy === 'expiryDate' || sortBy === 'purchaseDate') {
        valA = valA || '';
        valB = valB || '';
      } else if (sortBy === 'productName' || sortBy === 'brand') {
        valA = (valA || '').toLowerCase();
        valB = (valB || '').toLowerCase();
      }

      if (valA < valB) return sortOrder === 'desc' ? 1 : -1;
      if (valA > valB) return sortOrder === 'desc' ? -1 : 1;
      return 0;
    });

    return filtered;
  }

  /**
   * Get single product by ID
   */
  getById(productId) {
    const products = this.repo.findAll();
    const found = products.find(p => p.productId === productId);
    if (!found) return null;
    return decorateProduct(found);
  }

  /**
   * Create a new product record
   */
  create(productData) {
    // 1. Validate
    const validation = validateProductInput(productData);
    if (!validation.isValid) {
      const err = new Error('Validation failed');
      err.errors = validation.errors;
      err.statusCode = 400;
      throw err;
    }

    const products = this.repo.findAll();

    // 2. Generate unique Product ID
    const newId = generateProductId(products);

    // 3. Instantiate model
    const newProduct = new Product({
      ...productData,
      productId: newId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });

    products.push(newProduct);
    this.repo.saveAll(products);

    return decorateProduct(newProduct);
  }

  /**
   * Update an existing product
   */
  update(productId, productData) {
    const validation = validateProductInput(productData, true);
    if (!validation.isValid) {
      const err = new Error('Validation failed');
      err.errors = validation.errors;
      err.statusCode = 400;
      throw err;
    }

    const products = this.repo.findAll();
    const index = products.findIndex(p => p.productId === productId);
    if (index === -1) {
      const err = new Error(`Product with ID ${productId} not found`);
      err.statusCode = 404;
      throw err;
    }

    const existing = products[index];
    const updated = new Product({
      ...existing,
      productName: productData.productName,
      brand: productData.brand,
      category: productData.category || existing.category,
      purchaseDate: productData.purchaseDate,
      warrantyDuration: productData.warrantyDuration,
      warrantyUnit: productData.warrantyUnit,
      purchasePrice: productData.purchasePrice,
      serialNumber: productData.serialNumber,
      seller: productData.seller,
      notes: productData.notes,
      receiptName: productData.receiptName || existing.receiptName,
      updatedAt: new Date().toISOString()
    });

    products[index] = updated;
    this.repo.saveAll(products);

    return decorateProduct(updated);
  }

  /**
   * Delete a product
   */
  delete(productId) {
    const products = this.repo.findAll();
    const index = products.findIndex(p => p.productId === productId);
    if (index === -1) {
      const err = new Error(`Product with ID ${productId} not found`);
      err.statusCode = 404;
      throw err;
    }

    const [deleted] = products.splice(index, 1);
    this.repo.saveAll(products);
    return decorateProduct(deleted);
  }

  /**
   * Dashboard statistics:
   * Total products, Active, Expiring Soon, Expired counts,
   * plus short list of upcoming expirations ordered by nearest expiry date.
   */
  getDashboardStats() {
    const products = this.repo.findAll();
    const decorated = products.map(p => decorateProduct(p));

    let activeCount = 0;
    let expiringSoonCount = 0;
    let expiredCount = 0;

    const upcoming = [];

    for (const item of decorated) {
      if (item.statusKey === WarrantyStatus.ACTIVE) {
        activeCount++;
      } else if (item.statusKey === WarrantyStatus.EXPIRING_SOON) {
        expiringSoonCount++;
        upcoming.push(item);
      } else if (item.statusKey === WarrantyStatus.EXPIRED) {
        expiredCount++;
      }
    }

    // Sort upcoming expiring soon by nearest expiry date (fewest days remaining first: 0, 1, 2, ...)
    upcoming.sort((a, b) => a.daysRemaining - b.daysRemaining);

    // If fewer than 5 expiring soon items, also show active products closest to expiring
    if (upcoming.length < 5) {
      const activeClose = decorated
        .filter(i => i.statusKey === WarrantyStatus.ACTIVE)
        .sort((a, b) => a.daysRemaining - b.daysRemaining);
      
      for (const item of activeClose) {
        if (upcoming.length >= 5) break;
        upcoming.push(item);
      }
    }

    // Unique categories list
    const categoriesSet = new Set(['General']);
    decorated.forEach(p => {
      if (p.category) categoriesSet.add(p.category);
    });

    return {
      totalProducts: decorated.length,
      activeCount,
      expiringSoonCount,
      expiredCount,
      upcomingExpirations: upcoming.slice(0, 5),
      categories: Array.from(categoriesSet).sort()
    };
  }

  /**
   * Load demo products
   */
  loadDemoData() {
    const demoItems = this.repo.getDemoProducts();
    const existing = this.repo.findAll();

    // Avoid duplicate IDs
    const existingIds = new Set(existing.map(p => p.productId));
    const toAdd = demoItems.filter(d => !existingIds.has(d.productId));

    const combined = [...existing, ...toAdd];
    this.repo.saveAll(combined);
    return this.getDashboardStats();
  }

  /**
   * Clear demo products (or all products)
   */
  clearDemoData() {
    const existing = this.repo.findAll();
    const nonDemo = existing.filter(p => !p.productName.includes('[DEMO]'));
    this.repo.saveAll(nonDemo);
    return this.getDashboardStats();
  }

  /**
   * Export to CSV
   */
  exportCSV() {
    const products = this.getAll();
    const headers = [
      'Product ID',
      'Product Name',
      'Brand',
      'Category',
      'Purchase Date',
      'Warranty End Date',
      'Days Remaining',
      'Status',
      'Purchase Price',
      'Serial Number',
      'Seller',
      'Notes'
    ];

    const escapeCSV = (str) => {
      if (str === null || str === undefined) return '""';
      const s = String(str).replace(/"/g, '""');
      return `"${s}"`;
    };

    const rows = products.map(p => [
      escapeCSV(p.productId),
      escapeCSV(p.productName),
      escapeCSV(p.brand),
      escapeCSV(p.category),
      escapeCSV(p.purchaseDate),
      escapeCSV(p.expiryDate),
      escapeCSV(p.daysRemaining),
      escapeCSV(p.statusLabel),
      escapeCSV(p.purchasePrice !== null ? p.purchasePrice : ''),
      escapeCSV(p.serialNumber),
      escapeCSV(p.seller),
      escapeCSV(p.notes)
    ].join(','));

    return [headers.join(','), ...rows].join('\r\n');
  }
}

module.exports = ProductService;
