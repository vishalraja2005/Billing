-- ====================================================================
-- STATIONERY BILLING & INVENTORY MANAGEMENT SYSTEM
-- PostgreSQL Database Schema with Row Level Security (RLS)
-- ====================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. SHOPS TABLE
CREATE TABLE IF NOT EXISTS public.shops (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    owner_name VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(50) NOT NULL,
    address TEXT NOT NULL,
    gstin VARCHAR(50),
    state VARCHAR(100) DEFAULT 'Tamil Nadu',
    currency VARCHAR(10) DEFAULT 'INR',
    invoice_prefix VARCHAR(20) DEFAULT 'INV-',
    invoice_footer TEXT DEFAULT 'Thank you for shopping with us! Please visit again.',
    thermal_printer BOOLEAN DEFAULT true,
    low_stock_threshold INTEGER DEFAULT 10,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. USER PROFILES TABLE (Supabase Auth link)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    shop_id UUID NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('admin', 'staff')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. CATEGORIES TABLE
CREATE TABLE IF NOT EXISTS public.categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    shop_id UUID NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    is_default BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(shop_id, name)
);

-- 4. PRODUCTS TABLE
CREATE TABLE IF NOT EXISTS public.products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    shop_id UUID NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
    category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
    name VARCHAR(255) NOT NULL,
    sku VARCHAR(100) NOT NULL,
    barcode VARCHAR(100),
    purchase_price NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (purchase_price >= 0),
    selling_price NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (selling_price >= 0),
    current_stock INTEGER NOT NULL DEFAULT 0,
    min_stock INTEGER NOT NULL DEFAULT 5 CHECK (min_stock >= 0),
    unit VARCHAR(50) NOT NULL DEFAULT 'pcs',
    gst_rate NUMERIC(5, 2) NOT NULL DEFAULT 0.00 CHECK (gst_rate IN (0, 5, 12, 18, 28)),
    hsn_code VARCHAR(50),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(shop_id, sku)
);

-- 5. CUSTOMERS TABLE
CREATE TABLE IF NOT EXISTS public.customers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    shop_id UUID NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(50) NOT NULL,
    email VARCHAR(255),
    address TEXT,
    gstin VARCHAR(50),
    total_purchases INTEGER DEFAULT 0,
    total_spent NUMERIC(12, 2) DEFAULT 0.00,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 6. SUPPLIERS TABLE
CREATE TABLE IF NOT EXISTS public.suppliers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    shop_id UUID NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    contact_person VARCHAR(255),
    phone VARCHAR(50) NOT NULL,
    email VARCHAR(255),
    address TEXT,
    gstin VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 7. SALES (INVOICES) TABLE
CREATE TABLE IF NOT EXISTS public.sales (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    shop_id UUID NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
    invoice_number VARCHAR(100) NOT NULL,
    customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
    customer_name VARCHAR(255) NOT NULL DEFAULT 'Walk-in Customer',
    customer_phone VARCHAR(50),
    customer_address TEXT,
    subtotal NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    discount_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    tax_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    cgst_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    sgst_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    total_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    payment_mode VARCHAR(20) NOT NULL CHECK (payment_mode IN ('cash', 'upi', 'card', 'split')),
    cash_tendered NUMERIC(12, 2) DEFAULT 0.00,
    change_returned NUMERIC(12, 2) DEFAULT 0.00,
    status VARCHAR(20) NOT NULL DEFAULT 'completed' CHECK (status IN ('completed', 'cancelled', 'refunded')),
    notes TEXT,
    cashier_id UUID REFERENCES auth.users(id),
    cashier_name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(shop_id, invoice_number)
);

