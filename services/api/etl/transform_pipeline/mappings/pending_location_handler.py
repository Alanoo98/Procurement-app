import uuid

def insert_pending_location_mapping(
    cur,
    variant_name,
    variant_address,
    suggested_location_id=None,
    similarity_score=None,
    organization_id=None,
):
    """
    Insert a new pending location mapping if one doesn't already exist,
    scoped by organization.
    """

    if not variant_name or not variant_address or not organization_id:
        print("❌ Missing required data — skipping insert")
        return

    cur.execute("""
        SELECT 1 FROM pending_location_mappings
        WHERE variant_receiver_name ILIKE %s
          AND variant_address ILIKE %s
          AND organization_id = %s
          AND status = 'pending'
    """, (variant_name.strip(), variant_address.strip(), organization_id))

    if cur.fetchone():
        return

    cur.execute("""
        INSERT INTO pending_location_mappings (
            id,
            variant_receiver_name,
            variant_address,
            suggested_location_id,
            similarity_score,
            status,
            created_at,
            organization_id
        ) VALUES (%s, %s, %s, %s, %s, 'pending', now(), %s)
    """, (
        str(uuid.uuid4()),
        variant_name.strip(),
        variant_address.strip(),
        suggested_location_id,
        similarity_score,
        organization_id
    ))
