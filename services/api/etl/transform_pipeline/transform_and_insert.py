import os
import sys
import json
import psycopg2
from datetime import datetime
from dotenv import load_dotenv
import argparse
from typing import List, Dict, Tuple

from normalizers.supplier_normalizer import normalize_supplier_address
from normalizers.address_normalizer import normalize_address
from normalizers.currency_converter import convert_to_dkk
from normalizers.locale_rules import get_locale_settings
from normalizers.discount_handler import parse_discount_value, parse_discount_value_with_context, process_discount_calculations, analyze_discount_pattern, validate_discount_consistency
from normalizers.unit_normalizer import normalize_unit
from normalizers.date_normalizer import normalize_date
from normalizers.number_normalizer import normalize_number

from mappings.location_matcher import fuzzy_match_location
from mappings.pending_location_handler import insert_pending_location_mapping
from mappings.supplier_matcher import fuzzy_match_supplier
from mappings.pending_supplier_handler import insert_pending_supplier_mapping
from mappings.category_resolver import resolve_product_category

load_dotenv()

parser = argparse.ArgumentParser()
parser.add_argument('--organization-id', type=str, required=True)
args = parser.parse_args()
organization_id = args.organization_id

    # Script called with organization_id

conn = psycopg2.connect(
    dbname=os.getenv("DB_NAME"),
    user=os.getenv("DB_USER"),
    password=os.getenv("DB_PASSWORD"),
    host=os.getenv("DB_HOST"),
    port=os.getenv("DB_PORT"),
)

def get_cursor():
    """Get a fresh cursor, creating one if needed"""
    global conn
    try:
        # Test if connection is still alive
        conn.cursor().execute("SELECT 1")
        return conn.cursor()
    except:
        # If connection is broken, reconnect
        print("🔄 Connection lost, reconnecting...")
        conn = psycopg2.connect(
            dbname=os.getenv("DB_NAME"),
            user=os.getenv("DB_USER"),
            password=os.getenv("DB_PASSWORD"),
            host=os.getenv("DB_HOST"),
            port=os.getenv("DB_PORT"),
        )
        return conn.cursor()

cur = get_cursor()

def get_non_processed_rows():
    cur = get_cursor()
    # First, let's see what's in the table
    cur.execute("""
        SELECT id, status, organization_id, created_at 
        FROM extracted_data 
        ORDER BY created_at DESC 
        LIMIT 10
    """)
    all_rows = cur.fetchall()
    # Found total rows in extracted_data table
    
    # Get all non-processed rows (pending, processing, failed) - anything that needs processing
    cur.execute("""
        SELECT ed.id, ed.data, ed.organization_id, ed.business_unit_id, ed.data_source_id
        FROM extracted_data ed
        WHERE ed.status IN ('pending', 'processing', 'failed')
    """)
    pending_rows = cur.fetchall()
    
    # Found non-processed rows (all organizations)
    
    return pending_rows

def get_mappings_for_source(source_id, cur=None):
    if cur is None:
        cur = get_cursor()
    cur.execute("""
        SELECT source_field, target_field, transformation
        FROM data_mappings
        WHERE data_source_id = %s
    """, (source_id,))
    return cur.fetchall()

def resolve_supplier(name, address, org_id, cur=None):
    if cur is None:
        cur = get_cursor()
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
        # Found mapping in supplier_mappings
        return row[0]

    # 2. Fallback to fuzzy matching
    supplier_id, score = fuzzy_match_supplier(cur, name, address, org_id)
    if supplier_id and score >= 80:  # or your preferred threshold
        # Fuzzy matched supplier
        return supplier_id

    # 3. If not resolved, add to pending_supplier_mappings
    # Could not resolve supplier, adding to pending_supplier_mappings
    cur.execute("""
        INSERT INTO pending_supplier_mappings
            (variant_supplier_name, variant_address, suggested_supplier_id, similarity_score, organization_id)
        VALUES (%s, %s, %s, %s, %s)
        ON CONFLICT DO NOTHING
    """, (name, address, supplier_id, score, org_id))
    return None

