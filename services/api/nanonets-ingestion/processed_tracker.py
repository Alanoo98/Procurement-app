import json
import requests
from pathlib import Path
from config import ECONOMIC_APP_SECRET, ECONOMIC_GRANT_TOKEN

PROCESSED_DIR = Path("processed")
PROCESSED_DIR.mkdir(exist_ok=True)

PENDING_DIR = Path("pending")
PENDING_DIR.mkdir(exist_ok=True)

def get_agreement_identifier() -> str:
    url = "https://restapi.e-conomic.com/self"
    headers = {
        'X-AppSecretToken': ECONOMIC_APP_SECRET,
        'X-AgreementGrantToken': ECONOMIC_GRANT_TOKEN
    }
    response = requests.get(url, headers=headers, timeout=10)
    response.raise_for_status()
    data = response.json()
    name = data.get("company", {}).get("name", "").replace(" ", "_")
    number = data.get("agreementNumber")
    return f"{name}_{number}"

def get_processed_file() -> Path:
    org_id = get_agreement_identifier()
    return PROCESSED_DIR / f"{org_id}.json"

def get_pending_file() -> Path:
    org_id = get_agreement_identifier()
    return PENDING_DIR / f"{org_id}.json"

def load_json(file_path: Path):
    if file_path.exists() and file_path.read_text().strip():
        return json.loads(file_path.read_text())
    return []

def save_json(data, file_path: Path):
    file_path.write_text(json.dumps(sorted(data, key=lambda x: x["key"]), indent=2))

def load_processed_entries():
    return load_json(get_processed_file())

def load_pending_entries():
    return load_json(get_pending_file())

def save_processed_entry(year: int, document_id: int, filename: str):
    key = build_key(year, document_id)
    entries = load_processed_entries()
    if not any(e["key"] == key for e in entries):
        entries.append({"key": key, "filename": filename})
        save_json(entries, get_processed_file())

def save_pending_entry(year: int, document_id: int, filename: str):
    key = build_key(year, document_id)
    entries = load_pending_entries()
    if not any(e["key"] == key for e in entries):
        entries.append({"key": key, "filename": filename})
        save_json(entries, get_pending_file())

def remove_pending_entry(year: int, document_id: int):
    key = build_key(year, document_id)
    entries = load_pending_entries()
    entries = [e for e in entries if e["key"] != key]
    save_json(entries, get_pending_file())

def has_been_processed(year: int, document_id: int) -> bool:
    key = build_key(year, document_id)
    return any(e["key"] == key for e in load_processed_entries())

def is_pending(year: int, document_id: int) -> bool:
    key = build_key(year, document_id)
    return any(e["key"] == key for e in load_pending_entries())

def build_key(year: int, document_id: int) -> str:
    return f"{year}:{get_agreement_identifier()}:{document_id}"
