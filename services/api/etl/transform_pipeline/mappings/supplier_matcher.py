from rapidfuzz import fuzz
from normalizers.address_normalizer import normalize_address
import unicodedata
import re

def clean_text(text):
    if not text:
        return ""
    text = str(text).lower().strip()
    import unicodedata, re
    text = unicodedata.normalize("NFKD", text).encode("ascii", "ignore").decode("utf-8")
    text = re.sub(r'\s+', ' ', text)
    text = re.sub(r'[^\w\s,]', '', text)
    return text

def fetch_all_suppliers(cur, organization_id):
    cur.execute("""
        SELECT supplier_id, name, address
        FROM suppliers
        WHERE organization_id = %s
    """, (organization_id,))
    return cur.fetchall()

def fuzzy_match_supplier(cur, variant_name, variant_address, organization_id, threshold=85):
    variant_name = clean_text(variant_name or "")
    variant_address = clean_text(normalize_address(variant_address or "") or "")

    all_suppliers = fetch_all_suppliers(cur, organization_id)
    best_match = None
    best_score = 0

    for supplier_id, name, address in all_suppliers:
        std_name = clean_text(name or "")
        std_address = clean_text(address or "")

        score_name = fuzz.partial_ratio(variant_name, std_name)
        score_addr = fuzz.partial_ratio(variant_address, std_address)

        if score_name >= 90 and score_addr < 50:
            total = score_name
        else:
            total = 0.6 * score_name + 0.4 * score_addr

        if total > best_score:
            best_score = total
            best_match = supplier_id

    if best_score >= threshold:
        return best_match, best_score
    return None, best_score

def resolve_supplier(name, address, org_id):
    # 1. Try to resolve via supplier_mappings (exact match)
    cur.execute("""
        SELECT supplier_id FROM supplier_mappings
        WHERE organization_id = %s
          AND variant_name = %s
          AND (variant_address = %s OR variant_address IS NULL)
        LIMIT 1
    """, (org_id, name, address))
    row = cur.fetchone()
    if row and row[0]:
        return row[0]

    # 2. Fallback to fuzzy matching
    supplier_id, score = fuzzy_match_supplier(cur, name, address, org_id)
    if supplier_id and score >= 80:  # or your preferred threshold
        return supplier_id

    # 3. If not resolved, add to pending_supplier_mappings
    cur.execute("""
        INSERT INTO pending_supplier_mappings
            (variant_supplier_name, variant_address, suggested_supplier_id, similarity_score, organization_id)
        VALUES (%s, %s, %s, %s, %s)
        ON CONFLICT DO NOTHING
    """, (name, address, supplier_id, score, org_id))
    return None
