# Stationery Billing – Professional Billing & Inventory Management Software

A production-ready, commercial-grade Stationery Shop Billing & Inventory Management Web Application built with **React**, **TypeScript**, **Vite**, **Tailwind CSS**, and **Supabase PostgreSQL**.

Designed with a clean **White & Blue** professional UI, desktop-first responsive design, atomic transaction processing, low-stock alerts, barcode scanner integration, and audit-grade financial reporting.

---

## 🌟 Key Modules & Features

### 1. POS Billing System (`New Bill` / Hotkey `F1`)
- **Fast Product Search**: Search by product name, SKU, or direct barcode scanner input (`F3`).
- **Category Filter Pills**: Quick one-click filtering by stationery category.
- **Cart Management**: Add items, increase/decrease quantity, direct quantity typing, and stock boundary checks.
- **Taxes & Surcharges**: Automatic GST calculation (CGST + SGST split or IGST) based on item tax slabs (0%, 5%, 12%, 18%, 28%).
- **Discounts**: Item-level discount (%) and bill-level discount (Flat ₹ or %).
- **Payment Methods**: Cash (with tender/change calculator), UPI / QR Code, Card, and Split payment.
- **Transaction Safety**: Debounced single-click protection preventing duplicate billing, atomic stock deduction, and movement audit logging.
- **Invoice Formats**:
  - **A4 Full-Page Tax Invoice**: With shop details, GSTIN, customer information, itemized table, and amount in words.
  - **80mm Thermal Receipt**: Compact POS receipt with shop header, dashed lines, and itemized breakdown.
- **Instant Actions**: Direct browser print (`window.print()`) and downloadable PDF (`jsPDF`).

### 2. Dashboard
- Real-time KPIs calculated from actual database records:
  - Today's Sales Revenue
  - Monthly Sales
  - Estimated Net Profit (Sales minus COGS and Operating Expenses)
  - Low Stock Alerts count
  - Total Bills, Catalog Items, and Registered Customers
- 6-month historical revenue & profit trend area chart (`Recharts`).
- Best-selling stationery products by quantity and revenue.
- Recent invoices list with instant invoice preview and reprinting.

### 3. Product Catalog & CRUD
- Full CRUD: Add, Edit, Delete (with historical sales protection), Search, and Filter.
- Fields: Name, SKU, Barcode, Category, Purchase Cost, Selling Price, Current Stock, Minimum Stock, Unit (pcs, pack, box, ream, set, bottle, pad, dozen), and GST Rate.
- Unique SKU and Barcode validation.
- One-click export of catalog to Excel (`.xlsx`).

### 4. Category Management
- Pre-populated with stationery categories:
  - *Pens & Pencils*, *Notebooks & Records*, *Books & Guides*, *Files & Folders*, *Art & Craft*, *Office Supplies*, *Printing Materials*, and *Other Items*.
- Add, Edit, and Delete categories with integrity validation (prevents deleting categories that contain active products).

### 5. Inventory & Stock Control
- Real-time stock valuation: Total Cost Value and Total Retail Value.
- Automatic stock deduction upon completed sales.
- Automatic stock replenishment upon confirmed purchase inward entries.
- Manual stock count adjustments with mandatory audit reason.
- Complete stock movement history audit trail (Sale, Purchase, Adjustment, Initial).

### 6. Customer Management
- Register customers with Name, Phone, Email, Address, and GSTIN.
- Lifetime spending and purchase frequency tracking.
- Full support for Walk-in Customers without mandatory registration.
- View individual customer invoice history.

### 7. Purchase Management (Inward Stock)
- Record supplier inward bills with invoice number, supplier details, item quantities, and wholesale costs.
- Automatically increments inventory stock levels upon submission.

### 8. Operating Expense Register
- Track overhead costs: Shop Rent, Electricity Bills, Wholesale Transport & Logistics, Staff Salaries, Tea/Refreshments, Packaging, and Maintenance.
- Automatically factored into the Net Profit calculation.

### 9. Financial & Managerial Reports
- **Daily Report**: Sales revenue, invoice count, units sold, discount total, tax collected, and payment mode breakdown.
- **Monthly P&L**: Total Sales, COGS (Cost of Goods Sold based on actual purchase costs), Gross Profit, Operating Expenses, and Net Profit.
- **Yearly Report**: 12-month bar chart comparing revenue, expenses, and profits.
- **Month Comparison**: Side-by-side comparison of any two months with margin variance.
- **Exporting**: One-click export to PDF (`jsPDF` + `autoTable`) and Excel (`.xlsx`).

### 10. Store & System Settings
- Shop Profile: Name, Phone, Address, Email, GSTIN, and State.
- Invoice Customization: Invoice prefix (e.g. `STN-2026-`), footer note, and return policies.
- Default printer selection (80mm Thermal Receipt vs A4 Invoice).
- User management: Admin vs Staff permissions.
- Database backup export in JSON format.

---

## 🗄️ Database Architecture (Supabase PostgreSQL)

The schema is defined in [`supabase/migrations/20260218000001_initial_schema.sql`](file:///c:/Users/ELCOT/Billing/supabase/migrations/20260218000001_initial_schema.sql).

### Tables:
1. `shops`: Shop profile, tax numbers, and billing configurations.
2. `profiles`: User accounts linked to Supabase Auth (`admin` or `staff`).
3. `categories`: Stationery categories.
4. `products`: Catalog items, barcode, SKU, pricing, stock, and GST rate.
5. `customers`: Customer records and lifetime value.
6. `suppliers`: Wholesale stationery distributors.
7. `sales`: Invoices, financial totals, customer info, cashier, and payment mode.
8. `sale_items`: Itemized invoice lines with quantity, prices, discount, and taxes.
9. `purchases`: Inward purchase orders from suppliers.
10. `purchase_items`: Inward line items.
11. `expenses`: Operating expenses with categories and voucher references.
12. `stock_movements`: Complete immutable stock movement audit trail.
13. `monthly_reports`: Historical aggregated monthly financial statements.

### Atomic Stored Procedures:
- `create_sale_transaction`: Atomically verifies stock, creates the invoice, logs sale items, decrements stock, and writes stock movement audit logs.
- `create_purchase_transaction`: Atomically records supplier bills and increments product stock.
- `generate_monthly_financial_report`: Aggregates monthly revenues, COGS, expenses, and net profit.

---

## 🚀 Getting Started

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment Variables
Copy `.env.example` to `.env`:
```bash
VITE_SUPABASE_URL=https://your-supabase-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
```
*(Note: If left blank, the application automatically runs in standalone local mode with realistic stationery demo data and persistent LocalStorage).*

### 3. Setup Supabase Database
1. Open your Supabase Dashboard -> **SQL Editor**.
2. Paste and run the contents of [`supabase/migrations/20260218000001_initial_schema.sql`](file:///c:/Users/ELCOT/Billing/supabase/migrations/20260218000001_initial_schema.sql).

### 4. Run Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## ☁️ Deployment to Vercel

1. Push this repository to GitHub or GitLab.
2. Import the repository in [Vercel](https://vercel.com).
3. Under **Environment Variables**, add:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
4. The included [`vercel.json`](file:///c:/Users/ELCOT/Billing/vercel.json) automatically handles SPA routing rewrites.
5. Click **Deploy**.

---

## ⌨️ Keyboard Shortcuts
- **F1**: Instantly switch to New Bill (POS Counter)
- **F2**: Focus product keyword search input
- **F3**: Focus barcode scanner input
- **Escape**: Close any open modal / invoice preview

---

## 🛡️ License
Proprietary commercial software for stationery store billing and inventory management.

