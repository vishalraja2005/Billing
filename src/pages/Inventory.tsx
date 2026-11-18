import React, { useState, useEffect } from 'react';
import { 
  Boxes, 
  AlertTriangle, 
  ArrowDownRight, 
  ArrowUpRight, 
  RefreshCw, 
  SlidersHorizontal, 
  DollarSign, 
  Search,
  CheckCircle,
  History
} from 'lucide-react';
import { dataService } from '../lib/dataService';
import { formatINR } from '../lib/pdfGenerator';
import { Product, StockMovement, Shop } from '../types/database';
import { Modal } from '../components/common/Modal';
import { useAuth } from '../contexts/AuthContext';

interface InventoryProps {
  shop: Shop | null;
}

export const Inventory: React.FC<InventoryProps> = ({ shop }) => {
  const { user } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [loading, setLoading] = useState(true);

  // Tabs: 'overview' or 'history'
  const [activeTab, setActiveTab] = useState<'overview' | 'history'>('overview');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterAlertsOnly, setFilterAlertsOnly] = useState(false);

  // Adjustment Modal
  const [adjustingProduct, setAdjustingProduct] = useState<Product | null>(null);
  const [newStockInput, setNewStockInput] = useState<number | ''>('');
  const [adjustReason, setAdjustReason] = useState('Physical Stock Verification Count');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [prods, moves] = await Promise.all([
        dataService.getProducts(),
        dataService.getStockMovements(),
      ]);
      setProducts(prods);
      setMovements(moves);
    } catch (err) {
      console.error('Error fetching inventory data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const openAdjustModal = (p: Product) => {
    setAdjustingProduct(p);
    setNewStockInput(p.current_stock);
    setAdjustReason('Physical Stock Verification Count');
  };

  const handleAdjustStock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustingProduct) return;
    const nextVal = Number(newStockInput);
    if (isNaN(nextVal) || nextVal < 0) {
      alert('Stock cannot be negative.');
      return;
    }

    setIsSubmitting(true);
    try {
      await dataService.adjustStock(
        adjustingProduct.id,
        nextVal,
        adjustReason,
        user?.full_name || 'Admin'
      );
      setAdjustingProduct(null);
      loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to adjust stock');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Metrics
  const totalCostValuation = products.reduce((sum, p) => sum + (p.purchase_price * p.current_stock), 0);
  const totalRetailValuation = products.reduce((sum, p) => sum + (p.selling_price * p.current_stock), 0);
  const lowStockCount = products.filter(p => p.current_stock <= p.min_stock).length;
  const outOfStockCount = products.filter(p => p.current_stock <= 0).length;

  // Filtered Products
  const filteredProducts = products.filter(p => {
    const s = searchTerm.toLowerCase();
    const matchesSearch = p.name.toLowerCase().includes(s) || p.sku.toLowerCase().includes(s);
    const matchesAlert = filterAlertsOnly ? p.current_stock <= p.min_stock : true;
    return matchesSearch && matchesAlert;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800 tracking-tight">Inventory & Stock Control</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Monitor real-time stock balances, inventory valuation, and complete audit trail.
          </p>
        </div>
        <div className="flex items-center space-x-2 bg-slate-100 p-1 rounded-xl text-xs font-semibold">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              activeTab === 'overview' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Stock Balances
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              activeTab === 'history' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Movement Audit Log
          </button>
        </div>
      </div>

      {/* Valuation & Alert Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Total Cost Valuation</span>
          <h3 className="text-2xl font-extrabold text-slate-900 mt-1">{formatINR(totalCostValuation)}</h3>
          <p className="text-xs text-slate-500 mt-1">Based on purchase costs</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Total Retail Value</span>
          <h3 className="text-2xl font-extrabold text-blue-700 mt-1">{formatINR(totalRetailValuation)}</h3>
          <p className="text-xs text-slate-500 mt-1">Potential sales revenue</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Low Stock Items</span>
          <h3 className={`text-2xl font-extrabold mt-1 ${lowStockCount > 0 ? 'text-amber-600' : 'text-slate-800'}`}>
            {lowStockCount} Products
          </h3>
          <p className="text-xs text-slate-500 mt-1">At or below minimum limit</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Out of Stock</span>
          <h3 className={`text-2xl font-extrabold mt-1 ${outOfStockCount > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
            {outOfStockCount} Products
          </h3>
          <p className="text-xs text-slate-500 mt-1">Immediate reorder required</p>
        </div>
      </div>

      {activeTab === 'overview' ? (
        /* OVERVIEW TAB: STOCK BALANCES & MANUAL ADJUSTMENT */
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="relative max-w-sm w-full">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search products in stock..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-hidden focus:border-blue-500"
              />
            </div>
            <label className="flex items-center space-x-2 text-xs font-semibold text-slate-700 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={filterAlertsOnly}
                onChange={(e) => setFilterAlertsOnly(e.target.checked)}
                className="rounded text-blue-600"
              />
              <span>Show Low / Out of Stock Only</span>
            </label>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 font-semibold uppercase text-[10px] tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="px-5 py-3">Product Name & SKU</th>
                    <th className="px-5 py-3">Category</th>
                    <th className="px-5 py-3 text-right">Cost Price</th>
                    <th className="px-5 py-3 text-right">Selling Price</th>
                    <th className="px-5 py-3 text-center">Current Stock</th>
                    <th className="px-5 py-3 text-center">Min Threshold</th>
                    <th className="px-5 py-3 text-right">Total Cost Value</th>
                    <th className="px-5 py-3 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredProducts.map((p) => {
                    const isLow = p.current_stock <= p.min_stock;
                    return (
                      <tr key={p.id} className="hover:bg-slate-50/75 transition-colors">
                        <td className="px-5 py-3.5">
                          <p className="font-bold text-slate-900">{p.name}</p>
                          <p className="text-[11px] font-mono text-slate-500">{p.sku}</p>
                        </td>
                        <td className="px-5 py-3.5 text-slate-600">{p.category_name}</td>
                        <td className="px-5 py-3.5 text-right text-slate-600">₹{p.purchase_price.toFixed(2)}</td>
                        <td className="px-5 py-3.5 text-right font-bold text-slate-900">₹{p.selling_price.toFixed(2)}</td>
                        <td className="px-5 py-3.5 text-center">
                          <span className={`inline-block px-2.5 py-0.5 rounded-full font-bold text-xs ${
                            p.current_stock <= 0
                              ? 'bg-red-100 text-red-700'
                              : isLow
                              ? 'bg-amber-100 text-amber-700'
                              : 'bg-emerald-100 text-emerald-800'
                          }`}>
                            {p.current_stock} {p.unit}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 text-center text-slate-500 font-medium">
                          {p.min_stock} {p.unit}
                        </td>
                        <td className="px-5 py-3.5 text-right font-bold text-slate-900">
                          {formatINR(p.purchase_price * p.current_stock)}
                        </td>
                        <td className="px-5 py-3.5 text-center">
                          <button
                            onClick={() => openAdjustModal(p)}
                            className="px-2.5 py-1 bg-slate-100 hover:bg-blue-50 text-slate-700 hover:text-blue-700 font-semibold rounded-lg text-[11px] transition-colors border border-slate-200"
                          >
                            Adjust Stock
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        /* HISTORY TAB: STOCK MOVEMENTS AUDIT TRAIL */
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-800">Complete Stock Movement Logs</h3>
            <span className="text-xs text-slate-500">{movements.length} logged events</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-semibold uppercase text-[10px] tracking-wider border-b border-slate-200">
                <tr>
                  <th className="px-5 py-3">Timestamp</th>
                  <th className="px-5 py-3">Product Name</th>
                  <th className="px-5 py-3 text-center">Type</th>
                  <th className="px-5 py-3 text-center">Quantity Change</th>
                  <th className="px-5 py-3 text-center">Previous → New</th>
                  <th className="px-5 py-3">Reason / Reference</th>
                  <th className="px-5 py-3">Recorded By</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {movements.map((m) => {
                  const isNegative = m.quantity_change < 0;
                  return (
                    <tr key={m.id} className="hover:bg-slate-50/75 transition-colors">
                      <td className="px-5 py-3.5 text-slate-500">
                        {new Date(m.created_at).toLocaleString('en-IN', {
                          day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit'
                        })}
                      </td>
                      <td className="px-5 py-3.5 font-bold text-slate-900">{m.product_name}</td>
                      <td className="px-5 py-3.5 text-center">
                        <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                          m.movement_type === 'sale' ? 'bg-blue-100 text-blue-700' :
                          m.movement_type === 'purchase' ? 'bg-emerald-100 text-emerald-800' :
                          m.movement_type === 'adjustment' ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-700'
                        }`}>
                          {m.movement_type}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-center font-bold">
                        <span className={`inline-flex items-center ${isNegative ? 'text-red-600' : 'text-emerald-600'}`}>
                          {isNegative ? <ArrowDownRight className="w-3.5 h-3.5 mr-0.5" /> : <ArrowUpRight className="w-3.5 h-3.5 mr-0.5" />}
                          {m.quantity_change > 0 ? `+${m.quantity_change}` : m.quantity_change}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-center font-mono text-slate-600">
                        {m.previous_stock} → <span className="font-bold text-slate-900">{m.new_stock}</span>
                      </td>
                      <td className="px-5 py-3.5 text-slate-600">{m.reason}</td>
                      <td className="px-5 py-3.5 text-slate-500">{m.created_by}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Manual Stock Adjustment Modal */}
      <Modal
        isOpen={Boolean(adjustingProduct)}
        onClose={() => setAdjustingProduct(null)}
        title={`Adjust Stock: ${adjustingProduct?.name}`}
      >
        <form onSubmit={handleAdjustStock} className="space-y-4 text-xs">
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-blue-800 space-y-1">
            <p className="font-bold">Current Stock: {adjustingProduct?.current_stock} {adjustingProduct?.unit}</p>
            <p className="text-[11px] text-blue-600">Enter the verified physical count. A movement audit record will be logged.</p>
          </div>

          <div>
            <label className="block text-slate-700 font-bold mb-1">New Verified Stock Count *</label>
            <input
              type="number"
              min="0"
              required
              value={newStockInput}
              onChange={(e) => setNewStockInput(parseInt(e.target.value) || 0)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold outline-hidden focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-slate-700 font-bold mb-1">Adjustment Reason *</label>
            <select
              value={adjustReason}
              onChange={(e) => setAdjustReason(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-hidden focus:border-blue-500 font-medium"
            >
              <option value="Physical Stock Verification Count">Physical Stock Verification Count</option>
              <option value="Damaged / Shelf Wear Goods Written Off">Damaged / Shelf Wear Goods Written Off</option>
              <option value="Received Free Promo Sample / Gift Pack">Received Free Promo Sample / Gift Pack</option>
              <option value="Customer Return Restocked">Customer Return Restocked</option>
              <option value="Other Manual Correction">Other Manual Correction</option>
            </select>
          </div>

          <div className="flex justify-end space-x-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setAdjustingProduct(null)}
              className="px-4 py-2 border border-slate-200 text-slate-600 hover:bg-slate-50 font-semibold rounded-xl"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-xs disabled:opacity-50"
            >
              Confirm Adjustment
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

