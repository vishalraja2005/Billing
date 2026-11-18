import { 
  Shop, Product, Category, Customer, Supplier, Sale, Expense, StockMovement, 
  MonthlyReport, Purchase, CartItem, PaymentMode 
} from '../types/database';
import { 
  INITIAL_SHOP, INITIAL_PRODUCTS, INITIAL_CATEGORIES, INITIAL_CUSTOMERS, 
  INITIAL_SUPPLIERS, INITIAL_SALES, INITIAL_EXPENSES, INITIAL_STOCK_MOVEMENTS 
} from './demoData';
import { supabase, isSupabaseConfigured } from './supabase';

// Local storage keys for persistent offline/evaluation storage
const STORAGE_KEYS = {
  SHOP: 'stationery_shop',
  PRODUCTS: 'stationery_products',
  CATEGORIES: 'stationery_categories',
  CUSTOMERS: 'stationery_customers',
  SUPPLIERS: 'stationery_suppliers',
  SALES: 'stationery_sales',
  PURCHASES: 'stationery_purchases',
  EXPENSES: 'stationery_expenses',
  STOCK_MOVEMENTS: 'stationery_stock_movements',
  SYNC_QUEUE: 'stationery_sync_queue',
};

class DataService {
  private isProcessingSale = false;

  // Helper to get items from storage or fallback
  private getStored<T>(key: string, fallback: T): T {
    try {
      const data = localStorage.getItem(key);
      if (!data) {
        localStorage.setItem(key, JSON.stringify(fallback));
        return fallback;
      }
      return JSON.parse(data);
    } catch (e) {
      console.warn(`Error reading ${key} from storage:`, e);
      return fallback;
    }
  }

  private setStored<T>(key: string, data: T): void {
    try {
      localStorage.setItem(key, JSON.stringify(data));
    } catch (e) {
      console.error(`Error saving ${key} to storage:`, e);
    }
  }

