export type UserRole = 'admin' | 'staff';

export interface Profile {
  id: string;
  shop_id: string;
  email: string;
  full_name: string;
  role: UserRole;
  created_at: string;
}

export interface Shop {
  id: string;
  name: string;
  owner_name: string;
  email: string;
  phone: string;
  address: string;
  gstin: string;
  state: string;
  currency: string;
  invoice_prefix: string;
  invoice_footer: string;
  thermal_printer: boolean;
  low_stock_threshold: number;
  created_at: string;
}

export interface Category {
  id: string;
  shop_id: string;
  name: string;
  description?: string;
  is_default: boolean;
  created_at: string;
}

export interface Product {
  id: string;
  shop_id: string;
  category_id: string;
  category_name?: string;
  name: string;
  sku: string;
  barcode?: string;
  purchase_price: number;
  selling_price: number;
  current_stock: number;
  min_stock: number;
  unit: string;
  gst_rate: number; // 0, 5, 12, 18, 28
  hsn_code?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Customer {
  id: string;
  shop_id: string;
  name: string;
  phone: string;
  email?: string;
  address?: string;
  gstin?: string;
  total_purchases: number;
  total_spent: number;
  created_at: string;
}

export interface Supplier {
  id: string;
  shop_id: string;
  name: string;
  contact_person: string;
  phone: string;
  email?: string;
  address?: string;
  gstin?: string;
  created_at: string;
}

export type PaymentMode = 'cash' | 'upi' | 'card' | 'split';
export type SaleStatus = 'completed' | 'cancelled' | 'refunded';

export interface SaleItem {
  id?: string;
  sale_id?: string;
  product_id: string;
  product_name: string;
  sku: string;
  unit: string;
  quantity: number;
  purchase_price: number;
  unit_price: number;
  discount_percent: number;
  discount_amount: number;
  gst_rate: number;
  tax_amount: number;
  total_amount: number;
}

export interface Sale {
  id: string;
  shop_id: string;
  invoice_number: string;
  customer_id?: string;
  customer_name: string;
  customer_phone?: string;
  customer_address?: string;
  subtotal: number;
  discount_amount: number;
  tax_amount: number;
  cgst_amount: number;
  sgst_amount: number;
  total_amount: number;
  payment_mode: PaymentMode;
  cash_tendered?: number;
  change_returned?: number;
  status: SaleStatus;
  notes?: string;
  cashier_id: string;
  cashier_name: string;
  created_at: string;
  items: SaleItem[];
}

export interface PurchaseItem {
  id?: string;
  purchase_id?: string;
  product_id: string;
  product_name: string;
  quantity: number;
  unit_cost: number;
  total_cost: number;
}

export interface Purchase {
  id: string;
  shop_id: string;
  purchase_invoice_no: string;
  supplier_id: string;
  supplier_name: string;
  total_amount: number;
  payment_status: 'paid' | 'pending' | 'partial';
  notes?: string;
  created_at: string;
  items: PurchaseItem[];
}

export interface Expense {
  id: string;
  shop_id: string;
  category: string;
  amount: number;
  expense_date: string;
  description: string;
  payment_mode: 'cash' | 'upi' | 'card' | 'bank_transfer';
  reference_no?: string;
  created_at: string;
}

export type StockMovementType = 'sale' | 'purchase' | 'adjustment' | 'return' | 'initial';

export interface StockMovement {
  id: string;
  shop_id: string;
  product_id: string;
  product_name: string;
  movement_type: StockMovementType;
  quantity_change: number; // negative for sale, positive for purchase/increase
  previous_stock: number;
  new_stock: number;
  reason: string;
  reference_id?: string;
  created_by: string;
  created_at: string;
}

export interface MonthlyReport {
  id: string;
  shop_id: string;
  year: number;
  month: number;
  total_sales: number;
  total_bills: number;
  total_items_sold: number;
  total_purchases: number;
  total_expenses: number;
  cogs: number; // Cost of Goods Sold
  gross_profit: number; // total_sales - cogs
  net_profit: number; // gross_profit - total_expenses
  generated_at: string;
}

export interface CartItem {
  product: Product;
  quantity: number;
  unit_price: number;
  discount_percent: number;
  discount_amount: number;
  tax_amount: number;
  total_amount: number;
}
