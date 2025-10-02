-- Create missing tables for the new category system

-- 1. Product Categories Table
CREATE TABLE IF NOT EXISTS product_categories (
    category_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL,
    category_name VARCHAR(255) NOT NULL,
    category_description TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(organization_id, category_name)
);

-- 2. Product Category Mappings Table
CREATE TABLE IF NOT EXISTS product_category_mappings (
    mapping_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL,
    category_id UUID NOT NULL REFERENCES product_categories(category_id),
    
    -- What appears on invoices (exact match only)
    variant_product_name VARCHAR(500) NOT NULL,
    variant_product_code VARCHAR(100),
    variant_supplier_name VARCHAR(255),
    
    -- Metadata
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    UNIQUE(organization_id, variant_product_name, variant_product_code, variant_supplier_name)
);

-- 3. Pending Category Mappings Table
CREATE TABLE IF NOT EXISTS pending_category_mappings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL,
    
    -- What we found on the invoice
    variant_product_name VARCHAR(500) NOT NULL,
    variant_product_code VARCHAR(100),
    variant_supplier_name VARCHAR(255),
    
    -- Status
    status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'approved', 'rejected'
    notes TEXT,
    
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 4. Update invoice_lines table if needed
DO $$ 
BEGIN
    -- Add category columns if they don't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'invoice_lines' AND column_name = 'category_mapping_id') THEN
        ALTER TABLE invoice_lines ADD COLUMN category_mapping_id UUID REFERENCES product_category_mappings(mapping_id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'invoice_lines' AND column_name = 'category_id') THEN
        ALTER TABLE invoice_lines ADD COLUMN category_id UUID REFERENCES product_categories(category_id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'invoice_lines' AND column_name = 'category_pending') THEN
        ALTER TABLE invoice_lines ADD COLUMN category_pending BOOLEAN DEFAULT TRUE;
    END IF;
    
    -- Remove old product columns if they exist
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'invoice_lines' AND column_name = 'product_id') THEN
        ALTER TABLE invoice_lines DROP COLUMN product_id;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'invoice_lines' AND column_name = 'product_pending') THEN
        ALTER TABLE invoice_lines DROP COLUMN product_pending;
    END IF;
END $$;

-- 5. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_product_categories_org ON product_categories(organization_id);
CREATE INDEX IF NOT EXISTS idx_product_category_mappings_org ON product_category_mappings(organization_id);
CREATE INDEX IF NOT EXISTS idx_product_category_mappings_variant ON product_category_mappings(variant_product_name);
CREATE INDEX IF NOT EXISTS idx_pending_category_mappings_org ON pending_category_mappings(organization_id);
CREATE INDEX IF NOT EXISTS idx_pending_category_mappings_status ON pending_category_mappings(status);

-- 6. Create indexes on invoice_lines for new columns
CREATE INDEX IF NOT EXISTS idx_invoice_lines_category_mapping ON invoice_lines(category_mapping_id);
CREATE INDEX IF NOT EXISTS idx_invoice_lines_category_id ON invoice_lines(category_id);
CREATE INDEX IF NOT EXISTS idx_invoice_lines_category_pending ON invoice_lines(category_pending);

-- 7. Verify tables were created
SELECT 'Tables created successfully' as status;
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('product_categories', 'product_category_mappings', 'pending_category_mappings')
ORDER BY table_name;
