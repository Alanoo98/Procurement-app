from fastapi import FastAPI, Request, HTTPException
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
import os
import json
import psycopg2
from dotenv import load_dotenv
from uuid import uuid4
from datetime import datetime
import traceback

# Load environment variables
load_dotenv()
app = FastAPI()

@app.get("/")
async def root():
    return {"message": "Nanonets webhook is live!"}

@app.get("/healthz")
async def health_check():
    """Health check endpoint for Render monitoring"""
    # Simple health check - just return OK without database query
    # This prevents excessive database load from frequent health checks
    return {"status": "healthy"}

@app.get("/healthz/detailed")
async def detailed_health_check():
    """Detailed health check with database connectivity test"""
    try:
        # Test database connection
        cur.execute("SELECT 1")
        return {"status": "healthy", "database": "connected"}
    except Exception as e:
        return {"status": "unhealthy", "database": "disconnected", "error": str(e)}

# --- DB connection ---
conn = psycopg2.connect(os.getenv("DATABASE_URL"))
cur = conn.cursor()

# --- Constants ---
MODEL_ID = os.getenv("NANONETS_MODEL_ID")
DEFAULT_ORG_ID = os.getenv("DEFAULT_ORG_ID")

# --- Models ---
class PredictionField(BaseModel):
    label: str
    ocr_text: Optional[str] = None
    type: Optional[str] = None
    score: Optional[float] = None
    cells: Optional[List[Dict[str, Any]]] = None

class DocumentPayload(BaseModel):
    input: str
    prediction: List[PredictionField]

# --- Helpers ---
def get_data_source_id_from_model_id(model_id: str) -> Optional[str]:
    cur.execute("SELECT id FROM data_sources WHERE config->>'nanonets_model_id' = %s", (model_id,))
    row = cur.fetchone()
    return row[0] if row else None

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

# --- Webhook Endpoint ---
@app.post("/webhook")
async def nanonets_webhook(request: Request):
    try:
        data = await request.json()

        # Handle dictionary-style 'result' format from Nanonets (Per Document export)
        try:
            result = data.get("result", {})
            if not isinstance(result, dict) or "input" not in result or "prediction" not in result:
                raise ValueError("Missing or invalid 'result' dict")
            payload = DocumentPayload(**result)
        except Exception as e:
            print("❌ Payload parsing error:", str(e))
            raise HTTPException(status_code=400, detail=f"Malformed Nanonets webhook: {e}")

        data_source_id = get_data_source_id_from_model_id(MODEL_ID)
        if not data_source_id:
            raise HTTPException(status_code=400, detail="Could not find data_source for this model")

        cleaned_data = simplify_prediction(payload.prediction)

        cur.execute("""
            INSERT INTO extracted_data (
                id, external_id, data, status,
                organization_id, business_unit_id, data_source_id,
                created_at, updated_at
            ) VALUES (%s, %s, %s, %s, %s, NULL, %s, %s, %s)
        """, (
            str(uuid4()),
            payload.input,
            json.dumps(cleaned_data),
            "pending",
            DEFAULT_ORG_ID,
            data_source_id,
            datetime.utcnow(),
            datetime.utcnow()
        ))
        conn.commit()

        print(f"✅ Document {payload.input} stored in extracted_data.")
        return {"success": True, "message": f"✅ Document {payload.input} saved."}

    except Exception as e:
        print("🔥 Unexpected webhook error:", str(e))
        traceback.print_exc()  # <-- This prints the full traceback to the console/logs

        # Optionally, log the incoming request data for context
        try:
            body = await request.body()
            print("🔎 Raw request body:", body.decode("utf-8"))
        except Exception as log_exc:
            print("⚠️ Could not log request body:", log_exc)

        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

    except psycopg2.Error as db_err:
        print("🔥 Database error:", db_err)
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Database error: {db_err.pgerror}")
