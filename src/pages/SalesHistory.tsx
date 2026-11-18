import React, { useState, useEffect } from 'react';
import { 
  Search, 
  Receipt, 
  Eye, 
  Printer, 
  Download, 
  Calendar, 
  CreditCard, 
  Banknote, 
  QrCode,
  FileSpreadsheet
} from 'lucide-react';
import { dataService } from '../lib/dataService';
import { formatINR } from '../lib/pdfGenerator';
import { exportSalesToExcel } from '../lib/excelExporter';
import { Sale, Shop } from '../types/database';
import { InvoiceModal } from '../components/billing/InvoiceModal';

interface SalesHistoryProps {
  shop: Shop | null;
}

export const SalesHistory: React.FC<SalesHistoryProps> = ({ shop }) => {
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [paymentFilter, setPaymentFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'month'>('all');

  // Modal
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await dataService.getSales();
      setSales(data);
    } catch (err) {
      console.error('Error fetching sales history:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const todayStr = new Date().toISOString().split('T')[0];
  const curMonth = new Date().getMonth();
  const curYear = new Date().getFullYear();

  const filteredSales = sales.filter((s) => {
    const term = searchTerm.toLowerCase();
    const matchesSearch = 
      s.invoice_number.toLowerCase().includes(term) ||
      s.customer_name.toLowerCase().includes(term) ||
      (s.customer_phone && s.customer_phone.includes(term));

    const matchesPayment = paymentFilter === 'all' || s.payment_mode === paymentFilter;

    let matchesDate = true;
    if (dateFilter === 'today') {
      matchesDate = s.created_at.startsWith(todayStr);
    } else if (dateFilter === 'month') {
      const d = new Date(s.created_at);
      matchesDate = d.getMonth() === curMonth && d.getFullYear() === curYear;
    }

    return matchesSearch && matchesPayment && matchesDate;
  });

  const totalFilteredRevenue = filteredSales.reduce((sum, s) => sum + s.total_amount, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800 tracking-tight">Sales History & Invoices Register</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Look up previous customer bills, reprint thermal receipts, or download tax invoice PDFs.
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => exportSalesToExcel(filteredSales)}
            className="flex items-center space-x-1.5 px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs rounded-xl border border-slate-200 transition-colors shadow-xs"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            <span>Export to Excel</span>
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs grid grid-cols-1 md:grid-cols-12 gap-3">
        {/* Search */}
        <div className="md:col-span-5 relative">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by invoice number, customer name or phone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-hidden focus:border-blue-500"
          />
        </div>

        {/* Date Filter */}
        <div className="md:col-span-4 flex items-center bg-slate-100 p-1 rounded-xl text-xs font-semibold">
          <button
            onClick={() => setDateFilter('all')}
            className={`flex-1 py-1.5 rounded-lg transition-all ${
              dateFilter === 'all' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            All Time
          </button>
          <button
            onClick={() => setDateFilter('today')}
            className={`flex-1 py-1.5 rounded-lg transition-all ${
              dateFilter === 'today' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Today's Bills
          </button>
          <button
            onClick={() => setDateFilter('month')}
            className={`flex-1 py-1.5 rounded-lg transition-all ${
              dateFilter === 'month' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            This Month
          </button>
        </div>

        {/* Payment Filter */}
        <div className="md:col-span-3">
          <select
            value={paymentFilter}
            onChange={(e) => setPaymentFilter(e.target.value)}
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-hidden focus:border-blue-500 font-medium"
          >
            <option value="all">All Payment Modes</option>
            <option value="cash">Cash Only</option>
            <option value="upi">UPI / QR Code</option>
            <option value="card">Card</option>
          </select>
        </div>
      </div>

      {/* Summary KPI Strip */}
      <div className="flex items-center justify-between p-4 bg-blue-50/70 border border-blue-200 rounded-2xl text-xs font-medium text-blue-900">
        <span>
          Showing <strong>{filteredSales.length}</strong> invoices matching current criteria
        </span>
        <span>
          Total Value: <strong className="text-sm font-extrabold text-blue-700">{formatINR(totalFilteredRevenue)}</strong>
        </span>
      </div>

      {/* Invoices Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 font-semibold uppercase text-[10px] tracking-wider border-b border-slate-200">
              <tr>
                <th className="px-5 py-3">Invoice Number</th>
                <th className="px-5 py-3">Date & Time</th>
                <th className="px-5 py-3">Customer Details</th>
                <th className="px-5 py-3 text-center">Items Count</th>
                <th className="px-5 py-3 text-center">Payment</th>
                <th className="px-5 py-3 text-right">Subtotal</th>
                <th className="px-5 py-3 text-right">Tax (GST)</th>
                <th className="px-5 py-3 text-right">Grand Total</th>
                <th className="px-5 py-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredSales.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-5 py-8 text-center text-slate-400">
                    No sales invoices found matching your filters.
                  </td>
                </tr>
              ) : (
                filteredSales.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50/75 transition-colors">
                    <td className="px-5 py-3.5 font-bold font-mono text-blue-700">
                      {s.invoice_number}
                    </td>
                    <td className="px-5 py-3.5 text-slate-600">
                      {new Date(s.created_at).toLocaleDateString('en-IN')}{' '}
                      <span className="text-[10px] text-slate-400">
                        {new Date(s.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <p className="font-semibold text-slate-800">{s.customer_name}</p>
                      {s.customer_phone && <p className="text-[10px] text-slate-400 font-mono">{s.customer_phone}</p>}
                    </td>
                    <td className="px-5 py-3.5 text-center text-slate-700">
                      {s.items.reduce((sum, it) => sum + it.quantity, 0)} pcs
                    </td>
                    <td className="px-5 py-3.5 text-center">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                        s.payment_mode === 'cash' ? 'bg-emerald-100 text-emerald-800' :
                        s.payment_mode === 'upi' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'
                      }`}>
                        {s.payment_mode}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-right text-slate-600">
                      ₹{s.subtotal.toFixed(2)}
                    </td>
                    <td className="px-5 py-3.5 text-right text-slate-600">
                      ₹{s.tax_amount.toFixed(2)}
                    </td>
                    <td className="px-5 py-3.5 text-right font-extrabold text-slate-900 text-sm">
                      {formatINR(s.total_amount)}
                    </td>
                    <td className="px-5 py-3.5 text-center">
                      <button
                        onClick={() => setSelectedSale(s)}
                        className="px-2.5 py-1 bg-blue-50 text-blue-700 hover:bg-blue-100 font-bold rounded-lg transition-colors flex items-center space-x-1 mx-auto"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>View / Print</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Invoice Modal for View / Print / PDF */}
      <InvoiceModal
        isOpen={Boolean(selectedSale)}
        onClose={() => setSelectedSale(null)}
        sale={selectedSale}
        shop={shop}
      />
    </div>
  );
};

