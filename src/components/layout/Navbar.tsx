import React, { useState, useEffect } from 'react';
import { 
  Bell, 
  ShoppingCart, 
  Database, 
  CheckCircle, 
  RefreshCw, 
  UserCheck, 
  Clock,
  Sparkles
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { isSupabaseConfigured } from '../../lib/supabase';
import { Shop } from '../../types/database';

interface NavbarProps {
  shop: Shop | null;
  onOpenPOS: () => void;
  lowStockCount: number;
  onRefreshData: () => void;
  onSelectTab: (tab: any) => void;
}

export const Navbar: React.FC<NavbarProps> = ({ 
  shop, 
  onOpenPOS, 
  lowStockCount, 
  onRefreshData,
  onSelectTab 
}) => {
  const { user, role, switchDemoRole } = useAuth();
  const [time, setTime] = useState<string>('');

  useEffect(() => {
    const update = () => {
      setTime(new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, []);

  const isCloudOnline = isSupabaseConfigured();

  return (
    <header className="h-16 bg-white border-b border-slate-200 fixed top-0 right-0 left-64 z-20 px-6 flex items-center justify-between shadow-xs">
      {/* Left: Shop Name & Status */}
      <div className="flex items-center space-x-4">
        <div>
          <h2 className="text-base font-bold text-slate-800 tracking-tight flex items-center gap-2">
            {shop?.name || 'Stationery Shop'}
            <span className="text-xs font-normal px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
              {shop?.state || 'Retail Counter'}
            </span>
          </h2>
          <p className="text-xs text-slate-500 font-mono">
            {shop?.phone} {shop?.gstin ? `• GSTIN: ${shop.gstin}` : ''}
          </p>
        </div>
      </div>

      {/* Right: Actions, Live Clock, Database Badge & User Switcher */}
      <div className="flex items-center space-x-3">
        {/* Live Clock */}
        <div className="hidden md:flex items-center space-x-1.5 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-600 font-mono text-xs">
          <Clock className="w-3.5 h-3.5 text-blue-600" />
          <span>{time}</span>
        </div>

        {/* Database Mode Indicator */}
        <div 
          className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border ${
            isCloudOnline 
              ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
              : 'bg-blue-50 text-blue-700 border-blue-200'
          }`}
          title={isCloudOnline ? 'Connected to Supabase PostgreSQL' : 'Local Persistent Storage Mode (Offline Capable)'}
        >
          <Database className="w-3.5 h-3.5" />
          <span>{isCloudOnline ? 'Supabase Connected' : 'Local DB Active'}</span>
        </div>

        {/* Low Stock Warning Pill */}
        {lowStockCount > 0 && (
          <button
            onClick={() => onSelectTab('inventory')}
            className="flex items-center space-x-1.5 px-3 py-1.5 bg-amber-50 text-amber-700 border border-amber-200 rounded-lg text-xs font-semibold hover:bg-amber-100 transition-colors"
            title={`${lowStockCount} items have reached or fallen below minimum stock`}
          >
            <Bell className="w-3.5 h-3.5 animate-bounce" />
            <span>{lowStockCount} Low Stock</span>
          </button>
        )}

        {/* Demo Role Quick Switcher for Testing Admin vs Staff */}
        <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-xs">
          <button
            onClick={() => switchDemoRole('admin')}
            className={`px-2.5 py-1 rounded-md font-semibold transition-all ${
              role === 'admin' 
                ? 'bg-white text-blue-700 shadow-xs' 
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Admin
          </button>
          <button
            onClick={() => switchDemoRole('staff')}
            className={`px-2.5 py-1 rounded-md font-semibold transition-all ${
              role === 'staff' 
                ? 'bg-white text-blue-700 shadow-xs' 
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Staff
          </button>
        </div>

        {/* Refresh Data */}
        <button
          onClick={onRefreshData}
          className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg border border-slate-200 transition-colors"
          title="Refresh Data"
        >
          <RefreshCw className="w-4 h-4" />
        </button>

        {/* New Bill Button */}
        <button
          onClick={onOpenPOS}
          className="flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-all shadow-xs hover:shadow-sm active:scale-95"
        >
          <ShoppingCart className="w-4 h-4" />
          <span>New Bill</span>
        </button>
      </div>
    </header>
  );
};
