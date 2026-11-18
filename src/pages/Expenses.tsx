import React, { useState, useEffect } from 'react';
import { Plus, Search, Edit2, Trash2, Wallet, Calendar, DollarSign } from 'lucide-react';
import { dataService } from '../lib/dataService';
import { formatINR } from '../lib/pdfGenerator';
import { Expense } from '../types/database';
import { Modal } from '../components/common/Modal';
import { ConfirmDialog } from '../components/common/ConfirmDialog';

export const Expenses: React.FC = () => {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // Modals
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [expenseToDelete, setExpenseToDelete] = useState<Expense | null>(null);

  // Form
  const [category, setCategory] = useState('Shop Rent');
  const [amount, setAmount] = useState<number | ''>('');
  const [expenseDate, setExpenseDate] = useState(new Date().toISOString().split('T')[0]);
  const [description, setDescription] = useState('');
  const [paymentMode, setPaymentMode] = useState<'cash' | 'upi' | 'card' | 'bank_transfer'>('cash');
  const [referenceNo, setReferenceNo] = useState('');

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await dataService.getExpenses();
      setExpenses(data);
    } catch (err) {
      console.error('Error fetching expenses:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const openAddModal = () => {
    setEditingExpense(null);
    setCategory('Shop Rent');
    setAmount('');
    setExpenseDate(new Date().toISOString().split('T')[0]);
    setDescription('');
    setPaymentMode('cash');
    setReferenceNo('');
    setIsModalOpen(true);
  };

  const openEditModal = (exp: Expense) => {
    setEditingExpense(exp);
    setCategory(exp.category);
    setAmount(exp.amount);
    setExpenseDate(exp.expense_date);
    setDescription(exp.description);
    setPaymentMode(exp.payment_mode);
    setReferenceNo(exp.reference_no || '');
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amt = Number(amount);
    if (!amt || amt <= 0) {
      alert('Please enter a valid expense amount greater than 0.');
      return;
    }
    if (!description.trim()) {
      alert('Please provide a short description.');
      return;
    }

    try {
      if (editingExpense) {
        await dataService.updateExpense(editingExpense.id, {
          category,
          amount: amt,
          expense_date: expenseDate,
          description: description.trim(),
          payment_mode: paymentMode,
          reference_no: referenceNo.trim() || undefined,
        });
      } else {
        await dataService.addExpense({
          category,
          amount: amt,
          expense_date: expenseDate,
          description: description.trim(),
          payment_mode: paymentMode,
          reference_no: referenceNo.trim() || undefined,
        });
      }
      setIsModalOpen(false);
      loadData();
    } catch (err: any) {
      alert(err.message || 'Error saving expense');
    }
  };

  const handleDelete = async () => {
    if (!expenseToDelete) return;
    try {
      await dataService.deleteExpense(expenseToDelete.id);
      setExpenseToDelete(null);
      loadData();
    } catch (err: any) {
      alert(err.message || 'Error deleting expense');
    }
  };

  const filteredExpenses = expenses.filter(e => 
    e.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
    e.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (e.reference_no && e.reference_no.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const totalExpenseSum = filteredExpenses.reduce((sum, e) => sum + e.amount, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800 tracking-tight">Operating Expenses Register</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Log shop rents, electricity, transport freight and salaries for accurate net profit accounting.
          </p>
        </div>
        <button
          onClick={openAddModal}
          className="flex items-center space-x-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors self-start"
        >
          <Plus className="w-4 h-4" />
          <span>Record Expense</span>
        </button>
      </div>

      {/* Filter & Metric Strip */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
        <div className="md:col-span-6 bg-white p-4 rounded-2xl border border-slate-200 shadow-xs relative">
          <Search className="w-4 h-4 absolute left-7 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search expenses by category or description..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-hidden focus:border-blue-500 focus:bg-white"
          />
        </div>

        <div className="md:col-span-6 bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold uppercase text-slate-500">Total Filtered Outflow</span>
            <h3 className="text-xl font-extrabold text-slate-900 mt-0.5">{formatINR(totalExpenseSum)}</h3>
          </div>
          <span className="text-xs text-slate-500 font-semibold">{filteredExpenses.length} Records</span>
        </div>
      </div>

      {/* Expenses Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 font-semibold uppercase text-[10px] tracking-wider border-b border-slate-200">
              <tr>
                <th className="px-5 py-3">Expense Date</th>
                <th className="px-5 py-3">Category</th>
                <th className="px-5 py-3">Description</th>
                <th className="px-5 py-3">Payment Method</th>
                <th className="px-5 py-3">Voucher / Ref #</th>
                <th className="px-5 py-3 text-right">Amount (₹)</th>
                <th className="px-5 py-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredExpenses.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-8 text-center text-slate-400">
                    No operating expenses recorded yet.
                  </td>
                </tr>
              ) : (
                filteredExpenses.map((exp) => (
                  <tr key={exp.id} className="hover:bg-slate-50/75 transition-colors">
                    <td className="px-5 py-3.5 text-slate-600 font-mono">
                      {new Date(exp.expense_date).toLocaleDateString('en-IN')}
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="px-2.5 py-0.5 rounded-full font-bold text-[10px] bg-slate-100 text-slate-800">
                        {exp.category}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 font-medium text-slate-900 max-w-xs">
                      {exp.description}
                    </td>
                    <td className="px-5 py-3.5 uppercase text-[10px] font-semibold text-slate-600">
                      {exp.payment_mode.replace('_', ' ')}
                    </td>
                    <td className="px-5 py-3.5 font-mono text-slate-500 text-[11px]">
                      {exp.reference_no || '-'}
                    </td>
                    <td className="px-5 py-3.5 text-right font-extrabold text-red-600 text-sm">
                      {formatINR(exp.amount)}
                    </td>
                    <td className="px-5 py-3.5 text-center">
                      <div className="flex items-center justify-center space-x-1.5">
                        <button
                          onClick={() => openEditModal(exp)}
                          className="p-1.5 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Edit Expense"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setExpenseToDelete(exp)}
                          className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                          title="Delete Expense"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingExpense ? 'Edit Expense Entry' : 'Record Operating Expense'}
      >
        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block text-slate-700 font-bold mb-1">Expense Category *</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-hidden focus:border-blue-500 font-medium"
            >
              <option value="Shop Rent">Shop Rent</option>
              <option value="Electricity Bill">Electricity Bill</option>
              <option value="Wholesale Transport">Wholesale Transport & Logistics</option>
              <option value="Staff Salaries">Staff Salaries & Allowances</option>
              <option value="Staff Refreshments">Staff Refreshments & Tea</option>
              <option value="Packaging & Bags">Packaging Materials & Bags</option>
              <option value="Maintenance & Cleaning">Maintenance & Cleaning</option>
              <option value="Printing & Stationery Office Use">Shop Own Stationery & Thermal Rolls</option>
              <option value="Miscellaneous">Miscellaneous</option>
            </select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-700 font-bold mb-1">Amount (₹) *</label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                required
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(parseFloat(e.target.value) || '')}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-hidden focus:border-blue-500 font-extrabold text-sm text-red-600"
              />
            </div>
            <div>
              <label className="block text-slate-700 font-bold mb-1">Expense Date *</label>
              <input
                type="date"
                required
                value={expenseDate}
                onChange={(e) => setExpenseDate(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-hidden focus:border-blue-500 font-medium"
              />
            </div>
          </div>

          <div>
            <label className="block text-slate-700 font-bold mb-1">Description *</label>
            <input
              type="text"
              required
              placeholder="e.g. Monthly showroom rental paid via NEFT"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-hidden focus:border-blue-500"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-700 font-bold mb-1">Payment Mode</label>
              <select
                value={paymentMode}
                onChange={(e: any) => setPaymentMode(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-hidden focus:border-blue-500 font-medium"
              >
                <option value="cash">Cash</option>
                <option value="upi">UPI</option>
                <option value="bank_transfer">Bank Transfer (NEFT/IMPS)</option>
                <option value="card">Card</option>
              </select>
            </div>
            <div>
              <label className="block text-slate-700 font-bold mb-1">Reference / Voucher #</label>
              <input
                type="text"
                placeholder="e.g. VOUCHER-084 / UPI-REF"
                value={referenceNo}
                onChange={(e) => setReferenceNo(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-hidden focus:border-blue-500 font-mono"
              />
            </div>
          </div>

          <div className="flex justify-end space-x-2 pt-3 border-t border-slate-100">
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
              {editingExpense ? 'Update' : 'Record'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={Boolean(expenseToDelete)}
        onClose={() => setExpenseToDelete(null)}
        onConfirm={handleDelete}
        title="Delete Expense Record"
        message={`Are you sure you want to delete this expense of ₹${expenseToDelete?.amount}?`}
        confirmLabel="Delete Expense"
        isDestructive
      />
    </div>
  );
};

