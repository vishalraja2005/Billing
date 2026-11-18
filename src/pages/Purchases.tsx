import React, { useState, useEffect } from 'react';
import { Plus, Search, Truck, Trash2, CheckCircle2, PackagePlus, FileText } from 'lucide-react';
import { dataService } from '../lib/dataService';
import { formatINR } from '../lib/pdfGenerator';
import { Purchase, Supplier, Product } from '../types/database';
import { Modal } from '../components/common/Modal';
import { useAuth } from '../contexts/AuthContext';

export const Purchases: React.FC = () => {
  const { user } = useAuth();
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  // New Purchase Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [supplierId, setSupplierId] = useState('');
  const [purchaseInvoiceNo, setPurchaseInvoiceNo] = useState('');
  const [notes, setNotes] = useState('');

  // Items in purchase
  interface TempItem {
    productId: string;
    productName: string;
    quantity: number;
    unitCost: number;
  }
  const [items, setItems] = useState<TempItem[]>([]);
  const [selectedProdId, setSelectedProdId] = useState('');
  const [itemQty, setItemQty] = useState<number | ''>(10);
  const [itemCost, setItemCost] = useState<number | ''>('');

  // Add Supplier modal
  const [showAddSupplierModal, setShowAddSupplierModal] = useState(false);
  const [newSupName, setNewSupName] = useState('');
  const [newSupContact, setNewSupContact] = useState('');
  const [newSupPhone, setNewSupPhone] = useState('');

  const loadData = async () => {
    setLoading(true);
    try {
      const [purs, sups, prods] = await Promise.all([
        dataService.getPurchases(),
        dataService.getSuppliers(),
        dataService.getProducts(),
      ]);
      setPurchases(purs);
      setSuppliers(sups);
      setProducts(prods);
      if (sups.length > 0 && !supplierId) {
        setSupplierId(sups[0].id);
      }
    } catch (err) {
      console.error('Error fetching purchases data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const openNewPurchase = () => {
    setSupplierId(suppliers[0]?.id || '');
    setPurchaseInvoiceNo(`PUR-${Date.now().toString().slice(-6)}`);
    setNotes('');
    setItems([]);
    if (products.length > 0) {
      setSelectedProdId(products[0].id);
      setItemCost(products[0].purchase_price);
    }
    setIsModalOpen(true);
  };

  const handleProductSelectChange = (id: string) => {
    setSelectedProdId(id);
    const prod = products.find(p => p.id === id);
    if (prod) {
      setItemCost(prod.purchase_price);
    }
  };

  const handleAddItemToPurchase = () => {
    if (!selectedProdId) return;
    const prod = products.find(p => p.id === selectedProdId);
    if (!prod) return;

    const qty = Number(itemQty) || 1;
    const cost = Number(itemCost) || prod.purchase_price;

    const existingIdx = items.findIndex(it => it.productId === selectedProdId);
    if (existingIdx !== -1) {
      const updated = [...items];
      updated[existingIdx].quantity += qty;
      updated[existingIdx].unitCost = cost;
      setItems(updated);
    } else {
      setItems([...items, {
        productId: prod.id,
        productName: prod.name,
        quantity: qty,
        unitCost: cost,
      }]);
    }
  };

  const handleRemoveItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const totalPurchaseAmount = items.reduce((sum, it) => sum + (it.quantity * it.unitCost), 0);

  const handleSubmitPurchase = async (e: React.FormEvent) => {
    e.preventDefault();
    if (items.length === 0) {
      alert('Please add at least one item to this purchase invoice.');
      return;
    }

    const sup = suppliers.find(s => s.id === supplierId);
    if (!sup) {
      alert('Please select a supplier.');
      return;
    }

    try {
      await dataService.createPurchase({
        supplier_id: sup.id,
        supplier_name: sup.name,
        purchase_invoice_no: purchaseInvoiceNo.trim(),
        notes: notes.trim() || undefined,
        items: items.map(it => ({
          product_id: it.productId,
          product_name: it.productName,
          quantity: it.quantity,
          unit_cost: it.unitCost,
          total_cost: it.quantity * it.unitCost,
        })),
        total_amount: totalPurchaseAmount,
        created_by: user?.full_name || 'Admin',
      });

      setIsModalOpen(false);
      loadData();
    } catch (err: any) {
      alert(err.message || 'Error saving purchase entry');
    }
  };

  const handleCreateSupplier = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const newSup = await dataService.addSupplier({
        name: newSupName.trim(),
        contact_person: newSupContact.trim(),
        phone: newSupPhone.trim(),
      });
      setSuppliers([newSup, ...suppliers]);
      setSupplierId(newSup.id);
      setShowAddSupplierModal(false);
      setNewSupName('');
      setNewSupContact('');
      setNewSupPhone('');
    } catch (err: any) {
      alert(err.message || 'Error adding supplier');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800 tracking-tight">Purchase Inward & Wholesale Orders</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Log inward deliveries from stationery publishers and paper distributors with automatic stock replenishment.
          </p>
        </div>
        <button
          onClick={openNewPurchase}
          className="flex items-center space-x-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors self-start"
        >
          <Plus className="w-4 h-4" />
          <span>New Purchase Entry</span>
        </button>
      </div>

      {/* Purchases List */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-800">Confirmed Supplier Purchases</h3>
          <span className="text-xs text-slate-500">{purchases.length} Purchase Bills</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 font-semibold uppercase text-[10px] tracking-wider border-b border-slate-200">
              <tr>
                <th className="px-5 py-3">Purchase Inv #</th>
                <th className="px-5 py-3">Inward Date</th>
                <th className="px-5 py-3">Supplier Name</th>
                <th className="px-5 py-3 text-center">Items Inwarded</th>
                <th className="px-5 py-3 text-right">Total Bill Cost</th>
                <th className="px-5 py-3 text-center">Payment Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {purchases.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-8 text-center text-slate-400">
                    No purchase inward entries recorded yet. Click "New Purchase Entry" to add wholesale inventory.
                  </td>
                </tr>
              ) : (
                purchases.map((pur) => (
                  <tr key={pur.id} className="hover:bg-slate-50/75 transition-colors">
                    <td className="px-5 py-3.5 font-bold font-mono text-blue-700">
                      {pur.purchase_invoice_no}
                    </td>
                    <td className="px-5 py-3.5 text-slate-600">
                      {new Date(pur.created_at).toLocaleDateString('en-IN')}
                    </td>
                    <td className="px-5 py-3.5 font-medium text-slate-900">
                      {pur.supplier_name}
                    </td>
                    <td className="px-5 py-3.5 text-center text-slate-600">
                      {pur.items.reduce((s, it) => s + it.quantity, 0)} units ({pur.items.length} SKUs)
                    </td>
                    <td className="px-5 py-3.5 text-right font-extrabold text-slate-900 text-sm">
                      {formatINR(pur.total_amount)}
                    </td>
                    <td className="px-5 py-3.5 text-center">
                      <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-emerald-100 text-emerald-800">
                        {pur.payment_status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* New Purchase Inward Entry Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Record Wholesale Purchase & Inward Stock"
        maxWidth="3xl"
      >
        <form onSubmit={handleSubmitPurchase} className="space-y-4 text-xs">
          {/* Top Row: Supplier & Invoice No */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="text-slate-700 font-bold">Distributor / Supplier *</label>
                <button
                  type="button"
                  onClick={() => setShowAddSupplierModal(true)}
                  className="text-blue-600 font-bold text-[11px] hover:underline"
                >
                  + Add Supplier
                </button>
              </div>
              <select
                required
                value={supplierId}
                onChange={(e) => setSupplierId(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-hidden focus:border-blue-500 font-medium"
              >
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.contact_person})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-slate-700 font-bold mb-1">Supplier Bill / Invoice # *</label>
              <input
                type="text"
                required
                placeholder="e.g. ITC-CHE-2026-901"
                value={purchaseInvoiceNo}
                onChange={(e) => setPurchaseInvoiceNo(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-hidden focus:border-blue-500 font-mono"
              />
            </div>
          </div>

          {/* Item Selector Row */}
          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
            <h4 className="font-bold text-slate-800 text-[11px] uppercase tracking-wider">
              Add Products Inwarded
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-12 gap-2">
              <div className="md:col-span-6">
                <select
                  value={selectedProdId}
                  onChange={(e) => handleProductSelectChange(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium outline-hidden"
                >
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} (Cur Stock: {p.current_stock})
                    </option>
                  ))}
                </select>
              </div>
              <div className="md:col-span-2">
                <input
                  type="number"
                  min="1"
                  placeholder="Qty"
                  value={itemQty}
                  onChange={(e) => setItemQty(parseInt(e.target.value) || '')}
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold outline-hidden text-center"
                />
              </div>
              <div className="md:col-span-2">
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="Cost / Unit"
                  value={itemCost}
                  onChange={(e) => setItemCost(parseFloat(e.target.value) || '')}
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold outline-hidden text-right"
                />
              </div>
              <div className="md:col-span-2">
                <button
                  type="button"
                  onClick={handleAddItemToPurchase}
                  className="w-full py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg text-xs shadow-xs"
                >
                  + Add Item
                </button>
              </div>
            </div>
          </div>

          {/* Items Inward Table */}
          <div className="border border-slate-200 rounded-xl overflow-hidden max-h-48 overflow-y-auto custom-scrollbar">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                <tr>
                  <th className="px-3 py-2">Product Name</th>
                  <th className="px-3 py-2 text-center">Inward Qty</th>
                  <th className="px-3 py-2 text-right">Unit Cost</th>
                  <th className="px-3 py-2 text-right">Total</th>
                  <th className="px-3 py-2 text-center"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-3 py-6 text-center text-slate-400">
                      No items added yet. Select products above to build purchase invoice.
                    </td>
                  </tr>
                ) : (
                  items.map((it, idx) => (
                    <tr key={idx} className="hover:bg-slate-50">
                      <td className="px-3 py-2 font-bold text-slate-800">{it.productName}</td>
                      <td className="px-3 py-2 text-center font-bold text-blue-700">+{it.quantity}</td>
                      <td className="px-3 py-2 text-right">₹{it.unitCost.toFixed(2)}</td>
                      <td className="px-3 py-2 text-right font-extrabold text-slate-900">
                        ₹{(it.quantity * it.unitCost).toFixed(2)}
                      </td>
                      <td className="px-3 py-2 text-center">
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(idx)}
                          className="p-1 text-slate-400 hover:text-red-600"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Total & Submit */}
          <div className="flex items-center justify-between pt-3 border-t border-slate-200">
            <div>
              <span className="text-slate-500 font-medium">Total Purchase Valuation:</span>
              <p className="text-xl font-extrabold text-blue-800">{formatINR(totalPurchaseAmount)}</p>
            </div>
            <div className="flex space-x-2">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 border border-slate-200 text-slate-600 hover:bg-slate-50 font-semibold rounded-xl"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={items.length === 0}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-xs disabled:opacity-50"
              >
                Confirm & Replenish Stock
              </button>
            </div>
          </div>
        </form>
      </Modal>

      {/* Add Supplier Modal */}
      {showAddSupplierModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-sm p-6 space-y-4 text-xs">
            <h3 className="text-sm font-bold text-slate-800">Add New Wholesale Supplier</h3>
            <form onSubmit={handleCreateSupplier} className="space-y-3">
              <div>
                <label className="block text-slate-600 font-bold mb-1">Company / Agency Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Navneet Publications Agency"
                  value={newSupName}
                  onChange={(e) => setNewSupName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-hidden focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-slate-600 font-bold mb-1">Contact Person *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Ananth Kumar"
                  value={newSupContact}
                  onChange={(e) => setNewSupContact(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-hidden focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-slate-600 font-bold mb-1">Phone Number *</label>
                <input
                  type="tel"
                  required
                  placeholder="e.g. 9841054321"
                  value={newSupPhone}
                  onChange={(e) => setNewSupPhone(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-hidden focus:border-blue-500"
                />
              </div>
              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddSupplierModal(false)}
                  className="px-3 py-2 text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-xs"
                >
                  Save Supplier
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

