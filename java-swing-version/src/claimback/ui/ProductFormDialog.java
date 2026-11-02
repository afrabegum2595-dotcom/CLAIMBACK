package claimback.ui;

import claimback.model.Product;
import claimback.model.WarrantyStatus;
import claimback.service.ProductService;
import claimback.service.WarrantyService;

import javax.swing.*;
import javax.swing.border.EmptyBorder;
import javax.swing.event.DocumentEvent;
import javax.swing.event.DocumentListener;
import java.awt.*;
import java.time.LocalDate;

/**
 * Screen 2: Add / Edit Product Dialog with live preview of calculated expiry date.
 */
public class ProductFormDialog extends JDialog {
    private final ProductService productService;
    private final WarrantyService warrantyService;
    private final Product existingProduct;
    private final MainFrame mainFrame;

    private JTextField txtName;
    private JTextField txtBrand;
    private JTextField txtCategory;
    private JTextField txtPurchaseDate;
    private JTextField txtDuration;
    private JComboBox<String> cmbUnit;
    private JTextField txtPrice;
    private JTextField txtSerial;
    private JTextField txtSeller;
    private JTextArea txtNotes;
    private JLabel lblPreview;

    public ProductFormDialog(Frame parent, ProductService productService, WarrantyService warrantyService, Product existing, MainFrame mainFrame) {
        super(parent, existing == null ? "Add New Product" : "Edit Product (" + existing.getProductId() + ")", true);
        this.productService = productService;
        this.warrantyService = warrantyService;
        this.existingProduct = existing;
        this.mainFrame = mainFrame;

        setSize(520, 640);
        setLocationRelativeTo(parent);
        setResizable(false);

        initComponents();
        if (existing != null) {
            populateFields(existing);
        }
        updatePreview();
    }

    private void initComponents() {
        JPanel mainPanel = new JPanel(new BorderLayout(10, 10));
        mainPanel.setBorder(new EmptyBorder(20, 20, 20, 20));
        mainPanel.setBackground(Color.WHITE);

        JPanel formGrid = new JPanel(new GridLayout(10, 2, 10, 10));
        formGrid.setOpaque(false);

        formGrid.add(new JLabel("Product Name *:"));
        txtName = new JTextField();
        formGrid.add(txtName);

        formGrid.add(new JLabel("Brand / Manufacturer *:"));
        txtBrand = new JTextField();
        formGrid.add(txtBrand);

        formGrid.add(new JLabel("Category:"));
        txtCategory = new JTextField("Electronics");
        formGrid.add(txtCategory);

        formGrid.add(new JLabel("Purchase Date (YYYY-MM-DD) *:"));
        txtPurchaseDate = new JTextField(LocalDate.now().toString());
        formGrid.add(txtPurchaseDate);

        formGrid.add(new JLabel("Warranty Duration *:"));
        txtDuration = new JTextField("12");
        formGrid.add(txtDuration);

        formGrid.add(new JLabel("Warranty Unit *:"));
        cmbUnit = new JComboBox<>(new String[]{"MONTHS", "YEARS"});
        formGrid.add(cmbUnit);

        formGrid.add(new JLabel("Purchase Price ($):"));
        txtPrice = new JTextField();
        formGrid.add(txtPrice);

        formGrid.add(new JLabel("Serial Number:"));
        txtSerial = new JTextField();
        formGrid.add(txtSerial);

        formGrid.add(new JLabel("Store / Seller:"));
        txtSeller = new JTextField();
        formGrid.add(txtSeller);

        formGrid.add(new JLabel("Calculated Expiry Preview:"));
        lblPreview = new JLabel("--");
        lblPreview.setFont(new Font("Segoe UI", Font.BOLD, 12));
        lblPreview.setForeground(new Color(59, 130, 246));
        formGrid.add(lblPreview);

        mainPanel.add(formGrid, BorderLayout.NORTH);

        // Notes Area
        JPanel notesPanel = new JPanel(new BorderLayout(5, 5));
        notesPanel.setOpaque(false);
        notesPanel.add(new JLabel("Notes & Coverage Details:"), BorderLayout.NORTH);
        txtNotes = new JTextArea(3, 20);
        txtNotes.setBorder(BorderFactory.createLineBorder(new Color(203, 213, 225)));
        notesPanel.add(new JScrollPane(txtNotes), BorderLayout.CENTER);
        mainPanel.add(notesPanel, BorderLayout.CENTER);

        // Buttons
        JPanel buttonPanel = new JPanel(new FlowLayout(FlowLayout.RIGHT, 10, 10));
        buttonPanel.setOpaque(false);

        JButton btnCancel = new JButton("Cancel");
        btnCancel.addActionListener(e -> dispose());
        buttonPanel.add(btnCancel);

        JButton btnSave = new JButton("Save Product");
        btnSave.setBackground(new Color(59, 130, 246));
        btnSave.setForeground(Color.WHITE);
        btnSave.setFont(new Font("Segoe UI", Font.BOLD, 12));
        btnSave.addActionListener(e -> saveProduct());
        buttonPanel.add(btnSave);

        mainPanel.add(buttonPanel, BorderLayout.SOUTH);
        setContentPane(mainPanel);

        // Real-time calculation listeners
        DocumentListener docListener = new DocumentListener() {
            public void insertUpdate(DocumentEvent e) { updatePreview(); }
            public void removeUpdate(DocumentEvent e) { updatePreview(); }
            public void changedUpdate(DocumentEvent e) { updatePreview(); }
        };
        txtPurchaseDate.getDocument().addDocumentListener(docListener);
        txtDuration.getDocument().addDocumentListener(docListener);
        cmbUnit.addActionListener(e -> updatePreview());
    }

