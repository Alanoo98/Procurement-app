import subprocess
from fastapi import FastAPI, Request, HTTPException
from dotenv import load_dotenv
import os
import requests
import json

load_dotenv()

app = FastAPI()
API_KEY = os.getenv("API_KEY")
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

@app.get("/")
def healthcheck():
    return {"status": "ok"}

def call_etl_completion_webhook(organization_id=None, processed_count=0):
    """Call the ETL completion webhook to update processed_tracker statuses"""
    if not SUPABASE_URL or not SUPABASE_SERVICE_ROLE_KEY:
        print("⚠️ Missing Supabase credentials, skipping webhook call")
        return
    
    webhook_url = f"{SUPABASE_URL}/functions/v1/etl-completion-webhook"
    
    payload = {
        "status": "completed",
        "timestamp": "2024-01-01T00:00:00Z",  # Will be set by webhook
        "organization_id": organization_id,
        "processed_count": processed_count
    }
    
    headers = {
        "Authorization": f"Bearer {SUPABASE_SERVICE_ROLE_KEY}",
        "Content-Type": "application/json"
    }
    
    try:
        print(f"🔄 Calling ETL completion webhook: {webhook_url}")
        response = requests.post(webhook_url, json=payload, headers=headers)
        
        if response.status_code == 200:
            result = response.json()
            print(f"✅ ETL completion webhook successful: {result}")
        else:
            print(f"❌ ETL completion webhook failed: {response.status_code} - {response.text}")
            
    except Exception as e:
        print(f"❌ Error calling ETL completion webhook: {e}")

@app.post("/run-etl")
def run_etl(request: Request):
    auth = request.headers.get("Authorization")
    if auth != f"Bearer {API_KEY}":
        raise HTTPException(status_code=401, detail="Unauthorized")

    # Make sure this file path is relative to where `main.py` runs
    result = subprocess.run(["python", "transform_and_insert.py"], capture_output=True, text=True)
    
    # Call ETL completion webhook if ETL was successful
    if result.returncode == 0:
        print("🎉 ETL completed successfully, calling completion webhook...")
        print("ETL Output:", result.stdout)
        
        # Try to extract processed count from output
        processed_count = 0
        for line in result.stdout.split('\n'):
            if "Successfully processed" in line and "rows" in line:
                try:
                    # Extract number from "Successfully processed X rows"
                    parts = line.split()
                    for i, part in enumerate(parts):
                        if part == "processed" and i + 1 < len(parts):
                            processed_count = int(parts[i + 1])
                            break
                except (ValueError, IndexError):
                    pass
        
        call_etl_completion_webhook(processed_count=processed_count)
    else:
        print(f"❌ ETL failed with return code: {result.returncode}")
        print("ETL Error:", result.stderr)
    
    return {
        "status": "triggered",
        "returncode": result.returncode
    }
