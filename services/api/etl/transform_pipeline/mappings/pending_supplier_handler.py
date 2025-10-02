import uuid

def insert_pending_supplier_mapping(
    cur,
    variant_name,
    variant_address,
    suggested_supplier_id=None,
    similarity_score=None,
    organization_id=None,
):
    """
    Insert a new pending supplier mapping if one doesn't already exist,
    scoped by organization.
    """

    if not variant_name or not organization_id:
        return

    cur.execute("""
        SELECT 1 FROM pending_supplier_mappings
        WHERE variant_supplier_name ILIKE %s
          AND variant_address ILIKE %s
          AND organization_id = %s
          AND status = 'pending'
    """, (variant_name.strip(), variant_address.strip(), organization_id))

    if cur.fetchone():
        return

    cur.execute("""
        INSERT INTO pending_supplier_mappings (
            id,
            variant_supplier_name,
            variant_address,
            suggested_supplier_id,
            similarity_score,
            status,
            created_at,
            organization_id
        ) VALUES (%s, %s, %s, %s, %s, 'pending', now(), %s)
    """, (
        str(uuid.uuid4()),
        variant_name.strip(),
        variant_address.strip(),
        suggested_supplier_id,
        similarity_score,
        organization_id
    ))
