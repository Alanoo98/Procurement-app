from economic_client import get_document_ids, fetch_pdf_economic
from nanonets_client import send_pdf_to_nanonets
from processed_tracker import (
    has_been_processed,
    is_pending,
    save_pending_entry,
    remove_pending_entry,
    save_processed_entry,
    get_agreement_identifier,
    load_processed_entries,
    load_pending_entries,
)
from formatter import beautify_nanonets_response
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor, as_completed
import time
import json
import sys
import signal


CURSOR_FILE = Path("cursor_state.json")
FAILED_DIR = Path("failed_documents")
FAILED_DIR.mkdir(exist_ok=True)

def get_failed_file():
    agreement = get_agreement_identifier()
    return FAILED_DIR / f"{agreement}_failed.json"

def load_failed_ids():
    failed_file = get_failed_file()
    if failed_file.exists():
        return set(json.loads(failed_file.read_text()))
    return set()

def save_failed_id(doc_id):
    failed_file = get_failed_file()
    failed = load_failed_ids()
    failed.add(doc_id)
    failed_file.write_text(json.dumps(sorted(failed), indent=2))

def process_document(doc_id, year, async_flag):
    filename = f"{doc_id}.pdf"
    save_pending_entry(year, doc_id, filename)

    try:
        pdf_data = fetch_pdf_economic(doc_id)
        result = send_pdf_to_nanonets(pdf_data, filename=filename, async_mode=async_flag)

        if result.get("message") in ("Success", "TimeoutAssumedSuccess"):
            print(f"✅ Success for {doc_id} (including assumed)")
            print(result)
            print(beautify_nanonets_response(result))
            if async_flag:
                print("🔄 Async mode: result will be processed later.")
            else:
                print("📥 Synchronous mode: result is ready now.")
            save_processed_entry(year, doc_id, filename)
        else:
            print(f"❌ Upload failed for {doc_id}")
            save_failed_id(doc_id)

    except Exception as e:
        print(f"💥 Exception for {doc_id}: {e}")
        save_failed_id(doc_id)
    finally:
        remove_pending_entry(year, doc_id)
        time.sleep(0.3)


stop_requested = False

def handle_sigint(sig, frame):
    global stop_requested
    print("\n🛑 Stop requested by user. Finishing current document and exiting...")
    stop_requested = True

signal.signal(signal.SIGINT, handle_sigint)

if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Usage: python main.py <ACCOUNTING_YEAR> <NUM_DOCUMENTS> [async: true|false] [--reset-cursor]")
        sys.exit(1)

    year = int(sys.argv[1])
    limit = int(sys.argv[2])
    async_flag = True
    if len(sys.argv) >= 4 and sys.argv[3].lower() in ("true", "false"):
        async_flag = sys.argv[3].lower() == "true"

    reset_cursor = "--reset-cursor" in sys.argv
    if reset_cursor and CURSOR_FILE.exists():
        CURSOR_FILE.unlink()
        print("🗑️  Cursor reset: starting from the beginning.")

    resume_cursor = not reset_cursor
    document_ids = get_document_ids(year, limit, resume=resume_cursor)

    # Pre-load filters
    processed_keys = set(e["key"] for e in load_processed_entries())
    pending_keys = set(e["key"] for e in load_pending_entries())
    agreement = get_agreement_identifier()

    def is_skippable(doc_id):
        key = f"{year}:{agreement}:{doc_id}"
        return key in processed_keys or key in pending_keys

    filtered_ids = [doc_id for doc_id in document_ids if not is_skippable(doc_id)]
    print(f"🚀 Ready to process {len(filtered_ids)} documents (filtered from {len(document_ids)})")

    with ThreadPoolExecutor(max_workers=4) as executor:
        futures = []
        for doc_id in filtered_ids:
            if stop_requested:
                print("⏹️ Aborting further processing due to user interrupt.")
                break
            futures.append(executor.submit(process_document, doc_id, year, async_flag))

        try:
            for _ in as_completed(futures):
                if stop_requested:
                    break
        except KeyboardInterrupt:
            print("⚠️ Interrupted — shutting down...")

