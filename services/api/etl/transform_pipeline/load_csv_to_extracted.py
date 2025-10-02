# transform_pipeline/load_csv_to_extracted.py

import csv
import json
import uuid
import psycopg2
import os
import chardet
from datetime import datetime
from dotenv import load_dotenv

# Limit for how many rows to import
IMPORT_LIMIT = 50  # or 1000

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
DATA_SOURCE_ID = 'd310cc94-8ce2-4ca3-88a2-191f832b94b0'
ORG_ID = '5c38a370-7d13-4656-97f8-0b71f4000703'

# Use file from files/ subdirectory
FILENAME = os.path.join(os.path.dirname(__file__), "files", "csv test.csv")

# Get business_unit_id and config from the data source
cur.execute("SELECT business_unit_id, config FROM data_sources WHERE id = %s", (DATA_SOURCE_ID,))
row = cur.fetchone()
BUSINESS_UNIT_ID = row[0] if row and row[0] else None
CONFIG = row[1] or {}

DELIMITER = CONFIG.get("delimiter", ";")
print(f"ℹ️ Using business_unit_id: {BUSINESS_UNIT_ID or 'NULL (multi-BU import)'}")
print(f"ℹ️ Using delimiter: '{DELIMITER}'")

def insert_row(row):
    cur.execute("""
        INSERT INTO extracted_data (
            id, organization_id, business_unit_id, data_source_id,
            external_id, data, metadata, status, created_at
        ) VALUES (
            %s, %s, %s, %s,
            %s, %s, %s, 'pending', now()
        )
    """, (
        str(uuid.uuid4()), ORG_ID, BUSINESS_UNIT_ID, DATA_SOURCE_ID,
        row.get("Invoice Number") or str(uuid.uuid4()),
        json.dumps(row),
        json.dumps({})
    ))

# Detect encoding of the file
with open(FILENAME, 'rb') as raw_file:
    detected = chardet.detect(raw_file.read(10000))
    encoding = detected['encoding']
    print(f"📄 Detected encoding: {encoding}")

# Load and insert rows

row_count = 0
with open(FILENAME, newline='', encoding=encoding) as f:
    reader = csv.DictReader(f, delimiter=DELIMITER)
    for i, row in enumerate(reader):
        if i >= IMPORT_LIMIT:
            break
        insert_row(row)
        row_count += 1

conn.commit()
print(f"✅ Inserted {row_count} rows into extracted_data")

cur.close()
conn.close()
print("✅ Database connection closed")


# It assumes that the database connection details are stored in a .env file.
# Make sure to handle exceptions and edge cases in a production environment.
# This script is a basic example and may need to be adjusted based on your specific requirements.
# The script reads a CSV file, processes each row, and inserts it into the `extracted_data` table in a PostgreSQL database.
# It uses the `psycopg2` library to connect to the database and execute SQL commands.
# The script also uses the `dotenv` library to load environment variables for database connection details.
