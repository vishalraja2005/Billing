import React, { useState, useEffect } from 'react';
import { Sidebar, NavigationTab } from './components/layout/Sidebar';
import { Navbar } from './components/layout/Navbar';
import { Dashboard } from './pages/Dashboard';
import { BillingPOS } from './pages/BillingPOS';
import { Products } from './pages/Products';
import { Categories } from './pages/Categories';
import { Inventory } from './pages/Inventory';
import { Customers } from './pages/Customers';
import { SalesHistory } from './pages/SalesHistory';
import { Purchases } from './pages/Purchases';
import { Expenses } from './pages/Expenses';
import { Reports } from './pages/Reports';
import { Settings } from './pages/Settings';
import { Login } from './pages/Login';
import { useAuth } from './contexts/AuthContext';
import { dataService } from './lib/dataService';
import { Shop } from './types/database';

export function App() {
  const { user, isLoading } = useAuth();
  const [currentTab, setCurrentTab] = useState<NavigationTab>('dashboard');
  const [shop, setShop] = useState<Shop | null>(null);
  const [lowStockCount, setLowStockCount] = useState<number>(0);
  const [refreshKey, setRefreshKey] = useState<number>(0);

  const loadInitialData = async () => {
    try {
      const [shopData, products] = await Promise.all([
        dataService.getShop(),
        dataService.getProducts(),
      ]);
      setShop(shopData);
      const threshold = shopData.low_stock_threshold || 10;
      const low = products.filter(p => p.current_stock <= (p.min_stock || threshold)).length;
      setLowStockCount(low);
    } catch (err) {
      console.error('Error initializing app data:', err);
    }
  };

  useEffect(() => {
    loadInitialData();
  }, [refreshKey]);

  // Global F1 keybinding to switch straight to POS Billing
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F1') {
        e.preventDefault();
        setCurrentTab('pos');
      }
    };
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, []);

  const handleRefresh = () => {
    setRefreshKey(prev => prev + 1);
  };

  if (isLoading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center space-y-3">
          <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-sm font-bold text-slate-600">Starting Stationery Billing Pro...</p>
        </div>
      </div>
    );
  }

  // If not logged in, render Login page
  if (!user) {
    return <Login />;
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex font-['Inter',sans-serif]">
      {/* Fixed Left Sidebar */}
      <Sidebar
        currentTab={currentTab}
        onSelectTab={(tab) => setCurrentTab(tab)}
        lowStockCount={lowStockCount}
      />

      {/* Main Content Area */}
      <div className="flex-1 ml-64 flex flex-col min-h-screen">
        {/* Fixed Top Navbar */}
        <Navbar
          shop={shop}
          onOpenPOS={() => setCurrentTab('pos')}
          lowStockCount={lowStockCount}
          onRefreshData={handleRefresh}
          onSelectTab={(tab) => setCurrentTab(tab)}
        />

        {/* Dynamic Page Container */}
        <main className="flex-1 mt-16 p-6 overflow-y-auto">
          {currentTab === 'dashboard' && (
            <Dashboard
              key={refreshKey}
              onOpenPOS={() => setCurrentTab('pos')}
              onSelectTab={(tab) => setCurrentTab(tab)}
              shop={shop}
            />
          )}

          {currentTab === 'pos' && (
            <BillingPOS
              key={refreshKey}
              shop={shop}
              onRefreshData={handleRefresh}
            />
          )}

          {currentTab === 'products' && (
            <Products key={refreshKey} />
          )}

          {currentTab === 'categories' && (
            <Categories key={refreshKey} />
          )}

          {currentTab === 'inventory' && (
            <Inventory key={refreshKey} shop={shop} />
          )}

          {currentTab === 'customers' && (
            <Customers key={refreshKey} />
          )}

          {currentTab === 'sales' && (
            <SalesHistory key={refreshKey} shop={shop} />
          )}

          {currentTab === 'purchases' && (
            <Purchases key={refreshKey} />
          )}

          {currentTab === 'expenses' && (
            <Expenses key={refreshKey} />
          )}

          {currentTab === 'reports' && (
            <Reports key={refreshKey} shop={shop} />
          )}

          {currentTab === 'settings' && (
            <Settings
              key={refreshKey}
              shop={shop}
              onUpdateShop={(updated) => {
                setShop(updated);
                handleRefresh();
              }}
            />
          )}
        </main>
      </div>
    </div>
  );
}

