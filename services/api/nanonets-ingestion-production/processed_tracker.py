import json
import requests
from pathlib import Path
from config import ECONOMIC_APP_SECRET
import os
from datetime import datetime

PROCESSED_DIR = Path("processed")
PROCESSED_DIR.mkdir(exist_ok=True)

PENDING_DIR = Path("pending")
PENDING_DIR.mkdir(exist_ok=True)

SUPABASE_URL = os.getenv('SUPABASE_URL')
SUPABASE_KEY = os.getenv('SUPABASE_KEY')
SUPABASE_TABLE = 'processed_tracker'

HEADERS = {
    'apikey': SUPABASE_KEY,
    'Authorization': f'Bearer {SUPABASE_KEY}',
    'Content-Type': 'application/json',
}

def get_agreement_identifier(grant_token) -> str:
    url = "https://restapi.e-conomic.com/self"
    headers = {
        'X-AppSecretToken': ECONOMIC_APP_SECRET,
        'X-AgreementGrantToken': grant_token
    }
    response = requests.get(url, headers=headers, timeout=10)
    response.raise_for_status()
    data = response.json()
    name = data.get("company", {}).get("name", "").replace(" ", "_")
    number = data.get("agreementNumber")
    return f"{name}_{number}"

def get_processed_file(org_id) -> Path:
    return PROCESSED_DIR / f"{org_id}.json"

def get_pending_file(org_id) -> Path:
    return PENDING_DIR / f"{org_id}.json"

def load_json(file_path: Path):
    if file_path.exists() and file_path.read_text().strip():
        return json.loads(file_path.read_text())
    return []

def save_json(data, file_path: Path):
    file_path.write_text(json.dumps(sorted(data, key=lambda x: x["key"]), indent=2))

def load_processed_entries(org_id):
    url = f"{SUPABASE_URL}/rest/v1/{SUPABASE_TABLE}?organization_id=eq.{org_id}&status=eq.processed"
    r = requests.get(url, headers=HEADERS)
    r.raise_for_status()
    return r.json()

def load_pending_entries(org_id):
    url = f"{SUPABASE_URL}/rest/v1/{SUPABASE_TABLE}?organization_id=eq.{org_id}&status=eq.pending"
    r = requests.get(url, headers=HEADERS)
    r.raise_for_status()
    return r.json()

def save_processed_entry(year: int, document_id: int, filename: str, org_id):
    url = f"{SUPABASE_URL}/rest/v1/{SUPABASE_TABLE}"
    payload = {
        "document_id": document_id,
        "accounting_year": year,
        "organization_id": org_id,
        "filename": filename,
        "status": "processed",
        "updated_at": datetime.utcnow().isoformat() + 'Z',
    }
    # Upsert (insert or update)
    r = requests.post(url, headers={**HEADERS, 'Prefer': 'resolution=merge-duplicates'}, json=payload)
    r.raise_for_status()

def save_pending_entry(year: int, document_id: int, filename: str, org_id):
    url = f"{SUPABASE_URL}/rest/v1/{SUPABASE_TABLE}"
    payload = {
        "document_id": document_id,
        "accounting_year": year,
        "organization_id": org_id,
        "filename": filename,
        "status": "pending",
        "updated_at": datetime.utcnow().isoformat() + 'Z',
    }
    r = requests.post(url, headers={**HEADERS, 'Prefer': 'resolution=merge-duplicates'}, json=payload)
    r.raise_for_status()

def remove_pending_entry(year: int, document_id: int, org_id):
    url = f"{SUPABASE_URL}/rest/v1/{SUPABASE_TABLE}?document_id=eq.{document_id}&accounting_year=eq.{year}&organization_id=eq.{org_id}&status=eq.pending"
    r = requests.delete(url, headers=HEADERS)
    r.raise_for_status()

def has_been_processed(year: int, document_id: int, org_id) -> bool:
    url = f"{SUPABASE_URL}/rest/v1/{SUPABASE_TABLE}?document_id=eq.{document_id}&accounting_year=eq.{year}&organization_id=eq.{org_id}&status=eq.processed"
    r = requests.get(url, headers=HEADERS)
    r.raise_for_status()
    data = r.json()
    return len(data) > 0

def is_pending(year: int, document_id: int, org_id) -> bool:
    url = f"{SUPABASE_URL}/rest/v1/{SUPABASE_TABLE}?document_id=eq.{document_id}&accounting_year=eq.{year}&organization_id=eq.{org_id}&status=eq.pending"
    r = requests.get(url, headers=HEADERS)
    r.raise_for_status()
    data = r.json()
    return len(data) > 0

def build_key(year: int, document_id: int, org_id) -> str:
    return f"{year}:{org_id}:{document_id}"

def mark_failed_entry(year: int, document_id: int, filename: str, org_id: str):
    url = f"{SUPABASE_URL}/rest/v1/{SUPABASE_TABLE}"
    payload = {
        "document_id": document_id,
        "accounting_year": year,
        "organization_id": org_id,
        "filename": filename,
        "status": "failed",
        "updated_at": datetime.utcnow().isoformat() + 'Z',
    }
    r = requests.post(url, headers={**HEADERS, 'Prefer': 'resolution=merge-duplicates'}, json=payload)
    r.raise_for_status() 