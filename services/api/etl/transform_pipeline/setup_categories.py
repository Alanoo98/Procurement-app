#!/usr/bin/env python3
"""
Simple script to set up product categories and mappings manually.
This is a helper script to create initial categories and mappings.
"""

import psycopg2
import os
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

def create_category(org_id: str, category_name: str, description: str = None):
    """Create a new product category."""
    try:
        cur.execute("""
            INSERT INTO product_categories (organization_id, category_name, category_description)
            VALUES (%s, %s, %s)
            ON CONFLICT (organization_id, category_name) DO NOTHING
            RETURNING category_id
        """, (org_id, category_name, description))
        
        result = cur.fetchone()
        if result:
            category_id = result[0]
            print(f"✅ Created category: '{category_name}' (ID: {category_id})")
            return category_id
        else:
            # Category already exists, get its ID
            cur.execute("""
                SELECT category_id FROM product_categories 
                WHERE organization_id = %s AND category_name = %s
            """, (org_id, category_name))
            result = cur.fetchone()
            if result:
                print(f"ℹ️ Category already exists: '{category_name}' (ID: {result[0]})")
                return result[0]
    except Exception as e:
        print(f"❌ Error creating category '{category_name}': {e}")
        return None

def create_mapping(org_id: str, category_id: str, variant_name: str, variant_code: str = None, variant_supplier: str = None):
    """Create a product category mapping."""
    try:
        cur.execute("""
            INSERT INTO product_category_mappings 
            (organization_id, category_id, variant_product_name, variant_product_code, variant_supplier_name)
            VALUES (%s, %s, %s, %s, %s)
            ON CONFLICT (organization_id, variant_product_name, variant_product_code, variant_supplier_name) DO NOTHING
        """, (org_id, category_id, variant_name, variant_code, variant_supplier))
        
        print(f"✅ Created mapping: '{variant_name}' → category_id: {category_id}")
        return True
    except Exception as e:
        print(f"❌ Error creating mapping for '{variant_name}': {e}")
        return False

def main():
    print("🏗️ Product Category System Setup")
    print("This script provides utility functions for managing product categories.")
    print("All categories and mappings should be managed through the frontend interface.")
    print("\nAvailable functions:")
    print("- create_category(org_id, category_name, description)")
    print("- create_mapping(org_id, category_id, variant_name, variant_code, variant_supplier)")
    print("\nExample usage:")
    print("category_id = create_category('your-org-id', 'Karse', 'Leafy green vegetable')")
    print("create_mapping('your-org-id', category_id, 'Karse Rød')")
    print("\n✅ Setup complete! Use the frontend to manage categories and mappings.")

if __name__ == "__main__":
    main()
    cur.close()
    conn.close()
