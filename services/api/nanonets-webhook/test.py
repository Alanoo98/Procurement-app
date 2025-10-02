import json
from pathlib import Path
from pydantic import BaseModel
from typing import Optional, List, Dict, Any

# --- Models ---
class PredictionField(BaseModel):
    label: str
    ocr_text: Optional[str] = None
    type: Optional[str] = None
    cells: Optional[List[Dict[str, Any]]] = None

class DocumentPayload(BaseModel):
    input: str
    prediction: List[PredictionField]

# --- Simplify logic (same as used in webhook) ---
def simplify_prediction(predictions: List[PredictionField]) -> List[dict]:
    simplified = []
    seen_labels = set()
    table_rows = []
    table_columns = set()

    for field in predictions:
        label = field.label.strip().lower()

        # TABLE HANDLING
        if field.type == "table" and field.cells:
            row_map = {}
            for cell in field.cells:
                row = cell.get("row")
                col_label = cell.get("label", "").strip().lower()
                text = cell.get("text", "")
                if row is not None and col_label:
                    row_map.setdefault(row, {})[col_label] = text
                    table_columns.add(col_label)
            for row_idx in sorted(row_map.keys()):
                table_rows.append([
                    row_map[row_idx].get(col, "") for col in sorted(table_columns)
                ])

        # FLAT FIELD HANDLING (de-duplication)
        elif label not in seen_labels:
            simplified.append({
                "label": label,
                "ocr_text": field.ocr_text or ""
            })
            seen_labels.add(label)

    # Add final table if rows were collected
    if table_rows:
        simplified.append({
            "label": "table",
            "type": "table",
            "columns": sorted(table_columns),
            "rows": table_rows
        })

    print("📦 Simplified payload size:", len(json.dumps(simplified)), "bytes")
    return simplified

# --- Load payload ---
path = Path(__file__).parent / "test_payload.json"
with path.open(encoding="utf-8") as f:
    raw_data = json.load(f)

print("📦 Top-level keys:", list(raw_data.keys()))

try:
    # Compatible with current Nanonets structure (dict-style `result`)
    document = raw_data.get("result")
    if not document or not isinstance(document, dict):
        raise ValueError("❌ Expected 'result' to be a dictionary containing 'input' and 'prediction'.")

    print("🔍 Document keys:", list(document.keys()))
    parsed = DocumentPayload(**document)

    print(f"✅ Parsed document for file: {parsed.input}")
    print(f"🔢 Found {len(parsed.prediction)} prediction fields")

    # Preview simplified
    simplified = simplify_prediction(parsed.prediction)
    print(f"\n📄 Simplified output ({len(simplified)} items):")
    print(json.dumps(simplified, indent=2, ensure_ascii=False))

except Exception as e:
    print("❌ Failed to parse or process payload:")
    print(e)
