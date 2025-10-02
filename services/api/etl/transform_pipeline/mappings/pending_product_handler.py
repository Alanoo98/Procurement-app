import psycopg2

def insert_pending_product_mapping(cur, variant_product_name, variant_product_code, variant_supplier_name,
                                   suggested_product_id, similarity_score, organization_id):
    """
    Idempotent upsert for pending product mappings.
    """
    try:
        cur.execute("""
            insert into pending_product_mappings
                (variant_product_name, variant_product_code, variant_supplier_name,
                 suggested_product_id, similarity_score, organization_id, created_at, updated_at)
            values (%s, %s, %s, %s, %s, %s, now(), now())
            on conflict (organization_id, variant_product_name, variant_product_code, variant_supplier_name)
            do update set
                suggested_product_id = excluded.suggested_product_id,
                similarity_score     = excluded.similarity_score,
                updated_at           = now();
        """, (variant_product_name, variant_product_code, variant_supplier_name,
              suggested_product_id, similarity_score, organization_id))
        
        print(f"   📝 Added to pending_product_mappings: {variant_product_name}")
        return True
        
    except Exception as e:
        print(f"   ❌ Error inserting pending product mapping: {e}")
        return False
