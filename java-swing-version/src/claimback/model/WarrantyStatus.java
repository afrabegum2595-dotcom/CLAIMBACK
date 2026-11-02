package claimback.model;

/**
 * Represents the status of a product warranty.
 * - ACTIVE: Greater than 30 days remaining
 * - EXPIRING_SOON: 0 to 30 days remaining (inclusive)
 * - EXPIRED: Less than 0 days remaining (today is after expiry date)
 */
public enum WarrantyStatus {
    ACTIVE("Active"),
    EXPIRING_SOON("Expiring Soon"),
    EXPIRED("Expired");

    private final String displayName;

    WarrantyStatus(String displayName) {
        this.displayName = displayName;
    }

    public String getDisplayName() {
        return displayName;
    }

    @Override
    public String toString() {
        return displayName;
    }
}
