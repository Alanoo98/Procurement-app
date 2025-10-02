import sys
import time
import json
from pathlib import Path
from economic_client import fetch_pdf_economic
from nanonets_client import send_pdf_to_nanonets
from processed_tracker import (
    has_been_processed,
    save_processed_entry,
    get_agreement_identifier,
    remove_pending_entry,
    save_pending_entry,
)
from formatter import beautify_nanonets_response

FAILED_DIR = Path("failed_documents")

def get_failed_file():
    agreement = get_agreement_identifier()
    return FAILED_DIR / f"{agreement}_failed.json"

def load_failed_ids():
    failed_file = get_failed_file()
    if failed_file.exists():
        return set(json.loads(failed_file.read_text()))
    return set()

def save_failed_ids(failed_ids):
    failed_file = get_failed_file()
    failed_file.write_text(json.dumps(sorted(failed_ids), indent=2))

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python retry_failed.py <ACCOUNTING_YEAR> [async: true|false]")
        sys.exit(1)

    year = int(sys.argv[1])
    async_flag = True
    if len(sys.argv) >= 3 and sys.argv[2].lower() in ("true", "false"):
        async_flag = sys.argv[2].lower() == "true"

    failed_ids = load_failed_ids()
    still_failed = set()

    for doc_id in failed_ids:
        if has_been_processed(year, doc_id):
            print(f"✅ Already processed: {doc_id}")
            continue

        filename = f"{doc_id}.pdf"
        save_pending_entry(year, doc_id, filename)

        try:
            pdf_data = fetch_pdf_economic(doc_id)
            result = send_pdf_to_nanonets(pdf_data, filename=filename, async_mode=async_flag)

            if result.get("message") in ("Success", "TimeoutAssumedSuccess"):
                print(f"✅ Success for {doc_id} (reprocessed)")
                save_processed_entry(year, doc_id, filename)
            else:
                print(f"❌ Still failed: {doc_id}")
                still_failed.add(doc_id)
        except Exception as e:
            print(f"💥 Exception for {doc_id}: {e}")
            still_failed.add(doc_id)
        finally:
            remove_pending_entry(year, doc_id)
            time.sleep(0.3)

    save_failed_ids(still_failed)
    print(f"\n🔁 Retry complete. Remaining failures: {len(still_failed)}")
