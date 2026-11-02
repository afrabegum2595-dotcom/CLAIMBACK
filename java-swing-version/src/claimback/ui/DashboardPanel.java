package claimback.ui;

import claimback.model.Product;
import claimback.service.ProductService;
import claimback.service.WarrantyService;

import javax.swing.*;
import javax.swing.border.EmptyBorder;
import javax.swing.border.LineBorder;
import java.awt.*;
import java.time.LocalDate;
import java.util.List;

/**
 * Screen 1: Dashboard Panel.
 * Displays 4 summary cards and upcoming expirations list.
 */
public class DashboardPanel extends JPanel {
    private final ProductService productService;
    private final WarrantyService warrantyService;
    private final MainFrame mainFrame;

    private JLabel lblTotal;
    private JLabel lblActive;
    private JLabel lblExpiring;
    private JLabel lblExpired;
    private JPanel upcomingContainer;

    public DashboardPanel(ProductService productService, WarrantyService warrantyService, MainFrame mainFrame) {
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
        // Top Header
        JPanel headerPanel = new JPanel(new BorderLayout());
        headerPanel.setOpaque(false);

        JLabel title = new JLabel("Warranty Overview & Analytics");
        title.setFont(new Font("Segoe UI", Font.BOLD, 22));
        title.setForeground(new Color(15, 23, 42));

        JButton btnAdd = new JButton("+ Add Product");
        btnAdd.setFont(new Font("Segoe UI", Font.BOLD, 13));
        btnAdd.setBackground(new Color(59, 130, 246));
        btnAdd.setForeground(Color.WHITE);
        btnAdd.setFocusPainted(false);
        btnAdd.addActionListener(e -> mainFrame.showAddProductDialog());

        headerPanel.add(title, BorderLayout.WEST);
        headerPanel.add(btnAdd, BorderLayout.EAST);
        add(headerPanel, BorderLayout.NORTH);

        // Center Content: Cards + Upcoming List
        JPanel contentPanel = new JPanel(new BorderLayout(0, 20));
        contentPanel.setOpaque(false);

        // 4 KPI Cards
        JPanel cardsGrid = new JPanel(new GridLayout(1, 4, 15, 0));
        cardsGrid.setOpaque(false);

        lblTotal = new JLabel("0", SwingConstants.CENTER);
        lblActive = new JLabel("0", SwingConstants.CENTER);
        lblExpiring = new JLabel("0", SwingConstants.CENTER);
        lblExpired = new JLabel("0", SwingConstants.CENTER);

        cardsGrid.add(createCard("Total Products", lblTotal, new Color(59, 130, 246), new Color(239, 246, 255)));
        cardsGrid.add(createCard("Active Warranties", lblActive, new Color(16, 185, 129), new Color(236, 253, 245)));
        cardsGrid.add(createCard("Expiring Soon", lblExpiring, new Color(245, 158, 11), new Color(254, 243, 199)));
        cardsGrid.add(createCard("Expired", lblExpired, new Color(239, 68, 68), new Color(254, 242, 242)));

        contentPanel.add(cardsGrid, BorderLayout.NORTH);

        // Upcoming Expirations Section
        JPanel upcomingPanel = new JPanel(new BorderLayout());
        upcomingPanel.setBackground(Color.WHITE);
        upcomingPanel.setBorder(BorderFactory.createCompoundBorder(
                new LineBorder(new Color(226, 232, 240), 1),
                new EmptyBorder(15, 15, 15, 15)
        ));

        JLabel upcomingTitle = new JLabel("Warranties Nearing Expiry (0 to 30 Days)");
        upcomingTitle.setFont(new Font("Segoe UI", Font.BOLD, 16));
        upcomingTitle.setForeground(new Color(30, 41, 59));
        upcomingPanel.add(upcomingTitle, BorderLayout.NORTH);

        upcomingContainer = new JPanel();
        upcomingContainer.setLayout(new BoxLayout(upcomingContainer, BoxLayout.Y_AXIS));
        upcomingContainer.setOpaque(false);

        JScrollPane scroll = new JScrollPane(upcomingContainer);
        scroll.setBorder(null);
        scroll.setOpaque(false);
        scroll.getViewport().setOpaque(false);
        upcomingPanel.add(scroll, BorderLayout.CENTER);

        contentPanel.add(upcomingPanel, BorderLayout.CENTER);
        add(contentPanel, BorderLayout.CENTER);
    }

    private JPanel createCard(String title, JLabel valLabel, Color accentColor, Color bgColor) {
        JPanel card = new JPanel(new BorderLayout(5, 5));
        card.setBackground(Color.WHITE);
        card.setBorder(BorderFactory.createCompoundBorder(
                new LineBorder(new Color(226, 232, 240), 1),
                new EmptyBorder(15, 15, 15, 15)
        ));

        JLabel lblTitle = new JLabel(title.toUpperCase());
        lblTitle.setFont(new Font("Segoe UI", Font.BOLD, 11));
        lblTitle.setForeground(new Color(100, 116, 139));

        valLabel.setFont(new Font("Segoe UI", Font.BOLD, 32));
        valLabel.setForeground(accentColor);

        card.add(lblTitle, BorderLayout.NORTH);
        card.add(valLabel, BorderLayout.CENTER);
        return card;
    }

    public void refresh() {
        lblTotal.setText(String.valueOf(productService.getTotalCount()));
        lblActive.setText(String.valueOf(productService.getActiveCount()));
        lblExpiring.setText(String.valueOf(productService.getExpiringSoonCount()));
        lblExpired.setText(String.valueOf(productService.getExpiredCount()));

        upcomingContainer.removeAll();
        List<Product> upcoming = productService.getUpcomingExpirations(6);

        if (upcoming.isEmpty()) {
            JLabel empty = new JLabel("No products currently expiring soon. All warranties in good standing!");
            empty.setFont(new Font("Segoe UI", Font.ITALIC, 13));
            empty.setForeground(new Color(148, 163, 184));
            empty.setBorder(new EmptyBorder(20, 0, 0, 0));
            upcomingContainer.add(empty);
        } else {
            for (Product p : upcoming) {
                LocalDate expiry = warrantyService.calculateExpiryDate(p);
                long days = warrantyService.calculateDaysRemaining(expiry);

                JPanel row = new JPanel(new BorderLayout(10, 5));
                row.setBackground(new Color(248, 250, 252));
                row.setBorder(BorderFactory.createCompoundBorder(
                        new LineBorder(new Color(226, 232, 240), 1),
                        new EmptyBorder(10, 15, 10, 15)
                ));
                row.setMaximumSize(new Dimension(Integer.MAX_VALUE, 55));

                JLabel lblName = new JLabel(p.getProductName() + " (" + p.getBrand() + ")");
                lblName.setFont(new Font("Segoe UI", Font.BOLD, 14));
                lblName.setForeground(new Color(30, 41, 59));

                JLabel lblExpiry = new JLabel("Expires: " + expiry + " (" + days + " days remaining)");
                lblExpiry.setFont(new Font("Segoe UI", Font.BOLD, 12));
                lblExpiry.setForeground(new Color(217, 119, 6));

                row.add(lblName, BorderLayout.WEST);
                row.add(lblExpiry, BorderLayout.EAST);

                upcomingContainer.add(row);
                upcomingContainer.add(Box.createVerticalStrut(8));
            }
        }

        upcomingContainer.revalidate();
        upcomingContainer.repaint();
    }
}
