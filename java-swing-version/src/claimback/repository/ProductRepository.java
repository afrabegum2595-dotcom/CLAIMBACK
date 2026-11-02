package claimback.repository;

import claimback.model.Product;

import java.io.*;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

/**
 * File-based local repository for persisting product records.
 * Supports CSV persistence with automatic directory creation, atomic backup,
 * and graceful fallback.
 */
public class ProductRepository {
    private final File dataFile;
    private final File backupFile;

    public ProductRepository() {
        this(new File("data", "products.csv"));
    }

    public ProductRepository(File dataFile) {
        this.dataFile = dataFile;
        this.backupFile = new File(dataFile.getParentFile(), dataFile.getName() + ".bak");
        ensureDirectory();
    }

    private void ensureDirectory() {
        File parent = dataFile.getParentFile();
        if (parent != null && !parent.exists()) {
            parent.mkdirs();
        }
    }

    public synchronized List<Product> loadAll() {
        List<Product> products = new ArrayList<>();
        if (!dataFile.exists() || dataFile.length() == 0) {
            return products;
        }

        try (BufferedReader reader = new BufferedReader(new InputStreamReader(new FileInputStream(dataFile), StandardCharsets.UTF_8))) {
            String line = reader.readLine(); // Skip header
            while ((line = reader.readLine()) != null) {
                line = line.trim();
                if (line.isEmpty()) continue;
                Product p = parseCsvLine(line);
                if (p != null) {
                    products.add(p);
                }
            }
        } catch (Exception e) {
            System.err.println("[ProductRepository] Error loading primary data file: " + e.getMessage());
            // Attempt recovery from backup
            if (backupFile.exists()) {
                try (BufferedReader reader = new BufferedReader(new InputStreamReader(new FileInputStream(backupFile), StandardCharsets.UTF_8))) {
                    String line = reader.readLine();
                    while ((line = reader.readLine()) != null) {
                        line = line.trim();
                        if (!line.isEmpty()) {
                            Product p = parseCsvLine(line);
                            if (p != null) products.add(p);
                        }
                    }
                    System.out.println("[ProductRepository] Successfully restored from backup file.");
                } catch (Exception backupEx) {
                    System.err.println("[ProductRepository] Backup restore failed: " + backupEx.getMessage());
                }
            }
        }
        return products;
    }

    public synchronized void saveAll(List<Product> products) throws IOException {
        ensureDirectory();

        // 1. Create backup of current file if it exists
        if (dataFile.exists() && dataFile.length() > 0) {
            try {
                copyFile(dataFile, backupFile);
            } catch (Exception ignored) {}
        }

        // 2. Write to temporary file
        File tempFile = new File(dataFile.getParentFile(), dataFile.getName() + ".tmp");
        try (PrintWriter writer = new PrintWriter(new OutputStreamWriter(new FileOutputStream(tempFile), StandardCharsets.UTF_8))) {
            // Write CSV Header
            writer.println("productId,productName,brand,category,purchaseDate,warrantyDuration,warrantyUnit,purchasePrice,serialNumber,seller,notes");
            for (Product p : products) {
                if (p != null) {
                    writer.println(toCsvLine(p));
                }
            }
        }

        // 3. Atomic rename
        if (dataFile.exists()) {
            dataFile.delete();
        }
        if (!tempFile.renameTo(dataFile)) {
            copyFile(tempFile, dataFile);
            tempFile.delete();
        }
    }

    private void copyFile(File source, File dest) throws IOException {
        try (InputStream in = new FileInputStream(source); OutputStream out = new FileOutputStream(dest)) {
            byte[] buf = new byte[4096];
            int len;
            while ((len = in.read(buf)) > 0) {
                out.write(buf, 0, len);
            }
        }
    }

    private String toCsvLine(Product p) {
        StringBuilder sb = new StringBuilder();
        sb.append(escape(p.getProductId())).append(",");
        sb.append(escape(p.getProductName())).append(",");
        sb.append(escape(p.getBrand())).append(",");
        sb.append(escape(p.getCategory())).append(",");
        sb.append(p.getPurchaseDate() != null ? p.getPurchaseDate().toString() : "").append(",");
        sb.append(p.getWarrantyDuration()).append(",");
        sb.append(escape(p.getWarrantyUnit())).append(",");
        sb.append(p.getPurchasePrice() != null ? p.getPurchasePrice().toString() : "").append(",");
        sb.append(escape(p.getSerialNumber())).append(",");
        sb.append(escape(p.getSeller())).append(",");
        sb.append(escape(p.getNotes()));
        return sb.toString();
    }

    private Product parseCsvLine(String line) {
        try {
            List<String> tokens = parseLineTokens(line);
            if (tokens.size() < 7) return null;

            String id = tokens.get(0);
            String name = tokens.get(1);
            String brand = tokens.get(2);
            String category = tokens.size() > 3 ? tokens.get(3) : "General";
            LocalDate purchaseDate = LocalDate.parse(tokens.get(4));
            int duration = Integer.parseInt(tokens.get(5));
            String unit = tokens.get(6);
            Double price = (tokens.size() > 7 && !tokens.get(7).isEmpty()) ? Double.parseDouble(tokens.get(7)) : null;
            String serial = tokens.size() > 8 ? tokens.get(8) : "";
            String seller = tokens.size() > 9 ? tokens.get(9) : "";
            String notes = tokens.size() > 10 ? tokens.get(10) : "";

            return new Product(id, name, brand, category, purchaseDate, duration, unit, price, serial, seller, notes);
        } catch (Exception e) {
            return null;
        }
    }

    private String escape(String s) {
        if (s == null) return "\"\"";
        return "\"" + s.replace("\"", "\"\"") + "\"";
    }

    private List<String> parseLineTokens(String line) {
        List<String> tokens = new ArrayList<>();
        StringBuilder sb = new StringBuilder();
        boolean inQuotes = false;
        for (int i = 0; i < line.length(); i++) {
            char c = line.charAt(i);
            if (c == '\"') {
                if (inQuotes && i + 1 < line.length() && line.charAt(i + 1) == '\"') {
                    sb.append('\"');
                    i++;
                } else {
                    inQuotes = !inQuotes;
                }
            } else if (c == ',' && !inQuotes) {
                tokens.add(sb.toString().trim());
                sb.setLength(0);
            } else {
                sb.append(c);
            }
        }
        tokens.add(sb.toString().trim());
        return tokens;
    }
}
