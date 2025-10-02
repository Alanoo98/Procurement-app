-- Add RLS policies for product category tables

-- Enable RLS on product_categories table
ALTER TABLE product_categories ENABLE ROW LEVEL SECURITY;

-- Enable RLS on product_category_mappings table  
ALTER TABLE product_category_mappings ENABLE ROW LEVEL SECURITY;

-- Enable RLS on pending_category_mappings table
ALTER TABLE pending_category_mappings ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view product categories in their organization" ON product_categories;
DROP POLICY IF EXISTS "Admins can manage product categories in their organization" ON product_categories;

DROP POLICY IF EXISTS "Users can view product category mappings in their organization" ON product_category_mappings;
DROP POLICY IF EXISTS "Admins can manage product category mappings in their organization" ON product_category_mappings;

DROP POLICY IF EXISTS "Users can view pending category mappings in their organization" ON pending_category_mappings;
DROP POLICY IF EXISTS "Admins can manage pending category mappings in their organization" ON pending_category_mappings;

-- Product Categories Policies
CREATE POLICY "Users can view product categories in their organization" ON product_categories
    FOR SELECT USING (user_belongs_to_organization(organization_id));

CREATE POLICY "Users can manage product categories in their organization" ON product_categories
    FOR ALL USING (user_belongs_to_organization(organization_id));

-- Product Category Mappings Policies
CREATE POLICY "Users can view product category mappings in their organization" ON product_category_mappings
    FOR SELECT USING (user_belongs_to_organization(organization_id));

CREATE POLICY "Users can manage product category mappings in their organization" ON product_category_mappings
    FOR ALL USING (user_belongs_to_organization(organization_id));

-- Pending Category Mappings Policies
CREATE POLICY "Users can view pending category mappings in their organization" ON pending_category_mappings
    FOR SELECT USING (user_belongs_to_organization(organization_id));

CREATE POLICY "Users can manage pending category mappings in their organization" ON pending_category_mappings
    FOR ALL USING (user_belongs_to_organization(organization_id));

-- Verify policies are created
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename IN ('product_categories', 'product_category_mappings', 'pending_category_mappings')
ORDER BY tablename, policyname;
