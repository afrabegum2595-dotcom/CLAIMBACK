/**
 * Product ID Generator
 * Generates unique formatted IDs like CB-0001, CB-0002
 */

function generateProductId(existingProducts = []) {
  let maxIdNum = 0;

  for (const product of existingProducts) {
    if (product && product.productId) {
      const match = String(product.productId).match(/^CB-(\d+)$/i);
      if (match) {
        const num = parseInt(match[1], 10);
        if (!isNaN(num) && num > maxIdNum) {
          maxIdNum = num;
        }
      }
    }
  }

  const nextNum = maxIdNum + 1;
  const padded = String(nextNum).padStart(4, '0');
  return `CB-${padded}`;
}

module.exports = {
  generateProductId
};
