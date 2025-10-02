#!/usr/bin/env python3
"""
Script to manage pending category mappings.
Shows pending mappings and allows you to approve them by creating proper mappings.
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

def show_pending_mappings(org_id: str):
    """Show all pending category mappings."""
    cur.execute("""
        SELECT id, variant_product_name, variant_product_code, variant_supplier_name, created_at
        FROM pending_category_mappings
        WHERE organization_id = %s AND status = 'pending'
        ORDER BY created_at DESC
    """, (org_id,))
    
    pending = cur.fetchall()
    
    if not pending:
        print("✅ No pending category mappings found!")
        return []
    
    print(f"\n📋 Found {len(pending)} pending category mappings:")
    print("-" * 80)
    
    for i, (mapping_id, name, code, supplier, created_at) in enumerate(pending, 1):
        print(f"{i:2d}. {name}")
        if code:
            print(f"    Code: {code}")
        if supplier:
            print(f"    Supplier: {supplier}")
        print(f"    Created: {created_at}")
        print(f"    ID: {mapping_id}")
        print()
    
    return pending

def show_categories(org_id: str):
    """Show all available categories."""
    cur.execute("""
        SELECT category_id, category_name, category_description
        FROM product_categories
        WHERE organization_id = %s
        ORDER BY category_name
    """, (org_id,))
    
    categories = cur.fetchall()
    
    if not categories:
        print("❌ No categories found! Create categories through the frontend interface first.")
        return []
    
    print(f"\n📂 Available categories:")
    print("-" * 50)
    
    for i, (category_id, name, description) in enumerate(categories, 1):
        print(f"{i:2d}. {name}")
        if description:
            print(f"    {description}")
        print(f"    ID: {category_id}")
        print()
    
    return categories

def approve_mapping(pending_id: str, category_id: str, org_id: str):
    """Approve a pending mapping by creating a proper mapping."""
    # Get the pending mapping details
    cur.execute("""
        SELECT variant_product_name, variant_product_code, variant_supplier_name
        FROM pending_category_mappings
        WHERE id = %s AND organization_id = %s
    """, (pending_id, org_id))
    
    result = cur.fetchone()
    if not result:
        print(f"❌ Pending mapping not found: {pending_id}")
        return False
    
    variant_name, variant_code, variant_supplier = result
    
    # Create the mapping
    cur.execute("""
        INSERT INTO product_category_mappings 
        (organization_id, category_id, variant_product_name, variant_product_code, variant_supplier_name)
        VALUES (%s, %s, %s, %s, %s)
        ON CONFLICT (organization_id, variant_product_name, variant_product_code, variant_supplier_name) DO NOTHING
    """, (org_id, category_id, variant_name, variant_code, variant_supplier))
    
    # Mark as approved
    cur.execute("""
        UPDATE pending_category_mappings
        SET status = 'approved', updated_at = now()
        WHERE id = %s
    """, (pending_id,))
    
    print(f"✅ Approved mapping: '{variant_name}' → category_id: {category_id}")
    return True

def reject_mapping(pending_id: str):
    """Reject a pending mapping."""
    cur.execute("""
        UPDATE pending_category_mappings
        SET status = 'rejected', updated_at = now()
        WHERE id = %s
    """, (pending_id,))
    
    print(f"❌ Rejected mapping: {pending_id}")

def main():
    ORG_ID = input("Enter your organization ID: ").strip()
    
    if not ORG_ID:
        print("❌ Organization ID is required")
        return
    
    while True:
        print(f"\n🔧 Pending Category Mappings Manager")
        print("1. Show pending mappings")
        print("2. Show available categories")
        print("3. Approve a mapping")
        print("4. Reject a mapping")
        print("5. Exit")
        
        choice = input("\nChoose an option (1-5): ").strip()
        
        if choice == "1":
            show_pending_mappings(ORG_ID)
        
        elif choice == "2":
            show_categories(ORG_ID)
        
        elif choice == "3":
            pending = show_pending_mappings(ORG_ID)
            if not pending:
                continue
            
            try:
                mapping_num = int(input("Enter mapping number to approve: ")) - 1
                if 0 <= mapping_num < len(pending):
                    pending_id = pending[mapping_num][0]
                    
                    categories = show_categories(ORG_ID)
                    if not categories:
                        continue
                    
                    cat_num = int(input("Enter category number: ")) - 1
                    if 0 <= cat_num < len(categories):
                        category_id = categories[cat_num][0]
                        approve_mapping(pending_id, category_id, ORG_ID)
                        conn.commit()
                    else:
                        print("❌ Invalid category number")
                else:
                    print("❌ Invalid mapping number")
            except ValueError:
                print("❌ Please enter a valid number")
        
        elif choice == "4":
            pending = show_pending_mappings(ORG_ID)
            if not pending:
                continue
            
            try:
                mapping_num = int(input("Enter mapping number to reject: ")) - 1
                if 0 <= mapping_num < len(pending):
                    pending_id = pending[mapping_num][0]
                    reject_mapping(pending_id)
                    conn.commit()
                else:
                    print("❌ Invalid mapping number")
            except ValueError:
                print("❌ Please enter a valid number")
        
        elif choice == "5":
            break
        
        else:
            print("❌ Invalid choice")

if __name__ == "__main__":
    main()
    cur.close()
    conn.close()
