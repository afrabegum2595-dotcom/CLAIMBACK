/**
 * Input Validator for CLAIMBACK
 * Implements FR-09 and acceptance criteria.
 */

const { formatDateToISO } = require('../services/warrantyService');

function isValidISODate(dateStr) {
  if (!dateStr || typeof dateStr !== 'string') return false;
  const match = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return false;

  const year = parseInt(match[1], 10);
  const month = parseInt(match[2], 10);
  const day = parseInt(match[3], 10);

  if (month < 1 || month > 12) return false;
  if (day < 1 || day > 31) return false;

  const d = new Date(year, month - 1, day);
  return d.getFullYear() === year && d.getMonth() === month - 1 && d.getDate() === day;
}

function validateProductInput(data, isUpdate = false) {
  const errors = {};

  // Product Name
  if (!data.productName || typeof data.productName !== 'string' || data.productName.trim() === '') {
    errors.productName = 'Product name is required and cannot be blank.';
  } else if (data.productName.trim().length > 100) {
    errors.productName = 'Product name cannot exceed 100 characters.';
  }

  // Brand
  if (!data.brand || typeof data.brand !== 'string' || data.brand.trim() === '') {
    errors.brand = 'Brand is required and cannot be blank.';
  } else if (data.brand.trim().length > 60) {
    errors.brand = 'Brand cannot exceed 60 characters.';
  }

  // Purchase Date
  const todayStr = formatDateToISO(new Date());
  if (!data.purchaseDate) {
    errors.purchaseDate = 'Purchase date is required.';
  } else if (!isValidISODate(data.purchaseDate)) {
    errors.purchaseDate = 'Invalid purchase date. Please use YYYY-MM-DD format.';
  } else if (data.purchaseDate > todayStr) {
    errors.purchaseDate = 'Purchase date cannot be in the future.';
  }

  // Warranty Duration
  if (data.warrantyDuration === undefined || data.warrantyDuration === null || data.warrantyDuration === '') {
    errors.warrantyDuration = 'Warranty duration is required.';
  } else {
    const durationNum = Number(data.warrantyDuration);
    if (isNaN(durationNum) || !Number.isInteger(durationNum) || durationNum <= 0) {
      errors.warrantyDuration = 'Warranty duration must be a positive whole number.';
    } else if (durationNum > 1200) {
      errors.warrantyDuration = 'Warranty duration exceeds realistic limit.';
    }
  }

  // Warranty Unit
  const allowedUnits = ['MONTHS', 'YEARS'];
  if (!data.warrantyUnit) {
    errors.warrantyUnit = 'Warranty unit is required (Months or Years).';
  } else if (!allowedUnits.includes(String(data.warrantyUnit).toUpperCase())) {
    errors.warrantyUnit = 'Warranty unit must be either "Months" or "Years".';
  }

  // Optional: Purchase Price
  if (data.purchasePrice !== undefined && data.purchasePrice !== null && data.purchasePrice !== '') {
    const priceNum = Number(data.purchasePrice);
    if (isNaN(priceNum) || priceNum < 0) {
      errors.purchasePrice = 'Purchase price cannot be negative.';
    }
  }

  // Optional: Serial Number
  if (data.serialNumber && typeof data.serialNumber === 'string' && data.serialNumber.trim().length > 60) {
    errors.serialNumber = 'Serial number cannot exceed 60 characters.';
  }

  // Optional: Seller
  if (data.seller && typeof data.seller === 'string' && data.seller.trim().length > 100) {
    errors.seller = 'Seller/Store cannot exceed 100 characters.';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
}

module.exports = {
  isValidISODate,
  validateProductInput
};
