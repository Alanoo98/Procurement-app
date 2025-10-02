from economic_client import get_document_ids, fetch_pdf_economic
from nanonets_client import send_pdf_to_nanonets
from processed_tracker import (
    has_been_processed,
    is_pending,
    save_pending_entry,
    remove_pending_entry,
    save_processed_entry,
    get_agreement_identifier,
    mark_failed_entry,
    load_pending_entries,
    load_processed_entries,
)
from config import get_grant_tokens
import time
import sys

def initialize_pending_entries(grant_token, year, org_id):
    # Fetch all document_ids for the year and insert as 'pending' if not present
    document_ids = get_document_ids(year, 10000, grant_token, org_id)  # Large limit to get all
    processed = {e['document_id'] for e in load_processed_entries(org_id)}
    pending = {e['document_id'] for e in load_pending_entries(org_id)}
    for doc_id in document_ids:
        if doc_id not in processed and doc_id not in pending:
            save_pending_entry(year, doc_id, filename=f"{doc_id}.pdf", org_id=org_id)

def process_document(doc_id, year, async_flag, grant_token, org_id):
    filename = f"{doc_id}.pdf"
    try:
        pdf_data = fetch_pdf_economic(doc_id, grant_token)
        result = send_pdf_to_nanonets(pdf_data, filename=filename, async_mode=async_flag)
        if result.get("message") in ("Success", "TimeoutAssumedSuccess"):
            print(f"✅ Success for {doc_id} (including assumed)")
            save_processed_entry(year, doc_id, filename, org_id)
        else:
            print(f"❌ Upload failed for {doc_id}")
            mark_failed_entry(year, doc_id, filename, org_id)
    except Exception as e:
        print(f"💥 Exception for {doc_id}: {e}")
        mark_failed_entry(year, doc_id, filename, org_id)
    finally:
        remove_pending_entry(year, doc_id, org_id)
        time.sleep(0.3)

def ingest_for_restaurant(grant_token, year, limit, async_flag):
    org_id = get_agreement_identifier(grant_token)
    initialize_pending_entries(grant_token, year, org_id)
    # Get all pending or failed entries
    pending_entries = [e for e in load_pending_entries(org_id)]
    failed_entries = []  # Optionally, you can add a function to load failed entries from Supabase
    to_process = pending_entries + failed_entries
    if limit:
        to_process = to_process[:limit]
    for entry in to_process:
        doc_id = entry['document_id']
        process_document(doc_id, year, async_flag, grant_token, org_id)

def main():
    if len(sys.argv) < 3:
        print("Usage: python main.py <ACCOUNTING_YEAR> <NUM_DOCUMENTS> [async: true|false]")
        sys.exit(1)
    year = int(sys.argv[1])
    limit = int(sys.argv[2])
    async_flag = True
    if len(sys.argv) >= 4 and sys.argv[3].lower() in ("true", "false"):
        async_flag = sys.argv[3].lower() == "true"
    grant_tokens = get_grant_tokens()
    for grant_token in grant_tokens:
        print(f"\n🚀 Processing restaurant with token: {grant_token[:8]}...\n")
        ingest_for_restaurant(grant_token, year, limit, async_flag)
        time.sleep(60)  # Wait 1 minute between restaurants

if __name__ == "__main__":
    main() 