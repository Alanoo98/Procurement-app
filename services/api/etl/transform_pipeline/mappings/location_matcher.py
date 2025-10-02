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
    text = re.sub(r'\s+', ' ', text)  # Collapse whitespace
    text = re.sub(r'[^\w\s,]', '', text)  # Remove special chars except commas
    return text

def fetch_all_locations(cur):
    cur.execute("SELECT location_id, name, address FROM locations")
    return cur.fetchall()

def fuzzy_match_location(cur, variant_name, variant_address, threshold=80):
    print(f"   🔍 Fuzzy matching against {len(fetch_all_locations(cur))} locations...")
    
    variant_name = clean_text(variant_name or "")
    variant_address = clean_text(normalize_address(variant_address or "") or "")
    
    print(f"   📝 Cleaned variant - Name: '{variant_name}' | Address: '{variant_address}'")

    all_locations = fetch_all_locations(cur)
    best_match = None
    best_score = 0
    best_location_name = None

    for location_id, name, address in all_locations:
        std_name = clean_text(name or "")
        std_address = clean_text(address or "")

        score_name = fuzz.partial_ratio(variant_name, std_name)
        score_addr = fuzz.partial_ratio(variant_address, std_address)

        # If name is a very strong match, ignore address if address score is very low
        if score_name >= 95 and score_addr < 40:
            total = score_name
            strategy = "name-only (very strong name match, weak address)"
        else:
            total = 0.7 * score_name + 0.3 * score_addr
            strategy = "weighted"

        if total > best_score:
            best_score = total
            best_match = location_id
            best_location_name = name

    if best_score >= threshold:
        print(f"    Best match: '{best_location_name}' (Score: {best_score:.1f}% - {strategy})")
        return best_match, best_score
    else:
        print(f"    Best match: '{best_location_name}' (Score: {best_score:.1f}% - {strategy}) - Below threshold ({threshold}%)")
        return None, best_score

def resolve_location(name, address, receiver_name, org_id):
    # 1. Try to resolve via location_mappings (exact match)
    cur.execute("""
        SELECT location_id FROM location_mappings
        WHERE organization_id = %s
          AND (
            (variant_name = %s AND (variant_address = %s OR variant_address IS NULL))
            OR (variant_receiver_name = %s)
          )
        LIMIT 1
    """, (org_id, name, address, receiver_name))
    row = cur.fetchone()
    if row:
        print(f"   ✅ Found mapping in location_mappings: {row[0]}")
        return row[0]

    # 2. Fallback to fuzzy matching
    location_id, score = fuzzy_match_location(cur, name, address)
    if location_id and score >= 80:  # or your preferred threshold
        print(f"   ✅ Fuzzy matched location: {location_id} (score: {score:.1f}%)")
        return location_id

    # 3. If not resolved, add to pending_location_mappings
    print(f"   ❌ Could not resolve location, adding to pending_location_mappings")
    cur.execute("""
        INSERT INTO pending_location_mappings
            (variant_receiver_name, variant_address, suggested_location_id, similarity_score, organization_id)
        VALUES (%s, %s, %s, %s, %s)
        ON CONFLICT DO NOTHING
    """, (receiver_name, address, location_id, score, org_id))
    return None
