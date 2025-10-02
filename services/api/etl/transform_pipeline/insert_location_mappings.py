import csv
import os
import uuid
import psycopg2
import chardet
from dotenv import load_dotenv

load_dotenv()

# Database connection
conn = psycopg2.connect(
    dbname=os.getenv("DB_NAME"),
    user=os.getenv("DB_USER"),
    password=os.getenv("DB_PASSWORD"),
    host=os.getenv("DB_HOST"),
    port=os.getenv("DB_PORT"),
)
cur = conn.cursor()

# Path to CSV file
CSV_FILE = os.path.join(os.path.dirname(__file__), "files", "location mappings.csv")

def get_location_id_by_name(name):
    cur.execute("SELECT location_id FROM locations WHERE name ILIKE %s", (name.strip(),))
    row = cur.fetchone()
    return row[0] if row else None

def insert_mapping(variant_name, variant_address, standard_name):
    # Sanitize inputs
    variant_name = (variant_name or "").strip()
    variant_address = (variant_address or "").strip()
    standard_name = (standard_name or "").strip()

    if not variant_name or not variant_address:
        print(f"⚠️ Skipping due to missing variant name or address: '{variant_name}' / '{variant_address}'")
        return

    location_id = get_location_id_by_name(standard_name)
    if not location_id:
        print(f"❌ No location found for '{standard_name}'")
        return

    # Avoid duplicates
    cur.execute("""
        SELECT 1 FROM location_mappings
        WHERE variant_receiver_name = %s AND variant_address = %s
    """, (variant_name, variant_address))
    if cur.fetchone():
        print(f"⚠️ Already exists: {variant_name} / {variant_address}")
        return

    # Insert mapping (same value for both name fields for now)
    cur.execute("""
        INSERT INTO location_mappings (
            mapping_id, location_id, variant_name, variant_receiver_name, variant_address, created_at
        ) VALUES (%s, %s, %s, %s, %s, now())
    """, (
        str(uuid.uuid4()), location_id,
        variant_name,         # variant_name
        variant_name,         # variant_receiver_name (same as above for now)
        variant_address
    ))
    print(f"✅ Inserted: {variant_name} → {standard_name}")


def main():
    if not os.path.exists(CSV_FILE):
        print(f"❌ File not found: {CSV_FILE}")
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
                variant_name = (row.get("Receiver Name") or "").strip()
                variant_address = (row.get("Receiver Address") or "").strip()
                standard_location = (row.get("Location") or "").strip()

                if not variant_name or not variant_address or not standard_location:
                    print(f"⚠️ Skipping line {i}: missing data")
                    continue

                insert_mapping(variant_name, variant_address, standard_location)
                count += 1
            except Exception as e:
                print(f"❌ Error on line {i}: {e}")

    conn.commit()
    print(f"\n🎉 Done. {count} mappings processed.")


if __name__ == "__main__":
    main()

cur.close()
conn.close()
print("✅ Database connection closed")