    private void updatePreview() {
        try {
            LocalDate purchaseDate = LocalDate.parse(txtPurchaseDate.getText().trim());
            int duration = Integer.parseInt(txtDuration.getText().trim());
            String unit = (String) cmbUnit.getSelectedItem();

            LocalDate expiry = warrantyService.calculateExpiryDate(purchaseDate, duration, unit);
            long days = warrantyService.calculateDaysRemaining(expiry);
            WarrantyStatus status = warrantyService.calculateStatus(days);

            lblPreview.setText(expiry + " (" + status.getDisplayName() + ", " + days + "d left)");
        } catch (Exception e) {
            lblPreview.setText("(Enter valid date & duration)");
        }
    }

    private void populateFields(Product p) {
        txtName.setText(p.getProductName());
        txtBrand.setText(p.getBrand());
        txtCategory.setText(p.getCategory());
        txtPurchaseDate.setText(p.getPurchaseDate() != null ? p.getPurchaseDate().toString() : "");
        txtDuration.setText(String.valueOf(p.getWarrantyDuration()));
        cmbUnit.setSelectedItem(p.getWarrantyUnit());
        txtPrice.setText(p.getPurchasePrice() != null ? p.getPurchasePrice().toString() : "");
        txtSerial.setText(p.getSerialNumber());
        txtSeller.setText(p.getSeller());
        txtNotes.setText(p.getNotes());
    }

    private void saveProduct() {
        try {
            String name = txtName.getText().trim();
            String brand = txtBrand.getText().trim();
            String category = txtCategory.getText().trim();
            LocalDate purchaseDate = LocalDate.parse(txtPurchaseDate.getText().trim());
            int duration = Integer.parseInt(txtDuration.getText().trim());
            String unit = (String) cmbUnit.getSelectedItem();

            Double price = null;
            if (!txtPrice.getText().trim().isEmpty()) {
                price = Double.parseDouble(txtPrice.getText().trim());
            }

            String serial = txtSerial.getText().trim();
            String seller = txtSeller.getText().trim();
            String notes = txtNotes.getText().trim();

            if (existingProduct == null) {
                Product p = new Product(null, name, brand, category, purchaseDate, duration, unit, price, serial, seller, notes);
                productService.addProduct(p);
                JOptionPane.showMessageDialog(this, "Product registered successfully: " + p.getProductId(), "Saved", JOptionPane.INFORMATION_MESSAGE);
            } else {
                existingProduct.setProductName(name);
                existingProduct.setBrand(brand);
                existingProduct.setCategory(category);
                existingProduct.setPurchaseDate(purchaseDate);
                existingProduct.setWarrantyDuration(duration);
                existingProduct.setWarrantyUnit(unit);
                existingProduct.setPurchasePrice(price);
                existingProduct.setSerialNumber(serial);
                existingProduct.setSeller(seller);
                existingProduct.setNotes(notes);

                productService.updateProduct(existingProduct);
                JOptionPane.showMessageDialog(this, "Product updated successfully.", "Saved", JOptionPane.INFORMATION_MESSAGE);
            }

            mainFrame.refreshAllPanels();
            dispose();
        } catch (Exception ex) {
            JOptionPane.showMessageDialog(this, "Validation error:\n" + ex.getMessage(), "Input Error", JOptionPane.ERROR_MESSAGE);
        }
    }
}
