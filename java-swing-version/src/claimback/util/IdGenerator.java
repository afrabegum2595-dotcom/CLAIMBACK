package claimback.util;

import claimback.model.Product;

import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Generates unique formatted sequential Product IDs: CB-0001, CB-0002, etc.
 */
public class IdGenerator {
    private static final Pattern ID_PATTERN = Pattern.compile("^CB-(\\d+)$", Pattern.CASE_INSENSITIVE);

    public static String generateNextId(List<Product> existingProducts) {
        int maxId = 0;
        if (existingProducts != null) {
            for (Product p : existingProducts) {
                if (p != null && p.getProductId() != null) {
                    Matcher m = ID_PATTERN.matcher(p.getProductId());
                    if (m.matches()) {
                        try {
                            int val = Integer.parseInt(m.group(1));
                            if (val > maxId) {
                                maxId = val;
                            }
                        } catch (NumberFormatException ignored) {}
                    }
                }
            }
        }
        return String.format("CB-%04d", maxId + 1);
    }
}
