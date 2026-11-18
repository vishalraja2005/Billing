import React, { useState, useEffect } from 'react';
import { Plus, Search, Edit2, Trash2, Phone, Mail, MapPin, Receipt, ArrowRight, User } from 'lucide-react';
import { dataService } from '../lib/dataService';
import { formatINR } from '../lib/pdfGenerator';
import { Customer, Sale } from '../types/database';
import { Modal } from '../components/common/Modal';
import { ConfirmDialog } from '../components/common/ConfirmDialog';

export const Customers: React.FC = () => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // Modals
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [customerToDelete, setCustomerToDelete] = useState<Customer | null>(null);
  const [viewHistoryCustomer, setViewHistoryCustomer] = useState<Customer | null>(null);

  // Form Fields
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [gstin, setGstin] = useState('');

  const loadData = async () => {
    setLoading(true);
    try {
      const [custs, sls] = await Promise.all([
        dataService.getCustomers(),
        dataService.getSales(),
      ]);
      setCustomers(custs);
      setSales(sls);
    } catch (err) {
      console.error('Error fetching customers:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const openAddModal = () => {
    setEditingCustomer(null);
    setName('');
    setPhone('');
    setEmail('');
    setAddress('');
    setGstin('');
    setIsModalOpen(true);
  };

  const openEditModal = (c: Customer) => {
    setEditingCustomer(c);
    setName(c.name);
    setPhone(c.phone);
    setEmail(c.email || '');
    setAddress(c.address || '');
    setGstin(c.gstin || '');
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !phone.trim()) {
      alert('Name and phone number are required.');
      return;
    }

    try {
      if (editingCustomer) {
        await dataService.updateCustomer(editingCustomer.id, {
          name: name.trim(),
          phone: phone.trim(),
          email: email.trim() || undefined,
          address: address.trim() || undefined,
          gstin: gstin.trim() || undefined,
        });
      } else {
        await dataService.addCustomer({
          name: name.trim(),
          phone: phone.trim(),
          email: email.trim() || undefined,
          address: address.trim() || undefined,
          gstin: gstin.trim() || undefined,
        });
      }
      setIsModalOpen(false);
      loadData();
    } catch (err: any) {
      alert(err.message || 'Operation failed');
    }
  };

  const handleDelete = async () => {
    if (!customerToDelete) return;
    try {
      await dataService.deleteCustomer(customerToDelete.id);
      setCustomerToDelete(null);
      loadData();
    } catch (err: any) {
      alert(err.message || 'Error deleting customer');
    }
  };

  const filteredCustomers = customers.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.phone.includes(searchTerm) ||
    (c.email && c.email.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const customerPurchases = viewHistoryCustomer 
    ? sales.filter(s => s.customer_id === viewHistoryCustomer.id || s.customer_phone === viewHistoryCustomer.phone)
    : [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800 tracking-tight">Customer Management</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Maintain regular school, clinic, corporate and student accounts and their billing history.
          </p>
        </div>
        <button
          onClick={openAddModal}
          className="flex items-center space-x-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors self-start"
        >
          <Plus className="w-4 h-4" />
          <span>Add New Customer</span>
        </button>
      </div>

      {/* Search Input */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs max-w-md relative">
        <Search className="w-4 h-4 absolute left-7 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          placeholder="Search customer by name or phone..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-hidden focus:border-blue-500 focus:bg-white"
        />
      </div>

      {/* Customers Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 font-semibold uppercase text-[10px] tracking-wider border-b border-slate-200">
              <tr>
                <th className="px-5 py-3">Customer Name</th>
                <th className="px-5 py-3">Contact Information</th>
                <th className="px-5 py-3">Address & GSTIN</th>
                <th className="px-5 py-3 text-center">Total Invoices</th>
                <th className="px-5 py-3 text-right">Lifetime Spent</th>
                <th className="px-5 py-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredCustomers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-8 text-center text-slate-400">
                    No customers found matching your search.
                  </td>
                </tr>
              ) : (
                filteredCustomers.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50/75 transition-colors">
                    <td className="px-5 py-3.5">
                      <p className="font-bold text-slate-900">{c.name}</p>
                      <p className="text-[11px] text-slate-400">ID: {c.id}</p>
                    </td>
                    <td className="px-5 py-3.5 space-y-0.5">
                      <p className="font-medium text-slate-800 flex items-center">
                        <Phone className="w-3 h-3 text-slate-400 mr-1.5" />
                        {c.phone}
                      </p>
                      {c.email && (
                        <p className="text-slate-500 flex items-center text-[11px]">
                          <Mail className="w-3 h-3 text-slate-400 mr-1.5" />
                          {c.email}
                        </p>
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-slate-600 max-w-xs truncate">
                      {c.address ? (
                        <p className="truncate">{c.address}</p>
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                      {c.gstin && <p className="text-[10px] font-mono text-slate-500">GSTIN: {c.gstin}</p>}
                    </td>
                    <td className="px-5 py-3.5 text-center font-bold text-slate-800">
                      <button
                        onClick={() => setViewHistoryCustomer(c)}
                        className="px-2.5 py-1 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg transition-colors font-bold"
                        title="View Billing History"
                      >
                        {c.total_purchases} Bills
                      </button>
                    </td>
                    <td className="px-5 py-3.5 text-right font-extrabold text-blue-700 text-sm">
                      {formatINR(c.total_spent)}
                    </td>
                    <td className="px-5 py-3.5 text-center">
                      <div className="flex items-center justify-center space-x-1.5">
                        <button
                          onClick={() => openEditModal(c)}
                          className="p-1.5 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Edit Customer"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setCustomerToDelete(c)}
                          className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                          title="Delete Customer"
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

      {/* Customer Add / Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingCustomer ? 'Edit Customer Details' : 'Register New Customer'}
      >
        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block text-slate-700 font-bold mb-1">Customer / Organization Name *</label>
            <input
              type="text"
              required
              placeholder="e.g. Sri Vidya Higher Secondary School"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-hidden focus:border-blue-500 font-medium"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-700 font-bold mb-1">Phone Number *</label>
              <input
                type="tel"
                required
                placeholder="e.g. 9840123456"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-hidden focus:border-blue-500 font-mono"
              />
            </div>
            <div>
              <label className="block text-slate-700 font-bold mb-1">Email (Optional)</label>
              <input
                type="email"
                placeholder="e.g. admin@school.org"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-hidden focus:border-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-slate-700 font-bold mb-1">Address</label>
            <textarea
              rows={2}
              placeholder="Billing & delivery address"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-hidden focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-slate-700 font-bold mb-1">GSTIN (Optional)</label>
            <input
              type="text"
              placeholder="e.g. 33AAAAA0000A1Z5"
              value={gstin}
              onChange={(e) => setGstin(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-hidden focus:border-blue-500 font-mono uppercase"
            />
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
              {editingCustomer ? 'Update Customer' : 'Save Customer'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Customer Purchase History Modal */}
      <Modal
        isOpen={Boolean(viewHistoryCustomer)}
        onClose={() => setViewHistoryCustomer(null)}
        title={`Purchase History: ${viewHistoryCustomer?.name}`}
        maxWidth="2xl"
      >
        <div className="space-y-4 text-xs">
          <div className="p-3 bg-blue-50 rounded-xl flex justify-between items-center text-blue-900">
            <div>
              <p className="font-bold text-sm">{viewHistoryCustomer?.name}</p>
              <p className="text-[11px] text-blue-700">Phone: {viewHistoryCustomer?.phone}</p>
            </div>
            <div className="text-right">
              <span className="text-[10px] uppercase font-bold text-blue-600">Total Spent</span>
              <p className="text-lg font-extrabold text-blue-800">{formatINR(viewHistoryCustomer?.total_spent || 0)}</p>
            </div>
          </div>

          {customerPurchases.length === 0 ? (
            <p className="text-center py-6 text-slate-400">No past transactions found for this customer.</p>
          ) : (
            <div className="space-y-2 max-h-72 overflow-y-auto custom-scrollbar">
              {customerPurchases.map((sale) => (
                <div key={sale.id} className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
                  <div>
                    <span className="font-bold text-blue-700 font-mono">{sale.invoice_number}</span>
                    <p className="text-slate-500 text-[11px] mt-0.5">
                      {new Date(sale.created_at).toLocaleDateString('en-IN')} • {sale.items.length} item types
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="font-extrabold text-slate-900 text-sm">{formatINR(sale.total_amount)}</span>
                    <p className="text-[10px] text-slate-500 uppercase">{sale.payment_mode}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={Boolean(customerToDelete)}
        onClose={() => setCustomerToDelete(null)}
        onConfirm={handleDelete}
        title="Delete Customer Profile"
        message={`Are you sure you want to delete "${customerToDelete?.name}"?`}
        confirmLabel="Delete Customer"
        isDestructive
      />
    </div>
  );
};