def resolve_location(name, address, receiver_name, org_id, cur=None):
    if cur is None:
        cur = get_cursor()
    # 1. Try to resolve via location_mappings
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
        return row[0]

    # 2. Fuzzy matching fallback...
    location_id, score = fuzzy_match_location(cur, name, address)
    if location_id and score >= 80:
        return location_id

    # 3. If still unresolved, insert into pending_location_mappings
    cur.execute("""
        INSERT INTO pending_location_mappings
            (variant_receiver_name, variant_address, suggested_location_id, similarity_score, organization_id)
        VALUES (%s, %s, %s, %s, %s)
        ON CONFLICT DO NOTHING
    """, (receiver_name, address, location_id, score, org_id))
    return None

def resolve_business_unit(location_id):
    if not location_id:
        # No location_id provided for business unit resolution
        return None
    
    cur = get_cursor()
    cur.execute("SELECT business_unit_id, name FROM locations WHERE location_id = %s", (location_id,))
    row = cur.fetchone()
    
    if row:
        business_unit_id, location_name = row
        # Business unit resolved
        return business_unit_id
    else:
        # No business unit found for location_id
        return None

def parse_extracted_data(data):
    flat = {}
    table = {}
    for item in data:
        if item.get("type") == "table" and "columns" in item and "rows" in item:
            for idx, row_values in enumerate(item["rows"], start=1):
                table[idx] = dict(zip(item["columns"], row_values))
        elif "label" in item and "ocr_text" in item:
            flat[item["label"]] = item["ocr_text"]
    return flat, table

def is_credit_note(document_type, invoice_number=None, description=None):
    """
    Detect if a document is a credit note based on document type, invoice number, or description.
    """
    if not document_type:
        return False
    
    # Check document type for credit note indicators
    credit_indicators = [
        'credit note', 'kreditnota', 'credit', 'kredit', 'credit memo', 
        'credit invoice', 'refund', 'tilbagebetaling', 'kreditfaktura'
    ]
    
    doc_type_lower = str(document_type).lower().strip()
    
    # Check if document type contains credit indicators
    for indicator in credit_indicators:
        if indicator in doc_type_lower:
            return True
    
    # Check invoice number for credit indicators (common patterns)
    if invoice_number:
        invoice_lower = str(invoice_number).lower()
        if any(indicator in invoice_lower for indicator in ['cn', 'credit', 'kredit', 'refund']):
            return True
    
    # Check description for credit indicators
    if description:
        desc_lower = str(description).lower()
        if any(indicator in desc_lower for indicator in ['credit', 'kredit', 'refund', 'tilbagebetaling']):
            return True
    
    return False

def make_prices_negative_if_credit_note(fields, document_type, invoice_number=None, description=None):
    """
    Make all price fields negative if this is a credit note.
    """
    if not is_credit_note(document_type, invoice_number, description):
        return fields
    
    # Detected credit note - making prices negative
    
    # List of price fields to make negative
    price_fields = [
        'unit_price', 'unit_price_after_discount', 'total_price', 
        'total_price_after_discount', 'discount_amount', 'total_tax'
    ]
    
    for field_name in price_fields:
        if field_name in fields and fields[field_name] is not None:
            try:
                # Convert to float, make negative, then back to original type
                original_value = fields[field_name]
                if isinstance(original_value, str):
                    # Handle string numbers
                    numeric_value = float(original_value.replace(',', '.'))
                    fields[field_name] = str(-numeric_value)
                elif isinstance(original_value, (int, float)):
                    # Handle numeric types
                    fields[field_name] = -original_value
                # Applied credit note logic to field
            except (ValueError, TypeError) as e:
                pass  # Could not make field negative
    
    return fields

