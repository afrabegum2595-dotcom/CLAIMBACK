package claimback.ui;

import claimback.model.Product;
import claimback.model.WarrantyStatus;
import claimback.service.ProductService;
import claimback.service.WarrantyService;

import javax.swing.*;
import javax.swing.border.EmptyBorder;
import javax.swing.table.DefaultTableCellRenderer;
import javax.swing.table.DefaultTableModel;
import java.awt.*;
import java.time.LocalDate;
import java.util.List;

/**
 * Screen 3: My Products List with Table, Search, and Status Filters.
 */
public class ProductListPanel extends JPanel {
    private final ProductService productService;
    private final WarrantyService warrantyService;
    private final MainFrame mainFrame;

    private JTable table;
    private DefaultTableModel tableModel;
    private JTextField txtSearch;
    private JComboBox<String> cmbStatusFilter;
    private List<Product> currentList;

    public ProductListPanel(ProductService productService, WarrantyService warrantyService, MainFrame mainFrame) {
        this.productService = productService;
        this.warrantyService = warrantyService;
        this.mainFrame = mainFrame;

        setLayout(new BorderLayout(15, 15));
        setBorder(new EmptyBorder(20, 20, 20, 20));
        setBackground(new Color(248, 250, 252));

        initComponents();
        refresh();
    }

    private void initComponents() {
        // Top Toolbar: Search & Filters
        JPanel topBar = new JPanel(new BorderLayout(15, 10));
        topBar.setOpaque(false);

        JPanel filterPanel = new JPanel(new FlowLayout(FlowLayout.LEFT, 10, 0));
        filterPanel.setOpaque(false);

        filterPanel.add(new JLabel("Search:"));
        txtSearch = new JTextField(18);
        txtSearch.setFont(new Font("Segoe UI", Font.PLAIN, 13));
        txtSearch.addActionListener(e -> applyFilter());
        filterPanel.add(txtSearch);

        JButton btnSearch = new JButton("Filter");
        btnSearch.addActionListener(e -> applyFilter());
        filterPanel.add(btnSearch);

        filterPanel.add(new JLabel("Status:"));
        cmbStatusFilter = new JComboBox<>(new String[]{"ALL", "ACTIVE", "EXPIRING_SOON", "EXPIRED"});
        cmbStatusFilter.addActionListener(e -> applyFilter());
        filterPanel.add(cmbStatusFilter);

        JButton btnReset = new JButton("Reset");
        btnReset.addActionListener(e -> {
            txtSearch.setText("");
            cmbStatusFilter.setSelectedIndex(0);
            applyFilter();
        });
        filterPanel.add(btnReset);

        JPanel actionsPanel = new JPanel(new FlowLayout(FlowLayout.RIGHT, 10, 0));
        actionsPanel.setOpaque(false);

        JButton btnAdd = new JButton("+ Add Product");
        btnAdd.setBackground(new Color(59, 130, 246));
        btnAdd.setForeground(Color.WHITE);
        btnAdd.setFont(new Font("Segoe UI", Font.BOLD, 12));
        btnAdd.addActionListener(e -> mainFrame.showAddProductDialog());
        actionsPanel.add(btnAdd);

        topBar.add(filterPanel, BorderLayout.WEST);
        topBar.add(actionsPanel, BorderLayout.EAST);
        add(topBar, BorderLayout.NORTH);

        // Table
        String[] columns = {"ID", "Product Name", "Brand", "Category", "Purchase Date", "Warranty End", "Days Left", "Status"};
        tableModel = new DefaultTableModel(columns, 0) {
            @Override
            public boolean isCellEditable(int row, int column) {
                return false;
            }
        };

        table = new JTable(tableModel);
        table.setRowHeight(32);
        table.setFont(new Font("Segoe UI", Font.PLAIN, 13));
        table.getTableHeader().setFont(new Font("Segoe UI", Font.BOLD, 13));
        table.setSelectionMode(ListSelectionModel.SINGLE_SELECTION);

        // Center align dates & status
        DefaultTableCellRenderer centerRenderer = new DefaultTableCellRenderer();
        centerRenderer.setHorizontalAlignment(SwingConstants.CENTER);
        table.getColumnModel().getColumn(0).setCellRenderer(centerRenderer);
        table.getColumnModel().getColumn(4).setCellRenderer(centerRenderer);
        table.getColumnModel().getColumn(5).setCellRenderer(centerRenderer);
        table.getColumnModel().getColumn(6).setCellRenderer(centerRenderer);
        table.getColumnModel().getColumn(7).setCellRenderer(centerRenderer);

        JScrollPane scrollPane = new JScrollPane(table);
        scrollPane.setBorder(BorderFactory.createLineBorder(new Color(226, 232, 240)));
        add(scrollPane, BorderLayout.CENTER);

        // Bottom Action Buttons
        JPanel bottomBar = new JPanel(new FlowLayout(FlowLayout.RIGHT, 10, 5));
        bottomBar.setOpaque(false);

        JButton btnView = new JButton("View Details");
        btnView.addActionListener(e -> viewSelected());
        bottomBar.add(btnView);

        JButton btnEdit = new JButton("Edit Product");
        btnEdit.addActionListener(e -> editSelected());
        bottomBar.add(btnEdit);

        JButton btnDelete = new JButton("Delete Product");
        btnDelete.setForeground(new Color(220, 38, 38));
        btnDelete.addActionListener(e -> deleteSelected());
        bottomBar.add(btnDelete);

        add(bottomBar, BorderLayout.SOUTH);
    }

