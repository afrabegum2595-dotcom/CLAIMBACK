package claimback.util;

import claimback.model.Product;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

/**
 * Validates product inputs according to FR-09.
 */
public class InputValidator {

    public static class ValidationResult {
        private final boolean valid;
        private final List<String> errors;

        public ValidationResult(boolean valid, List<String> errors) {
            this.valid = valid;
            this.errors = errors != null ? errors : new ArrayList<>();
        }

        public boolean isValid() {
            return valid;
        }

        public List<String> getErrors() {
            return errors;
        }

        public String getJoinedErrorMessage() {
            return String.join("\n", errors);
        }
    }

    public static ValidationResult validate(Product product) {
        List<String> errors = new ArrayList<>();

        if (product == null) {
            errors.add("Product data cannot be null.");
            return new ValidationResult(false, errors);
        }

        // Product Name
        if (product.getProductName() == null || product.getProductName().trim().isEmpty()) {
            errors.add("Product Name is required and cannot be blank.");
        }

        // Brand
        if (product.getBrand() == null || product.getBrand().trim().isEmpty()) {
            errors.add("Brand is required and cannot be blank.");
        }

        // Purchase Date
        if (product.getPurchaseDate() == null) {
            errors.add("Purchase Date is required.");
        } else if (product.getPurchaseDate().isAfter(LocalDate.now())) {
            errors.add("Purchase Date cannot be in the future.");
        }

        // Warranty Duration
        if (product.getWarrantyDuration() <= 0) {
            errors.add("Warranty Duration must be a positive whole number.");
        }

        // Warranty Unit
        if (product.getWarrantyUnit() == null ||
                (!product.getWarrantyUnit().equalsIgnoreCase("MONTHS") && !product.getWarrantyUnit().equalsIgnoreCase("YEARS"))) {
            errors.add("Warranty Unit must be either Months or Years.");
        }

        // Purchase Price
        if (product.getPurchasePrice() != null && product.getPurchasePrice() < 0) {
            errors.add("Purchase Price cannot be negative.");
        }

        return new ValidationResult(errors.isEmpty(), errors);
    }
}
