import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Sale, Shop } from '../types/database';

export const formatINR = (val: number): string => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
  }).format(val);
};

// Convert number to Indian words
export const numberToWords = (num: number): string => {
  const a = ['', 'One ', 'Two ', 'Three ', 'Four ', 'Five ', 'Six ', 'Seven ', 'Eight ', 'Nine ', 'Ten ', 'Eleven ', 'Twelve ', 'Thirteen ', 'Fourteen ', 'Fifteen ', 'Sixteen ', 'Seventeen ', 'Eighteen ', 'Nineteen '];
  const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  const n = ('000000000' + Math.floor(num)).substr(-9).match(/^(\d{2})(\d{2})(\d{2})(\d{1})(\d{2})$/);
  if (!n) return '';
  let str = '';
  str += (Number(n[1]) !== 0) ? (a[Number(n[1])] || b[Number(n[1][0])] + ' ' + a[Number(n[1][1])]) + 'Crore ' : '';
  str += (Number(n[2]) !== 0) ? (a[Number(n[2])] || b[Number(n[2][0])] + ' ' + a[Number(n[2][1])]) + 'Lakh ' : '';
  str += (Number(n[3]) !== 0) ? (a[Number(n[3])] || b[Number(n[3][0])] + ' ' + a[Number(n[3][1])]) + 'Thousand ' : '';
  str += (Number(n[4]) !== 0) ? (a[Number(n[4])] || b[Number(n[4][0])] + ' ' + a[Number(n[4][1])]) + 'Hundred ' : '';
  str += (Number(n[5]) !== 0) ? ((str !== '') ? 'and ' : '') + (a[Number(n[5])] || b[Number(n[5][0])] + ' ' + a[Number(n[5][1])]) + 'Rupees Only' : 'Rupees Only';
  return str.trim();
};

/**
 * Generate standard A4 Tax Invoice PDF
 */
