import React, { useEffect, useState } from 'react';
import { 
  TrendingUp, 
  Receipt, 
  Package, 
  AlertTriangle, 
  Users, 
  Coins, 
  ArrowUpRight, 
  Eye, 
  ShoppingCart,
  Calendar,
  Layers,
  ArrowRight
} from 'lucide-react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell
} from 'recharts';
import { dataService } from '../lib/dataService';
import { formatINR } from '../lib/pdfGenerator';
import { Sale, Shop } from '../types/database';
import { InvoiceModal } from '../components/billing/InvoiceModal';

interface DashboardProps {
  onOpenPOS: () => void;
  onSelectTab: (tab: any) => void;
  shop: Shop | null;
}

export const Dashboard: React.FC<DashboardProps> = ({ onOpenPOS, onSelectTab, shop }) => {
  const [metrics, setMetrics] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);

  const fetchMetrics = async () => {
    setLoading(true);
    try {
      const data = await dataService.getDashboardMetrics();
      setMetrics(data);
    } catch (err) {
      console.error('Error loading dashboard metrics:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
  }, []);

  if (loading || !metrics) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="flex flex-col items-center space-y-3">
          <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-sm font-semibold text-slate-500">Calculating dashboard analytics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Banner / Welcome */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-2xl p-6 text-white shadow-sm flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <span className="text-xs font-semibold px-2.5 py-1 bg-white/20 backdrop-blur-xs rounded-full uppercase tracking-wider text-blue-100">
            Real-Time Store Operations
          </span>
          <h2 className="text-2xl font-bold mt-2">Stationery Billing Overview</h2>
          <p className="text-blue-100 text-sm mt-1 max-w-xl">
            Manage your billing counter, stock movement, suppliers and financial performance with zero discrepancies.
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={onOpenPOS}
            className="px-5 py-2.5 bg-white text-blue-700 hover:bg-blue-50 font-bold text-sm rounded-xl transition-all shadow-md flex items-center space-x-2"
          >
            <ShoppingCart className="w-4 h-4" />
            <span>Open POS Counter (F1)</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Today's Sales */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs hover:border-blue-300 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Today's Sales</span>
            <div className="p-2.5 rounded-xl bg-blue-50 text-blue-600">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl font-extrabold text-slate-900">{formatINR(metrics.todaySalesTotal)}</h3>
            <p className="text-xs text-slate-500 mt-1 flex items-center">
              <span className="text-emerald-600 font-semibold inline-flex items-center mr-1">
                <ArrowUpRight className="w-3.5 h-3.5" /> Live
              </span>
              Calculated from today's receipts
            </p>
          </div>
        </div>

        {/* Monthly Sales */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs hover:border-blue-300 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Monthly Sales</span>
            <div className="p-2.5 rounded-xl bg-indigo-50 text-indigo-600">
              <Calendar className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl font-extrabold text-slate-900">{formatINR(metrics.monthlySalesTotal)}</h3>
            <p className="text-xs text-slate-500 mt-1">This current calendar month</p>
          </div>
        </div>

        {/* Estimated Net Profit */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs hover:border-blue-300 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Estimated Net Profit</span>
            <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-600">
              <Coins className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className={`text-2xl font-extrabold ${metrics.monthlyNetProfit >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
              {formatINR(metrics.monthlyNetProfit)}
            </h3>
            <p className="text-xs text-slate-500 mt-1">Sales minus COGS & Shop Expenses</p>
          </div>
        </div>

        {/* Low Stock Alerts */}
        <div 
          onClick={() => onSelectTab('inventory')}
          className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs hover:border-amber-300 transition-colors cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Low Stock Alert</span>
            <div className={`p-2.5 rounded-xl ${metrics.lowStockCount > 0 ? 'bg-amber-50 text-amber-600' : 'bg-slate-50 text-slate-500'}`}>
              <AlertTriangle className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className={`text-2xl font-extrabold ${metrics.lowStockCount > 0 ? 'text-amber-600' : 'text-slate-800'}`}>
              {metrics.lowStockCount} Products
            </h3>
            <p className="text-xs text-slate-500 mt-1">Below minimum reorder threshold</p>
          </div>
        </div>
      </div>

      {/* Secondary Quick Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center space-x-3">
          <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
            <Receipt className="w-4 h-4" />
          </div>
          <div>
            <p className="text-[11px] font-semibold text-slate-500 uppercase">Total Bills</p>
            <p className="text-base font-bold text-slate-800">{metrics.totalBillsCount}</p>
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center space-x-3">
          <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
            <Package className="w-4 h-4" />
          </div>
          <div>
            <p className="text-[11px] font-semibold text-slate-500 uppercase">Total Catalog Items</p>
            <p className="text-base font-bold text-slate-800">{metrics.totalProductsCount}</p>
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center space-x-3">
          <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
            <Users className="w-4 h-4" />
          </div>
          <div>
            <p className="text-[11px] font-semibold text-slate-500 uppercase">Registered Customers</p>
            <p className="text-base font-bold text-slate-800">{metrics.totalCustomersCount}</p>
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center space-x-3">
          <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
            <Layers className="w-4 h-4" />
          </div>
          <div>
            <p className="text-[11px] font-semibold text-slate-500 uppercase">Inventory Valuation</p>
            <p className="text-base font-bold text-slate-800">{formatINR(metrics.totalInventoryCost)}</p>
          </div>
        </div>
      </div>

      {/* Charts & Analytics Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Monthly Sales Revenue Chart (AreaChart) */}
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold text-slate-800">Monthly Sales & Profit Trend</h3>
              <p className="text-xs text-slate-500">6-Month historical performance based on completed bills</p>
            </div>
            <button
              onClick={() => onSelectTab('reports')}
              className="text-xs text-blue-600 font-semibold hover:text-blue-700 flex items-center"
            >
              Full Reports <ArrowRight className="w-3.5 h-3.5 ml-1" />
            </button>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={metrics.monthlyTrend} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="salesGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2563eb" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="profitGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="month" stroke="#94a3b8" fontSize={11} tickLine={false} />
                <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} tickFormatter={(v) => `₹${v}`} />
                <Tooltip 
                  formatter={(val: any) => [`₹${val}`, '']}
                  contentStyle={{ backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '12px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
                <Area type="monotone" dataKey="sales" name="Sales Revenue" stroke="#2563eb" strokeWidth={2.5} fillOpacity={1} fill="url(#salesGrad)" />
                <Area type="monotone" dataKey="profit" name="Net Profit" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#profitGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Best-Selling Stationery Products */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-bold text-slate-800">Best-Selling Items</h3>
                <p className="text-xs text-slate-500">By quantity sold</p>
              </div>
              <button
                onClick={() => onSelectTab('products')}
                className="text-xs text-blue-600 font-semibold hover:text-blue-700"
              >
                View Catalog
              </button>
            </div>

            <div className="space-y-3">
              {metrics.bestSelling.length === 0 ? (
                <p className="text-xs text-slate-400 py-8 text-center">No sales recorded yet.</p>
              ) : (
                metrics.bestSelling.map((prod: any, idx: number) => (
                  <div key={idx} className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                    <div className="min-w-0 flex-1 mr-2">
                      <p className="text-xs font-semibold text-slate-800 truncate">{prod.name}</p>
                      <p className="text-[11px] text-slate-500 font-mono">{prod.category}</p>
                    </div>
                    <div className="text-right">
                      <span className="inline-block px-2 py-0.5 rounded-md bg-blue-100 text-blue-700 font-bold text-xs">
                        {prod.quantity} sold
                      </span>
                      <p className="text-[11px] text-slate-600 font-semibold mt-0.5">{formatINR(prod.revenue)}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100">
            <button
              onClick={onOpenPOS}
              className="w-full py-2 bg-blue-50 text-blue-700 hover:bg-blue-100 font-bold text-xs rounded-xl transition-colors flex items-center justify-center space-x-1"
            >
              <span>Create New Bill</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Recent Transactions Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-800">Recent Invoices</h3>
            <p className="text-xs text-slate-500">Latest completed checkout transactions</p>
          </div>
          <button
            onClick={() => onSelectTab('sales')}
            className="text-xs text-blue-600 font-semibold hover:text-blue-700 flex items-center"
          >
            View Complete Sales History <ArrowRight className="w-3.5 h-3.5 ml-1" />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 font-semibold uppercase text-[10px] tracking-wider border-b border-slate-200">
              <tr>
                <th className="px-6 py-3">Invoice #</th>
                <th className="px-6 py-3">Date & Time</th>
                <th className="px-6 py-3">Customer</th>
                <th className="px-6 py-3">Items</th>
                <th className="px-6 py-3">Payment</th>
                <th className="px-6 py-3 text-right">Grand Total</th>
                <th className="px-6 py-3 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {metrics.recentSales.map((sale: Sale) => (
                <tr key={sale.id} className="hover:bg-slate-50/75 transition-colors">
                  <td className="px-6 py-3.5 font-bold text-blue-700 font-mono">{sale.invoice_number}</td>
                  <td className="px-6 py-3.5 text-slate-500">
                    {new Date(sale.created_at).toLocaleDateString('en-IN')}{' '}
                    <span className="text-[11px] text-slate-400">
                      {new Date(sale.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </td>
                  <td className="px-6 py-3.5 font-medium text-slate-800">{sale.customer_name}</td>
                  <td className="px-6 py-3.5 text-slate-600">
                    {sale.items.reduce((s, it) => s + it.quantity, 0)} items
                  </td>
                  <td className="px-6 py-3.5">
                    <span className={`px-2 py-0.5 rounded-full font-semibold uppercase text-[10px] ${
                      sale.payment_mode === 'cash' ? 'bg-emerald-100 text-emerald-800' :
                      sale.payment_mode === 'upi' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'
                    }`}>
                      {sale.payment_mode}
                    </span>
                  </td>
                  <td className="px-6 py-3.5 text-right font-extrabold text-slate-900">
                    {formatINR(sale.total_amount)}
                  </td>
                  <td className="px-6 py-3.5 text-center">
                    <button
                      onClick={() => setSelectedSale(sale)}
                      className="p-1.5 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-colors"
                      title="View & Print Invoice"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Invoice Modal */}
      <InvoiceModal
        isOpen={Boolean(selectedSale)}
        onClose={() => setSelectedSale(null)}
        sale={selectedSale}
        shop={shop}
      />
    </div>
  );
};

