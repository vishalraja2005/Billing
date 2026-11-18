import React, { useState } from 'react';
import { Printer, Download, CheckCircle, FileText, Smartphone } from 'lucide-react';
import { Modal } from '../common/Modal';
import { Sale, Shop } from '../../types/database';
import { generateA4InvoicePDF, generateThermalReceiptPDF, formatINR, numberToWords } from '../../lib/pdfGenerator';

interface InvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  sale: Sale | null;
  shop: Shop | null;
}

export const InvoiceModal: React.FC<InvoiceModalProps> = ({ isOpen, onClose, sale, shop }) => {
  const [viewMode, setViewMode] = useState<'a4' | 'thermal'>(shop?.thermal_printer ? 'thermal' : 'a4');

  if (!sale || !shop) return null;

  const handleDownloadPDF = () => {
    if (viewMode === 'a4') {
      const doc = generateA4InvoicePDF(sale, shop);
      doc.save(`${sale.invoice_number}_A4.pdf`);
    } else {
      const doc = generateThermalReceiptPDF(sale, shop);
      doc.save(`${sale.invoice_number}_Thermal.pdf`);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Invoice ${sale.invoice_number}`} maxWidth="3xl">
      <div className="space-y-4">
        {/* Top Controls: Switch A4 / Thermal & Action Buttons */}
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-200">
          <div className="flex items-center space-x-1 bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-medium">
            <button
              onClick={() => setViewMode('thermal')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg transition-all ${
                viewMode === 'thermal' ? 'bg-white text-blue-700 font-bold shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span>80mm Thermal</span>
            </button>
            <button
              onClick={() => setViewMode('a4')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg transition-all ${
                viewMode === 'a4' ? 'bg-white text-blue-700 font-bold shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>A4 Full Page</span>
            </button>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={handleDownloadPDF}
              className="flex items-center space-x-1.5 px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl transition-colors border border-slate-200"
            >
              <Download className="w-3.5 h-3.5 text-slate-600" />
              <span>Download PDF</span>
            </button>
            <button
              onClick={handlePrint}
              className="flex items-center space-x-1.5 px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Invoice</span>
            </button>
          </div>
        </div>

        {/* Printable View Area */}
        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 overflow-x-auto flex justify-center">
          {viewMode === 'a4' ? (
            /* A4 Sheet Simulation */
            <div id="printable-invoice" className="bg-white p-8 rounded-lg shadow-sm border border-slate-200 w-full max-w-[650px] text-slate-800 text-xs font-sans">
              {/* Header */}
              <div className="border-b-2 border-blue-600 pb-4 flex justify-between items-start">
                <div>
                  <h1 className="text-xl font-bold text-blue-800 tracking-tight">{shop.name}</h1>
                  <p className="text-slate-600 mt-1">{shop.address}</p>
                  <p className="text-slate-600">Phone: {shop.phone} {shop.email ? `• ${shop.email}` : ''}</p>
                  {shop.gstin && <p className="font-semibold text-slate-700">GSTIN: {shop.gstin} | State: {shop.state}</p>}
                </div>
                <div className="text-right">
                  <span className="inline-block bg-blue-100 text-blue-800 text-xs font-extrabold px-3 py-1 rounded-md mb-1 uppercase tracking-wider">
                    TAX INVOICE
                  </span>
                  <p className="font-bold text-slate-900 mt-1">Inv: {sale.invoice_number}</p>
                  <p className="text-slate-500">{new Date(sale.created_at).toLocaleDateString('en-IN')} {new Date(sale.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</p>
                </div>
              </div>

              {/* Customer Info */}
              <div className="py-3 border-b border-slate-200 flex justify-between text-xs">
                <div>
                  <span className="text-slate-400 font-semibold uppercase text-[10px] block">Customer Details:</span>
                  <p className="font-bold text-slate-800 text-sm mt-0.5">{sale.customer_name}</p>
                  {sale.customer_phone && <p className="text-slate-600">Phone: {sale.customer_phone}</p>}
                  {sale.customer_address && <p className="text-slate-600">Address: {sale.customer_address}</p>}
                </div>
                <div className="text-right">
                  <span className="text-slate-400 font-semibold uppercase text-[10px] block">Payment Info:</span>
                  <p className="font-bold text-blue-700 capitalize mt-0.5">{sale.payment_mode} Payment</p>
                  <p className="text-slate-600">Cashier: {sale.cashier_name}</p>
                </div>
              </div>

              {/* Items Table */}
              <div className="py-3">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-300 text-slate-500 font-semibold text-[11px]">
                      <th className="py-2 w-8">#</th>
                      <th className="py-2">Item Description</th>
                      <th className="py-2">SKU</th>
                      <th className="py-2 text-center">Qty</th>
                      <th className="py-2 text-right">Unit Rate</th>
                      <th className="py-2 text-center">GST</th>
                      <th className="py-2 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {sale.items.map((it, idx) => (
                      <tr key={idx} className="text-slate-700">
                        <td className="py-2 text-slate-400">{idx + 1}</td>
                        <td className="py-2 font-medium text-slate-900">{it.product_name}</td>
                        <td className="py-2 text-slate-500 font-mono text-[11px]">{it.sku}</td>
                        <td className="py-2 text-center font-semibold">{it.quantity} {it.unit}</td>
                        <td className="py-2 text-right">₹{it.unit_price.toFixed(2)}</td>
                        <td className="py-2 text-center">{it.gst_rate}%</td>
                        <td className="py-2 text-right font-semibold">₹{it.total_amount.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Summary Totals */}
              <div className="pt-3 border-t border-slate-200 flex justify-between items-start">
                <div className="max-w-[300px]">
                  <p className="text-[11px] text-slate-500 font-semibold">Amount in Words:</p>
                  <p className="text-xs italic text-slate-700 font-medium">{numberToWords(sale.total_amount)}</p>
                  
                  <div className="mt-4 pt-3 border-t border-slate-100 text-[10px] text-slate-500">
                    <p className="font-bold text-slate-600">Declaration & Terms:</p>
                    <p>{shop.invoice_footer}</p>
                  </div>
                </div>

                <div className="w-60 space-y-1.5 text-right">
                  <div className="flex justify-between text-slate-600">
                    <span>Subtotal:</span>
                    <span>₹{sale.subtotal.toFixed(2)}</span>
                  </div>
                  {sale.discount_amount > 0 && (
                    <div className="flex justify-between text-emerald-600">
                      <span>Discount:</span>
                      <span>-₹{sale.discount_amount.toFixed(2)}</span>
                    </div>
                  )}
                  {sale.cgst_amount > 0 && (
                    <div className="flex justify-between text-slate-600">
                      <span>CGST:</span>
                      <span>₹{sale.cgst_amount.toFixed(2)}</span>
                    </div>
                  )}
                  {sale.sgst_amount > 0 && (
                    <div className="flex justify-between text-slate-600">
                      <span>SGST:</span>
                      <span>₹{sale.sgst_amount.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-base font-bold text-blue-700 pt-2 border-t border-slate-200">
                    <span>Grand Total:</span>
                    <span>₹{sale.total_amount.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* 80mm Thermal Receipt Simulation */
            <div id="printable-thermal" className="bg-white p-5 rounded-lg shadow-sm border border-slate-300 w-80 font-mono text-slate-800 text-xs">
              <div className="text-center pb-2 border-b border-dashed border-slate-400">
                <h2 className="font-bold text-sm text-slate-900 uppercase">{shop.name}</h2>
                <p className="text-[11px] text-slate-600 mt-0.5">{shop.address}</p>
                <p className="text-[11px] text-slate-600">Ph: {shop.phone}</p>
                {shop.gstin && <p className="text-[11px] font-semibold text-slate-700">GSTIN: {shop.gstin}</p>}
              </div>

              <div className="py-2 border-b border-dashed border-slate-400 text-[11px] space-y-0.5">
                <div className="flex justify-between">
                  <span>Inv: {sale.invoice_number}</span>
                  <span>{new Date(sale.created_at).toLocaleDateString('en-IN')}</span>
                </div>
                <div className="flex justify-between">
                  <span>Cust: {sale.customer_name.substring(0, 16)}</span>
                  <span className="uppercase">{sale.payment_mode}</span>
                </div>
              </div>

              {/* Items */}
              <div className="py-2 border-b border-dashed border-slate-400">
                <div className="flex justify-between font-bold text-[11px] mb-1">
                  <span>Item</span>
                  <span>Qty x Rate</span>
                  <span>Amt</span>
                </div>
                {sale.items.map((it, idx) => (
                  <div key={idx} className="mb-1.5 text-[11px]">
                    <div className="font-semibold text-slate-900 truncate">{it.product_name}</div>
                    <div className="flex justify-between text-slate-600">
                      <span>{it.quantity} {it.unit} @ ₹{it.unit_price}</span>
                      <span className="font-bold text-slate-800">₹{it.total_amount.toFixed(2)}</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Totals */}
              <div className="py-2 border-b border-dashed border-slate-400 space-y-1 text-[11px]">
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span>₹{sale.subtotal.toFixed(2)}</span>
                </div>
                {sale.discount_amount > 0 && (
                  <div className="flex justify-between text-emerald-700">
                    <span>Discount:</span>
                    <span>-₹{sale.discount_amount.toFixed(2)}</span>
                  </div>
                )}
                {sale.tax_amount > 0 && (
                  <div className="flex justify-between">
                    <span>Tax (GST):</span>
                    <span>₹{sale.tax_amount.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-sm text-slate-900 pt-1 border-t border-slate-200">
                  <span>TOTAL:</span>
                  <span>₹{sale.total_amount.toFixed(2)}</span>
                </div>
                {sale.cash_tendered && sale.cash_tendered > 0 ? (
                  <>
                    <div className="flex justify-between text-slate-500 text-[10px]">
                      <span>Cash Tendered:</span>
                      <span>₹{sale.cash_tendered.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-slate-500 text-[10px]">
                      <span>Change Due:</span>
                      <span>₹{(sale.change_returned || 0).toFixed(2)}</span>
                    </div>
                  </>
                ) : null}
              </div>

              <div className="text-center pt-3 text-[10px] text-slate-500 space-y-0.5">
                <p className="font-semibold text-slate-700">Thank you for visiting!</p>
                <p>Please check your items before leaving</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
};