export const generateA4InvoicePDF = (sale: Sale, shop: Shop): jsPDF => {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();

  // Header Background bar
  doc.setFillColor(37, 99, 235); // Blue 600
  doc.rect(0, 0, pageWidth, 28, 'F');

  // Shop Title & Subtitle in White
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text(shop.name.toUpperCase(), 14, 12);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(`${shop.address} | Phone: ${shop.phone}`, 14, 18);
  if (shop.gstin) {
    doc.text(`GSTIN: ${shop.gstin} | State: ${shop.state}`, 14, 23);
  }

  // Tax Invoice Badge on Top Right
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('TAX INVOICE', pageWidth - 14, 14, { align: 'right' });
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text('(Original for Recipient)', pageWidth - 14, 20, { align: 'right' });

  // Invoice & Customer Info Box
  doc.setTextColor(30, 41, 59);
  doc.setFontSize(9);

  // Left Column: Customer details
  doc.setFont('helvetica', 'bold');
  doc.text('BILLED TO:', 14, 38);
  doc.setFont('helvetica', 'normal');
  doc.text(sale.customer_name, 14, 43);
  if (sale.customer_phone) {
    doc.text(`Phone: ${sale.customer_phone}`, 14, 48);
  }
  if (sale.customer_address) {
    doc.text(`Address: ${sale.customer_address}`, 14, 53);
  }

  // Right Column: Invoice Details
  const rightX = pageWidth - 65;
  doc.setFont('helvetica', 'bold');
  doc.text('Invoice No:', rightX, 38);
  doc.setFont('helvetica', 'normal');
  doc.text(sale.invoice_number, pageWidth - 14, 38, { align: 'right' });

  doc.setFont('helvetica', 'bold');
  doc.text('Date & Time:', rightX, 43);
  doc.setFont('helvetica', 'normal');
  const dateFormatted = new Date(sale.created_at).toLocaleString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
  });
  doc.text(dateFormatted, pageWidth - 14, 43, { align: 'right' });

  doc.setFont('helvetica', 'bold');
  doc.text('Payment Mode:', rightX, 48);
  doc.setFont('helvetica', 'normal');
  doc.text(sale.payment_mode.toUpperCase(), pageWidth - 14, 48, { align: 'right' });

  doc.setFont('helvetica', 'bold');
  doc.text('Cashier:', rightX, 53);
  doc.setFont('helvetica', 'normal');
  doc.text(sale.cashier_name, pageWidth - 14, 53, { align: 'right' });

  // Divider Line
  doc.setDrawColor(226, 232, 240);
  doc.line(14, 58, pageWidth - 14, 58);

  // Table Data
  const tableData = sale.items.map((item, idx) => [
    (idx + 1).toString(),
    item.product_name,
    item.sku,
    `${item.quantity} ${item.unit || 'pcs'}`,
    `Rs. ${item.unit_price.toFixed(2)}`,
    item.discount_amount > 0 ? `Rs. ${item.discount_amount.toFixed(2)}` : '-',
    `${item.gst_rate}%`,
    `Rs. ${item.total_amount.toFixed(2)}`,
  ]);

  autoTable(doc, {
    startY: 62,
    head: [['#', 'Item Description', 'SKU', 'Qty', 'Unit Price', 'Disc.', 'GST', 'Amount']],
    body: tableData,
    theme: 'striped',
    headStyles: {
      fillColor: [37, 99, 235],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8.5,
    },
    styles: {
      fontSize: 8,
      cellPadding: 2.5,
      textColor: [30, 41, 59],
    },
    columnStyles: {
      0: { cellWidth: 10, halign: 'center' },
      1: { cellWidth: 'auto' },
      2: { cellWidth: 25 },
      3: { cellWidth: 20, halign: 'center' },
      4: { cellWidth: 24, halign: 'right' },
      5: { cellWidth: 20, halign: 'right' },
      6: { cellWidth: 16, halign: 'center' },
      7: { cellWidth: 26, halign: 'right' },
    },
  });

  // Calculate position after table
  const finalY = (doc as any).lastAutoTable.finalY || 120;

  // Amount in Words (Left)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.text('Amount in Words:', 14, finalY + 10);
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(8);
  doc.text(numberToWords(sale.total_amount), 14, finalY + 15, { maxWidth: 100 });

  // Bank / Footer Notes
  doc.setFont('helvetica', 'bold');
  doc.text('Terms & Conditions:', 14, finalY + 25);
  doc.setFont('helvetica', 'normal');
  doc.text(shop.invoice_footer || 'Goods once sold can be exchanged within 3 days with bill.', 14, finalY + 30, { maxWidth: 100 });

  // Financial Summary Box (Right)
  const sumX = pageWidth - 80;
  const valX = pageWidth - 14;
  let curY = finalY + 8;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.text('Subtotal:', sumX, curY);
  doc.text(`Rs. ${sale.subtotal.toFixed(2)}`, valX, curY, { align: 'right' });

  if (sale.discount_amount > 0) {
    curY += 5;
    doc.text('Total Discount:', sumX, curY);
    doc.text(`- Rs. ${sale.discount_amount.toFixed(2)}`, valX, curY, { align: 'right' });
  }

  if (sale.cgst_amount > 0) {
    curY += 5;
    doc.text('CGST:', sumX, curY);
    doc.text(`Rs. ${sale.cgst_amount.toFixed(2)}`, valX, curY, { align: 'right' });
  }

  if (sale.sgst_amount > 0) {
    curY += 5;
    doc.text('SGST:', sumX, curY);
    doc.text(`Rs. ${sale.sgst_amount.toFixed(2)}`, valX, curY, { align: 'right' });
  }

  curY += 6;
  doc.setFillColor(239, 246, 255);
  doc.rect(sumX - 4, curY - 4, 70, 9, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(37, 99, 235);
  doc.text('GRAND TOTAL:', sumX, curY + 2);
  doc.text(`Rs. ${sale.total_amount.toFixed(2)}`, valX, curY + 2, { align: 'right' });

  // Signature Line
  doc.setTextColor(30, 41, 59);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text('For ' + shop.name, pageWidth - 14, finalY + 50, { align: 'right' });
  doc.text('Authorized Signatory', pageWidth - 14, finalY + 65, { align: 'right' });

  return doc;
};

/**
 * Generate 80mm Thermal POS Receipt PDF
 */