-- 8. SALE ITEMS TABLE
CREATE TABLE IF NOT EXISTS public.sale_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sale_id UUID NOT NULL REFERENCES public.sales(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
    product_name VARCHAR(255) NOT NULL,
    sku VARCHAR(100) NOT NULL,
    unit VARCHAR(50) NOT NULL DEFAULT 'pcs',
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    purchase_price NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    unit_price NUMERIC(12, 2) NOT NULL CHECK (unit_price >= 0),
    discount_percent NUMERIC(5, 2) DEFAULT 0.00,
    discount_amount NUMERIC(12, 2) DEFAULT 0.00,
    gst_rate NUMERIC(5, 2) DEFAULT 0.00,
    tax_amount NUMERIC(12, 2) DEFAULT 0.00,
    total_amount NUMERIC(12, 2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 9. PURCHASES TABLE
CREATE TABLE IF NOT EXISTS public.purchases (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    shop_id UUID NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
    purchase_invoice_no VARCHAR(100) NOT NULL,
    supplier_id UUID NOT NULL REFERENCES public.suppliers(id) ON DELETE RESTRICT,
    supplier_name VARCHAR(255) NOT NULL,
    total_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    payment_status VARCHAR(20) DEFAULT 'paid' CHECK (payment_status IN ('paid', 'pending', 'partial')),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 10. PURCHASE ITEMS TABLE
CREATE TABLE IF NOT EXISTS public.purchase_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    purchase_id UUID NOT NULL REFERENCES public.purchases(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
    product_name VARCHAR(255) NOT NULL,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    unit_cost NUMERIC(12, 2) NOT NULL CHECK (unit_cost >= 0),
    total_cost NUMERIC(12, 2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 11. EXPENSES TABLE
CREATE TABLE IF NOT EXISTS public.expenses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    shop_id UUID NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
    category VARCHAR(100) NOT NULL,
    amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
    expense_date DATE NOT NULL,
    description TEXT NOT NULL,
    payment_mode VARCHAR(30) DEFAULT 'cash',
    reference_no VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 12. STOCK MOVEMENTS (AUDIT TRAIL)
CREATE TABLE IF NOT EXISTS public.stock_movements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    shop_id UUID NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    product_name VARCHAR(255) NOT NULL,
    movement_type VARCHAR(30) NOT NULL CHECK (movement_type IN ('sale', 'purchase', 'adjustment', 'return', 'initial')),
    quantity_change INTEGER NOT NULL,
    previous_stock INTEGER NOT NULL,
    new_stock INTEGER NOT NULL,
    reason TEXT NOT NULL,
    reference_id VARCHAR(100),
    created_by VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 13. MONTHLY REPORTS TABLE
CREATE TABLE IF NOT EXISTS public.monthly_reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    shop_id UUID NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
    year INTEGER NOT NULL,
    month INTEGER NOT NULL CHECK (month BETWEEN 1 AND 12),
    total_sales NUMERIC(14, 2) DEFAULT 0.00,
    total_bills INTEGER DEFAULT 0,
    total_items_sold INTEGER DEFAULT 0,
    total_purchases NUMERIC(14, 2) DEFAULT 0.00,
    total_expenses NUMERIC(14, 2) DEFAULT 0.00,
    cogs NUMERIC(14, 2) DEFAULT 0.00,
    gross_profit NUMERIC(14, 2) DEFAULT 0.00,
    net_profit NUMERIC(14, 2) DEFAULT 0.00,
    generated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(shop_id, year, month)
);

-- ====================================================================
-- INDEXES FOR PERFORMANCE
-- ====================================================================
CREATE INDEX IF NOT EXISTS idx_products_shop ON public.products(shop_id);
CREATE INDEX IF NOT EXISTS idx_products_barcode ON public.products(barcode);
CREATE INDEX IF NOT EXISTS idx_products_sku ON public.products(sku);
CREATE INDEX IF NOT EXISTS idx_sales_shop_date ON public.sales(shop_id, created_at);
CREATE INDEX IF NOT EXISTS idx_sales_invoice ON public.sales(invoice_number);
CREATE INDEX IF NOT EXISTS idx_sale_items_sale ON public.sale_items(sale_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_prod ON public.stock_movements(product_id);
CREATE INDEX IF NOT EXISTS idx_expenses_date ON public.expenses(shop_id, expense_date);

-- ====================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ====================================================================
ALTER TABLE public.shops ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sale_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.monthly_reports ENABLE ROW LEVEL SECURITY;

-- Helper function to get current user shop_id
CREATE OR REPLACE FUNCTION public.get_user_shop_id()
RETURNS UUID AS $$
  SELECT shop_id FROM public.profiles WHERE id = auth.uid() LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER;

-- Shop isolation policies
CREATE POLICY "Users can access their shop" ON public.shops
    FOR ALL USING (id = public.get_user_shop_id());

CREATE POLICY "Users can access their profiles" ON public.profiles
    FOR ALL USING (shop_id = public.get_user_shop_id());

CREATE POLICY "Users can access categories in their shop" ON public.categories
    FOR ALL USING (shop_id = public.get_user_shop_id());

CREATE POLICY "Users can access products in their shop" ON public.products
    FOR ALL USING (shop_id = public.get_user_shop_id());

CREATE POLICY "Users can access customers in their shop" ON public.customers
    FOR ALL USING (shop_id = public.get_user_shop_id());

CREATE POLICY "Users can access suppliers in their shop" ON public.suppliers
    FOR ALL USING (shop_id = public.get_user_shop_id());

CREATE POLICY "Users can access sales in their shop" ON public.sales
    FOR ALL USING (shop_id = public.get_user_shop_id());

CREATE POLICY "Users can access sale_items of their shop" ON public.sale_items
    FOR ALL USING (
        sale_id IN (SELECT id FROM public.sales WHERE shop_id = public.get_user_shop_id())
    );

CREATE POLICY "Users can access purchases in their shop" ON public.purchases
    FOR ALL USING (shop_id = public.get_user_shop_id());

CREATE POLICY "Users can access purchase_items of their shop" ON public.purchase_items
    FOR ALL USING (
        purchase_id IN (SELECT id FROM public.purchases WHERE shop_id = public.get_user_shop_id())
    );

CREATE POLICY "Users can access expenses in their shop" ON public.expenses
    FOR ALL USING (shop_id = public.get_user_shop_id());

CREATE POLICY "Users can access stock_movements of their shop" ON public.stock_movements
    FOR ALL USING (shop_id = public.get_user_shop_id());

CREATE POLICY "Users can access monthly_reports of their shop" ON public.monthly_reports
    FOR ALL USING (shop_id = public.get_user_shop_id());

-- ====================================================================
-- ATOMIC TRANSACTION FUNCTION: CREATE SALE & DEDUCT STOCK
-- ====================================================================
CREATE OR REPLACE FUNCTION public.create_sale_transaction(
    p_shop_id UUID,
    p_invoice_number VARCHAR,
    p_customer_id UUID,
    p_customer_name VARCHAR,
    p_customer_phone VARCHAR,
    p_customer_address TEXT,
    p_subtotal NUMERIC,
    p_discount_amount NUMERIC,
    p_tax_amount NUMERIC,
    p_cgst_amount NUMERIC,
    p_sgst_amount NUMERIC,
    p_total_amount NUMERIC,
    p_payment_mode VARCHAR,
    p_cash_tendered NUMERIC,
    p_change_returned NUMERIC,
    p_cashier_id UUID,
    p_cashier_name VARCHAR,
    p_notes TEXT,
    p_items JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_sale_id UUID;
    v_item RECORD;
    v_product RECORD;
    v_new_stock INTEGER;
    v_result JSONB;
BEGIN
    -- Check for duplicate invoice
    IF EXISTS (SELECT 1 FROM public.sales WHERE shop_id = p_shop_id AND invoice_number = p_invoice_number) THEN
        RAISE EXCEPTION 'Invoice number % already exists', p_invoice_number;
    END IF;

    -- Verify stock for all items first
    FOR v_item IN SELECT * FROM jsonb_to_recordset(p_items) AS x(
        product_id UUID,
        product_name VARCHAR,
        quantity INTEGER
    )
    LOOP
        SELECT * INTO v_product FROM public.products 
        WHERE id = v_item.product_id AND shop_id = p_shop_id FOR UPDATE;
        
        IF NOT FOUND THEN
            RAISE EXCEPTION 'Product % not found', v_item.product_name;
        END IF;

        IF v_product.current_stock < v_item.quantity THEN
            RAISE EXCEPTION 'Insufficient stock for product %. Available: %, Requested: %', 
                v_product.name, v_product.current_stock, v_item.quantity;
        END IF;
    END LOOP;

    -- Insert sale record
    INSERT INTO public.sales (
        shop_id,
        invoice_number,
        customer_id,
        customer_name,
        customer_phone,
        customer_address,
        subtotal,
        discount_amount,
        tax_amount,
        cgst_amount,
        sgst_amount,
        total_amount,
        payment_mode,
        cash_tendered,
        change_returned,
        status,
        notes,
        cashier_id,
        cashier_name
    ) VALUES (
        p_shop_id,
        p_invoice_number,
        p_customer_id,
        p_customer_name,
        p_customer_phone,
        p_customer_address,
        p_subtotal,
        p_discount_amount,
        p_tax_amount,
        p_cgst_amount,
        p_sgst_amount,
        p_total_amount,
        p_payment_mode,
        p_cash_tendered,
        p_change_returned,
        'completed',
        p_notes,
        p_cashier_id,
        p_cashier_name
    ) RETURNING id INTO v_sale_id;

    -- Process sale items and decrement stock
    FOR v_item IN SELECT * FROM jsonb_to_recordset(p_items) AS x(
        product_id UUID,
        product_name VARCHAR,
        sku VARCHAR,
        unit VARCHAR,
        quantity INTEGER,
        purchase_price NUMERIC,
        unit_price NUMERIC,
        discount_percent NUMERIC,
        discount_amount NUMERIC,
        gst_rate NUMERIC,
        tax_amount NUMERIC,
        total_amount NUMERIC
    )
    LOOP
        -- Insert sale item
        INSERT INTO public.sale_items (
            sale_id,
            product_id,
            product_name,
            sku,
            unit,
            quantity,
            purchase_price,
            unit_price,
            discount_percent,
            discount_amount,
            gst_rate,
            tax_amount,
            total_amount
        ) VALUES (
            v_sale_id,
            v_item.product_id,
            v_item.product_name,
            v_item.sku,
            COALESCE(v_item.unit, 'pcs'),
            v_item.quantity,
            v_item.purchase_price,
            v_item.unit_price,
            COALESCE(v_item.discount_percent, 0),
            COALESCE(v_item.discount_amount, 0),
            COALESCE(v_item.gst_rate, 0),
            COALESCE(v_item.tax_amount, 0),
            v_item.total_amount
        );

        -- Fetch current stock
        SELECT current_stock INTO v_product FROM public.products WHERE id = v_item.product_id;
        v_new_stock := v_product.current_stock - v_item.quantity;

        -- Update product stock
        UPDATE public.products 
        SET current_stock = v_new_stock, updated_at = now()
        WHERE id = v_item.product_id;

        -- Audit trail stock movement
        INSERT INTO public.stock_movements (
            shop_id,
            product_id,
            product_name,
            movement_type,
            quantity_change,
            previous_stock,
            new_stock,
            reason,
            reference_id,
            created_by
        ) VALUES (
            p_shop_id,
            v_item.product_id,
            v_item.product_name,
            'sale',
            -v_item.quantity,
            v_product.current_stock,
            v_new_stock,
            'Sold in invoice ' || p_invoice_number,
            p_invoice_number,
            p_cashier_name
        );
    END LOOP;

    -- Update customer total purchases and spending if customer_id is provided
    IF p_customer_id IS NOT NULL THEN
        UPDATE public.customers
        SET total_purchases = total_purchases + 1,
            total_spent = total_spent + p_total_amount
        WHERE id = p_customer_id;
    END IF;

    -- Return JSON response
    v_result := jsonb_build_object(
        'success', true,
        'sale_id', v_sale_id,
        'invoice_number', p_invoice_number
    );

    RETURN v_result;
END;
$$;

-- ====================================================================
-- ATOMIC TRANSACTION FUNCTION: RECORD PURCHASE & INCREASE STOCK
-- ====================================================================
CREATE OR REPLACE FUNCTION public.create_purchase_transaction(
    p_shop_id UUID,
    p_purchase_invoice_no VARCHAR,
    p_supplier_id UUID,
    p_supplier_name VARCHAR,
    p_total_amount NUMERIC,
    p_payment_status VARCHAR,
    p_notes TEXT,
    p_items JSONB,
    p_created_by VARCHAR
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_purchase_id UUID;
    v_item RECORD;
    v_product RECORD;
    v_new_stock INTEGER;
BEGIN
    INSERT INTO public.purchases (
        shop_id,
        purchase_invoice_no,
        supplier_id,
        supplier_name,
        total_amount,
        payment_status,
        notes
    ) VALUES (
        p_shop_id,
        p_purchase_invoice_no,
        p_supplier_id,
        p_supplier_name,
        p_total_amount,
        p_payment_status,
        p_notes
    ) RETURNING id INTO v_purchase_id;

    FOR v_item IN SELECT * FROM jsonb_to_recordset(p_items) AS x(
        product_id UUID,
        product_name VARCHAR,
        quantity INTEGER,
        unit_cost NUMERIC,
        total_cost NUMERIC
    )
    LOOP
        INSERT INTO public.purchase_items (
            purchase_id,
            product_id,
            product_name,
            quantity,
            unit_cost,
            total_cost
        ) VALUES (
            v_purchase_id,
            v_item.product_id,
            v_item.product_name,
            v_item.quantity,
            v_item.unit_cost,
            v_item.total_cost
        );

        -- Update stock and purchase price
        SELECT current_stock INTO v_product FROM public.products WHERE id = v_item.product_id;
        v_new_stock := v_product.current_stock + v_item.quantity;

        UPDATE public.products
        SET current_stock = v_new_stock,
            purchase_price = v_item.unit_cost,
            updated_at = now()
        WHERE id = v_item.product_id;

        -- Record movement
        INSERT INTO public.stock_movements (
            shop_id,
            product_id,
            product_name,
            movement_type,
            quantity_change,
            previous_stock,
            new_stock,
            reason,
            reference_id,
            created_by
        ) VALUES (
            p_shop_id,
            v_item.product_id,
            v_item.product_name,
            'purchase',
            v_item.quantity,
            v_product.current_stock,
            v_new_stock,
            'Stock added via purchase bill #' || p_purchase_invoice_no,
            p_purchase_invoice_no,
            p_created_by
        );
    END LOOP;

    RETURN jsonb_build_object(
        'success', true,
        'purchase_id', v_purchase_id
    );
END;
$$;

-- ====================================================================
-- SCHEDULED MONTHLY REPORT GENERATION FUNCTION
-- ====================================================================
CREATE OR REPLACE FUNCTION public.generate_monthly_financial_report(
    p_shop_id UUID,
    p_year INTEGER,
    p_month INTEGER
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_start_date TIMESTAMP;
    v_end_date TIMESTAMP;
    v_sales NUMERIC := 0.00;
    v_bills INTEGER := 0;
    v_items_sold INTEGER := 0;
    v_purchases NUMERIC := 0.00;
    v_expenses NUMERIC := 0.00;
    v_cogs NUMERIC := 0.00;
    v_gross_profit NUMERIC := 0.00;
    v_net_profit NUMERIC := 0.00;
BEGIN
    v_start_date := make_timestamp(p_year, p_month, 1, 0, 0, 0);
    v_end_date := (v_start_date + interval '1 month');

    -- Aggregate sales
    SELECT 
        COALESCE(SUM(total_amount), 0),
        COUNT(id)
    INTO v_sales, v_bills
    FROM public.sales
    WHERE shop_id = p_shop_id 
      AND status = 'completed'
      AND created_at >= v_start_date 
      AND created_at < v_end_date;

    -- Aggregate items sold & Cost of Goods Sold (COGS)
    SELECT 
        COALESCE(SUM(quantity), 0),
        COALESCE(SUM(quantity * purchase_price), 0)
    INTO v_items_sold, v_cogs
    FROM public.sale_items si
    JOIN public.sales s ON si.sale_id = s.id
    WHERE s.shop_id = p_shop_id
      AND s.status = 'completed'
      AND s.created_at >= v_start_date
      AND s.created_at < v_end_date;

    -- Aggregate purchases
    SELECT COALESCE(SUM(total_amount), 0)
    INTO v_purchases
    FROM public.purchases
    WHERE shop_id = p_shop_id
      AND created_at >= v_start_date
      AND created_at < v_end_date;

    -- Aggregate expenses
    SELECT COALESCE(SUM(amount), 0)
    INTO v_expenses
    FROM public.expenses
    WHERE shop_id = p_shop_id
      AND expense_date >= v_start_date::date
      AND expense_date < v_end_date::date;

    v_gross_profit := v_sales - v_cogs;
    v_net_profit := v_gross_profit - v_expenses;

    -- Upsert into monthly_reports
    INSERT INTO public.monthly_reports (
        shop_id, year, month, total_sales, total_bills,
        total_items_sold, total_purchases, total_expenses,
        cogs, gross_profit, net_profit, generated_at
    ) VALUES (
        p_shop_id, p_year, p_month, v_sales, v_bills,
        v_items_sold, v_purchases, v_expenses,
        v_cogs, v_gross_profit, v_net_profit, now()
    )
    ON CONFLICT (shop_id, year, month)
    DO UPDATE SET
        total_sales = EXCLUDED.total_sales,
        total_bills = EXCLUDED.total_bills,
        total_items_sold = EXCLUDED.total_items_sold,
        total_purchases = EXCLUDED.total_purchases,
        total_expenses = EXCLUDED.total_expenses,
        cogs = EXCLUDED.cogs,
        gross_profit = EXCLUDED.gross_profit,
        net_profit = EXCLUDED.net_profit,
        generated_at = now();

    RETURN jsonb_build_object(
        'success', true,
        'year', p_year,
        'month', p_month,
        'total_sales', v_sales,
        'gross_profit', v_gross_profit,
        'net_profit', v_net_profit
    );
END;
$$;

