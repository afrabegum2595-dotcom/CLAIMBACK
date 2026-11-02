/**
 * Product Data Model
 */
class Product {
  constructor({
    productId,
    productName,
    brand,
    category = 'General',
    purchaseDate,
    warrantyDuration,
    warrantyUnit = 'MONTHS',
    purchasePrice = null,
    serialNumber = '',
    seller = '',
    notes = '',
    receiptName = '',
    createdAt = new Date().toISOString(),
    updatedAt = new Date().toISOString()
  }) {
    this.productId = productId;
    this.productName = productName ? productName.trim() : '';
    this.brand = brand ? brand.trim() : '';
    this.category = category ? category.trim() : 'General';
    this.purchaseDate = purchaseDate;
    this.warrantyDuration = Number(warrantyDuration);
    this.warrantyUnit = warrantyUnit.toUpperCase();
    this.purchasePrice = purchasePrice !== null && purchasePrice !== '' && !isNaN(purchasePrice) ? Number(purchasePrice) : null;
    this.serialNumber = serialNumber ? serialNumber.trim() : '';
    this.seller = seller ? seller.trim() : '';
    this.notes = notes ? notes.trim() : '';
    this.receiptName = receiptName ? receiptName.trim() : '';
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
  }

  toJSON() {
    return {
      productId: this.productId,
      productName: this.productName,
      brand: this.brand,
      category: this.category,
      purchaseDate: this.purchaseDate,
      warrantyDuration: this.warrantyDuration,
      warrantyUnit: this.warrantyUnit,
      purchasePrice: this.purchasePrice,
      serialNumber: this.serialNumber,
      seller: this.seller,
      notes: this.notes,
      receiptName: this.receiptName,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }
}

module.exports = Product;
