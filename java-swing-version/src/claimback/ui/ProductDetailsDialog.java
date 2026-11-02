package claimback.ui;

import claimback.model.Product;
import claimback.model.WarrantyStatus;
import claimback.service.ProductService;
import claimback.service.WarrantyService;

import javax.swing.*;
import javax.swing.border.EmptyBorder;
import java.awt.*;
import java.time.LocalDate;

/**
 * Screen 4: Product Details Dialog.
 * Displays all product fields, warranty timeline, days left, and action buttons.
 */
public class ProductDetailsDialog extends JDialog {
    private final Product product;
    private final ProductService productService;
    private final WarrantyService warrantyService;
    private final MainFrame mainFrame;

    public ProductDetailsDialog(Frame parent, Product product, ProductService productService, WarrantyService warrantyService, MainFrame mainFrame) {
        super(parent, "Product Details: " + product.getProductId(), true);
        this.product = product;
        this.productService = productService;
        this.warrantyService = warrantyService;
        this.mainFrame = mainFrame;

        setSize(480, 520);
        setLocationRelativeTo(parent);
        setResizable(false);

        initComponents();
    }

    private void initComponents() {
        JPanel mainPanel = new JPanel(new BorderLayout(15, 15));
        mainPanel.setBorder(new EmptyBorder(20, 20, 20, 20));
        mainPanel.setBackground(Color.WHITE);

        LocalDate expiry = warrantyService.calculateExpiryDate(product);
        long days = warrantyService.calculateDaysRemaining(expiry);
        WarrantyStatus status = warrantyService.calculateStatus(days);

        // Header
        JPanel headerPanel = new JPanel(new GridLayout(2, 1, 0, 4));
        headerPanel.setOpaque(false);

        JLabel lblTitle = new JLabel(product.getProductName());
        lblTitle.setFont(new Font("Segoe UI", Font.BOLD, 18));
        headerPanel.add(lblTitle);

        JLabel lblStatus = new JLabel("Status: " + status.getDisplayName() + " (" + (days >= 0 ? days + " days left" : Math.abs(days) + " days ago") + ")");
        lblStatus.setFont(new Font("Segoe UI", Font.BOLD, 13));
        if (status == WarrantyStatus.ACTIVE) lblStatus.setForeground(new Color(16, 185, 129));
        else if (status == WarrantyStatus.EXPIRING_SOON) lblStatus.setForeground(new Color(245, 158, 11));
        else lblStatus.setForeground(new Color(239, 68, 68));
        headerPanel.add(lblStatus);

        mainPanel.add(headerPanel, BorderLayout.NORTH);

        // Details Grid
        JPanel grid = new JPanel(new GridLayout(8, 2, 8, 8));
        grid.setOpaque(false);

        addField(grid, "Product ID:", product.getProductId());
        addField(grid, "Brand / Maker:", product.getBrand());
        addField(grid, "Category:", product.getCategory());
        addField(grid, "Purchase Date:", product.getPurchaseDate() != null ? product.getPurchaseDate().toString() : "N/A");
        addField(grid, "Warranty End Date:", expiry != null ? expiry.toString() : "N/A");
        addField(grid, "Warranty Duration:", product.getWarrantyDuration() + " " + product.getWarrantyUnit().toLowerCase());
        addField(grid, "Purchase Price:", product.getPurchasePrice() != null ? "$" + product.getPurchasePrice() : "N/A");
        addField(grid, "Serial Number:", product.getSerialNumber().isEmpty() ? "N/A" : product.getSerialNumber());

        mainPanel.add(grid, BorderLayout.CENTER);

        // Notes section
        if (!product.getNotes().isEmpty()) {
            JPanel notesPanel = new JPanel(new BorderLayout(5, 5));
            notesPanel.setOpaque(false);
            JLabel notesTitle = new JLabel("Notes:");
            notesTitle.setFont(new Font("Segoe UI", Font.BOLD, 12));
            JTextArea notesArea = new JTextArea(product.getNotes());
            notesArea.setEditable(false);
            notesArea.setBackground(new Color(248, 250, 252));
            notesPanel.add(notesTitle, BorderLayout.NORTH);
            notesPanel.add(new JScrollPane(notesArea), BorderLayout.CENTER);
            mainPanel.add(notesPanel, BorderLayout.SOUTH);
        }

        // Action Buttons
        JPanel buttonPanel = new JPanel(new FlowLayout(FlowLayout.RIGHT, 10, 5));
        buttonPanel.setOpaque(false);

        JButton btnClose = new JButton("Close");
        btnClose.addActionListener(e -> dispose());
        buttonPanel.add(btnClose);

        JButton btnEdit = new JButton("Edit Product");
        btnEdit.addActionListener(e -> {
            dispose();
            mainFrame.showEditProductDialog(product);
        });
        buttonPanel.add(btnEdit);

        JButton btnDelete = new JButton("Delete");
        btnDelete.setForeground(Color.RED);
        btnDelete.addActionListener(e -> {
            int confirm = JOptionPane.showConfirmDialog(this, "Are you sure you want to delete this product?", "Confirm", JOptionPane.YES_NO_OPTION);
            if (confirm == JOptionPane.YES_OPTION) {
                try {
                    productService.deleteProduct(product.getProductId());
                    mainFrame.refreshAllPanels();
                    dispose();
                } catch (Exception ex) {
                    JOptionPane.showMessageDialog(this, "Error deleting: " + ex.getMessage(), "Error", JOptionPane.ERROR_MESSAGE);
                }
            }
        });
        buttonPanel.add(btnDelete);

        mainPanel.add(buttonPanel, BorderLayout.SOUTH);
        setContentPane(mainPanel);
    }

    private void addField(JPanel panel, String label, String value) {
        JLabel l = new JLabel(label);
        l.setFont(new Font("Segoe UI", Font.BOLD, 12));
        l.setForeground(new Color(100, 116, 139));

        JLabel v = new JLabel(value);
        v.setFont(new Font("Segoe UI", Font.PLAIN, 12));
        v.setForeground(new Color(15, 23, 42));

        panel.add(l);
        panel.add(v);
    }
}
