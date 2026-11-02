package claimback.ui;

import claimback.model.Product;
import claimback.service.ProductService;
import claimback.service.WarrantyService;

import javax.swing.*;
import javax.swing.border.EmptyBorder;
import java.awt.*;

/**
 * Main application window for CLAIMBACK Swing desktop application.
 */
public class MainFrame extends JFrame {
    private final ProductService productService;
    private final WarrantyService warrantyService;

    private CardLayout cardLayout;
    private JPanel centerCards;

    private DashboardPanel dashboardPanel;
    private ProductListPanel productListPanel;

    public MainFrame(ProductService productService, WarrantyService warrantyService) {
        super("CLAIMBACK – Smart Warranty & Purchase Tracker");
        this.productService = productService;
        this.warrantyService = warrantyService;

        setDefaultCloseOperation(JFrame.EXIT_ON_CLOSE);
        setSize(1080, 720);
        setMinimumSize(new Dimension(850, 600));
        setLocationRelativeTo(null);

        initComponents();
    }

    private void initComponents() {
        setLayout(new BorderLayout());

        // Header Navigation Bar
        JPanel navBar = new JPanel(new BorderLayout());
        navBar.setBackground(new Color(15, 23, 42)); // Dark Navy
        navBar.setBorder(new EmptyBorder(12, 20, 12, 20));

        // Brand Title
        JLabel brand = new JLabel("CLAIMBACK");
        brand.setFont(new Font("Segoe UI", Font.BOLD, 18));
        brand.setForeground(Color.WHITE);

        JLabel brandSub = new JLabel("  Smart Warranty & Purchase Tracker");
        brandSub.setFont(new Font("Segoe UI", Font.PLAIN, 12));
        brandSub.setForeground(new Color(148, 163, 184));

        JPanel brandWrap = new JPanel(new FlowLayout(FlowLayout.LEFT, 0, 0));
        brandWrap.setOpaque(false);
        brandWrap.add(brand);
        brandWrap.add(brandSub);
        navBar.add(brandWrap, BorderLayout.WEST);

        // Navigation Buttons
        JPanel navButtons = new JPanel(new FlowLayout(FlowLayout.RIGHT, 10, 0));
        navButtons.setOpaque(false);

        JButton btnDash = createNavButton("Dashboard");
        btnDash.addActionListener(e -> showCard("DASHBOARD"));
        navButtons.add(btnDash);

        JButton btnProducts = createNavButton("My Products");
        btnProducts.addActionListener(e -> showCard("PRODUCTS"));
        navButtons.add(btnProducts);

        JButton btnAdd = createNavButton("+ Add Product");
        btnAdd.addActionListener(e -> showAddProductDialog());
        navButtons.add(btnAdd);

        JButton btnDemo = createNavButton("Load Demo Data");
        btnDemo.addActionListener(e -> {
            try {
                productService.loadSampleData();
                refreshAllPanels();
                JOptionPane.showMessageDialog(this, "Sample demo products loaded successfully.", "Demo Data", JOptionPane.INFORMATION_MESSAGE);
            } catch (Exception ex) {
                JOptionPane.showMessageDialog(this, "Error loading sample data: " + ex.getMessage(), "Error", JOptionPane.ERROR_MESSAGE);
            }
        });
        navButtons.add(btnDemo);

        JButton btnAbout = createNavButton("About");
        btnAbout.addActionListener(e -> showCard("ABOUT"));
        navButtons.add(btnAbout);

        navBar.add(navButtons, BorderLayout.EAST);
        add(navBar, BorderLayout.NORTH);

        // Center: CardLayout
        cardLayout = new CardLayout();
        centerCards = new JPanel(cardLayout);

        dashboardPanel = new DashboardPanel(productService, warrantyService, this);
        productListPanel = new ProductListPanel(productService, warrantyService, this);
        JPanel aboutPanel = createAboutPanel();

        centerCards.add(dashboardPanel, "DASHBOARD");
        centerCards.add(productListPanel, "PRODUCTS");
        centerCards.add(aboutPanel, "ABOUT");

        add(centerCards, BorderLayout.CENTER);
    }

    private JButton createNavButton(String text) {
        JButton btn = new JButton(text);
        btn.setFont(new Font("Segoe UI", Font.BOLD, 12));
        btn.setForeground(Color.WHITE);
        btn.setBackground(new Color(30, 41, 59));
        btn.setBorder(BorderFactory.createCompoundBorder(
                BorderFactory.createLineBorder(new Color(51, 65, 85), 1),
                new EmptyBorder(6, 12, 6, 12)
        ));
        btn.setFocusPainted(false);
        return btn;
    }

    private JPanel createAboutPanel() {
        JPanel p = new JPanel(new GridBagLayout());
        p.setBackground(new Color(248, 250, 252));

        JPanel card = new JPanel(new GridLayout(6, 1, 10, 10));
        card.setBackground(Color.WHITE);
        card.setBorder(BorderFactory.createCompoundBorder(
                BorderFactory.createLineBorder(new Color(226, 232, 240), 1),
                new EmptyBorder(30, 40, 30, 40)
        ));

        JLabel title = new JLabel("About CLAIMBACK", SwingConstants.CENTER);
        title.setFont(new Font("Segoe UI", Font.BOLD, 22));

        JLabel desc = new JLabel("Smart Warranty & Purchase Tracker", SwingConstants.CENTER);
        desc.setFont(new Font("Segoe UI", Font.PLAIN, 14));
        desc.setForeground(new Color(100, 116, 139));

        JLabel stack = new JLabel("Technology: Java Swing GUI & Core Java Backend", SwingConstants.CENTER);
        JLabel dates = new JLabel("Date Engine: java.time.LocalDate & ChronoUnit", SwingConstants.CENTER);
        JLabel storage = new JLabel("Persistence: Local Data Repository (data/products.csv)", SwingConstants.CENTER);
        JLabel license = new JLabel("Offline & Beginner-Friendly Student Mini-Project", SwingConstants.CENTER);

        card.add(title);
        card.add(desc);
        card.add(stack);
        card.add(dates);
        card.add(storage);
        card.add(license);

        p.add(card);
        return p;
    }

    public void showCard(String cardName) {
        cardLayout.show(centerCards, cardName);
        if ("DASHBOARD".equals(cardName)) {
            dashboardPanel.refresh();
        } else if ("PRODUCTS".equals(cardName)) {
            productListPanel.refresh();
        }
    }

    public void showAddProductDialog() {
        ProductFormDialog dlg = new ProductFormDialog(this, productService, warrantyService, null, this);
        dlg.setVisible(true);
    }

    public void showEditProductDialog(Product p) {
        ProductFormDialog dlg = new ProductFormDialog(this, productService, warrantyService, p, this);
        dlg.setVisible(true);
    }

    public void showProductDetailsDialog(Product p) {
        ProductDetailsDialog dlg = new ProductDetailsDialog(this, p, productService, warrantyService, this);
        dlg.setVisible(true);
    }

    public void refreshAllPanels() {
        dashboardPanel.refresh();
        productListPanel.refresh();
    }
}
