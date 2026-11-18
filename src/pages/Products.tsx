import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Search, 
  Edit2, 
  Trash2, 
  Download, 
  AlertTriangle, 
  Check, 
  Package, 
  Barcode, 
  Filter,
  CheckCircle2
} from 'lucide-react';
import { dataService } from '../lib/dataService';
import { formatINR } from '../lib/pdfGenerator';
import { exportProductsToExcel } from '../lib/excelExporter';
import { Product, Category } from '../types/database';
import { Modal } from '../components/common/Modal';
import { ConfirmDialog } from '../components/common/ConfirmDialog';

export const Products: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [stockFilter, setStockFilter] = useState<'all' | 'in_stock' | 'low_stock' | 'out_of_stock'>('all');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Form Fields
  const [name, setName] = useState('');
  const [sku, setSku] = useState('');
  const [barcode, setBarcode] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [purchasePrice, setPurchasePrice] = useState<number | ''>('');
  const [sellingPrice, setSellingPrice] = useState<number | ''>('');
  const [currentStock, setCurrentStock] = useState<number | ''>('');
  const [minStock, setMinStock] = useState<number | ''>(5);
  const [unit, setUnit] = useState('pcs');
  const [gstRate, setGstRate] = useState<number>(12);
  const [hsnCode, setHsnCode] = useState('');

  const loadData = async () => {
    setLoading(true);
    try {
      const [prods, cats] = await Promise.all([
        dataService.getProducts(),
        dataService.getCategories(),
      ]);
      setProducts(prods);
      setCategories(cats);
      if (cats.length > 0 && !categoryId) {
        setCategoryId(cats[0].id);
      }
    } catch (err) {
      console.error('Error fetching products:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const openAddModal = () => {
    setEditingProduct(null);
    setName('');
    setSku('');
    setBarcode('');
    setCategoryId(categories[0]?.id || '');
    setPurchasePrice('');
    setSellingPrice('');
    setCurrentStock('');
    setMinStock(5);
    setUnit('pcs');
    setGstRate(12);
    setHsnCode('');
    setErrorMessage(null);
    setIsModalOpen(true);
  };

  const openEditModal = (p: Product) => {
    setEditingProduct(p);
    setName(p.name);
    setSku(p.sku);
    setBarcode(p.barcode || '');
    setCategoryId(p.category_id);
    setPurchasePrice(p.purchase_price);
    setSellingPrice(p.selling_price);
    setCurrentStock(p.current_stock);
    setMinStock(p.min_stock);
    setUnit(p.unit);
    setGstRate(p.gst_rate);
    setHsnCode(p.hsn_code || '');
    setErrorMessage(null);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!name.trim() || !sku.trim()) {
      setErrorMessage('Product Name and SKU code are required.');
      return;
    }

    const pCost = Number(purchasePrice) || 0;
    const sPrice = Number(sellingPrice) || 0;
    const cStock = Number(currentStock) || 0;
    const mStock = Number(minStock) || 0;

    if (pCost < 0 || sPrice < 0 || cStock < 0 || mStock < 0) {
      setErrorMessage('Prices and stock values cannot be negative.');
      return;
    }

    try {
      if (editingProduct) {
        await dataService.updateProduct(editingProduct.id, {
          name: name.trim(),
          sku: sku.trim(),
          barcode: barcode.trim() || undefined,
          category_id: categoryId,
          purchase_price: pCost,
          selling_price: sPrice,
          current_stock: cStock,
          min_stock: mStock,
          unit,
          gst_rate: gstRate,
          hsn_code: hsnCode.trim() || undefined,
        });
      } else {
        await dataService.addProduct({
          name: name.trim(),
          sku: sku.trim(),
          barcode: barcode.trim() || undefined,
          category_id: categoryId,
          purchase_price: pCost,
          selling_price: sPrice,
          current_stock: cStock,
          min_stock: mStock,
          unit,
          gst_rate: gstRate,
          hsn_code: hsnCode.trim() || undefined,
          is_active: true,
        });
      }

      setIsModalOpen(false);
      loadData();
    } catch (err: any) {
      setErrorMessage(err.message || 'Operation failed. Please check inputs.');
    }
  };

  const handleDelete = async () => {
    if (!productToDelete) return;
    try {
      await dataService.deleteProduct(productToDelete.id);
      setProductToDelete(null);
      loadData();
    } catch (err: any) {
      alert(err.message || 'Error deleting product');
    }
  };

  // Filtered Products
  const filteredProducts = products.filter(p => {
    const s = searchTerm.toLowerCase();
    const matchesSearch = 
      p.name.toLowerCase().includes(s) ||
      p.sku.toLowerCase().includes(s) ||
      (p.barcode && p.barcode.includes(s));

    const matchesCat = selectedCategory === 'all' || p.category_id === selectedCategory;

    let matchesStock = true;
    if (stockFilter === 'out_of_stock') matchesStock = p.current_stock <= 0;
    else if (stockFilter === 'low_stock') matchesStock = p.current_stock > 0 && p.current_stock <= p.min_stock;
    else if (stockFilter === 'in_stock') matchesStock = p.current_stock > p.min_stock;

    return matchesSearch && matchesCat && matchesStock;
  });

  return (
    <div className="space-y-6">
      {/* Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800 tracking-tight">Product Inventory Management</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Maintain your stationery catalog, prices, GST tax slabs, and stock control.
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => exportProductsToExcel(products)}
            className="flex items-center space-x-1.5 px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs rounded-xl border border-slate-200 transition-colors shadow-xs"
          >
            <Download className="w-4 h-4 text-slate-500" />
            <span>Export to Excel</span>
          </button>
          <button
            onClick={openAddModal}
            className="flex items-center space-x-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Add New Product</span>
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs grid grid-cols-1 md:grid-cols-12 gap-3">
        {/* Search Input */}
        <div className="md:col-span-5 relative">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by product name, SKU or barcode..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-hidden focus:border-blue-500 focus:bg-white"
          />
        </div>

        {/* Category Filter */}
        <div className="md:col-span-4">
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-hidden focus:border-blue-500 font-medium"
          >
            <option value="all">All Categories ({categories.length})</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        {/* Stock Filter */}
        <div className="md:col-span-3">
          <select
            value={stockFilter}
            onChange={(e: any) => setStockFilter(e.target.value)}
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-hidden focus:border-blue-500 font-medium"
          >
            <option value="all">All Stock Statuses</option>
            <option value="in_stock">In Stock</option>
            <option value="low_stock">Low Stock Alerts</option>
            <option value="out_of_stock">Out of Stock</option>
          </select>
        </div>
      </div>

      {/* Products Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 font-semibold uppercase text-[10px] tracking-wider border-b border-slate-200">
              <tr>
                <th className="px-5 py-3">Product Name & Category</th>
                <th className="px-5 py-3">SKU / Barcode</th>
                <th className="px-5 py-3 text-right">Cost Price</th>
                <th className="px-5 py-3 text-right">Selling Price</th>
                <th className="px-5 py-3 text-center">GST</th>
                <th className="px-5 py-3 text-center">Stock</th>
                <th className="px-5 py-3 text-center">Status</th>
                <th className="px-5 py-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-5 py-8 text-center text-slate-400">
                    No products matching your filters.
                  </td>
                </tr>
              ) : (
                filteredProducts.map((p) => {
                  const isOutOfStock = p.current_stock <= 0;
                  const isLowStock = p.current_stock > 0 && p.current_stock <= p.min_stock;

                  return (
                    <tr key={p.id} className="hover:bg-slate-50/75 transition-colors">
                      <td className="px-5 py-3.5">
                        <p className="font-bold text-slate-900">{p.name}</p>
                        <p className="text-[11px] text-slate-500 font-medium">{p.category_name}</p>
                      </td>
                      <td className="px-5 py-3.5 font-mono text-[11px] text-slate-600">
                        <div>{p.sku}</div>
                        {p.barcode && <div className="text-slate-400 text-[10px]">{p.barcode}</div>}
                      </td>
                      <td className="px-5 py-3.5 text-right font-medium text-slate-600">
                        ₹{p.purchase_price.toFixed(2)}
                      </td>
                      <td className="px-5 py-3.5 text-right font-bold text-slate-900">
                        ₹{p.selling_price.toFixed(2)}
                      </td>
                      <td className="px-5 py-3.5 text-center text-slate-500">
                        {p.gst_rate}%
                      </td>
                      <td className="px-5 py-3.5 text-center font-bold text-slate-800">
                        {p.current_stock} <span className="text-[10px] font-normal text-slate-500">{p.unit}</span>
                      </td>
                      <td className="px-5 py-3.5 text-center">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                            isOutOfStock
                              ? 'bg-red-100 text-red-700'
                              : isLowStock
                              ? 'bg-amber-100 text-amber-700'
                              : 'bg-emerald-100 text-emerald-800'
                          }`}
                        >
                          {isOutOfStock ? 'Out of Stock' : isLowStock ? 'Low Stock' : 'In Stock'}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-center">
                        <div className="flex items-center justify-center space-x-1.5">
                          <button
                            onClick={() => openEditModal(p)}
                            className="p-1.5 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Edit Product"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setProductToDelete(p)}
                            className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                            title="Delete Product"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Product Add / Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingProduct ? 'Edit Stationery Product' : 'Add New Stationery Product'}
        maxWidth="2xl"
      >
        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {errorMessage && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 font-medium">
              {errorMessage}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Product Name */}
            <div className="md:col-span-2">
              <label className="block text-slate-700 font-bold mb-1">Product Name *</label>
              <input
                type="text"
                required
                placeholder="e.g. Classmate 192 Pgs Notebook Ruled"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-hidden focus:border-blue-500 font-medium"
              />
            </div>

            {/* SKU & Barcode */}
            <div>
              <label className="block text-slate-700 font-bold mb-1">Product Code / SKU *</label>
              <input
                type="text"
                required
                placeholder="e.g. CLM-NB-192"
                value={sku}
                onChange={(e) => setSku(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-hidden focus:border-blue-500 font-mono"
              />
            </div>

            <div>
              <label className="block text-slate-700 font-bold mb-1">Barcode (Optional)</label>
              <input
                type="text"
                placeholder="e.g. 890123400001"
                value={barcode}
                onChange={(e) => setBarcode(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-hidden focus:border-blue-500 font-mono"
              />
            </div>

            {/* Category & Unit */}
            <div>
              <label className="block text-slate-700 font-bold mb-1">Category *</label>
              <select
                required
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-hidden focus:border-blue-500 font-medium"
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-slate-700 font-bold mb-1">Unit of Measurement</label>
              <select
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-hidden focus:border-blue-500"
              >
                <option value="pcs">Pieces (pcs)</option>
                <option value="pack">Pack</option>
                <option value="box">Box</option>
                <option value="ream">Ream</option>
                <option value="set">Set</option>
                <option value="bottle">Bottle</option>
                <option value="pad">Pad</option>
                <option value="dozen">Dozen</option>
              </select>
            </div>

            {/* Purchase Price & Selling Price */}
            <div>
              <label className="block text-slate-700 font-bold mb-1">Purchase Cost Price (₹) *</label>
              <input
                type="number"
                step="0.01"
                min="0"
                required
                placeholder="0.00"
                value={purchasePrice}
                onChange={(e) => setPurchasePrice(parseFloat(e.target.value) || '')}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-hidden focus:border-blue-500 font-bold"
              />
            </div>

            <div>
              <label className="block text-slate-700 font-bold mb-1">Selling Retail Price (₹) *</label>
              <input
                type="number"
                step="0.01"
                min="0"
                required
                placeholder="0.00"
                value={sellingPrice}
                onChange={(e) => setSellingPrice(parseFloat(e.target.value) || '')}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-hidden focus:border-blue-500 font-bold text-blue-700"
              />
            </div>

            {/* Current Stock & Min Stock Alert */}
            <div>
              <label className="block text-slate-700 font-bold mb-1">Current Stock Quantity *</label>
              <input
                type="number"
                min="0"
                required
                placeholder="0"
                value={currentStock}
                onChange={(e) => setCurrentStock(parseInt(e.target.value) || '')}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-hidden focus:border-blue-500 font-bold"
              />
            </div>

            <div>
              <label className="block text-slate-700 font-bold mb-1">Minimum Stock Threshold</label>
              <input
                type="number"
                min="0"
                required
                value={minStock}
                onChange={(e) => setMinStock(parseInt(e.target.value) || '')}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-hidden focus:border-blue-500 font-medium"
              />
            </div>

            {/* GST Rate & HSN Code */}
            <div>
              <label className="block text-slate-700 font-bold mb-1">GST Tax Rate (%)</label>
              <select
                value={gstRate}
                onChange={(e) => setGstRate(parseInt(e.target.value) || 0)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-hidden focus:border-blue-500 font-bold"
              >
                <option value={0}>0% (Exempted)</option>
                <option value={5}>5% GST</option>
                <option value={12}>12% GST (Books, Pastels)</option>
                <option value={18}>18% GST (Pens, Folders, Staplers)</option>
                <option value={28}>28% GST</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-700 font-bold mb-1">HSN Code (Optional)</label>
              <input
                type="text"
                placeholder="e.g. 4820, 9608"
                value={hsnCode}
                onChange={(e) => setHsnCode(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-hidden focus:border-blue-500 font-mono"
              />
            </div>
          </div>

          <div className="flex justify-end space-x-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 border border-slate-200 text-slate-600 hover:bg-slate-50 font-semibold rounded-xl"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-xs"
            >
              {editingProduct ? 'Update Product' : 'Create Product'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={Boolean(productToDelete)}
        onClose={() => setProductToDelete(null)}
        onConfirm={handleDelete}
        title="Delete Stationery Product"
        message={`Are you sure you want to delete "${productToDelete?.name}"? This action cannot be reversed.`}
        confirmLabel="Delete Product"
        isDestructive
      />
    </div>
  );
};