export const generateThermalReceiptPDF = (sale: Sale, shop: Shop): jsPDF => {
  // 80mm width = 80mm, dynamic height based on item count
  const receiptHeight = 120 + (sale.items.length * 10);
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: [80, Math.max(160, receiptHeight)],
  });

  const width = 80;
  let y = 8;

  // Header
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text(shop.name, width / 2, y, { align: 'center' });

  y += 4;
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'normal');
  doc.text(shop.address, width / 2, y, { align: 'center', maxWidth: 70 });

  y += 6;
  doc.text(`Ph: ${shop.phone}`, width / 2, y, { align: 'center' });
  if (shop.gstin) {
    y += 3.5;
    doc.text(`GSTIN: ${shop.gstin}`, width / 2, y, { align: 'center' });
  }

  y += 4;
  doc.setLineDashPattern([1, 1], 0);
  doc.line(5, y, width - 5, y);

  // Bill metadata
  y += 4;
  doc.setFont('helvetica', 'bold');
  doc.text(`Inv: ${sale.invoice_number}`, 5, y);
  doc.setFont('helvetica', 'normal');
  const dStr = new Date(sale.created_at).toLocaleDateString('en-IN');
  doc.text(dStr, width - 5, y, { align: 'right' });

  y += 3.5;
  doc.text(`Customer: ${sale.customer_name}`, 5, y);
  doc.text(sale.payment_mode.toUpperCase(), width - 5, y, { align: 'right' });

  y += 4;
  doc.line(5, y, width - 5, y);

  // Table header
  y += 4;
  doc.setFont('helvetica', 'bold');
  doc.text('Item', 5, y);
  doc.text('Qty', 45, y, { align: 'center' });
  doc.text('Amount', width - 5, y, { align: 'right' });

  y += 2;
  doc.line(5, y, width - 5, y);

  // Items
  doc.setFont('helvetica', 'normal');
  sale.items.forEach(item => {
    y += 4.5;
    doc.setFont('helvetica', 'bold');
    doc.text(item.product_name.substring(0, 24), 5, y);
    y += 3.5;
    doc.setFont('helvetica', 'normal');
    doc.text(`@ Rs.${item.unit_price}`, 8, y);
    doc.text(`${item.quantity} ${item.unit || ''}`, 45, y, { align: 'center' });
    doc.text(`Rs.${item.total_amount.toFixed(2)}`, width - 5, y, { align: 'right' });
  });

  y += 4;
  doc.line(5, y, width - 5, y);

  // Totals
  y += 4;
  doc.text('Subtotal:', 35, y);
  doc.text(`Rs.${sale.subtotal.toFixed(2)}`, width - 5, y, { align: 'right' });

  if (sale.discount_amount > 0) {
    y += 3.5;
    doc.text('Discount:', 35, y);
    doc.text(`-Rs.${sale.discount_amount.toFixed(2)}`, width - 5, y, { align: 'right' });
  }

  if (sale.tax_amount > 0) {
    y += 3.5;
    doc.text('GST Tax:', 35, y);
    doc.text(`Rs.${sale.tax_amount.toFixed(2)}`, width - 5, y, { align: 'right' });
  }

  y += 5;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.text('TOTAL:', 35, y);
  doc.text(`Rs.${sale.total_amount.toFixed(2)}`, width - 5, y, { align: 'right' });

  if (sale.cash_tendered && sale.cash_tendered > 0) {
    y += 4;
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'normal');
    doc.text(`Cash Tendered: Rs.${sale.cash_tendered.toFixed(2)}`, 35, y);
    y += 3.5;
    doc.text(`Change: Rs.${(sale.change_returned || 0).toFixed(2)}`, 35, y);
  }

  y += 6;
  doc.setLineDashPattern([], 0);
  doc.line(5, y, width - 5, y);

  // Footer
  y += 5;
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'normal');
  doc.text('Thank you for shopping with us!', width / 2, y, { align: 'center' });
  y += 3.5;
  doc.text('Please Visit Again', width / 2, y, { align: 'center' });

  return doc;
};

/**
 * Generate Monthly Financial Statement PDF Report
 */
export const generateFinancialReportPDF = (report: any, shop: Shop): jsPDF => {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();

  // Header
  doc.setFillColor(37, 99, 235);
  doc.rect(0, 0, pageWidth, 26, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text(shop.name, 14, 11);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(`Financial Performance Statement - ${report.title || 'Summary Report'}`, 14, 18);
  doc.text(`Generated: ${new Date().toLocaleDateString('en-IN')}`, pageWidth - 14, 18, { align: 'right' });

  // Key Metrics Table
  const tableData = [
    ['Total Sales Revenue', `Rs. ${report.total_sales.toFixed(2)}`],
    ['Total Invoices Count', `${report.total_bills} Bills`],
    ['Total Units Sold', `${report.total_items_sold} Items`],
    ['Cost of Goods Sold (COGS)', `Rs. ${report.cogs.toFixed(2)}`],
    ['Gross Profit (Sales - COGS)', `Rs. ${report.gross_profit.toFixed(2)}`],
    ['Total Operational Expenses', `Rs. ${report.total_expenses.toFixed(2)}`],
    ['ESTIMATED NET PROFIT', `Rs. ${report.net_profit.toFixed(2)}`],
  ];

  autoTable(doc, {
    startY: 34,
    head: [['Financial Metric', 'Value']],
    body: tableData,
    theme: 'grid',
    headStyles: { fillColor: [37, 99, 235], fontSize: 9.5, fontStyle: 'bold' },
    styles: { fontSize: 9, cellPadding: 3.5 },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 100 },
      1: { halign: 'right', fontStyle: 'bold' },
    },
  });

  return doc;
};