    public void applyFilter() {
        String q = txtSearch.getText();
        String status = (String) cmbStatusFilter.getSelectedItem();
        currentList = productService.searchAndFilter(q, status);
        populateTable(currentList);
    }

    public void refresh() {
        applyFilter();
    }

    private void populateTable(List<Product> products) {
        tableModel.setRowCount(0);
        for (Product p : products) {
            LocalDate expiry = warrantyService.calculateExpiryDate(p);
            long days = warrantyService.calculateDaysRemaining(expiry);
            WarrantyStatus status = warrantyService.calculateStatus(days);

            tableModel.addRow(new Object[]{
                    p.getProductId(),
                    p.getProductName(),
                    p.getBrand(),
                    p.getCategory(),
                    p.getPurchaseDate(),
                    expiry,
                    days + "d",
                    status.getDisplayName()
            });
        }
    }

    private Product getSelectedProduct() {
        int selectedRow = table.getSelectedRow();
        if (selectedRow == -1 || currentList == null || selectedRow >= currentList.size()) {
            JOptionPane.showMessageDialog(this, "Please select a product from the table first.", "No Selection", JOptionPane.WARNING_MESSAGE);
            return null;
        }
        return currentList.get(selectedRow);
    }

    private void viewSelected() {
        Product selected = getSelectedProduct();
        if (selected != null) {
            mainFrame.showProductDetailsDialog(selected);
        }
    }

    private void editSelected() {
        Product selected = getSelectedProduct();
        if (selected != null) {
            mainFrame.showEditProductDialog(selected);
        }
    }

    private void deleteSelected() {
        Product selected = getSelectedProduct();
        if (selected != null) {
            int confirm = JOptionPane.showConfirmDialog(
                    this,
                    "Are you sure you want to delete:\n" + selected.getProductName() + " (" + selected.getProductId() + ")?",
                    "Confirm Deletion",
                    JOptionPane.YES_NO_OPTION,
                    JOptionPane.WARNING_MESSAGE
            );
            if (confirm == JOptionPane.YES_OPTION) {
                try {
                    productService.deleteProduct(selected.getProductId());
                    mainFrame.refreshAllPanels();
                    JOptionPane.showMessageDialog(this, "Product deleted successfully.", "Deleted", JOptionPane.INFORMATION_MESSAGE);
                } catch (Exception ex) {
                    JOptionPane.showMessageDialog(this, "Error deleting: " + ex.getMessage(), "Error", JOptionPane.ERROR_MESSAGE);
                }
            }
        }
    }
}