  // ==========================================
  // SHOP & SETTINGS
  // ==========================================
  async getShop(): Promise<Shop> {
    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await supabase.from('shops').select('*').limit(1).single();
        if (!error && data) return data as Shop;
      } catch (err) {
        console.warn('Supabase fetch shop failed, falling back to local:', err);
      }
    }
    return this.getStored<Shop>(STORAGE_KEYS.SHOP, INITIAL_SHOP);
  }

  async updateShop(shopData: Partial<Shop>): Promise<Shop> {
    const current = await this.getShop();
    const updated = { ...current, ...shopData };
    if (isSupabaseConfigured()) {
      try {
        await supabase.from('shops').update(shopData).eq('id', current.id);
      } catch (err) {
        console.warn('Supabase update shop failed:', err);
      }
    }
    this.setStored(STORAGE_KEYS.SHOP, updated);
    return updated;
  }

  // ==========================================
  // CATEGORIES
  // ==========================================
  async getCategories(): Promise<Category[]> {
    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await supabase.from('categories').select('*').order('name');
        if (!error && data && data.length > 0) return data as Category[];
      } catch (err) {
        console.warn('Supabase categories error:', err);
      }
    }
    return this.getStored<Category[]>(STORAGE_KEYS.CATEGORIES, INITIAL_CATEGORIES);
  }

  async addCategory(name: string, description?: string): Promise<Category> {
    const categories = await this.getCategories();
    const exists = categories.some(c => c.name.toLowerCase() === name.trim().toLowerCase());
    if (exists) {
      throw new Error(`Category "${name}" already exists`);
    }

    const newCategory: Category = {
      id: 'cat-' + Date.now(),
      shop_id: 'shop-001',
      name: name.trim(),
      description: description?.trim() || '',
      is_default: false,
      created_at: new Date().toISOString(),
    };

    if (isSupabaseConfigured()) {
      try {
        await supabase.from('categories').insert(newCategory);
      } catch (err) {
        console.warn('Supabase insert category error:', err);
      }
    }

    const updated = [...categories, newCategory];
    this.setStored(STORAGE_KEYS.CATEGORIES, updated);
    return newCategory;
  }

  async updateCategory(id: string, name: string, description?: string): Promise<Category> {
    const categories = await this.getCategories();
    const index = categories.findIndex(c => c.id === id);
    if (index === -1) throw new Error('Category not found');

    const updatedCat = {
      ...categories[index],
      name: name.trim(),
      description: description?.trim(),
    };

    if (isSupabaseConfigured()) {
      try {
        await supabase.from('categories').update(updatedCat).eq('id', id);
      } catch (err) {
        console.warn('Supabase update category error:', err);
      }
    }

    categories[index] = updatedCat;
    this.setStored(STORAGE_KEYS.CATEGORIES, categories);
    return updatedCat;
  }

  async deleteCategory(id: string): Promise<void> {
    // Check if any product is using this category
    const products = await this.getProducts();
    const hasProducts = products.some(p => p.category_id === id);
    if (hasProducts) {
      throw new Error('Cannot delete category because it has products assigned to it. Please reassign or delete those products first.');
    }

    const categories = await this.getCategories();
    const filtered = categories.filter(c => c.id !== id);

    if (isSupabaseConfigured()) {
      try {
        await supabase.from('categories').delete().eq('id', id);
      } catch (err) {
        console.warn('Supabase delete category error:', err);
      }
    }

    this.setStored(STORAGE_KEYS.CATEGORIES, filtered);
  }

  // ==========================================
  // PRODUCTS
  // ==========================================
  async getProducts(): Promise<Product[]> {
    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await supabase.from('products').select('*').order('name');
        if (!error && data && data.length > 0) return data as Product[];
      } catch (err) {
        console.warn('Supabase products error:', err);
      }
    }
    return this.getStored<Product[]>(STORAGE_KEYS.PRODUCTS, INITIAL_PRODUCTS);
  }

  async addProduct(product: Omit<Product, 'id' | 'shop_id' | 'created_at' | 'updated_at'>): Promise<Product> {
    const products = await this.getProducts();
    
    // Validate uniqueness of SKU and barcode
    const skuExists = products.some(p => p.sku.toLowerCase() === product.sku.trim().toLowerCase());
    if (skuExists) {
      throw new Error(`Product SKU "${product.sku}" already exists. SKU must be unique.`);
    }

    if (product.barcode) {
      const trimmedBarcode = product.barcode.trim();
      const barcodeExists = products.some(p => p.barcode && p.barcode === trimmedBarcode);
      if (barcodeExists) {
        throw new Error(`Barcode "${trimmedBarcode}" is already registered to another item.`);
      }
    }

    // Attach category name if missing
    const categories = await this.getCategories();
    const cat = categories.find(c => c.id === product.category_id);

    const newProduct: Product = {
      ...product,
      id: 'prod-' + Date.now(),
      shop_id: 'shop-001',
      category_name: cat?.name || 'General',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    if (isSupabaseConfigured()) {
      try {
        await supabase.from('products').insert(newProduct);
      } catch (err) {
        console.warn('Supabase insert product error:', err);
      }
    }

    const updated = [newProduct, ...products];
    this.setStored(STORAGE_KEYS.PRODUCTS, updated);

    // Record initial stock movement
    await this.recordStockMovement({
      product_id: newProduct.id,
      product_name: newProduct.name,
      movement_type: 'initial',
      quantity_change: newProduct.current_stock,
      previous_stock: 0,
      new_stock: newProduct.current_stock,
      reason: 'Initial stock on product creation',
      created_by: 'Admin',
    });

    return newProduct;
  }

  async updateProduct(id: string, updates: Partial<Product>): Promise<Product> {
    const products = await this.getProducts();
    const index = products.findIndex(p => p.id === id);
    if (index === -1) throw new Error('Product not found');

    // Check SKU conflict
    if (updates.sku && updates.sku !== products[index].sku) {
      const skuConflict = products.some(p => p.id !== id && p.sku.toLowerCase() === updates.sku!.trim().toLowerCase());
      if (skuConflict) {
        throw new Error(`Product SKU "${updates.sku}" is already used by another product.`);
      }
    }

    const categories = await this.getCategories();
    const targetCatId = updates.category_id || products[index].category_id;
    const cat = categories.find(c => c.id === targetCatId);

    const updatedProd: Product = {
      ...products[index],
      ...updates,
      category_name: cat?.name || products[index].category_name,
      updated_at: new Date().toISOString(),
    };

    if (isSupabaseConfigured()) {
      try {
        await supabase.from('products').update(updatedProd).eq('id', id);
      } catch (err) {
        console.warn('Supabase update product error:', err);
      }
    }

    products[index] = updatedProd;
    this.setStored(STORAGE_KEYS.PRODUCTS, products);
    return updatedProd;
  }

  async deleteProduct(id: string): Promise<void> {
    // Check if item has been billed in sales
    const sales = await this.getSales();
    const hasSales = sales.some(s => s.items.some(item => item.product_id === id));
    if (hasSales) {
      throw new Error('This product cannot be deleted because it is recorded in historical sales invoices. You can set it to inactive instead.');
    }

    const products = await this.getProducts();
    const filtered = products.filter(p => p.id !== id);

    if (isSupabaseConfigured()) {
      try {
        await supabase.from('products').delete().eq('id', id);
      } catch (err) {
        console.warn('Supabase delete product error:', err);
      }
    }

    this.setStored(STORAGE_KEYS.PRODUCTS, filtered);
  }

  // ==========================================
  // BILLING & SALES (ATOMIC TRANSACTION)
  // ==========================================
  async getSales(): Promise<Sale[]> {
    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await supabase.from('sales').select('*, items:sale_items(*)').order('created_at', { ascending: false });
        if (!error && data && data.length > 0) return data as Sale[];
      } catch (err) {
        console.warn('Supabase sales error:', err);
      }
    }
    return this.getStored<Sale[]>(STORAGE_KEYS.SALES, INITIAL_SALES);
  }

  async generateNextInvoiceNumber(): Promise<string> {
    const shop = await this.getShop();
    const sales = await this.getSales();
    const prefix = shop.invoice_prefix || 'STN-2026-';
    
    // Find highest suffix number
    let maxNum = 0;
    sales.forEach(s => {
      if (s.invoice_number.startsWith(prefix)) {
        const numPart = parseInt(s.invoice_number.replace(prefix, ''), 10);
        if (!isNaN(numPart) && numPart > maxNum) {
          maxNum = numPart;
        }
      }
    });

    const nextNum = (maxNum + 1).toString().padStart(4, '0');
    return `${prefix}${nextNum}`;
  }

  async createSaleTransaction(payload: {
    customer_id?: string;
    customer_name: string;
    customer_phone?: string;
    customer_address?: string;
    items: CartItem[];
    subtotal: number;
    discount_amount: number;
    tax_amount: number;
    cgst_amount: number;
    sgst_amount: number;
    total_amount: number;
    payment_mode: PaymentMode;
    cash_tendered?: number;
    change_returned?: number;
    notes?: string;
    cashier_id: string;
    cashier_name: string;
  }): Promise<Sale> {
    // Prevent duplicate button clicks
    if (this.isProcessingSale) {
      throw new Error('A billing transaction is already in progress. Please wait.');
    }

    this.isProcessingSale = true;

    try {
      if (payload.items.length === 0) {
        throw new Error('Cart is empty. Please add items before checking out.');
      }

      // Fetch fresh products to verify stock
      const products = await this.getProducts();

      // Check stock availability for every cart item
      for (const item of payload.items) {
        const product = products.find(p => p.id === item.product.id);
        if (!product) {
          throw new Error(`Product "${item.product.name}" was not found in database.`);
        }
        if (product.current_stock < item.quantity) {
          throw new Error(`Insufficient stock for "${product.name}". Available: ${product.current_stock}, Requested: ${item.quantity}.`);
        }
      }

      const invoiceNumber = await this.generateNextInvoiceNumber();
      const shop = await this.getShop();

      const newSaleId = 'sale-' + Date.now();
      const saleRecord: Sale = {
        id: newSaleId,
        shop_id: shop.id,
        invoice_number: invoiceNumber,
        customer_id: payload.customer_id,
        customer_name: payload.customer_name || 'Walk-in Customer',
        customer_phone: payload.customer_phone,
        customer_address: payload.customer_address,
        subtotal: payload.subtotal,
        discount_amount: payload.discount_amount,
        tax_amount: payload.tax_amount,
        cgst_amount: payload.cgst_amount,
        sgst_amount: payload.sgst_amount,
        total_amount: payload.total_amount,
        payment_mode: payload.payment_mode,
        cash_tendered: payload.cash_tendered,
        change_returned: payload.change_returned,
        status: 'completed',
        notes: payload.notes,
        cashier_id: payload.cashier_id,
        cashier_name: payload.cashier_name,
        created_at: new Date().toISOString(),
        items: payload.items.map(i => ({
          product_id: i.product.id,
          product_name: i.product.name,
          sku: i.product.sku,
          unit: i.product.unit,
          quantity: i.quantity,
          purchase_price: i.product.purchase_price,
          unit_price: i.unit_price,
          discount_percent: i.discount_percent,
          discount_amount: i.discount_amount,
          gst_rate: i.product.gst_rate,
          tax_amount: i.tax_amount,
          total_amount: i.total_amount,
        })),
      };

      // Atomic Stock Deduction & Movement Logging
      for (const item of payload.items) {
        const prodIndex = products.findIndex(p => p.id === item.product.id);
        if (prodIndex !== -1) {
          const prevStock = products[prodIndex].current_stock;
          const nextStock = prevStock - item.quantity;
          products[prodIndex].current_stock = nextStock;
          products[prodIndex].updated_at = new Date().toISOString();

          // Log movement
          await this.recordStockMovement({
            product_id: item.product.id,
            product_name: item.product.name,
            movement_type: 'sale',
            quantity_change: -item.quantity,
            previous_stock: prevStock,
            new_stock: nextStock,
            reason: `Sold in invoice ${invoiceNumber}`,
            reference_id: invoiceNumber,
            created_by: payload.cashier_name,
          });
        }
      }

      // Save updated products
      this.setStored(STORAGE_KEYS.PRODUCTS, products);

      // Save new sale
      const allSales = await this.getSales();
      this.setStored(STORAGE_KEYS.SALES, [saleRecord, ...allSales]);

      // If customer exists, update customer total spent
      if (payload.customer_id) {
        const customers = await this.getCustomers();
        const custIndex = customers.findIndex(c => c.id === payload.customer_id);
        if (custIndex !== -1) {
          customers[custIndex].total_purchases += 1;
          customers[custIndex].total_spent += payload.total_amount;
          this.setStored(STORAGE_KEYS.CUSTOMERS, customers);
        }
      }

      // If live Supabase is configured, execute remote RPC
      if (isSupabaseConfigured()) {
        try {
          await supabase.rpc('create_sale_transaction', {
            p_shop_id: shop.id,
            p_invoice_number: invoiceNumber,
            p_customer_id: payload.customer_id || null,
            p_customer_name: payload.customer_name,
            p_customer_phone: payload.customer_phone || null,
            p_customer_address: payload.customer_address || null,
            p_subtotal: payload.subtotal,
            p_discount_amount: payload.discount_amount,
            p_tax_amount: payload.tax_amount,
            p_cgst_amount: payload.cgst_amount,
            p_sgst_amount: payload.sgst_amount,
            p_total_amount: payload.total_amount,
            p_payment_mode: payload.payment_mode,
            p_cash_tendered: payload.cash_tendered || 0,
            p_change_returned: payload.change_returned || 0,
            p_cashier_id: payload.cashier_id,
            p_cashier_name: payload.cashier_name,
            p_notes: payload.notes || null,
            p_items: saleRecord.items,
          });
        } catch (supaErr) {
          console.warn('Supabase remote transaction error (saved locally):', supaErr);
        }
      }

      return saleRecord;
    } finally {
      this.isProcessingSale = false;
    }
  }

  // ==========================================
  // INVENTORY & STOCK MOVEMENTS
  // ==========================================
  async getStockMovements(): Promise<StockMovement[]> {
    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await supabase.from('stock_movements').select('*').order('created_at', { ascending: false });
        if (!error && data && data.length > 0) return data as StockMovement[];
      } catch (err) {
        console.warn('Supabase stock movements error:', err);
      }
    }
    return this.getStored<StockMovement[]>(STORAGE_KEYS.STOCK_MOVEMENTS, INITIAL_STOCK_MOVEMENTS);
  }

  async recordStockMovement(movement: Omit<StockMovement, 'id' | 'shop_id' | 'created_at'>): Promise<void> {
    const movements = this.getStored<StockMovement[]>(STORAGE_KEYS.STOCK_MOVEMENTS, INITIAL_STOCK_MOVEMENTS);
    const newMovement: StockMovement = {
      ...movement,
      id: 'sm-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
      shop_id: 'shop-001',
      created_at: new Date().toISOString(),
    };
    this.setStored(STORAGE_KEYS.STOCK_MOVEMENTS, [newMovement, ...movements]);

    if (isSupabaseConfigured()) {
      try {
        await supabase.from('stock_movements').insert(newMovement);
      } catch (err) {
        console.warn('Supabase movement insert error:', err);
      }
    }
  }

  async adjustStock(productId: string, newStock: number, reason: string, adjustedBy: string): Promise<Product> {
    const products = await this.getProducts();
    const index = products.findIndex(p => p.id === productId);
    if (index === -1) throw new Error('Product not found');

    const previousStock = products[index].current_stock;
    const difference = newStock - previousStock;

    if (newStock < 0) {
      throw new Error('Stock quantity cannot be negative.');
    }

    products[index].current_stock = newStock;
    products[index].updated_at = new Date().toISOString();
    this.setStored(STORAGE_KEYS.PRODUCTS, products);

    await this.recordStockMovement({
      product_id: productId,
      product_name: products[index].name,
      movement_type: 'adjustment',
      quantity_change: difference,
      previous_stock: previousStock,
      new_stock: newStock,
      reason: reason || 'Manual stock count adjustment',
      created_by: adjustedBy,
    });

    return products[index];
  }

  // ==========================================
  // CUSTOMERS
  // ==========================================
  async getCustomers(): Promise<Customer[]> {
    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await supabase.from('customers').select('*').order('name');
        if (!error && data && data.length > 0) return data as Customer[];
      } catch (err) {
        console.warn('Supabase customers error:', err);
      }
    }
    return this.getStored<Customer[]>(STORAGE_KEYS.CUSTOMERS, INITIAL_CUSTOMERS);
  }

  async addCustomer(customer: Omit<Customer, 'id' | 'shop_id' | 'total_purchases' | 'total_spent' | 'created_at'>): Promise<Customer> {
    const customers = await this.getCustomers();
    const newCustomer: Customer = {
      ...customer,
      id: 'cust-' + Date.now(),
      shop_id: 'shop-001',
      total_purchases: 0,
      total_spent: 0,
      created_at: new Date().toISOString(),
    };

    if (isSupabaseConfigured()) {
      try {
        await supabase.from('customers').insert(newCustomer);
      } catch (err) {
        console.warn('Supabase insert customer error:', err);
      }
    }

    const updated = [newCustomer, ...customers];
    this.setStored(STORAGE_KEYS.CUSTOMERS, updated);
    return newCustomer;
  }

  async updateCustomer(id: string, updates: Partial<Customer>): Promise<Customer> {
    const customers = await this.getCustomers();
    const index = customers.findIndex(c => c.id === id);
    if (index === -1) throw new Error('Customer not found');

    const updatedCust = { ...customers[index], ...updates };
    customers[index] = updatedCust;

    if (isSupabaseConfigured()) {
      try {
        await supabase.from('customers').update(updatedCust).eq('id', id);
      } catch (err) {
        console.warn('Supabase update customer error:', err);
      }
    }

    this.setStored(STORAGE_KEYS.CUSTOMERS, customers);
    return updatedCust;
  }

  async deleteCustomer(id: string): Promise<void> {
    const customers = await this.getCustomers();
    const filtered = customers.filter(c => c.id !== id);
    this.setStored(STORAGE_KEYS.CUSTOMERS, filtered);

    if (isSupabaseConfigured()) {
      try {
        await supabase.from('customers').delete().eq('id', id);
      } catch (err) {
        console.warn('Supabase delete customer error:', err);
      }
    }
  }

  // ==========================================
  // SUPPLIERS & PURCHASES
  // ==========================================
  async getSuppliers(): Promise<Supplier[]> {
    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await supabase.from('suppliers').select('*').order('name');
        if (!error && data && data.length > 0) return data as Supplier[];
      } catch (err) {
        console.warn('Supabase suppliers error:', err);
      }
    }
    return this.getStored<Supplier[]>(STORAGE_KEYS.SUPPLIERS, INITIAL_SUPPLIERS);
  }

  async addSupplier(supplier: Omit<Supplier, 'id' | 'shop_id' | 'created_at'>): Promise<Supplier> {
    const suppliers = await this.getSuppliers();
    const newSupplier: Supplier = {
      ...supplier,
      id: 'sup-' + Date.now(),
      shop_id: 'shop-001',
      created_at: new Date().toISOString(),
    };

    if (isSupabaseConfigured()) {
      try {
        await supabase.from('suppliers').insert(newSupplier);
      } catch (err) {
        console.warn('Supabase insert supplier error:', err);
      }
    }

    const updated = [newSupplier, ...suppliers];
    this.setStored(STORAGE_KEYS.SUPPLIERS, updated);
    return newSupplier;
  }

  async getPurchases(): Promise<Purchase[]> {
    return this.getStored<Purchase[]>(STORAGE_KEYS.PURCHASES, []);
  }

  async createPurchase(purchaseData: {
    supplier_id: string;
    supplier_name: string;
    purchase_invoice_no: string;
    notes?: string;
    items: { product_id: string; product_name: string; quantity: number; unit_cost: number; total_cost: number }[];
    total_amount: number;
    created_by: string;
  }): Promise<Purchase> {
    const products = await this.getProducts();

    const newPurchase: Purchase = {
      id: 'pur-' + Date.now(),
      shop_id: 'shop-001',
      purchase_invoice_no: purchaseData.purchase_invoice_no,
      supplier_id: purchaseData.supplier_id,
      supplier_name: purchaseData.supplier_name,
      total_amount: purchaseData.total_amount,
      payment_status: 'paid',
      notes: purchaseData.notes,
      created_at: new Date().toISOString(),
      items: purchaseData.items,
    };

    // Update stock and cost prices
    for (const item of purchaseData.items) {
      const pIdx = products.findIndex(p => p.id === item.product_id);
      if (pIdx !== -1) {
        const prev = products[pIdx].current_stock;
        const nxt = prev + item.quantity;
        products[pIdx].current_stock = nxt;
        products[pIdx].purchase_price = item.unit_cost;
        products[pIdx].updated_at = new Date().toISOString();

        await this.recordStockMovement({
          product_id: item.product_id,
          product_name: item.product_name,
          movement_type: 'purchase',
          quantity_change: item.quantity,
          previous_stock: prev,
          new_stock: nxt,
          reason: `Stock added via purchase bill #${purchaseData.purchase_invoice_no}`,
          reference_id: purchaseData.purchase_invoice_no,
          created_by: purchaseData.created_by,
        });
      }
    }

    this.setStored(STORAGE_KEYS.PRODUCTS, products);

    const existingPurchases = await this.getPurchases();
    this.setStored(STORAGE_KEYS.PURCHASES, [newPurchase, ...existingPurchases]);

    return newPurchase;
  }

  // ==========================================
  // EXPENSES
  // ==========================================
  async getExpenses(): Promise<Expense[]> {
    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await supabase.from('expenses').select('*').order('expense_date', { ascending: false });
        if (!error && data && data.length > 0) return data as Expense[];
      } catch (err) {
        console.warn('Supabase expenses error:', err);
      }
    }
    return this.getStored<Expense[]>(STORAGE_KEYS.EXPENSES, INITIAL_EXPENSES);
  }

  async addExpense(expense: Omit<Expense, 'id' | 'shop_id' | 'created_at'>): Promise<Expense> {
    const expenses = await this.getExpenses();
    const newExpense: Expense = {
      ...expense,
      id: 'exp-' + Date.now(),
      shop_id: 'shop-001',
      created_at: new Date().toISOString(),
    };

    if (isSupabaseConfigured()) {
      try {
        await supabase.from('expenses').insert(newExpense);
      } catch (err) {
        console.warn('Supabase insert expense error:', err);
      }
    }

    const updated = [newExpense, ...expenses];
    this.setStored(STORAGE_KEYS.EXPENSES, updated);
    return newExpense;
  }

  async updateExpense(id: string, updates: Partial<Expense>): Promise<Expense> {
    const expenses = await this.getExpenses();
    const index = expenses.findIndex(e => e.id === id);
    if (index === -1) throw new Error('Expense not found');

    const updatedExp = { ...expenses[index], ...updates };
    expenses[index] = updatedExp;

    if (isSupabaseConfigured()) {
      try {
        await supabase.from('expenses').update(updatedExp).eq('id', id);
      } catch (err) {
        console.warn('Supabase update expense error:', err);
      }
    }

    this.setStored(STORAGE_KEYS.EXPENSES, expenses);
    return updatedExp;
  }

  async deleteExpense(id: string): Promise<void> {
    const expenses = await this.getExpenses();
    const filtered = expenses.filter(e => e.id !== id);
    this.setStored(STORAGE_KEYS.EXPENSES, filtered);

    if (isSupabaseConfigured()) {
      try {
        await supabase.from('expenses').delete().eq('id', id);
      } catch (err) {
        console.warn('Supabase delete expense error:', err);
      }
    }
  }

  // ==========================================
  // REAL FINANCIAL & INVENTORY ANALYTICS
  // ==========================================
  async getDashboardMetrics() {
    const sales = await this.getSales();
    const products = await this.getProducts();
    const customers = await this.getCustomers();
    const expenses = await this.getExpenses();
    const shop = await this.getShop();

    const todayStr = new Date().toISOString().split('T')[0];
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();

    // 1. Today's sales
    const todaySales = sales.filter(s => s.created_at.startsWith(todayStr));
    const todaySalesTotal = todaySales.reduce((sum, s) => sum + s.total_amount, 0);

    // 2. Monthly sales
    const monthlySales = sales.filter(s => {
      const d = new Date(s.created_at);
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    });
    const monthlySalesTotal = monthlySales.reduce((sum, s) => sum + s.total_amount, 0);

    // 3. Low stock items
    const threshold = shop.low_stock_threshold || 10;
    const lowStockProducts = products.filter(p => p.current_stock <= (p.min_stock || threshold));

    // 4. Inventory Valuation
    const totalInventoryCost = products.reduce((sum, p) => sum + (p.purchase_price * p.current_stock), 0);
    const totalInventoryRetail = products.reduce((sum, p) => sum + (p.selling_price * p.current_stock), 0);

    // 5. Cost of Goods Sold & Profit calculations
    let monthlyCOGS = 0;
    monthlySales.forEach(sale => {
      sale.items.forEach(item => {
        monthlyCOGS += (item.purchase_price * item.quantity);
      });
    });

    const monthlyGrossProfit = monthlySalesTotal - monthlyCOGS;

    // Monthly expenses
    const currentMonthExpenses = expenses.filter(e => {
      const d = new Date(e.expense_date);
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    }).reduce((sum, e) => sum + e.amount, 0);

    const monthlyNetProfit = monthlyGrossProfit - currentMonthExpenses;

    // 6. Best selling products
    const productSoldMap: Record<string, { name: string; quantity: number; revenue: number; category: string }> = {};
    sales.forEach(s => {
      s.items.forEach(item => {
        if (!productSoldMap[item.product_id]) {
          productSoldMap[item.product_id] = {
            name: item.product_name,
            quantity: 0,
            revenue: 0,
            category: item.sku,
          };
        }
        productSoldMap[item.product_id].quantity += item.quantity;
        productSoldMap[item.product_id].revenue += item.total_amount;
      });
    });

    const bestSelling = Object.values(productSoldMap)
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 5);

    // 7. Last 6 months sales chart data
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const monthlyTrend = [];
    for (let i = 5; i >= 0; i--) {
      const targetDate = new Date(currentYear, currentMonth - i, 1);
      const mIdx = targetDate.getMonth();
      const yVal = targetDate.getFullYear();
      const label = `${monthNames[mIdx]} ${yVal.toString().substring(2)}`;

      const mSales = sales.filter(s => {
        const d = new Date(s.created_at);
        return d.getMonth() === mIdx && d.getFullYear() === yVal;
      });

      const totalRevenue = mSales.reduce((sum, s) => sum + s.total_amount, 0);
      const totalBills = mSales.length;

      // Approximate or calculate COGS
      let cogs = 0;
      mSales.forEach(s => s.items.forEach(it => cogs += (it.purchase_price * it.quantity)));
      
      const mExpenses = expenses.filter(e => {
        const d = new Date(e.expense_date);
        return d.getMonth() === mIdx && d.getFullYear() === yVal;
      }).reduce((sum, e) => sum + e.amount, 0);

      const netProfit = (totalRevenue - cogs) - mExpenses;

      monthlyTrend.push({
        month: label,
        sales: Math.round(totalRevenue),
        profit: Math.round(netProfit),
        bills: totalBills,
      });
    }

    return {
      todaySalesTotal,
      monthlySalesTotal,
      totalBillsCount: sales.length,
      totalProductsCount: products.length,
      lowStockCount: lowStockProducts.length,
      totalCustomersCount: customers.length,
      monthlyGrossProfit,
      monthlyNetProfit,
      totalInventoryCost,
      totalInventoryRetail,
      recentSales: sales.slice(0, 7),
      bestSelling,
      monthlyTrend,
      lowStockProducts,
    };
  }

  // ==========================================
  // DETAILED REPORTS GENERATOR
  // ==========================================
  async getDailyReport(targetDate: string) {
    const sales = await this.getSales();
    const daySales = sales.filter(s => s.created_at.startsWith(targetDate));

    let totalDiscounts = 0;
    let totalTax = 0;
    let totalItemsCount = 0;
    const paymentBreakdown: Record<string, number> = { cash: 0, upi: 0, card: 0, split: 0 };

    daySales.forEach(s => {
      totalDiscounts += s.discount_amount;
      totalTax += s.tax_amount;
      paymentBreakdown[s.payment_mode] = (paymentBreakdown[s.payment_mode] || 0) + s.total_amount;
      s.items.forEach(it => {
        totalItemsCount += it.quantity;
      });
    });

    const totalSales = daySales.reduce((sum, s) => sum + s.total_amount, 0);

    return {
      date: targetDate,
      totalSales,
      totalBills: daySales.length,
      totalItemsSold: totalItemsCount,
      totalDiscounts,
      totalTax,
      paymentBreakdown,
      bills: daySales,
    };
  }

  async getMonthlyFinancialReport(year: number, month: number): Promise<MonthlyReport> {
    const sales = await this.getSales();
    const purchases = await this.getPurchases();
    const expenses = await this.getExpenses();
    const shop = await this.getShop();

    const mSales = sales.filter(s => {
      const d = new Date(s.created_at);
      return d.getFullYear() === year && d.getMonth() === month;
    });

    const totalSales = mSales.reduce((sum, s) => sum + s.total_amount, 0);
    const totalBills = mSales.length;

    let totalItemsSold = 0;
    let cogs = 0;
    mSales.forEach(s => {
      s.items.forEach(it => {
        totalItemsSold += it.quantity;
        cogs += (it.purchase_price * it.quantity);
      });
    });

    const mPurchases = purchases.filter(p => {
      const d = new Date(p.created_at);
      return d.getFullYear() === year && d.getMonth() === month;
    });
    const totalPurchases = mPurchases.reduce((sum, p) => sum + p.total_amount, 0);

    const mExpenses = expenses.filter(e => {
      const d = new Date(e.expense_date);
      return d.getFullYear() === year && d.getMonth() === month;
    });
    const totalExpenses = mExpenses.reduce((sum, e) => sum + e.amount, 0);

    const grossProfit = totalSales - cogs;
    const netProfit = grossProfit - totalExpenses;

    return {
      id: `rep-${year}-${month + 1}`,
      shop_id: shop.id,
      year,
      month: month + 1,
      total_sales: totalSales,
      total_bills: totalBills,
      total_items_sold: totalItemsSold,
      total_purchases: totalPurchases,
      total_expenses: totalExpenses,
      cogs,
      gross_profit: grossProfit,
      net_profit: netProfit,
      generated_at: new Date().toISOString(),
    };
  }
}

export const dataService = new DataService();