def transform_row_optimized(row, mappings, product_matcher=None, cur=None):
    """
    Optimized version that processes all products in a row at once.
    """
    if cur is None:
        cur = get_cursor()
    ed_id, raw_data, org_id, bu_id, source_id = row
    data = raw_data if isinstance(raw_data, list) else json.loads(raw_data)
    flat_data, table_rows = parse_extracted_data(data)
    locale = get_locale_settings("da")

    supplier_name = flat_data.get("supplier_name", "")
    supplier_address = flat_data.get("supplier_address", "")
    receiver_name = flat_data.get("receiver_name", "")
    receiver_address = flat_data.get("receiver_address", "")

    print(f"\n📄 Processing extracted_data.id={ed_id}")
    print(f"   Supplier: '{supplier_name}' | '{supplier_address}'")
    print(f"   Receiver: '{receiver_name}' | '{receiver_address}'")
    
    # Check if this is a credit note based on flat data
    document_type = flat_data.get("document_type", "")
    invoice_number = flat_data.get("invoice_number", "")
    if is_credit_note(document_type, invoice_number):
        print(f"   🎯 Detected credit note: document_type='{document_type}', invoice_number='{invoice_number}'")
    
    # Parse total_amount and subtotal from extracted data using existing normalizers
    total_amount = None
    subtotal = None
    
    # Extract total_amount and subtotal from flat_data using the number normalizer
    if "total_amount" in flat_data:
        try:
            total_amount = normalize_number(flat_data["total_amount"], locale="da")
            if total_amount is not None:
                print(f"   📊 Extracted total_amount: {total_amount}")
        except Exception as e:
            print(f"   ⚠️ Could not parse total_amount: {e}")
    
    if "subtotal" in flat_data:
        try:
            subtotal = normalize_number(flat_data["subtotal"], locale="da")
            if subtotal is not None:
                print(f"   📊 Extracted subtotal: {subtotal}")
        except Exception as e:
            print(f"   ⚠️ Could not parse subtotal: {e}")

    supplier_id = resolve_supplier(
        supplier_name,
        supplier_address,
        org_id,
        cur
    )
    supplier_pending = supplier_id is None
    
    print(f"   🔍 Supplier resolution result: supplier_id={supplier_id}, pending={supplier_pending}")

    location_id = resolve_location(
        receiver_name,
        receiver_address,
        receiver_name, # Pass receiver_name as variant_receiver_name
        org_id,
        cur
    )
    location_pending = location_id is None

    business_unit_id = resolve_business_unit(location_id)
    if not business_unit_id:
        print(f"   ❌ Skipping extracted_data.id={ed_id} — could not resolve business unit.")
        return

    # Collect all products for batch processing
    products_to_resolve = []
    processed_rows = []
    
    # First pass: Collect all lines for pattern analysis
    all_invoice_lines = []
    table_data_list = []
    
    for row_idx, table_data in table_rows.items():
        fields = {}
        for src_field, tgt_field, transform in mappings:
            lookup_key = src_field.lower()
            val = table_data.get(lookup_key) or flat_data.get(lookup_key)
            if val in ("", "-", None, "null", "None"):
                val = None
            else:
                try:
                    if transform == "to_number":
                        val = normalize_number(val, locale="da")
                    elif transform == "trim" and isinstance(val, str):
                        val = val.strip()
                    elif transform == "to_date":
                        val = normalize_date(val)
                    elif transform == "normalize_unit":
                        val = normalize_unit(val)
                except Exception:
                    val = None
            fields[tgt_field] = val

        # Look for discount fields with case-insensitive search and parse them
        discount_value = None
        discount_percentage_value = None
        discount_amount_value = None
        
        for key, value in fields.items():
            key_lower = key.lower()
            if key_lower == "discount":
                discount_value = value
            elif key_lower == "discount_percentage":
                discount_percentage_value = value
            elif key_lower == "discount_amount":
                discount_amount_value = value
        
        # Parse discount values if found (use context-aware parsing)
        unit_price = fields.get("unit_price")
        total_price = fields.get("total_price")
        
        # Priority order: discount_percentage_value > discount_amount_value > discount_value
        # This ensures percentage discounts are prioritized over amount discounts
        if discount_percentage_value is not None:
            parsed_amount, parsed_percentage = parse_discount_value_with_context(discount_percentage_value, unit_price, total_price)
            if parsed_amount is not None:
                fields["discount_amount"] = parsed_amount
            if parsed_percentage is not None:
                fields["discount_percentage"] = parsed_percentage
        elif discount_amount_value is not None:
            parsed_amount, parsed_percentage = parse_discount_value_with_context(discount_amount_value, unit_price, total_price)
            if parsed_amount is not None:
                fields["discount_amount"] = parsed_amount
            if parsed_percentage is not None:
                fields["discount_percentage"] = parsed_percentage
        elif discount_value is not None:
            parsed_amount, parsed_percentage = parse_discount_value_with_context(discount_value, unit_price, total_price)
            if parsed_amount is not None:
                fields["discount_amount"] = parsed_amount
            if parsed_percentage is not None:
                fields["discount_percentage"] = parsed_percentage
        
        # Store the line for pattern analysis
        all_invoice_lines.append(fields)
        table_data_list.append((row_idx, table_data))
    
    # Analyze discount pattern across all lines in the invoice
    invoice_discount_pattern = analyze_discount_pattern(all_invoice_lines)
    
    # Second pass: Process each line with the determined pattern
    for (row_idx, table_data), fields in zip(table_data_list, all_invoice_lines):
        # First, validate discount consistency to prevent both types being set
        fields = validate_discount_consistency(fields)
        
        # Apply comprehensive discount calculation with the determined pattern
        fields = process_discount_calculations(fields, invoice_discount_pattern)
        
        # Extract the calculated discount_amount for database storage
        discount_amount = fields.get("discount_amount", 0)
        discount_percentage = fields.get("discount_percentage")

        # Apply credit note logic
        fields = make_prices_negative_if_credit_note(fields, fields.get("document_type"), fields.get("invoice_number"), fields.get("product_name"))
        
        # Update discount_amount from fields if it was modified by credit note logic
        if "discount_amount" in fields:
            discount_amount = fields["discount_amount"]

        # Collect product for batch resolution
        product_name = fields.get("product_name")
        product_code = fields.get("product_code")
        
        if product_name:
            products_to_resolve.append({
                'name': product_name,
                'code': product_code,
                'supplier_id': supplier_id
            })
        
        processed_rows.append({
            'fields': fields,
            'discount_amount': discount_amount,
            'discount_percentage': discount_percentage,
            'product_name': product_name,
            'product_code': product_code
        })

    # Resolve products to categories using enhanced manual mapping
    category_results = []
    print(f"   🔍 Resolving categories for {len(products_to_resolve)} products...")
    for i, product in enumerate(products_to_resolve):
        print(f"   📦 Product {i+1}: '{product['name']}' | '{product['code']}' | '{supplier_name}'")
        category_id, mapping_id, category_pending = resolve_product_category(
            cur, 
            product['name'], 
            product['code'], 
            supplier_name, 
            org_id
        )
        category_results.append((category_id, mapping_id, category_pending))
        if category_id:
            print(f"   ✅ Resolved to category_id: {category_id}, mapping_id: {mapping_id}")
        else:
            print(f"   ⚠️ No category found - will be pending")

    # Get tax from first row (it's the same for all line items in an invoice)
    total_tax = None
    if processed_rows:
        total_tax = processed_rows[0]['fields'].get("total_tax")
    
    print(f"   📊 Extracted values:")
    print(f"      Total Amount: {total_amount}")
    print(f"      Subtotal: {subtotal}")
    print(f"      Tax: {total_tax}")
    
    # Now process all rows with resolved categories
    line_count = 0
    for i, processed_row in enumerate(processed_rows):
        category_id, category_mapping_id, category_pending = category_results[i] if i < len(category_results) else (None, None, True)
        
        # Debug: Show what category info is being inserted
        if i < 3:  # Only show first 3 for debugging
            print(f"   📋 Line {i+1}: category_id={category_id}, mapping_id={category_mapping_id}, pending={category_pending}")
        
        try:
            cur.execute("""
                INSERT INTO invoice_lines (
                    organization_id, business_unit_id, data_source_id, extracted_data_id,
                    invoice_number, invoice_date, delivery_date, due_date,
                    supplier_id, location_id, category_mapping_id, category_id,
                    product_code, description, product_category, quantity, unit_type, unit_subtype, sub_quantity,
                    unit_price, unit_price_after_discount, discount_amount, discount_percentage,
                    total_price, total_price_after_discount, total_tax,
                    supplier_pending, location_pending, category_pending,
                    document_type, currency,
                    variant_supplier_name, variant_address, variant_receiver_name, variant_receiver_address,
                    total_amount, subtotal
                ) VALUES (
                    %s, %s, %s, %s,
                    %s, %s, %s, %s,
                    %s, %s, %s, %s,
                    %s, %s, %s, %s, %s, %s, %s,
                    %s, %s, %s, %s,
                    %s, %s, %s,
                    %s, %s, %s,
                    %s, %s,
                    %s, %s, %s, %s,
                    %s, %s
                )
            """, (
                org_id, business_unit_id, source_id, ed_id,
                processed_row['fields'].get("invoice_number"), processed_row['fields'].get("invoice_date"), 
                processed_row['fields'].get("delivery_date"), processed_row['fields'].get("due_date"),
                supplier_id, location_id, category_mapping_id, category_id,
                processed_row['fields'].get("product_code"), processed_row['fields'].get("product_name"), 
                processed_row['fields'].get("product_category"), processed_row['fields'].get("quantity"),
                processed_row['fields'].get("unit_type"), processed_row['fields'].get("unit_subtype"), 
                processed_row['fields'].get("sub_quantity"),
                processed_row['fields'].get("unit_price"), processed_row['fields'].get("unit_price_after_discount"),
                processed_row['discount_amount'], processed_row['discount_percentage'],
                processed_row['fields'].get("total_price"), processed_row['fields'].get("total_price_after_discount"),
                processed_row['fields'].get("total_tax"),
                supplier_pending, location_pending, category_pending,
                processed_row['fields'].get("document_type"), processed_row['fields'].get("currency"),
                supplier_name, supplier_address, receiver_name, receiver_address,
                total_amount, subtotal
            ))
            line_count += 1
            print(f"   ✅ Inserted invoice_line {i+1}/{len(processed_rows)}")
            
        except Exception as e:
            print(f"   ❌ Failed to insert invoice_line {i+1}: {e}")
            print(f"   📋 Row data: {processed_row}")
            # Mark this record as failed and return
            cur.execute("""
                UPDATE extracted_data 
                SET status = 'failed', processed_at = now()
                WHERE id = %s
            """, (ed_id,))
            print(f"   🔄 Marked extracted_data {ed_id} as failed due to insertion error")
            return False  # Return False to indicate failure

    # Update extracted_data with extracted totals and mark as processed
    cur.execute("""
        UPDATE extracted_data 
        SET 
            status = 'processed', 
            processed_at = now()
        WHERE id = %s
    """, (ed_id,))
    print(f"✅ Processed extracted_data.id={ed_id} with {line_count} line(s).")
    print(f"   📊 Extracted values: total_amount={total_amount}, subtotal={subtotal}, tax={total_tax}")
    
    # Check if processed_tracker was updated by the trigger, and update manually if needed
    # Get the document_id from extracted_data.external_id (remove .pdf suffix)
    cur.execute("""
        SELECT external_id 
        FROM extracted_data 
        WHERE id = %s
    """, (ed_id,))
    external_id_result = cur.fetchone()
    
    if external_id_result and external_id_result[0]:
        external_id = external_id_result[0]
        # Remove .pdf suffix to get the actual document_id
        document_id = external_id.replace('.pdf', '') if external_id.endswith('.pdf') else external_id
        
        # First, verify that invoice_lines were actually inserted for this extracted_data
        cur.execute("""
            SELECT COUNT(*) 
            FROM invoice_lines 
            WHERE extracted_data_id = %s AND organization_id = %s
        """, (ed_id, org_id))
        invoice_lines_count = cur.fetchone()[0]
        
        # Get location_id from the invoice_lines (if any were created)
        location_id = None
        if invoice_lines_count > 0:
            cur.execute("""
                SELECT location_id 
                FROM invoice_lines 
                WHERE extracted_data_id = %s AND organization_id = %s
                LIMIT 1
            """, (ed_id, org_id))
            location_result = cur.fetchone()
            location_id = location_result[0] if location_result else None
        
        if invoice_lines_count > 0:
            print(f"   ✅ Verified {invoice_lines_count} invoice_lines inserted for extracted_data {ed_id}")
            
            # First, try to find the processed_tracker record that matches the invoice_lines location_id
            cur.execute("""
                SELECT status, updated_at, location_id as tracker_location_id
                FROM processed_tracker 
                WHERE document_id = %s AND organization_id = %s
                AND location_id = %s
                ORDER BY updated_at DESC 
                LIMIT 1
            """, (document_id, org_id, location_id))
            tracker_result = cur.fetchone()
            
            if tracker_result:
                status, updated_at, tracker_location_id = tracker_result
                print(f"   📊 processed_tracker status: {status} (updated: {updated_at}, location_id: {tracker_location_id})")
                
                # If status is still 'processing' or 'pending', update it to 'processed'
                if status in ['processing', 'pending']:
                    print(f"   🔄 Updating processed_tracker status to 'processed' (invoice_lines confirmed)")
                    cur.execute("""
                        UPDATE processed_tracker 
                        SET status = 'processed', updated_at = now()
                        WHERE document_id = %s AND organization_id = %s
                        AND location_id = %s
                        AND status IN ('pending', 'processing')
                    """, (document_id, org_id, location_id))
                    print(f"   ✅ processed_tracker status updated to 'processed'")
                elif status == 'processed':
                    print(f"   ✅ processed_tracker already marked as 'processed'")
                else:
                    print(f"   ⚠️ processed_tracker has unexpected status: {status}")
            else:
                print(f"   ⚠️ No processed_tracker record found for document_id: {document_id} with location_id: {location_id}")
                # Try to find ANY processed_tracker record for this document_id to see what's there
                cur.execute("""
                    SELECT status, updated_at, location_id
                    FROM processed_tracker 
                    WHERE document_id = %s AND organization_id = %s
                    ORDER BY updated_at DESC
                """, (document_id, org_id))
                all_tracker_records = cur.fetchall()
                if all_tracker_records:
                    print(f"   📋 Found {len(all_tracker_records)} other processed_tracker record(s) for this document_id:")
                    for i, (status, updated_at, loc_id) in enumerate(all_tracker_records):
                        print(f"      Record {i+1}: status={status}, location_id={loc_id}, updated={updated_at}")
                else:
                    print(f"   ❌ No processed_tracker records found at all for document_id: {document_id}")
        else:
            print(f"   ❌ No invoice_lines found for extracted_data {ed_id} - NOT updating processed_tracker status")
            # Mark as failed since no invoice_lines were inserted
            cur.execute("""
                UPDATE processed_tracker 
                SET status = 'failed', updated_at = now()
                WHERE document_id = %s AND organization_id = %s
                AND (location_id = %s OR (location_id IS NULL AND %s IS NULL))
                AND status IN ('pending', 'processing')
            """, (document_id, org_id, location_id, location_id))
            print(f"   🔄 Marked processed_tracker as 'failed' due to missing invoice_lines")
    else:
        print(f"   ⚠️ No external_id found in extracted_data {ed_id} to check processed_tracker")

