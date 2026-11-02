# 🛡️ CLAIMBACK – Smart Warranty & Purchase Tracker

> **CLAIMBACK** is a clean, modern, offline-first application designed to organize purchase records, calculate warranty end dates, and alert consumers before product warranties expire.

---

## 🌟 Key Features

- **📊 Comprehensive Dashboard**: 4 real-time KPI metrics (Total Products, Active Warranties, Expiring Soon, Expired), plus an urgent Upcoming Expirations feed sorted by nearest expiry date.
- **⚡ Live Interactive Warranty Calculator**: Dynamically calculates expiry dates, days remaining, and status in real-time as you enter purchase dates and duration (Months or Years).
- **🔍 Fast Search & Multi-Filters**: Instant live search by Product ID (e.g. `CB-0001`), product name, brand, or serial number, with status pills (`Active`, `Expiring Soon`, `Expired`) and category filters.
- **🏷️ Strict Business Logic & Calculations**:
  - **Active**: > 30 calendar days remaining.
  - **Expiring Soon**: 0 to 30 days remaining (includes expiry today at 0 days).
  - **Expired**: After expiry date (negative days).
  - Accurate calendar arithmetic matching standard `LocalDate` month rules (e.g., Jan 31 + 1 month = Feb 28/29).
- **💾 Local Data Persistence**: Saves and loads automatically from `data/products.json` with automatic directory creation, atomic writes, and `.bak` backup copy protection.
- **📥 CSV Export & Demo Data Toggle**: 1-click export to CSV for spreadsheets and 1-click load/clear of realistic sample data.
- **🌓 Light & Dark Theme**: Sleek glassmorphism UI with theme toggle and local storage persistence.
- **📦 Dual Implementation**:
  1. **Fullstack Web Application**: Zero-dependency Node.js HTTP server + modern responsive SPA.
  2. **Core Java Swing Desktop Application**: Fully structured Java source code matching PRD Section 11 specifications in `java-swing-version/`.

---

## 🚀 How to Run the Web Application

The web application runs using standard Node.js with **zero external npm dependencies** required!

### Prerequisites
- Node.js installed (v18+ recommended)

### Start the Server
```bash
# Navigate to the project folder
cd claimback-app

# Launch the server
npm start
# OR: node server.js
```

Open your browser and navigate to:
```
http://localhost:3000
```

---

## 🧪 Running Automated Tests

All test scenarios and acceptance criteria from Section 13 & 14 of the PRD are automated:

```bash
npm test
# OR: node --test
```

### Test Results Summary
```text
✔ Scenario 1: Add product with valid details saves and returns CB-0001
✔ Scenario 2: Missing name is rejected with clear error
✔ Scenario 3: Future purchase date is rejected with validation message
✔ Scenario 4: Active status when days remaining is > 30
✔ Scenario 5: Expiring soon when expiry date is 15 days away
✔ Scenario 6: Expiry date today shows Expiring Soon with 0 days remaining
✔ Scenario 7: Expired status when expiry date was yesterday
✔ Scenario 8: Search matches product name, brand, or ID case-insensitively
✔ Scenario 9: Confirm deletion removes record from list and file
✔ Scenario 10: Records persist after closing and reopening repo
✔ Date Arithmetic: Jan 31 + 1 month correctly adjusts to Feb 28 or 29
✔ Dashboard stats correctly aggregate totals and categories
✔ REST API: GET /api/stats, POST /api/products, GET /api/calculate, GET /api/export/csv
Total: 17 passed, 0 failed
```

---

## 📁 Project Architecture

```
claimback-app/
├── server.js               # Zero-dependency Node.js HTTP Server & REST API
├── package.json            # Project manifest & test runner scripts
├── public/                 # Modern Frontend Assets
│   ├── index.html          # Semantic Single-Page Application
│   ├── css/
│   │   └── styles.css      # Custom design system & animations
│   └── js/
│       └── app.js          # Client-side reactivity, modals, & calculators
├── src/                    # Backend Logic
│   ├── models/
│   │   └── Product.js      # Product schema
│   ├── services/
│   │   ├── warrantyService.js  # Date arithmetic & status engine
│   │   └── productService.js   # CRUD & dashboard aggregations
│   ├── repository/
│   │   └── productRepository.js # File persistence with atomic backup
│   └── utils/
│       ├── validator.js    # Validation & future-date checks
│       └── idGenerator.js  # Auto-generating CB-0001 sequence
├── tests/                  # Automated Test Suite
│   ├── warranty.test.js    # Unit tests for FR-01 through FR-09
│   ├── api.test.js         # Integration tests for HTTP REST endpoints
│   └── probe.js            # Self-testing network probe
├── data/
│   └── products.json       # Local database file
└── java-swing-version/     # Complete Core Java Swing mini-project
    ├── src/claimback/
    │   ├── Main.java
    │   ├── model/Product.java, WarrantyStatus.java
    │   ├── service/ProductService.java, WarrantyService.java
    │   ├── repository/ProductRepository.java
    │   ├── ui/MainFrame.java, DashboardPanel.java, ProductListPanel.java, ...
    │   └── util/InputValidator.java, IdGenerator.java
    └── README.md
```

---

## ☕ Core Java Swing Version

If you need to compile and run the Java Swing desktop version:

```bash
cd java-swing-version
javac -d bin src/claimback/model/*.java src/claimback/util/*.java src/claimback/service/*.java src/claimback/repository/*.java src/claimback/ui/*.java src/claimback/Main.java
java -cp bin claimback.Main
```

---

## 📤 Pushing to GitHub

To push this completed project to your GitHub account:

1. Create a new empty repository on [GitHub](https://github.com/new) named `claimback` (do not initialize with README since we already have one).
2. Run the following commands in terminal:

```bash
cd claimback-app
git init
git add .
git commit -m "feat: complete CLAIMBACK smart warranty & purchase tracker app"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/claimback.git
git push -u origin main
```
