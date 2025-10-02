import psycopg2
from typing import Optional, Tuple

def resolve_product_category(cur, product_name: str, product_code: str, supplier_name: str, org_id: str) -> Tuple[Optional[str], Optional[str], bool]:
    """
    Enhanced category resolution prioritizing product code + supplier over exact name matching.
    Returns: (category_id, mapping_id, is_pending)
    """
    if not product_name:
        return None, None, True
    
    # Clean inputs
    product_name = product_name.strip()
    product_code = product_code.strip() if product_code else None
    supplier_name = supplier_name.strip() if supplier_name else None
    
    print(f"   🔍 Resolving category for: '{product_name}' | '{product_code}' | '{supplier_name}'")
    
    # 1. Try exact match in product_category_mappings (most specific)
    cur.execute("""
        SELECT pcm.category_id, pcm.mapping_id, pc.category_name
        FROM product_category_mappings pcm
        JOIN product_categories pc ON pcm.category_id = pc.category_id
        WHERE pcm.organization_id = %s
          AND pcm.is_active = TRUE
          AND pcm.variant_product_name = %s
          AND (pcm.variant_product_code = %s OR (pcm.variant_product_code IS NULL AND %s IS NULL))
          AND (pcm.variant_supplier_name = %s OR (pcm.variant_supplier_name IS NULL AND %s IS NULL))
        LIMIT 1
    """, (org_id, product_name, product_code, product_code, supplier_name, supplier_name))
    
    row = cur.fetchone()
    if row:
        category_id, mapping_id, category_name = row
        print(f"   ✅ Found exact category mapping: {category_name} (mapping_id: {mapping_id})")
        return category_id, mapping_id, False
    
    # 2. PRIORITY: Match by product code + supplier (ignore name variations)
    if product_code and supplier_name:
        cur.execute("""
            SELECT pcm.category_id, pcm.mapping_id, pc.category_name
            FROM product_category_mappings pcm
            JOIN product_categories pc ON pcm.category_id = pc.category_id
            WHERE pcm.organization_id = %s
              AND pcm.is_active = TRUE
              AND pcm.variant_product_code = %s
              AND pcm.variant_supplier_name = %s
            LIMIT 1
        """, (org_id, product_code, supplier_name))
        
        row = cur.fetchone()
        if row:
            category_id, mapping_id, category_name = row
            print(f"   ✅ Found category mapping by code+supplier: {category_name} (mapping_id: {mapping_id})")
            return category_id, mapping_id, False
    
    # 3. Match by product code only (ignore name and supplier variations)
    if product_code:
        cur.execute("""
            SELECT pcm.category_id, pcm.mapping_id, pc.category_name
            FROM product_category_mappings pcm
            JOIN product_categories pc ON pcm.category_id = pc.category_id
            WHERE pcm.organization_id = %s
              AND pcm.is_active = TRUE
              AND pcm.variant_product_code = %s
              AND pcm.variant_supplier_name IS NULL
            LIMIT 1
        """, (org_id, product_code))
        
        row = cur.fetchone()
        if row:
            category_id, mapping_id, category_name = row
            print(f"   ✅ Found category mapping by code only: {category_name} (mapping_id: {mapping_id})")
            return category_id, mapping_id, False
    
    # 4. Match by product name and code only (ignore supplier)
    if product_code:
        cur.execute("""
            SELECT pcm.category_id, pcm.mapping_id, pc.category_name
            FROM product_category_mappings pcm
            JOIN product_categories pc ON pcm.category_id = pc.category_id
            WHERE pcm.organization_id = %s
              AND pcm.is_active = TRUE
              AND pcm.variant_product_name = %s
              AND pcm.variant_product_code = %s
              AND pcm.variant_supplier_name IS NULL
            LIMIT 1
        """, (org_id, product_name, product_code))
        
        row = cur.fetchone()
        if row:
            category_id, mapping_id, category_name = row
            print(f"   ✅ Found category mapping by name+code: {category_name} (mapping_id: {mapping_id})")
            return category_id, mapping_id, False
    
    # 5. Try fuzzy match by product name (case-insensitive, trimmed)
    cur.execute("""
        SELECT pcm.category_id, pcm.mapping_id, pc.category_name
        FROM product_category_mappings pcm
        JOIN product_categories pc ON pcm.category_id = pc.category_id
        WHERE pcm.organization_id = %s
          AND pcm.is_active = TRUE
          AND LOWER(TRIM(pcm.variant_product_name)) = LOWER(TRIM(%s))
        LIMIT 1
    """, (org_id, product_name))
    
    row = cur.fetchone()
    if row:
        category_id, mapping_id, category_name = row
        print(f"   ✅ Found fuzzy category mapping: {category_name} (mapping_id: {mapping_id})")
        return category_id, mapping_id, False
    
    # 6. If no match found, add to pending for manual review
    print(f"   ⚠️ No category mapping found - adding to pending")
    add_to_pending_category_mappings(cur, product_name, product_code, supplier_name, org_id)
    return None, None, True

def add_to_pending_category_mappings(cur, product_name: str, product_code: str, supplier_name: str, org_id: str):
    """
    Add unmatched product to pending category mappings for manual review.
    """
    try:
        cur.execute("""
            INSERT INTO pending_category_mappings
                (organization_id, variant_product_name, variant_product_code, variant_supplier_name, status)
            VALUES (%s, %s, %s, %s, 'pending')
            ON CONFLICT DO NOTHING
        """, (org_id, product_name, product_code, supplier_name))
        
        # Added to pending_category_mappings
        
    except Exception as e:
        pass  # Error adding to pending category mappings

def get_category_mapping_id(cur, category_id: str, org_id: str) -> Optional[str]:
    """
    Get the mapping_id for a given category_id and organization.
    This is used to link invoice_lines to the specific mapping.
    """
    if not category_id:
        return None
    
    cur.execute("""
        SELECT mapping_id 
        FROM product_category_mappings 
        WHERE category_id = %s AND organization_id = %s AND is_active = TRUE
        LIMIT 1
    """, (category_id, org_id))
    
    row = cur.fetchone()
    return row[0] if row else None
