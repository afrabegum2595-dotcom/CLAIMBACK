package claimback;

import claimback.repository.ProductRepository;
import claimback.service.ProductService;
import claimback.service.WarrantyService;
import claimback.ui.MainFrame;

import javax.swing.*;

/**
 * Application Entry Point for CLAIMBACK Desktop App.
 */
public class Main {
    public static void main(String[] args) {
        // Set System Look and Feel
        try {
            UIManager.setLookAndFeel(UIManager.getSystemLookAndFeelClassName());
        } catch (Exception ignored) {}

        SwingUtilities.invokeLater(() -> {
            ProductRepository repository = new ProductRepository();
            WarrantyService warrantyService = new WarrantyService();
            ProductService productService = new ProductService(repository, warrantyService);

            MainFrame frame = new MainFrame(productService, warrantyService);
            frame.setVisible(true);
        });
    }
}
