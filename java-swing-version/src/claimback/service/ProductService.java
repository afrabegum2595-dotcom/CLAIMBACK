package claimback.service;

import claimback.model.Product;
import claimback.model.WarrantyStatus;
import claimback.repository.ProductRepository;
import claimback.util.IdGenerator;
import claimback.util.InputValidator;

import java.io.IOException;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.stream.Collectors;

/**
 * Core business service for managing products and dashboard metrics.
 */
public class ProductService {
    private final ProductRepository repository;
    private final WarrantyService warrantyService;
    private final List<Product> cache;

    public ProductService(ProductRepository repository, WarrantyService warrantyService) {
        this.repository = repository;
        this.warrantyService = warrantyService;
        this.cache = new ArrayList<>(repository.loadAll());
    }

    public synchronized List<Product> getAllProducts() {
        return new ArrayList<>(cache);
    }

    public synchronized Product getProductById(String id) {
        if (id == null) return null;
        for (Product p : cache) {
            if (id.equalsIgnoreCase(p.getProductId())) {
                return p;
            }
        }
        return null;
    }

    public synchronized Product addProduct(Product product) throws IllegalArgumentException, IOException {
        InputValidator.ValidationResult result = InputValidator.validate(product);
        if (!result.isValid()) {
            throw new IllegalArgumentException(result.getJoinedErrorMessage());
        }

        String newId = IdGenerator.generateNextId(cache);
        product.setProductId(newId);

        cache.add(product);
        repository.saveAll(cache);
        return product;
    }

    public synchronized Product updateProduct(Product product) throws IllegalArgumentException, IOException {
        if (product == null || product.getProductId() == null) {
            throw new IllegalArgumentException("Cannot update product without a valid Product ID.");
        }

        InputValidator.ValidationResult result = InputValidator.validate(product);
        if (!result.isValid()) {
            throw new IllegalArgumentException(result.getJoinedErrorMessage());
        }

        int targetIndex = -1;
        for (int i = 0; i < cache.size(); i++) {
            if (cache.get(i).getProductId().equalsIgnoreCase(product.getProductId())) {
                targetIndex = i;
                break;
            }
        }

        if (targetIndex == -1) {
            throw new IllegalArgumentException("Product " + product.getProductId() + " not found.");
        }

        cache.set(targetIndex, product);
        repository.saveAll(cache);
        return product;
    }

    public synchronized boolean deleteProduct(String productId) throws IOException {
        if (productId == null) return false;
        boolean removed = cache.removeIf(p -> p.getProductId().equalsIgnoreCase(productId));
        if (removed) {
            repository.saveAll(cache);
        }
        return removed;
    }

    public List<Product> searchAndFilter(String query, String statusFilter) {
        String q = (query != null) ? query.trim().toLowerCase() : "";
        boolean filterAll = (statusFilter == null || statusFilter.equalsIgnoreCase("ALL"));

        return cache.stream().filter(p -> {
            // Search match
            boolean matchesSearch = q.isEmpty() ||
                    (p.getProductId() != null && p.getProductId().toLowerCase().contains(q)) ||
                    (p.getProductName() != null && p.getProductName().toLowerCase().contains(q)) ||
                    (p.getBrand() != null && p.getBrand().toLowerCase().contains(q));

            if (!matchesSearch) return false;

            // Status match
            if (!filterAll) {
                WarrantyStatus status = warrantyService.calculateStatus(p);
                return status.name().equalsIgnoreCase(statusFilter) ||
                       status.getDisplayName().equalsIgnoreCase(statusFilter);
            }
            return true;
        }).collect(Collectors.toList());
    }

    // Dashboard metrics
    public int getTotalCount() {
        return cache.size();
    }

    public int getActiveCount() {
        return (int) cache.stream()
                .filter(p -> warrantyService.calculateStatus(p) == WarrantyStatus.ACTIVE)
                .count();
    }

    public int getExpiringSoonCount() {
        return (int) cache.stream()
                .filter(p -> warrantyService.calculateStatus(p) == WarrantyStatus.EXPIRING_SOON)
                .count();
    }

    public int getExpiredCount() {
        return (int) cache.stream()
                .filter(p -> warrantyService.calculateStatus(p) == WarrantyStatus.EXPIRED)
                .count();
    }

    public List<Product> getUpcomingExpirations(int limit) {
        return cache.stream()
                .filter(p -> warrantyService.calculateStatus(p) == WarrantyStatus.EXPIRING_SOON)
                .sorted(Comparator.comparingLong(p -> {
                    LocalDate expiry = warrantyService.calculateExpiryDate(p);
                    return warrantyService.calculateDaysRemaining(expiry);
                }))
                .limit(limit)
                .collect(Collectors.toList());
    }

    public void loadSampleData() throws IOException {
        LocalDate today = LocalDate.now();
        List<Product> demos = new ArrayList<>();
        demos.add(new Product("CB-0001", "MacBook Air M3 [DEMO]", "Apple", "Electronics", today.minusMonths(2), 1, "YEARS", 1099.0, "C02F48KLQ6L4", "Apple Store", "1 yr AppleCare"));
        demos.add(new Product("CB-0002", "Sony WH-1000XM5 [DEMO]", "Sony", "Audio", today.minusMonths(11), 12, "MONTHS", 349.99, "SN-998124", "Best Buy", "Expiring soon check"));
        demos.add(new Product("CB-0003", "Samsung 55\" OLED [DEMO]", "Samsung", "Appliances", today.minusMonths(6), 2, "YEARS", 1499.0, "SAM-55-90", "Samsung Direct", "Panel warranty 2 yrs"));
        demos.add(new Product("CB-0004", "Instant Pot Duo [DEMO]", "Instant Pot", "Kitchen", today.minusMonths(18), 12, "MONTHS", 89.95, "IP-0012", "Amazon", "Expired warranty"));

        for (Product d : demos) {
            if (getProductById(d.getProductId()) == null) {
                cache.add(d);
            }
        }
        repository.saveAll(cache);
    }
}
