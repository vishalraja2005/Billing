import React from 'react';
import { 
  LayoutDashboard, 
  ShoppingCart, 
  Package, 
  Tag, 
  Boxes, 
  Users, 
  ReceiptText, 
  Truck, 
  Wallet, 
  BarChart3, 
  Settings, 
  LogOut,
  ShieldAlert,
  ChevronRight
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

export type NavigationTab = 
  | 'dashboard'
  | 'pos'
  | 'products'
  | 'categories'
  | 'inventory'
  | 'customers'
  | 'sales'
  | 'purchases'
  | 'expenses'
  | 'reports'
  | 'settings';

interface SidebarProps {
  currentTab: NavigationTab;
  onSelectTab: (tab: NavigationTab) => void;
  lowStockCount?: number;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentTab, onSelectTab, lowStockCount = 0 }) => {
  const { user, isAdmin, logout } = useAuth();

  const menuItems = [
    { id: 'dashboard' as NavigationTab, label: 'Dashboard', icon: LayoutDashboard },
    { id: 'pos' as NavigationTab, label: 'New Bill (POS)', icon: ShoppingCart, highlight: true },
    { id: 'products' as NavigationTab, label: 'Products', icon: Package },
    { id: 'categories' as NavigationTab, label: 'Categories', icon: Tag },
    { id: 'inventory' as NavigationTab, label: 'Inventory / Stock', icon: Boxes, badge: lowStockCount > 0 ? lowStockCount : undefined },
    { id: 'customers' as NavigationTab, label: 'Customers', icon: Users },
    { id: 'sales' as NavigationTab, label: 'Sales History', icon: ReceiptText },
    { id: 'purchases' as NavigationTab, label: 'Purchases', icon: Truck },
    { id: 'expenses' as NavigationTab, label: 'Expenses', icon: Wallet },
    { id: 'reports' as NavigationTab, label: 'Reports', icon: BarChart3, adminOnly: true },
    { id: 'settings' as NavigationTab, label: 'Settings', icon: Settings, adminOnly: true },
  ];

  return (
    <aside className="w-64 bg-white border-r border-slate-200 flex flex-col h-screen fixed left-0 top-0 z-30 select-none shadow-sm">
      {/* Brand & Logo */}
      <div className="h-16 px-5 border-b border-slate-200 flex items-center justify-between bg-blue-600 text-white">
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-lg bg-white/20 backdrop-blur-sm flex items-center justify-center font-bold text-white text-lg shadow-inner">
            SB
          </div>
          <div>
            <h1 className="font-bold text-base tracking-tight leading-tight">Stationery Billing</h1>
            <p className="text-[11px] text-blue-100 font-medium">POS & Inventory Pro</p>
          </div>
        </div>
      </div>

      {/* Navigation List */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto custom-scrollbar">
        {menuItems.map((item) => {
          if (item.adminOnly && !isAdmin) return null;
          const isActive = currentTab === item.id;
          const Icon = item.icon;

          if (item.highlight) {
            return (
              <button
                key={item.id}
                onClick={() => onSelectTab(item.id)}
                className={`w-full flex items-center justify-between px-3.5 py-3 rounded-xl font-semibold text-sm transition-all duration-150 mb-3 shadow-sm ${
                  isActive 
                    ? 'bg-blue-600 text-white shadow-blue-500/25 shadow-md' 
                    : 'bg-blue-50 text-blue-700 hover:bg-blue-100 hover:text-blue-800'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <Icon className={`w-5 h-5 ${isActive ? 'text-white' : 'text-blue-600'}`} />
                  <span>{item.label}</span>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${isActive ? 'bg-white/25 text-white' : 'bg-blue-200 text-blue-800'}`}>
                  F1
                </span>
              </button>
            );
          }

          return (
            <button
              key={item.id}
              onClick={() => onSelectTab(item.id)}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-blue-50 text-blue-700 font-semibold border-l-4 border-blue-600 pl-2.5'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <div className="flex items-center space-x-3">
                <Icon className={`w-5 h-5 ${isActive ? 'text-blue-600' : 'text-slate-400'}`} />
                <span>{item.label}</span>
              </div>
              {item.badge !== undefined && (
                <span className="bg-amber-100 text-amber-700 font-semibold text-[11px] px-2 py-0.5 rounded-full border border-amber-200">
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* User Status / Bottom Footer */}
      <div className="p-3 border-t border-slate-200 bg-slate-50">
        <div className="bg-white rounded-lg p-2.5 border border-slate-200 shadow-xs mb-2">
          <div className="flex items-center justify-between">
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-slate-800 truncate">{user?.full_name || 'Cashier'}</p>
              <div className="flex items-center space-x-1.5 mt-0.5">
                <span className={`inline-block w-2 h-2 rounded-full ${isAdmin ? 'bg-blue-600' : 'bg-emerald-500'}`}></span>
                <span className="text-[11px] text-slate-500 font-medium capitalize">{user?.role || 'Staff'} Account</span>
              </div>
            </div>
            <button
              onClick={() => logout()}
              title="Sign Out"
              className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
        <p className="text-center text-[10px] text-slate-400">Stationery Billing v1.0 • Supabase</p>
      </div>
    </aside>
  );
};

