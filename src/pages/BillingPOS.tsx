import React, { useState, useEffect, useRef } from 'react';
import { 
  Search, 
  Barcode, 
  Trash2, 
  Plus, 
  Minus, 
  ShoppingCart, 
  CreditCard, 
  QrCode, 
  Banknote, 
  UserPlus, 
  Printer, 
  CheckCircle2, 
  AlertCircle,
  X,
  User,
  ArrowRight
} from 'lucide-react';
import { dataService } from '../lib/dataService';
import { formatINR } from '../lib/pdfGenerator';
import { Product, Category, Customer, CartItem, PaymentMode, Sale, Shop } from '../types/database';
import { InvoiceModal } from '../components/billing/InvoiceModal';
import { useAuth } from '../contexts/AuthContext';

interface BillingPOSProps {
  shop: Shop | null;
  onRefreshData?: () => void;
}

export const BillingPOS: React.FC<BillingPOSProps> = ({ shop, onRefreshData }) => {
  const { user } = useAuth();
  
  // Data lists
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);

  // Search & Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [barcodeInput, setBarcodeInput] = useState('');

  // Cart State
  const [cart, setCart] = useState<CartItem[]>([]);
  const [billDiscountType, setBillDiscountType] = useState<'flat' | 'percent'>('flat');
  const [billDiscountValue, setBillDiscountValue] = useState<number>(0);

  // Customer selection
  const [isWalkIn, setIsWalkIn] = useState<boolean>(true);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [customerSearch, setCustomerSearch] = useState('');
  const [customerName, setCustomerName] = useState('Walk-in Customer');
  const [customerPhone, setCustomerPhone] = useState('');
  const [showAddCustomerModal, setShowAddCustomerModal] = useState(false);
  const [newCustName, setNewCustName] = useState('');
  const [newCustPhone, setNewCustPhone] = useState('');
  const [newCustAddress, setNewCustAddress] = useState('');

  // Payment State
  const [paymentMode, setPaymentMode] = useState<PaymentMode>('cash');
  const [cashTendered, setCashTendered] = useState<string>('');
  const [notes, setNotes] = useState('');

  // Checkout Status & Result
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [completedSale, setCompletedSale] = useState<Sale | null>(null);

  const barcodeInputRef = useRef<HTMLInputElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Load products, categories, customers
  const loadData = async () => {
    try {
      const [prods, cats, custs] = await Promise.all([
        dataService.getProducts(),
        dataService.getCategories(),
        dataService.getCustomers(),
      ]);
      setProducts(prods.filter(p => p.is_active));
      setCategories(cats);
      setCustomers(custs);
    } catch (err) {
      console.error('Error fetching billing data:', err);
    }
  };

  useEffect(() => {
    loadData();
    barcodeInputRef.current?.focus();
  }, []);

  // Keyboard shortcut listener (e.g. F2 to search, F4 for cash, Escape to clear)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F2') {
        e.preventDefault();
        searchInputRef.current?.focus();
      } else if (e.key === 'F3') {
        e.preventDefault();
        barcodeInputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Filter products by search and category
  const filteredProducts = products.filter(p => {
    const matchesCat = selectedCategory === 'all' || p.category_id === selectedCategory;
    const s = searchTerm.toLowerCase();
    const matchesSearch = 
      p.name.toLowerCase().includes(s) ||
      p.sku.toLowerCase().includes(s) ||
      (p.barcode && p.barcode.includes(s));
    return matchesCat && matchesSearch;
  });

  // Handle Barcode Scan / Enter
  const handleBarcodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!barcodeInput.trim()) return;

    const matched = products.find(p => 
      (p.barcode && p.barcode === barcodeInput.trim()) ||
      p.sku.toLowerCase() === barcodeInput.trim().toLowerCase()
    );

    if (matched) {
      addToCart(matched);
      setBarcodeInput('');
    } else {
      setErrorMessage(`No product found with barcode / SKU: ${barcodeInput}`);
      setTimeout(() => setErrorMessage(null), 3500);
    }
  };

  // Add product to cart
  const addToCart = (product: Product) => {
    setErrorMessage(null);
    const existingIndex = cart.findIndex(it => it.product.id === product.id);

    if (existingIndex !== -1) {
      const currentQty = cart[existingIndex].quantity;
      if (currentQty + 1 > product.current_stock) {
        setErrorMessage(`Only ${product.current_stock} units available for "${product.name}".`);
        setTimeout(() => setErrorMessage(null), 3000);
        return;
      }
      updateQuantity(existingIndex, currentQty + 1);
    } else {
      if (product.current_stock < 1) {
        setErrorMessage(`"${product.name}" is currently out of stock.`);
        setTimeout(() => setErrorMessage(null), 3000);
        return;
      }

      const unitPrice = product.selling_price;
      const taxRate = product.gst_rate || 0;
      const basePrice = unitPrice / (1 + (taxRate / 100));
      const taxAmount = unitPrice - basePrice;

      const newItem: CartItem = {
        product,
        quantity: 1,
        unit_price: unitPrice,
        discount_percent: 0,
        discount_amount: 0,
        tax_amount: Math.round(taxAmount * 100) / 100,
        total_amount: unitPrice,
      };

      setCart([newItem, ...cart]);
    }
  };

  // Update item quantity
  const updateQuantity = (index: number, newQty: number) => {
    if (newQty <= 0) {
      removeItem(index);
      return;
    }

    const item = cart[index];
    if (newQty > item.product.current_stock) {
      setErrorMessage(`Maximum available stock for "${item.product.name}" is ${item.product.current_stock}.`);
      setTimeout(() => setErrorMessage(null), 3000);
      return;
    }

    const updated = [...cart];
    const sub = item.unit_price * newQty;
    const disc = (sub * item.discount_percent) / 100;
    const afterDisc = sub - disc;
    const taxRate = item.product.gst_rate || 0;
    const tax = Math.round((afterDisc - (afterDisc / (1 + (taxRate / 100)))) * 100) / 100;

    updated[index] = {
      ...item,
      quantity: newQty,
      discount_amount: disc,
      tax_amount: tax,
      total_amount: Math.round(afterDisc * 100) / 100,
    };

    setCart(updated);
  };

  // Update item discount %
  const updateItemDiscount = (index: number, discountPercent: number) => {
    const item = cart[index];
    const updated = [...cart];
    const sub = item.unit_price * item.quantity;
    const disc = (sub * Math.min(100, Math.max(0, discountPercent))) / 100;
    const afterDisc = sub - disc;
    const taxRate = item.product.gst_rate || 0;
    const tax = Math.round((afterDisc - (afterDisc / (1 + (taxRate / 100)))) * 100) / 100;

    updated[index] = {
      ...item,
      discount_percent: discountPercent,
      discount_amount: disc,
      tax_amount: tax,
      total_amount: Math.round(afterDisc * 100) / 100,
    };

    setCart(updated);
  };

  // Remove item
  const removeItem = (index: number) => {
    setCart(cart.filter((_, i) => i !== index));
  };

  // Clear Cart
  const clearCart = () => {
    setCart([]);
    setBillDiscountValue(0);
    setCashTendered('');
    setNotes('');
    setErrorMessage(null);
  };

  // Financial Calculations
  const rawSubtotal = cart.reduce((sum, item) => sum + item.total_amount, 0);

  // Bill-level discount calculation
  let billDiscountAmount = 0;
  if (billDiscountType === 'percent') {
    billDiscountAmount = (rawSubtotal * Math.min(100, Math.max(0, billDiscountValue))) / 100;
  } else {
    billDiscountAmount = Math.min(rawSubtotal, Math.max(0, billDiscountValue));
  }

  const grandTotal = Math.max(0, Math.round((rawSubtotal - billDiscountAmount) * 100) / 100);

  // Total tax calculation
  const totalTax = cart.reduce((sum, item) => sum + item.tax_amount, 0);
  const cgstAmount = Math.round((totalTax / 2) * 100) / 100;
  const sgstAmount = Math.round((totalTax - cgstAmount) * 100) / 100;

  // Tender / Change returned
  const tenderedNum = parseFloat(cashTendered) || 0;
  const changeReturned = Math.max(0, tenderedNum - grandTotal);

  // Quick Customer Creation
  const handleCreateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustName.trim() || !newCustPhone.trim()) {
      alert('Please enter customer name and phone number');
      return;
    }
    try {
      const created = await dataService.addCustomer({
        name: newCustName.trim(),
        phone: newCustPhone.trim(),
        address: newCustAddress.trim(),
      });
      setCustomers([created, ...customers]);
      setSelectedCustomerId(created.id);
      setCustomerName(created.name);
      setCustomerPhone(created.phone);
      setIsWalkIn(false);
      setShowAddCustomerModal(false);
      setNewCustName('');
      setNewCustPhone('');
      setNewCustAddress('');
    } catch (err: any) {
      alert(err.message || 'Error creating customer');
    }
  };

  // Complete Sale & Checkout Transaction
  const handleCheckout = async () => {
    if (cart.length === 0) {
      setErrorMessage('Cart is empty. Add at least one product before billing.');
      return;
    }

    if (paymentMode === 'cash' && tenderedNum > 0 && tenderedNum < grandTotal) {
      setErrorMessage(`Tendered cash (₹${tenderedNum}) is less than grand total (₹${grandTotal}).`);
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const sale = await dataService.createSaleTransaction({
        customer_id: isWalkIn ? undefined : selectedCustomerId,
        customer_name: isWalkIn ? (customerName || 'Walk-in Customer') : customerName,
        customer_phone: customerPhone || undefined,
        items: cart,
        subtotal: rawSubtotal,
        discount_amount: billDiscountAmount,
        tax_amount: totalTax,
        cgst_amount: cgstAmount,
        sgst_amount: sgstAmount,
        total_amount: grandTotal,
        payment_mode: paymentMode,
        cash_tendered: paymentMode === 'cash' ? tenderedNum : undefined,
        change_returned: paymentMode === 'cash' && tenderedNum > 0 ? changeReturned : undefined,
        notes: notes || undefined,
        cashier_id: user?.id || 'cashier-01',
        cashier_name: user?.full_name || 'Cashier',
      });

      // Transaction completed successfully!
      setCompletedSale(sale);
      clearCart();
      loadData();
      if (onRefreshData) onRefreshData();
    } catch (err: any) {
      console.error('Checkout failed:', err);
      setErrorMessage(err.message || 'Failed to complete transaction. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-[calc(100vh-6rem)]">
      {/* LEFT COLUMN: PRODUCT SEARCH, CATEGORIES & PRODUCT GRID (7 COLS) */}
      <div className="lg:col-span-7 flex flex-col h-full space-y-4">
        {/* Barcode & Search Header */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {/* Barcode Scanner Input */}
            <form onSubmit={handleBarcodeSubmit} className="relative">
              <Barcode className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-blue-600" />
              <input
                ref={barcodeInputRef}
                type="text"
                placeholder="Scan Barcode / Enter SKU (F3)..."
                value={barcodeInput}
                onChange={(e) => setBarcodeInput(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 focus:border-blue-500 focus:bg-white rounded-xl text-xs font-mono font-medium outline-hidden transition-colors"
              />
            </form>

            {/* Keyword Search */}
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Search stationery by name or code (F2)..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 focus:border-blue-500 focus:bg-white rounded-xl text-xs outline-hidden transition-colors"
              />
            </div>
          </div>

          {/* Category Filter Pills */}
          <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 custom-scrollbar text-xs">
            <button
              onClick={() => setSelectedCategory('all')}
              className={`px-3 py-1.5 rounded-lg font-semibold whitespace-nowrap transition-colors ${
                selectedCategory === 'all'
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              All Categories
            </button>
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-3 py-1.5 rounded-lg font-semibold whitespace-nowrap transition-colors ${
                  selectedCategory === cat.id
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {cat.name}
              </button>
            ))}
          </div>
        </div>

        {/* Product Cards Grid */}
        <div className="flex-1 bg-white p-4 rounded-2xl border border-slate-200 shadow-xs overflow-y-auto custom-scrollbar">
          {filteredProducts.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-400 space-y-2">
              <Search className="w-10 h-10 stroke-1 text-slate-300" />
              <p className="text-sm font-medium">No stationery products found</p>
              <p className="text-xs text-slate-400">Try scanning a barcode or clearing your search filter</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3">
              {filteredProducts.map((p) => {
                const isOutOfStock = p.current_stock <= 0;
                const isLowStock = p.current_stock > 0 && p.current_stock <= p.min_stock;

                return (
                  <button
                    key={p.id}
                    disabled={isOutOfStock}
                    onClick={() => addToCart(p)}
                    className={`flex flex-col justify-between text-left p-3 rounded-xl border transition-all text-xs relative group ${
                      isOutOfStock
                        ? 'bg-slate-50 border-slate-200 opacity-60 cursor-not-allowed'
                        : 'bg-white border-slate-200 hover:border-blue-500 hover:shadow-md active:scale-98'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between gap-1 mb-1">
                        <span className="text-[10px] font-mono text-slate-400 uppercase truncate">
                          {p.sku}
                        </span>
                        <span
                          className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold ${
                            isOutOfStock
                              ? 'bg-red-100 text-red-700'
                              : isLowStock
                              ? 'bg-amber-100 text-amber-700'
                              : 'bg-emerald-50 text-emerald-700'
                          }`}
                        >
                          {isOutOfStock ? '0 Stock' : `${p.current_stock} ${p.unit}`}
                        </span>
                      </div>
                      <h4 className="font-semibold text-slate-900 line-clamp-2 leading-snug group-hover:text-blue-600 transition-colors">
                        {p.name}
                      </h4>
                    </div>

                    <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between">
                      <span className="font-extrabold text-sm text-blue-700">
                        ₹{p.selling_price.toFixed(2)}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        GST {p.gst_rate}%
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* RIGHT COLUMN: POS BILLING CART, TOTALS & CHECKOUT (5 COLS) */}
      <div className="lg:col-span-5 flex flex-col h-full bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {/* Customer Header */}
        <div className="p-4 border-b border-slate-200 bg-slate-50/75 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <User className="w-4 h-4 text-blue-600" />
              <span className="text-xs font-bold text-slate-800">Customer Details</span>
            </div>
            <div className="flex items-center space-x-2">
              <label className="flex items-center space-x-1.5 text-xs cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={isWalkIn}
                  onChange={(e) => {
                    setIsWalkIn(e.target.checked);
                    if (e.target.checked) {
                      setCustomerName('Walk-in Customer');
                      setCustomerPhone('');
                      setSelectedCustomerId('');
                    }
                  }}
                  className="rounded text-blue-600 focus:ring-0"
                />
                <span className="text-slate-600 font-medium">Walk-in</span>
              </label>

              {!isWalkIn && (
                <button
                  type="button"
                  onClick={() => setShowAddCustomerModal(true)}
                  className="p-1 rounded-md text-blue-600 hover:bg-blue-100 text-xs font-bold flex items-center"
                  title="Add New Customer"
                >
                  <UserPlus className="w-3.5 h-3.5 mr-1" />
                  <span>New</span>
                </button>
              )}
            </div>
          </div>

          {!isWalkIn ? (
            <div className="grid grid-cols-2 gap-2 pt-1">
              <select
                value={selectedCustomerId}
                onChange={(e) => {
                  const cust = customers.find(c => c.id === e.target.value);
                  if (cust) {
                    setSelectedCustomerId(cust.id);
                    setCustomerName(cust.name);
                    setCustomerPhone(cust.phone);
                  }
                }}
                className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium outline-hidden"
              >
                <option value="">Select Existing Customer</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.phone})
                  </option>
                ))}
              </select>
              <input
                type="text"
                placeholder="Customer Phone"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                className="px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs outline-hidden"
              />
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2 pt-1">
              <input
                type="text"
                placeholder="Customer Name (Optional)"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                className="px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs outline-hidden"
              />
              <input
                type="text"
                placeholder="Mobile (Optional)"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                className="px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs outline-hidden"
              />
            </div>
          )}
        </div>

        {/* Cart Items List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2.5 custom-scrollbar">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-400 space-y-2">
              <ShoppingCart className="w-10 h-10 stroke-1 text-slate-300" />
              <p className="text-xs font-semibold">Your billing cart is empty</p>
              <p className="text-[11px] text-slate-400">Click products or scan barcode to add</p>
            </div>
          ) : (
            cart.map((item, idx) => (
              <div
                key={idx}
                className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between text-xs hover:border-slate-300 transition-colors"
              >
                <div className="min-w-0 flex-1 mr-3">
                  <h5 className="font-bold text-slate-800 truncate">{item.product.name}</h5>
                  <div className="flex items-center space-x-2 mt-0.5 text-[11px] text-slate-500">
                    <span>₹{item.unit_price.toFixed(2)}</span>
                    <span>•</span>
                    <span>GST {item.product.gst_rate}%</span>
                    {item.discount_amount > 0 && (
                      <>
                        <span>•</span>
                        <span className="text-emerald-600 font-semibold">
                          -{item.discount_percent}%
                        </span>
                      </>
                    )}
                  </div>
                </div>

                {/* Qty +/- Controls */}
                <div className="flex items-center space-x-1.5">
                  <button
                    onClick={() => updateQuantity(idx, item.quantity - 1)}
                    className="p-1 rounded-md bg-white border border-slate-200 text-slate-600 hover:bg-slate-100"
                  >
                    <Minus className="w-3 h-3" />
                  </button>
                  <input
                    type="number"
                    min="1"
                    max={item.product.current_stock}
                    value={item.quantity}
                    onChange={(e) => updateQuantity(idx, parseInt(e.target.value) || 1)}
                    className="w-10 text-center font-bold text-slate-800 bg-white border border-slate-200 rounded-md py-0.5 text-xs outline-hidden"
                  />
                  <button
                    onClick={() => updateQuantity(idx, item.quantity + 1)}
                    className="p-1 rounded-md bg-white border border-slate-200 text-slate-600 hover:bg-slate-100"
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                </div>

                {/* Total & Delete */}
                <div className="text-right ml-3 flex items-center space-x-2">
                  <span className="font-extrabold text-sm text-slate-900 min-w-[60px]">
                    ₹{item.total_amount.toFixed(2)}
                  </span>
                  <button
                    onClick={() => removeItem(idx)}
                    className="p-1 text-slate-400 hover:text-red-600 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Error notification banner if any */}
        {errorMessage && (
          <div className="mx-4 p-2.5 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs flex items-center space-x-2 animate-in fade-in">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span className="font-medium">{errorMessage}</span>
          </div>
        )}

        {/* Checkout & Financial Calculations Footer */}
        <div className="p-4 border-t border-slate-200 bg-slate-50 space-y-3">
          {/* Bill Discount & Summary */}
          <div className="space-y-1.5 text-xs">
            <div className="flex justify-between text-slate-600">
              <span>Subtotal ({cart.reduce((s, it) => s + it.quantity, 0)} items):</span>
              <span className="font-semibold">₹{rawSubtotal.toFixed(2)}</span>
            </div>

            {/* Bill Level Discount */}
            <div className="flex items-center justify-between text-slate-600">
              <div className="flex items-center space-x-2">
                <span>Bill Discount:</span>
                <div className="inline-flex rounded-md border border-slate-200 bg-white text-[10px]">
                  <button
                    onClick={() => setBillDiscountType('flat')}
                    className={`px-1.5 py-0.5 font-bold ${billDiscountType === 'flat' ? 'bg-blue-600 text-white' : 'text-slate-600'}`}
                  >
                    ₹
                  </button>
                  <button
                    onClick={() => setBillDiscountType('percent')}
                    className={`px-1.5 py-0.5 font-bold ${billDiscountType === 'percent' ? 'bg-blue-600 text-white' : 'text-slate-600'}`}
                  >
                    %
                  </button>
                </div>
                <input
                  type="number"
                  min="0"
                  placeholder="0"
                  value={billDiscountValue || ''}
                  onChange={(e) => setBillDiscountValue(parseFloat(e.target.value) || 0)}
                  className="w-16 px-1.5 py-0.5 text-right font-medium bg-white border border-slate-200 rounded-md text-xs outline-hidden"
                />
              </div>
              <span className="font-semibold text-emerald-600">-₹{billDiscountAmount.toFixed(2)}</span>
            </div>

            {/* GST breakdown */}
            <div className="flex justify-between text-slate-500 text-[11px]">
              <span>Taxes (CGST: ₹{cgstAmount.toFixed(2)} + SGST: ₹{sgstAmount.toFixed(2)}):</span>
              <span>₹{totalTax.toFixed(2)}</span>
            </div>

            {/* Grand Total */}
            <div className="flex justify-between items-center text-base font-extrabold text-blue-800 pt-2 border-t border-slate-200">
              <span>Grand Total:</span>
              <span className="text-xl">₹{grandTotal.toFixed(2)}</span>
            </div>
          </div>

          {/* Payment Method Selector */}
          <div className="space-y-2">
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setPaymentMode('cash')}
                className={`py-2 rounded-xl text-xs font-bold flex items-center justify-center space-x-1.5 border transition-all ${
                  paymentMode === 'cash'
                    ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <Banknote className="w-4 h-4" />
                <span>Cash</span>
              </button>
              <button
                type="button"
                onClick={() => setPaymentMode('upi')}
                className={`py-2 rounded-xl text-xs font-bold flex items-center justify-center space-x-1.5 border transition-all ${
                  paymentMode === 'upi'
                    ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <QrCode className="w-4 h-4" />
                <span>UPI / QR</span>
              </button>
              <button
                type="button"
                onClick={() => setPaymentMode('card')}
                className={`py-2 rounded-xl text-xs font-bold flex items-center justify-center space-x-1.5 border transition-all ${
                  paymentMode === 'card'
                    ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <CreditCard className="w-4 h-4" />
                <span>Card</span>
              </button>
            </div>

            {/* Cash Tendered & Change Helper */}
            {paymentMode === 'cash' && (
              <div className="p-2.5 bg-white rounded-xl border border-slate-200 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-slate-600 font-medium">Cash Received:</span>
                  <div className="flex items-center space-x-1">
                    <span className="text-slate-400 font-bold">₹</span>
                    <input
                      type="number"
                      placeholder={grandTotal.toString()}
                      value={cashTendered}
                      onChange={(e) => setCashTendered(e.target.value)}
                      className="w-24 px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-right font-bold text-xs outline-hidden"
                    />
                  </div>
                </div>

                {/* Quick Cash Buttons */}
                <div className="flex items-center space-x-1">
                  <button
                    onClick={() => setCashTendered(grandTotal.toString())}
                    className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 rounded text-[10px] font-semibold text-slate-700"
                  >
                    Exact
                  </button>
                  {[100, 200, 500, 1000].map((val) => (
                    <button
                      key={val}
                      onClick={() => setCashTendered(val.toString())}
                      className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 rounded text-[10px] font-semibold text-slate-700"
                    >
                      ₹{val}
                    </button>
                  ))}
                </div>

                {tenderedNum > 0 && (
                  <div className="flex justify-between items-center pt-1 border-t border-slate-100 text-xs">
                    <span className="text-slate-600 font-medium">Change Due:</span>
                    <span className={`font-extrabold ${changeReturned >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                      ₹{changeReturned.toFixed(2)}
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Action Buttons: Clear Cart & Complete Sale */}
          <div className="flex items-center space-x-2 pt-1">
            <button
              type="button"
              onClick={clearCart}
              disabled={cart.length === 0 || isSubmitting}
              className="px-3 py-2.5 border border-slate-200 text-slate-600 hover:bg-slate-100 font-bold text-xs rounded-xl transition-colors disabled:opacity-50"
            >
              Clear
            </button>
            <button
              type="button"
              disabled={cart.length === 0 || isSubmitting}
              onClick={handleCheckout}
              className={`flex-1 py-3 px-4 rounded-xl text-white font-extrabold text-sm flex items-center justify-center space-x-2 transition-all shadow-md active:scale-98 ${
                isSubmitting
                  ? 'bg-blue-400 cursor-wait'
                  : cart.length === 0
                  ? 'bg-slate-300 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700 shadow-blue-500/25'
              }`}
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Processing Bill...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Complete Sale & Print (₹{grandTotal.toFixed(2)})</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* QUICK ADD CUSTOMER MODAL */}
      {showAddCustomerModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-sm p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-800">Register New Customer</h3>
              <button
                onClick={() => setShowAddCustomerModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleCreateCustomer} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-600 font-medium mb-1">Customer Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Ramesh Kumar"
                  value={newCustName}
                  onChange={(e) => setNewCustName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-hidden focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-slate-600 font-medium mb-1">Phone Number *</label>
                <input
                  type="tel"
                  required
                  placeholder="e.g. 9840123456"
                  value={newCustPhone}
                  onChange={(e) => setNewCustPhone(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-hidden focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-slate-600 font-medium mb-1">Address (Optional)</label>
                <textarea
                  rows={2}
                  placeholder="Street / Area address"
                  value={newCustAddress}
                  onChange={(e) => setNewCustAddress(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-hidden focus:border-blue-500"
                />
              </div>
              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddCustomerModal(false)}
                  className="px-3 py-2 text-slate-600 hover:bg-slate-100 rounded-xl font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-xs"
                >
                  Save & Select
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* COMPLETED INVOICE PREVIEW MODAL */}
      <InvoiceModal
        isOpen={Boolean(completedSale)}
        onClose={() => setCompletedSale(null)}
        sale={completedSale}
        shop={shop}
      />
    </div>
  );
};

