# insert_product_mappings.py
# Script to populate product mappings from CSV file

import csv
import psycopg2
import os
import chardet
from dotenv import load_dotenv

load_dotenv()

# Connect to database
conn = psycopg2.connect(
    dbname=os.getenv("DB_NAME"),
    user=os.getenv("DB_USER"),
    password=os.getenv("DB_PASSWORD"),
    host=os.getenv("DB_HOST"),
    port=os.getenv("DB_PORT"),
)
cur = conn.cursor()

# Constants
ORGANIZATION_ID = '5c38a370-7d13-4656-97f8-0b71f4000703'  # Update with your org ID
CSV_FILE = os.path.join(os.path.dirname(__file__), "files", "product_mappings.csv")

def insert_mapping(variant_name, variant_code, variant_supplier, standard_product_id):
    """
    Insert a product mapping.
    """
    # Sanitize inputs
    variant_name = (variant_name or "").strip()
    variant_code = (variant_code or "").strip()
    variant_supplier = (variant_supplier or "").strip()
    
    if not variant_name or not standard_product_id:
        print(f"⚠️ Skipping: missing variant_name or standard_product_id")
        return
    
    # Check if mapping already exists
    cur.execute("""
        SELECT id FROM product_mappings 
        WHERE organization_id = %s 
        AND variant_product_name = %s 
        AND (variant_product_code = %s OR (variant_product_code IS NULL AND %s = ''))
        AND (variant_supplier_name = %s OR (variant_supplier_name IS NULL AND %s = ''))
    """, (ORGANIZATION_ID, variant_name, variant_code, variant_code, variant_supplier, variant_supplier))
    
    if cur.fetchone():
        print(f"⚠️ Mapping already exists: {variant_name}")
        return
    
    # Insert new mapping
    cur.execute("""
        INSERT INTO product_mappings (
            organization_id, variant_product_name, variant_product_code, 
            variant_supplier_name, standard_product_id, created_at, updated_at
        ) VALUES (%s, %s, %s, %s, %s, now(), now())
    """, (
        ORGANIZATION_ID, variant_name, variant_code or None, 
        variant_supplier or None, standard_product_id
    ))
    
    print(f"✅ Inserted mapping: {variant_name} → {standard_product_id}")

def get_product_id_by_name(product_name):
    """
    Get product_id by product name.
    """
    cur.execute("""
        SELECT product_id FROM products 
        WHERE organization_id = %s AND description = %s AND active = true
    """, (ORGANIZATION_ID, product_name))
    
    result = cur.fetchone()
    return result[0] if result else None

def main():
    if not os.path.exists(CSV_FILE):
        print(f"❌ File not found: {CSV_FILE}")
        print(f"📝 Expected CSV format:")
        print(f"   Variant Name,Variant Code,Variant Supplier,Standard Product Name")
        print(f"   Quinoa Rød Øko 500g,12345,Supplier A,Quinoa Organic Red 500g")
        return

    # Detect encoding
    with open(CSV_FILE, 'rb') as raw_file:
        detected = chardet.detect(raw_file.read(10000))
        encoding = detected['encoding']
        print(f"📄 Detected encoding: {encoding}")

    # Open and parse CSV
    with open(CSV_FILE, newline='', encoding=encoding) as f:
        reader = csv.DictReader(f, delimiter=';')
        reader.fieldnames = [field.strip() for field in reader.fieldnames]
        print(f"📌 Headers: {reader.fieldnames}")

        count = 0
        for i, row in enumerate(reader, 1):
            try:
                variant_name = (row.get("Variant Name") or "").strip()
                variant_code = (row.get("Variant Code") or "").strip()
                variant_supplier = (row.get("Variant Supplier") or "").strip()
                standard_product_name = (row.get("Standard Product Name") or "").strip()

                if not variant_name or not standard_product_name:
                    print(f"⚠️ Skipping line {i}: missing required fields")
                    continue

                # Get standard product ID
                standard_product_id = get_product_id_by_name(standard_product_name)
                if not standard_product_id:
                    print(f"❌ Line {i}: Standard product '{standard_product_name}' not found in products table")
                    continue

                insert_mapping(variant_name, variant_code, variant_supplier, standard_product_id)
                count += 1
            except Exception as e:
                print(f"❌ Error on line {i}: {e}")

    conn.commit()
    print(f"\n🎉 Done. {count} product mappings processed.")

if __name__ == "__main__":
    main()

cur.close()
conn.close()
