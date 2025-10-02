import json
import requests
import time
from pathlib import Path
from config import ECONOMIC_APP_SECRET, ECONOMIC_GRANT_TOKEN, ECONOMIC_BASE_URL


def get_cursor_file() -> Path:
    from processed_tracker import get_agreement_identifier
    org = get_agreement_identifier()
    return Path(f"cursor_state_{org}.json")

CURSOR_FILE = get_cursor_file()

def load_cursor() -> str:
    if CURSOR_FILE.exists():
        try:
            content = CURSOR_FILE.read_text().strip()
            if not content:
                return None
            return json.loads(content).get("cursor")
        except Exception as e:
            print(f"⚠️ Failed to load cursor: {e}")
            return None
    return None

def save_cursor(cursor: str):
    CURSOR_FILE.write_text(json.dumps({"cursor": cursor}, indent=2))

def safe_get(url, headers, retries=3, backoff_factor=0.5, timeout=10):
    for attempt in range(retries):
        try:
            response = requests.get(url, headers=headers, timeout=timeout)
            if response.status_code in (502, 503, 429):
                wait = backoff_factor * (2 ** attempt)
                print(f"⚠️ Retry {attempt+1} after {wait:.1f}s (Status: {response.status_code})")
                time.sleep(wait)
                continue
            response.raise_for_status()
            return response
        except requests.exceptions.RequestException as e:
            print(f"⚠️ Error on attempt {attempt+1}: {e}")
            time.sleep(backoff_factor * (2 ** attempt))
    raise Exception(f"❌ Failed to GET {url} after {retries} attempts.")

def get_document_ids(year: int, limit: int, resume: bool = True):
    headers = {
        'X-AppSecretToken': ECONOMIC_APP_SECRET,
        'X-AgreementGrantToken': ECONOMIC_GRANT_TOKEN,
    }

    document_ids = []
    cursor = load_cursor() if resume else None
    seen_cursors = set()

    while len(document_ids) < limit:
        if cursor:
            if cursor in seen_cursors:
                print("⚠️ Cursor repeated — breaking to prevent infinite loop.")
                break
            seen_cursors.add(cursor)
            url = f"{ECONOMIC_BASE_URL}/AttachedDocuments?filter=accountingYear$eq:{year}&cursor={cursor}"
        else:
            url = f"{ECONOMIC_BASE_URL}/AttachedDocuments?filter=accountingYear$eq:{year}"

        response = safe_get(url, headers)
        data = response.json()

        for item in data.get("items", []):
            document_ids.append(item["number"])
            if len(document_ids) >= limit:
                break

        cursor = data.get("cursor")
        if cursor:
            save_cursor(cursor)
        print(f"📥 Total so far: {len(document_ids)}. Next cursor: {cursor}")
        time.sleep(0.5)

        if not cursor:
            break

    return document_ids

def fetch_pdf_economic(document_id: int) -> bytes:
    url = f"{ECONOMIC_BASE_URL}/AttachedDocuments/{document_id}/pdf"
    headers = {
        'X-AppSecretToken': ECONOMIC_APP_SECRET,
        'X-AgreementGrantToken': ECONOMIC_GRANT_TOKEN,
    }
    response = safe_get(url, headers)
    time.sleep(0.5)
    return response.content
