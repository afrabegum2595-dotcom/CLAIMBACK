package claimback.model;

import java.io.Serializable;
import java.time.LocalDate;

/**
 * Product Data Model.
 * Represents a registered product and its purchase/warranty attributes.
 */
public class Product implements Serializable {
    private static final long serialVersionUID = 1L;

    private String productId;
    private String productName;
    private String brand;
    private String category;
    private LocalDate purchaseDate;
    private int warrantyDuration;
    private String warrantyUnit; // "MONTHS" or "YEARS"
    private Double purchasePrice;
    private String serialNumber;
    private String seller;
    private String notes;

    public Product() {
        this.category = "General";
        this.warrantyUnit = "MONTHS";
    }

    public Product(String productId, String productName, String brand, String category,
                   LocalDate purchaseDate, int warrantyDuration, String warrantyUnit,
                   Double purchasePrice, String serialNumber, String seller, String notes) {
        this.productId = productId;
        this.productName = productName != null ? productName.trim() : "";
        this.brand = brand != null ? brand.trim() : "";
        this.category = (category != null && !category.trim().isEmpty()) ? category.trim() : "General";
        this.purchaseDate = purchaseDate;
        this.warrantyDuration = warrantyDuration;
        this.warrantyUnit = warrantyUnit != null ? warrantyUnit.toUpperCase() : "MONTHS";
        this.purchasePrice = purchasePrice;
        this.serialNumber = serialNumber != null ? serialNumber.trim() : "";
        this.seller = seller != null ? seller.trim() : "";
        this.notes = notes != null ? notes.trim() : "";
    }

    public String getProductId() {
        return productId;
    }

    public void setProductId(String productId) {
        this.productId = productId;
    }

    public String getProductName() {
        return productName;
    }

    public void setProductName(String productName) {
        this.productName = productName;
    }

    public String getBrand() {
        return brand;
    }

    public void setBrand(String brand) {
        this.brand = brand;
    }

    public String getCategory() {
        return category;
    }

    public void setCategory(String category) {
        this.category = category;
    }

    public LocalDate getPurchaseDate() {
        return purchaseDate;
    }

    public void setPurchaseDate(LocalDate purchaseDate) {
        this.purchaseDate = purchaseDate;
    }

    public int getWarrantyDuration() {
        return warrantyDuration;
    }

    public void setWarrantyDuration(int warrantyDuration) {
        this.warrantyDuration = warrantyDuration;
    }

    public String getWarrantyUnit() {
        return warrantyUnit;
    }

    public void setWarrantyUnit(String warrantyUnit) {
        this.warrantyUnit = warrantyUnit;
    }

    public Double getPurchasePrice() {
        return purchasePrice;
    }

    public void setPurchasePrice(Double purchasePrice) {
        this.purchasePrice = purchasePrice;
    }

    public String getSerialNumber() {
        return serialNumber;
    }

    public void setSerialNumber(String serialNumber) {
        this.serialNumber = serialNumber;
    }

    public String getSeller() {
        return seller;
    }

    public void setSeller(String seller) {
        this.seller = seller;
    }

    public String getNotes() {
        return notes;
    }

    public void setNotes(String notes) {
        this.notes = notes;
    }

    @Override
    public String toString() {
        return productId + " - " + productName + " (" + brand + ")";
    }
}
