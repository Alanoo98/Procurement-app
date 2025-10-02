import json
from pathlib import Path

TRACKER_FILE = Path("processed_documents.json")

def migrate_to_structured_format():
    if not TRACKER_FILE.exists():
        print("❌ No tracker file found.")
        return

    raw_data = TRACKER_FILE.read_text().strip()
    if not raw_data:
        print("ℹ️ Tracker file is empty. Nothing to migrate.")
        return

    data = json.loads(raw_data)

    # If already in structured format, skip
    if isinstance(data, list) and isinstance(data[0], dict) and "key" in data[0]:
        print("✅ Tracker is already structured.")
        return

    migrated = []
    for entry in data:
        if isinstance(entry, str):
            key = entry
            doc_id = key.split(":")[-1]
            migrated.append({
                "key": key,
                "filename": f"{doc_id}.pdf"
            })

    TRACKER_FILE.write_text(json.dumps(migrated, indent=2))
    print(f"✅ Migrated {len(migrated)} entries to structured format.")

if __name__ == "__main__":
    migrate_to_structured_format()
