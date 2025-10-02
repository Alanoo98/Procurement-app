import csv
import os
import uuid
import psycopg2
import chardet
from dotenv import load_dotenv

load_dotenv()

# DB Connection
conn = psycopg2.connect(
    dbname=os.getenv("DB_NAME"),
    user=os.getenv("DB_USER"),
    password=os.getenv("DB_PASSWORD"),
    host=os.getenv("DB_HOST"),
    port=os.getenv("DB_PORT"),
)
cur = conn.cursor()

CSV_FILE = os.path.join(os.path.dirname(__file__), "files", "supplier mappings.csv")

# Set your target organization ID
ORGANIZATION_ID = '5c38a370-7d13-4656-97f8-0b71f4000703'

def get_supplier_id_by_name(name):
    print(f"🔍 Looking up supplier: '{name}' (ORG: {ORGANIZATION_ID})")
    cur.execute("""
        SELECT supplier_id, name, organization_id
        FROM suppliers
        WHERE name ILIKE %s AND organization_id = %s
    """, (name.strip(), ORGANIZATION_ID))
    row = cur.fetchone()
    if row:
        print(f"✅ Found: DB name = '{row[1]}', org = '{row[2]}'")
    else:
        print(f"❌ Supplier NOT FOUND in DB for: '{name}'")
    return row[0] if row else None

def insert_mapping(variant_name, variant_address, tax_id, standard_name):
    variant_name = (variant_name or "").strip()
    variant_address = (variant_address or "").strip()
    tax_id = (tax_id or "").strip()
    standard_name = (standard_name or "").strip()

    print(f"\n--- Processing mapping: {variant_name} / {variant_address} → {standard_name}")

    if not variant_name or not standard_name:
        print(f"⚠️ Skipping due to missing variant or standard name.")
        return

    supplier_id = get_supplier_id_by_name(standard_name)
    if not supplier_id:
        print(f"⚠️ Skipping insert because supplier ID could not be resolved.")
        return

    cur.execute("""
        SELECT 1 FROM supplier_mappings
        WHERE organization_id = %s AND variant_name = %s AND variant_address = %s
    """, (ORGANIZATION_ID, variant_name, variant_address))
    if cur.fetchone():
        print(f"⚠️ Mapping already exists.")
        return

    cur.execute("""
        INSERT INTO supplier_mappings (
            mapping_id, supplier_id, variant_name, variant_address, organization_id, created_at
        ) VALUES (%s, %s, %s, %s, %s, now())
    """, (
        str(uuid.uuid4()), supplier_id, variant_name, variant_address, ORGANIZATION_ID
    ))
    print(f"✅ Inserted mapping: {variant_name} → {standard_name}")

def main():
    if not os.path.exists(CSV_FILE):
        print(f"❌ File not found: {CSV_FILE}")
        return

    with open(CSV_FILE, 'rb') as raw_file:
        detected = chardet.detect(raw_file.read(10000))
        encoding = detected['encoding']
        print(f"📄 Detected encoding: {encoding}")

    with open(CSV_FILE, newline='', encoding=encoding) as f:
        reader = csv.DictReader(f, delimiter=';')
        reader.fieldnames = [field.strip() for field in reader.fieldnames]
        print(f"📌 Headers: {reader.fieldnames}")

        count = 0
        for i, row in enumerate(reader, 1):
            try:
                variant_name = row.get("Shipper Name", "").strip()
                variant_address = row.get("Shipper Address", "").strip()
                tax_id = row.get("Supplier Tax ID", "").strip()
                standard_name = row.get("Supplier", "").strip()

                if not variant_name or not standard_name:
                    print(f"⚠️ Skipping line {i}: missing required fields")
                    continue

                insert_mapping(variant_name, variant_address, tax_id, standard_name)
                count += 1
            except Exception as e:
                print(f"❌ Error on line {i}: {e}")

    conn.commit()
    print(f"\n🎉 Done. {count} supplier mappings processed.")

if __name__ == "__main__":
    main()

cur.close()
conn.close()
print("✅ Database connection closed")