def main():
    rows = get_non_processed_rows()
    print(f"🔄 Found {len(rows)} non-processed rows to process.")
    
    if len(rows) == 0:
        print("ℹ️ No non-processed rows to process.")
        return
    
    # Get fresh cursor for processing
    cur = get_cursor()
    # Note: Now using simple manual category mapping instead of complex product matching
    
    processed_count = 0
    for row in rows:
        try:
            mappings = get_mappings_for_source(row[4], cur)
            success = transform_row_optimized(row, mappings, None, cur)  # Pass the same cursor
            if success is not False:  # Only count as processed if not explicitly failed
                processed_count += 1
                # Commit after each successful record to prevent rollback of successful records
                conn.commit()
                print(f"   💾 Committed successful processing of record {row[0][:8]}...")
        except Exception as e:
            print(f"❌ Error processing row {row[0]}: {e}")
            print("🔄 Rolling back transaction for this record only...")
            conn.rollback()
            # Get fresh cursor after rollback
            cur = get_cursor()
            continue
    
    print(f"✅ All rows processed. Successfully processed {processed_count} rows.")
    print("ℹ️ Note: Each successful record was committed individually to prevent rollback issues.")
    
    return processed_count

def clean_text(text):
    if not text:
        return ""
    text = text.lower().strip()
    import unicodedata, re
    text = unicodedata.normalize("NFKD", text).encode("ascii", "ignore").decode("utf-8")
    text = re.sub(r'\s+', ' ', text)  # Collapse whitespace
    text = re.sub(r'[^\w\s,]', '', text)  # Remove special chars except commas
    return text

if __name__ == "__main__":
    main()
