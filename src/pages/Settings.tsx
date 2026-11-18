import React, { useState } from 'react';
import { 
  Building2, 
  Receipt, 
  Printer, 
  Users, 
  Save, 
  ShieldCheck, 
  Database, 
  Download, 
  CheckCircle2, 
  AlertTriangle 
} from 'lucide-react';
import { dataService } from '../lib/dataService';
import { Shop, Profile, UserRole } from '../types/database';
import { INITIAL_PROFILES } from '../lib/demoData';
import { isSupabaseConfigured } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

interface SettingsProps {
  shop: Shop | null;
  onUpdateShop: (shop: Shop) => void;
}

export const Settings: React.FC<SettingsProps> = ({ shop, onUpdateShop }) => {
  const { user, isAdmin } = useAuth();

  // Settings State
  const [name, setName] = useState(shop?.name || '');
  const [ownerName, setOwnerName] = useState(shop?.owner_name || '');
  const [phone, setPhone] = useState(shop?.phone || '');
  const [email, setEmail] = useState(shop?.email || '');
  const [address, setAddress] = useState(shop?.address || '');
  const [gstin, setGstin] = useState(shop?.gstin || '');
  const [state, setState] = useState(shop?.state || 'Tamil Nadu');
  const [invoicePrefix, setInvoicePrefix] = useState(shop?.invoice_prefix || 'STN-2026-');
  const [invoiceFooter, setInvoiceFooter] = useState(shop?.invoice_footer || '');
  const [thermalPrinter, setThermalPrinter] = useState<boolean>(shop?.thermal_printer ?? true);
  const [lowStockThreshold, setLowStockThreshold] = useState<number>(shop?.low_stock_threshold || 10);

  const [savedSuccess, setSavedSuccess] = useState(false);
  const [usersList, setUsersList] = useState<Profile[]>(INITIAL_PROFILES);

  // New staff modal state
  const [showAddUser, setShowAddUser] = useState(false);
  const [newStaffEmail, setNewStaffEmail] = useState('');
  const [newStaffName, setNewStaffName] = useState('');
  const [newStaffRole, setNewStaffRole] = useState<UserRole>('staff');

  const handleSaveShopSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const updated = await dataService.updateShop({
        name: name.trim(),
        owner_name: ownerName.trim(),
        phone: phone.trim(),
        email: email.trim(),
        address: address.trim(),
        gstin: gstin.trim(),
        state: state.trim(),
        invoice_prefix: invoicePrefix.trim(),
        invoice_footer: invoiceFooter.trim(),
        thermal_printer: thermalPrinter,
        low_stock_threshold: lowStockThreshold,
      });
      onUpdateShop(updated);
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    } catch (err: any) {
      alert(err.message || 'Error saving settings');
    }
  };

  const handleCreateStaffUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStaffEmail.trim() || !newStaffName.trim()) return;

    const newProfile: Profile = {
      id: 'user-' + Date.now(),
      shop_id: shop?.id || 'shop-001',
      email: newStaffEmail.trim(),
      full_name: newStaffName.trim(),
      role: newStaffRole,
      created_at: new Date().toISOString(),
    };

    setUsersList([...usersList, newProfile]);
    setShowAddUser(false);
    setNewStaffEmail('');
    setNewStaffName('');
  };

  const handleExportDatabaseBackup = () => {
    const backupData = {
      timestamp: new Date().toISOString(),
      shop,
      products: localStorage.getItem('stationery_products'),
      categories: localStorage.getItem('stationery_categories'),
      customers: localStorage.getItem('stationery_customers'),
      sales: localStorage.getItem('stationery_sales'),
      expenses: localStorage.getItem('stationery_expenses'),
    };

    const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Stationery_Billing_Backup_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-slate-800 tracking-tight">System & Store Settings</h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Configure shop invoice branding, thermal printer defaults, tax GSTIN credentials, and staff permissions.
        </p>
      </div>

      {savedSuccess && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs font-bold flex items-center space-x-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>Shop settings successfully saved and applied to all billing invoices!</span>
        </div>
      )}

      {/* Main Settings Form */}
      <form onSubmit={handleSaveShopSettings} className="space-y-6">
        {/* Store Profile Card */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center space-x-2 pb-2 border-b border-slate-100">
            <Building2 className="w-5 h-5 text-blue-600" />
            <h3 className="text-sm font-bold text-slate-800">Store Profile & Legal Invoice Header</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block text-slate-700 font-bold mb-1">Shop / Business Name *</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-hidden focus:border-blue-500 font-bold text-slate-900"
              />
            </div>

            <div>
              <label className="block text-slate-700 font-bold mb-1">Owner / Manager Name</label>
              <input
                type="text"
                value={ownerName}
                onChange={(e) => setOwnerName(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-hidden focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-slate-700 font-bold mb-1">Shop Phone / Mobile *</label>
              <input
                type="text"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-hidden focus:border-blue-500 font-mono"
              />
            </div>

            <div>
              <label className="block text-slate-700 font-bold mb-1">Email Address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-hidden focus:border-blue-500"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-slate-700 font-bold mb-1">Showroom Address *</label>
              <textarea
                rows={2}
                required
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-hidden focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-slate-700 font-bold mb-1">GSTIN (Goods and Services Tax ID)</label>
              <input
                type="text"
                placeholder="e.g. 33AAAAA0000A1Z5"
                value={gstin}
                onChange={(e) => setGstin(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-hidden focus:border-blue-500 font-mono uppercase"
              />
            </div>

            <div>
              <label className="block text-slate-700 font-bold mb-1">State / Jurisdiction</label>
              <input
                type="text"
                value={state}
                onChange={(e) => setState(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-hidden focus:border-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Invoice & Printer Settings Card */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center space-x-2 pb-2 border-b border-slate-100">
            <Printer className="w-5 h-5 text-blue-600" />
            <h3 className="text-sm font-bold text-slate-800">Billing Counter & Printer Configurations</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block text-slate-700 font-bold mb-1">Invoice Prefix *</label>
              <input
                type="text"
                required
                value={invoicePrefix}
                onChange={(e) => setInvoicePrefix(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-hidden focus:border-blue-500 font-mono font-bold"
              />
              <p className="text-[11px] text-slate-400 mt-1">Example: STN-2026-0001</p>
            </div>

            <div>
              <label className="block text-slate-700 font-bold mb-1">Low Stock Warning Threshold (Qty)</label>
              <input
                type="number"
                min="1"
                required
                value={lowStockThreshold}
                onChange={(e) => setLowStockThreshold(parseInt(e.target.value) || 5)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-hidden focus:border-blue-500 font-bold"
              />
              <p className="text-[11px] text-slate-400 mt-1">Global alert limit for stationery items</p>
            </div>

            <div className="md:col-span-2">
              <label className="block text-slate-700 font-bold mb-1">Default Receipt Print Mode</label>
              <div className="flex items-center space-x-4 pt-1">
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="radio"
                    name="printer"
                    checked={thermalPrinter === true}
                    onChange={() => setThermalPrinter(true)}
                    className="text-blue-600 focus:ring-0"
                  />
                  <span className="font-semibold text-slate-800">80mm Thermal Receipt (POS Roll)</span>
                </label>
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="radio"
                    name="printer"
                    checked={thermalPrinter === false}
                    onChange={() => setThermalPrinter(false)}
                    className="text-blue-600 focus:ring-0"
                  />
                  <span className="font-semibold text-slate-800">A4 Full Page Tax Invoice</span>
                </label>
              </div>
            </div>

            <div className="md:col-span-2">
              <label className="block text-slate-700 font-bold mb-1">Invoice Footer / Return Policy</label>
              <textarea
                rows={2}
                value={invoiceFooter}
                onChange={(e) => setInvoiceFooter(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-hidden focus:border-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-end">
          <button
            type="submit"
            className="flex items-center space-x-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-md transition-all active:scale-98"
          >
            <Save className="w-4 h-4" />
            <span>Save Store Configurations</span>
          </button>
        </div>
      </form>

      {/* User Management & Roles Section */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
          <div className="flex items-center space-x-2">
            <Users className="w-5 h-5 text-blue-600" />
            <h3 className="text-sm font-bold text-slate-800">User Management & Permissions</h3>
          </div>
          <button
            type="button"
            onClick={() => setShowAddUser(true)}
            className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-xs rounded-xl transition-colors"
          >
            + Add Staff Account
          </button>
        </div>

        <div className="overflow-x-auto text-xs">
          <table className="w-full text-left">
            <thead className="bg-slate-50 text-slate-500 font-semibold uppercase text-[10px] tracking-wider border-b border-slate-200">
              <tr>
                <th className="px-4 py-2.5">User Full Name</th>
                <th className="px-4 py-2.5">Email</th>
                <th className="px-4 py-2.5">Role</th>
                <th className="px-4 py-2.5">Access Rights</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {usersList.map((u) => (
                <tr key={u.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-bold text-slate-800">{u.full_name}</td>
                  <td className="px-4 py-3 text-slate-600 font-mono">{u.email}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full font-bold uppercase text-[10px] ${
                      u.role === 'admin' ? 'bg-blue-100 text-blue-800' : 'bg-emerald-100 text-emerald-800'
                    }`}>
                      {u.role}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-500">
                    {u.role === 'admin' ? 'Full Access (POS, Catalog, Reports, Settings)' : 'POS Billing Counter & Customers only'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Database Backup & Export Section */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-3">
        <div className="flex items-center space-x-2 pb-2 border-b border-slate-100">
          <Database className="w-5 h-5 text-blue-600" />
          <h3 className="text-sm font-bold text-slate-800">Database Backup & Security</h3>
        </div>
        <p className="text-xs text-slate-600 leading-relaxed">
          Create complete JSON backups of your catalog, sales, categories, and customer records. When deployed with Supabase, PostgreSQL automatic daily backups and Point-In-Time-Recovery (PITR) are managed by Supabase cloud infrastructure.
        </p>
        <button
          onClick={handleExportDatabaseBackup}
          className="flex items-center space-x-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-xl transition-colors border border-slate-200"
        >
          <Download className="w-4 h-4 text-slate-600" />
          <span>Download Complete Store Database Backup (JSON)</span>
        </button>
      </div>

      {/* Add Staff User Modal */}
      {showAddUser && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 text-xs">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-sm p-6 space-y-4">
            <h3 className="text-sm font-bold text-slate-800">Add Staff Account</h3>
            <form onSubmit={handleCreateStaffUser} className="space-y-3">
              <div>
                <label className="block text-slate-600 font-bold mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Ramesh Cashier"
                  value={newStaffName}
                  onChange={(e) => setNewStaffName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-hidden focus:border-blue-500 font-medium"
                />
              </div>
              <div>
                <label className="block text-slate-600 font-bold mb-1">Email Address *</label>
                <input
                  type="email"
                  required
                  placeholder="e.g. ramesh@stationery.com"
                  value={newStaffEmail}
                  onChange={(e) => setNewStaffEmail(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-hidden focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-slate-600 font-bold mb-1">Role *</label>
                <select
                  value={newStaffRole}
                  onChange={(e: any) => setNewStaffRole(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-hidden focus:border-blue-500 font-bold"
                >
                  <option value="staff">Staff (POS Billing Counter)</option>
                  <option value="admin">Admin (Full Control)</option>
                </select>
              </div>
              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddUser(false)}
                  className="px-3 py-2 text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-xs"
                >
                  Add User
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

