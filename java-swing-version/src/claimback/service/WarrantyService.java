package claimback.service;

import claimback.model.Product;
import claimback.model.WarrantyStatus;

import java.time.LocalDate;
import java.time.temporal.ChronoUnit;

/**
 * Warranty calculation engine.
 * Computes warranty end dates, days remaining, and status labels
 * according to PRD section 7 rules.
 */
public class WarrantyService {

    /**
     * Expiry date = purchase date plus warranty duration in the selected unit.
     * Uses LocalDate's built-in month arithmetic.
     */
    public LocalDate calculateExpiryDate(LocalDate purchaseDate, int duration, String unit) {
        if (purchaseDate == null || duration <= 0) {
            return null;
        }

        if ("YEARS".equalsIgnoreCase(unit)) {
            return purchaseDate.plusYears(duration);
        } else {
            return purchaseDate.plusMonths(duration);
        }
    }

    public LocalDate calculateExpiryDate(Product product) {
        if (product == null) return null;
        return calculateExpiryDate(product.getPurchaseDate(), product.getWarrantyDuration(), product.getWarrantyUnit());
    }

    /**
     * Days remaining = calendar days between today and expiry date.
     * If expiry date is today, returns 0.
     * If expiry date was yesterday, returns -1.
     */
    public long calculateDaysRemaining(LocalDate expiryDate, LocalDate referenceDate) {
        if (expiryDate == null) return 0;
        LocalDate today = referenceDate != null ? referenceDate : LocalDate.now();
        return ChronoUnit.DAYS.between(today, expiryDate);
    }

    public long calculateDaysRemaining(LocalDate expiryDate) {
        return calculateDaysRemaining(expiryDate, LocalDate.now());
    }

    /**
     * Status rules:
     * - Expired if today is after the warranty end date (daysRemaining < 0)
     * - Expiring Soon if today is on or before expiry date and days remaining is 0 to 30
     * - Active if days remaining is greater than 30
     */
    public WarrantyStatus calculateStatus(long daysRemaining) {
        if (daysRemaining < 0) {
            return WarrantyStatus.EXPIRED;
        } else if (daysRemaining <= 30) {
            return WarrantyStatus.EXPIRING_SOON;
        } else {
            return WarrantyStatus.ACTIVE;
        }
    }

    public WarrantyStatus calculateStatus(Product product) {
        LocalDate expiryDate = calculateExpiryDate(product);
        if (expiryDate == null) return WarrantyStatus.EXPIRED;
        long days = calculateDaysRemaining(expiryDate);
        return calculateStatus(days);
    }
}
