import * as XLSX from 'xlsx';
import { Product, Sale } from '../types/database';

/**
 * Export products inventory to Excel
 */
export const exportProductsToExcel = (products: Product[], filename = 'Stationery_Inventory.xlsx') => {
  const data = products.map((p, idx) => ({
    'S.No': idx + 1,
    'Product Name': p.name,
    'SKU': p.sku,
    'Barcode': p.barcode || '-',
    'Category': p.category_name || '-',
    'Unit': p.unit,
    'Purchase Cost (Rs.)': p.purchase_price,
    'Selling Price (Rs.)': p.selling_price,
    'Current Stock': p.current_stock,
    'Min Stock Alert': p.min_stock,
    'Stock Status': p.current_stock <= 0 ? 'Out of Stock' : (p.current_stock <= p.min_stock ? 'Low Stock' : 'In Stock'),
    'Total Cost Value (Rs.)': p.purchase_price * p.current_stock,
    'Total Retail Value (Rs.)': p.selling_price * p.current_stock,
    'GST Rate (%)': p.gst_rate,
  }));

  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Products & Stock');

  // Auto-column widths
  const colWidths = [
    { wch: 6 },
    { wch: 35 },
    { wch: 16 },
    { wch: 16 },
    { wch: 20 },
    { wch: 8 },
    { wch: 18 },
    { wch: 18 },
    { wch: 14 },
    { wch: 15 },
    { wch: 15 },
    { wch: 20 },
    { wch: 20 },
    { wch: 12 },
  ];
  worksheet['!cols'] = colWidths;

  XLSX.writeFile(workbook, filename);
};

/**
 * Export sales history to Excel
 */
export const exportSalesToExcel = (sales: Sale[], filename = 'Sales_Register.xlsx') => {
  const data = sales.map((s, idx) => ({
    'S.No': idx + 1,
    'Invoice Number': s.invoice_number,
    'Date': new Date(s.created_at).toLocaleDateString('en-IN'),
    'Time': new Date(s.created_at).toLocaleTimeString('en-IN'),
    'Customer Name': s.customer_name,
    'Customer Phone': s.customer_phone || '-',
    'Payment Mode': s.payment_mode.toUpperCase(),
    'Items Count': s.items.reduce((sum, it) => sum + it.quantity, 0),
    'Subtotal (Rs.)': s.subtotal,
    'Discount (Rs.)': s.discount_amount,
    'Tax / GST (Rs.)': s.tax_amount,
    'Total Amount (Rs.)': s.total_amount,
    'Cashier': s.cashier_name,
    'Status': s.status,
  }));

  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Sales History');

  worksheet['!cols'] = [
    { wch: 6 },
    { wch: 18 },
    { wch: 12 },
    { wch: 12 },
    { wch: 28 },
    { wch: 16 },
    { wch: 14 },
    { wch: 12 },
    { wch: 14 },
    { wch: 14 },
    { wch: 14 },
    { wch: 16 },
    { wch: 20 },
    { wch: 12 },
  ];

  XLSX.writeFile(workbook, filename);
};

/**
 * Export Financial Performance Report to Excel
 */
export const exportFinancialReportToExcel = (report: any, filename = 'Financial_Report.xlsx') => {
  const summaryData = [
    { Metric: 'Report Title', Value: report.title || 'Stationery Shop Financial Statement' },
    { Metric: 'Generated Date', Value: new Date().toLocaleDateString('en-IN') },
    { Metric: 'Total Sales Revenue (Rs.)', Value: report.total_sales },
    { Metric: 'Total Invoices Count', Value: report.total_bills },
    { Metric: 'Total Units Sold', Value: report.total_items_sold },
    { Metric: 'Cost of Goods Sold (COGS) (Rs.)', Value: report.cogs },
    { Metric: 'Gross Profit (Rs.)', Value: report.gross_profit },
    { Metric: 'Total Operating Expenses (Rs.)', Value: report.total_expenses },
    { Metric: 'NET PROFIT (Rs.)', Value: report.net_profit },
  ];

  const worksheet = XLSX.utils.json_to_sheet(summaryData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Summary');

  worksheet['!cols'] = [{ wch: 32 }, { wch: 25 }];
  XLSX.writeFile(workbook, filename);
};

