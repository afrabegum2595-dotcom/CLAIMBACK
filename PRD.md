# 📋 PRODUCT REQUIREMENTS DOCUMENT (PRD)

## Project: CLAIMBACK – Smart Warranty & Purchase Tracker

| Attribute | Details |
| :--- | :--- |
| **Product Name** | **CLAIMBACK** |
| **Subtitle** | Smart Warranty & Purchase Tracker |
| **Repository** | [github.com/afrabegum2595-dotcom/CLAIMBACK](https://github.com/afrabegum2595-dotcom/CLAIMBACK) |
| **Production Target** | Vercel Serverless Cloud Deployment & Offline Local Desktop |
| **Version** | **1.0.0 (Production Release)** |
| **Build Status** | ✅ **Passing All 17 Automated Tests** |

---

## 1. Executive Summary & Purpose

Consumers and businesses regularly purchase electronic devices, home appliances, tools, and office equipment. However, tracking purchase invoices, warranty certificates, and manufacturer claim windows is notoriously disorganized:
- Paper receipts fade or get misplaced.
- Warranty expiry dates pass without notice, resulting in expensive out-of-pocket repairs.
- When an item breaks, locating model numbers, serial codes, and retailer info is frustrating.

**CLAIMBACK** solves this by providing a unified, beginner-friendly digital registry that organizes purchase history, calculates exact expiration deadlines in real-time, highlights impending deadlines, and ensures no claim opportunity is lost.

---

## 2. Goals & Non-Goals

### Core Goals
- Allow instant recording, editing, viewing, and deletion of purchased products.
- Automatically generate unique, standardized product identifiers (`CB-0001`, `CB-0002`).
- Accurately compute warranty expiration dates and days remaining using standard calendar math.
- Categorize warranties into three unambiguous statuses:
  - 🟢 **Active**: Healthy coverage (> 30 days remaining).
  - 🟡 **Expiring Soon**: Action needed (0 to 30 days remaining, including expiration today).
  - 🔴 **Expired**: Past coverage (warranty ended yesterday or earlier).
- Maintain 100% offline functionality with zero external API dependencies or paid database accounts.
- Dual-target design: Deploy seamlessly on **Vercel** as a web app AND run as a **Core Java Swing** desktop application.

### Non-Goals
- No paid cloud database requirements (MongoDB, Supabase, etc.) or recurring subscription fees.
- No mandatory user login, password authentication, or cloud account lock-in.
- No OCR scanning or payment gateway integration.

---

## 3. Technology Stack & System Architecture

```
┌────────────────────────────────────────────────────────┐
│                   CLIENT LAYER (UI/UX)                 │
│  - Semantic HTML5, Custom CSS Variables & Animations   │
│  - Responsive Viewports (Mobile, Tablet, Desktop)      │
│  - Reactive SPA Controller (Live Date Engine)          │
│  - Client LocalStorage Cache (Zero-Loss Offline Sync)  │
└──────────────────────────┬─────────────────────────────┘
                           │ HTTP / JSON
┌──────────────────────────▼─────────────────────────────┐
│                 BACKEND SERVICE LAYER                  │
│  - Native Node.js Server & Vercel Serverless Function   │
│  - Pure HTTP / REST API (Zero NPM Dependencies)        │
│  - Business Validation & Sanitization Engine           │
│  - ProductService & WarrantyService Calculations       │
└──────────────────────────┬─────────────────────────────┘
                           │ File I/O
┌──────────────────────────▼─────────────────────────────┐
│                   PERSISTENCE LAYER                    │
│  - Local: data/products.json (+ atomic .bak copies)    │
│  - Vercel Serverless: /tmp/products.json + Seed Data   │
│  - Export Engine: Standard RFC-4180 CSV Generator      │
└────────────────────────────────────────────────────────┘
```

---

## 4. Functional Requirements (FR-01 to FR-09)

### FR-01: Real-Time Dashboard
- **Summary KPI Cards**: Displays real-time counts for Total Registered, Active, Expiring Soon, and Expired products.
- **Urgent Expirations Feed**: Shortlist of upcoming expirations ordered by nearest deadline (fewest days left).
- **Quick Action Triggers**: Instant buttons to "+ Add Product" or jump directly to filtered views.

### FR-02: Add Product & ID Auto-Generation
- **Automated Sequential ID**: Generates non-colliding formatted IDs starting at `CB-0001`.
- **Required Fields**: Product Name, Brand / Manufacturer, Purchase Date, Warranty Duration, and Warranty Unit.
- **Optional Fields**: Category, Purchase Price, Serial Number / IMEI, Retailer / Store, Notes & Coverage details.
- **Live Calculation Preview**: As the user types the purchase date and duration, the expiry date and status badge update instantaneously.

### FR-03: Inventory Table & Detail Views
- **Structured Data Columns**: Product ID, Product Name, Brand, Category, Purchase Date, Warranty End Date, Days Left, Status, Actions.
- **Multi-Column Sorting**: Sort by nearest expiry, furthest expiry, name (A–Z), or purchase date (newest).
- **Comprehensive Details Modal**: Visual progress bar indicating elapsed warranty percentage from purchase date to expiry date.

### FR-04: Search & Multi-Criteria Filtering
- **Live Instant Search**: Case-insensitive substring matching against Product Name, Brand, Product ID, and Serial Number.
- **Status Filter Pills**: Quick toggle between `ALL`, `ACTIVE`, `EXPIRING_SOON`, and `EXPIRED`.
- **Category Filter Dropdown**: Automatically aggregates unique product categories.
- **Empty State**: Clear visual empty state when no products match filters, with an action button to add a product or reset search.

### FR-05: Warranty Calculation Engine
- **Duration Units**: Supports whole number integers in either **Months** or **Years**.
- **Calendar Math**: Uses Gregorian calendar rules. Handles leap years and month-end clamping (e.g. January 31 + 1 Month = February 28, or February 29 in leap years).
- **Boundary Conditions**:
  - Expiry date equals today: Classified as **Expiring Soon** with `0 days remaining`.
  - Expiry date was yesterday: Classified as **Expired** with `-1 days remaining`.
  - Expiry date is 30 days away: Classified as **Expiring Soon**.
  - Expiry date is 31 days away: Classified as **Active**.

### FR-06: Edit Product
- Allows full modification of all attributes.
- Dynamically recalculates expiry date, days remaining, and status badge upon saving.

### FR-07: Delete Product
- Secure deletion protected by a confirmation dialog displaying the product name and ID.
- Automatically refreshes dashboard metrics and persistent storage.

### FR-08: Data Persistence & Resiliency
- Loads stored products automatically on server launch.
- Saves changes after every add, edit, or delete operation.
- Creates directories and files automatically if missing.
- Dual-layer persistence: Writes to JSON storage on the server while simultaneously caching records in client-side `localStorage` to guarantee 100% data preservation across serverless reboots.

### FR-09: Validation & Input Guards
- Rejects empty required fields.
- Rejects invalid date strings.
- Rejects future purchase dates (purchases cannot be in the future).
- Rejects negative or zero warranty duration.
- Rejects negative purchase prices.
- Displays inline validation error messages directly under affected fields.

---

## 5. REST API Specification

| Endpoint | Method | Description | Request Body / Query | Success Response |
| :--- | :---: | :--- | :--- | :--- |
| `/api/stats` | `GET` | Aggregated dashboard metrics & upcoming list | None | `200 OK` (JSON) |
| `/api/products` | `GET` | Filtered & sorted product inventory | `search`, `status`, `category`, `sortBy` | `200 OK` (Array) |
| `/api/products` | `POST` | Create a new product | JSON Product Object | `201 Created` |
| `/api/products/:id` | `GET` | Retrieve single product details | URL param `:id` | `200 OK` / `404` |
| `/api/products/:id` | `PUT` | Update existing product | JSON Product Object | `200 OK` / `404` |
| `/api/products/:id` | `DELETE` | Delete a product record | URL param `:id` | `200 OK` / `404` |
| `/api/calculate` | `GET` | Live stateless date math endpoint | `purchaseDate`, `duration`, `unit` | `200 OK` |
| `/api/export/csv` | `GET` | Download inventory spreadsheet | None | `200 OK` (`text/csv`) |
| `/api/demo/load` | `POST` | Seed 5 realistic demo products | None | `200 OK` |
| `/api/demo/clear` | `POST` | Remove all sample demo items | None | `200 OK` |

---

## 6. Verification & Automated Test Scenarios

| Test Scenario | Action | Expected Output | Status |
| :--- | :--- | :--- | :---: |
| **Add Product** | Valid name, brand, date, duration | Record saved, ID `CB-0001` assigned | ✅ PASS |
| **Missing Field** | Blank product name | 400 Bad Request; inline error | ✅ PASS |
| **Future Date** | Purchase date set to tomorrow | Rejected with future date warning | ✅ PASS |
| **Active Status** | Expiry > 30 days away | Status: `Active` (Green) | ✅ PASS |
| **Expiring Soon** | Expiry 15 days away | Status: `Expiring Soon` (Amber) | ✅ PASS |
| **Expiry Today** | Expiry equals today's date | Status: `Expiring Soon` (0 days) | ✅ PASS |
| **Expired Status** | Expiry date was yesterday | Status: `Expired` (Red) | ✅ PASS |
| **Search Filter** | Query "Sony" or "CB-0002" | Matches returned accurately | ✅ PASS |
| **Delete Record** | Confirm deletion of item | Item removed from memory & disk | ✅ PASS |
| **Persistence** | Restart server after adding product | Product remains in storage | ✅ PASS |
| **Leap Year Math**| Jan 31 + 1 month in leap year | Adjusts accurately to Feb 29 | ✅ PASS |
| **API Endpoints** | Integration calls to `/api/*` | Correct status codes & JSON schemas | ✅ PASS |

---

## 7. Deployment & Live Hosting Guide

### Deploying to Vercel
1. Fork or push to GitHub: `https://github.com/afrabegum2595-dotcom/CLAIMBACK`.
2. Connect to [Vercel](https://vercel.com) and click **"Add New Project"**.
3. Select `CLAIMBACK` and click **Deploy**.
4. The application is instantly available on global high-speed edge infrastructure with zero setup required.

### Local Development
```bash
# Clone the repository
git clone https://github.com/afrabegum2595-dotcom/CLAIMBACK.git
cd CLAIMBACK

# Start the web app
npm start
# Open http://localhost:3000

# Run automated tests
npm test
```

### Core Java Swing Desktop Execution
```bash
cd java-swing-version
javac -d bin src/claimback/model/*.java src/claimback/util/*.java src/claimback/service/*.java src/claimback/repository/*.java src/claimback/ui/*.java src/claimback/Main.java
java -cp bin claimback.Main
```
