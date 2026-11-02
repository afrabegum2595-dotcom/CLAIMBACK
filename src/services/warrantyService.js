/**
 * Warranty Calculation Service
 * Implements FR-05 and Section 7 Warranty calculation rules.
 */

const WarrantyStatus = {
  ACTIVE: 'ACTIVE',
  EXPIRING_SOON: 'EXPIRING_SOON',
  EXPIRED: 'EXPIRED'
};

const WarrantyStatusLabels = {
  ACTIVE: 'Active',
  EXPIRING_SOON: 'Expiring Soon',
  EXPIRED: 'Expired'
};

/**
 * Format Date object to YYYY-MM-DD string using local calendar
 */
function formatDateToISO(date) {
  const d = date instanceof Date ? date : new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Add months to a YYYY-MM-DD date preserving Java LocalDate month-arithmetic semantics.
 * For example: Jan 31 + 1 month = Feb 28 (or 29 in leap year).
 */
function addMonthsToDateString(dateStr, monthsToAdd) {
  const [yearStr, monthStr, dayStr] = dateStr.split('-');
  let year = parseInt(yearStr, 10);
  let month = parseInt(monthStr, 10); // 1-12
  const day = parseInt(dayStr, 10);

  const totalMonths = (year * 12 + (month - 1)) + monthsToAdd;
  const newYear = Math.floor(totalMonths / 12);
  const newMonth = (totalMonths % 12) + 1;

  // Find max days in the target month (handles leap years correctly)
  const maxDaysInTargetMonth = new Date(newYear, newMonth, 0).getDate();
  const adjustedDay = Math.min(day, maxDaysInTargetMonth);

  const pad = (n) => String(n).padStart(2, '0');
  return `${newYear}-${pad(newMonth)}-${pad(adjustedDay)}`;
}

/**
 * Calculate the warranty end date given purchase date, duration, and unit.
 * @param {string} purchaseDateStr - YYYY-MM-DD
 * @param {number} duration - positive integer
 * @param {string} unit - 'MONTHS' or 'YEARS'
 * @returns {string} - YYYY-MM-DD
 */
function calculateExpiryDate(purchaseDateStr, duration, unit = 'MONTHS') {
  if (!purchaseDateStr) return '';
  const numDuration = parseInt(duration, 10);
  if (isNaN(numDuration) || numDuration <= 0) return '';

  const normalizedUnit = (unit || 'MONTHS').toUpperCase();
  const months = normalizedUnit === 'YEARS' ? numDuration * 12 : numDuration;
  return addMonthsToDateString(purchaseDateStr, months);
}

/**
 * Calculate calendar days remaining between reference date and expiry date.
 * If expiry date is today, days remaining is 0.
 * If expiry date was yesterday, days remaining is -1.
 * @param {string} expiryDateStr - YYYY-MM-DD
 * @param {string|Date} [refDate] - defaults to current system date
 * @returns {number}
 */
function calculateDaysRemaining(expiryDateStr, refDate = new Date()) {
  const refDateStr = typeof refDate === 'string' ? refDate : formatDateToISO(refDate);

  const [expY, expM, expD] = expiryDateStr.split('-').map(Number);
  const [refY, refM, refD] = refDateStr.split('-').map(Number);

  // Use UTC midnight to calculate pure calendar day difference without daylight savings issues
  const utcExpiry = Date.UTC(expY, expM - 1, expD);
  const utcRef = Date.UTC(refY, refM - 1, refD);

  const diffMs = utcExpiry - utcRef;
  return Math.round(diffMs / (1000 * 60 * 60 * 24));
}

/**
 * Determine warranty status based on days remaining.
 * Rules:
 * - If today is after expiry date (daysRemaining < 0): Expired
 * - If today is on or before expiry date and days remaining is 0 to 30: Expiring Soon
 * - If days remaining > 30: Active
 * @param {number} daysRemaining
 * @returns {{ key: string, label: string, colorClass: string }}
 */
function getWarrantyStatus(daysRemaining) {
  if (daysRemaining < 0) {
    return {
      key: WarrantyStatus.EXPIRED,
      label: WarrantyStatusLabels.EXPIRED,
      badgeClass: 'status-expired'
    };
  }
  if (daysRemaining <= 30) {
    return {
      key: WarrantyStatus.EXPIRING_SOON,
      label: WarrantyStatusLabels.EXPIRING_SOON,
      badgeClass: 'status-expiring'
    };
  }
  return {
    key: WarrantyStatus.ACTIVE,
    label: WarrantyStatusLabels.ACTIVE,
    badgeClass: 'status-active'
  };
}

/**
 * Decorate product with calculated warranty details.
 * Does not mutate the original product.
 */
function decorateProduct(product, refDate = new Date()) {
  const expiryDate = calculateExpiryDate(product.purchaseDate, product.warrantyDuration, product.warrantyUnit);
  let daysRemaining = 0;
  let status = { key: 'UNKNOWN', label: 'Unknown', badgeClass: '' };

  if (expiryDate) {
    daysRemaining = calculateDaysRemaining(expiryDate, refDate);
    status = getWarrantyStatus(daysRemaining);
  }

  return {
    ...product,
    expiryDate,
    daysRemaining,
    statusKey: status.key,
    statusLabel: status.label,
    badgeClass: status.badgeClass
  };
}

module.exports = {
  WarrantyStatus,
  WarrantyStatusLabels,
  formatDateToISO,
  addMonthsToDateString,
  calculateExpiryDate,
  calculateDaysRemaining,
  getWarrantyStatus,
  decorateProduct
};
