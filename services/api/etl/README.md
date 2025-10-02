# ETL Pipeline

This repository contains the ETL logic for transforming and inserting invoice data into the procurement system. The main processing script is `transform_and_insert.py`, which extracts `pending` records from `extracted_data`, applies mapping and normalization rules, and inserts structured rows into the `invoice_lines` table.

---

## ✅ Current Functionality

### Cron Job (Live on Render)
- **Script:** `transform_and_insert.py`
- **Schedule:** Runs every 120 minutes (via Render Cron Job)
- **Database:** Connects to a PostgreSQL instance using `.env` variables
- **Transformations:** 
  - Fuzzy matching of supplier and location
  - Currency and unit normalization
  - Discount parsing
  - Product-level data processing

---

## 🔧 Ready for Future Use

### `main.py` — FastAPI wrapper (optional)
- **Purpose:** Enable triggering ETL on-demand via `/run-etl` endpoint
- **Status:** Included, but **not currently deployed**
- **Use case:** Trigger ETL from frontend or Supabase Edge Function
- **To enable:** Deploy `main.py` as a web service on Render

---

## 📦 Project Structure
etl/
├── transform_and_insert.py # Main ETL logic (cron job target)
├── main.py # FastAPI wrapper for future use
├── requirements.txt # Dependencies
├── .env # Environment config (excluded from Git)
├── mappings/ # Fuzzy match logic for suppliers/locations
└── normalizers/ # Field-specific cleaning functions

---

## 🔜 Next Steps (To Be Developed)

- [ ] **Deploy Web Service**  
  Deploy `main.py` on Render to enable `POST /run-etl` endpoint

- [ ] **Secure Endpoint**  
  Add `Authorization` header checking using a shared secret (already scaffolded)

- [ ] **Add Logging**  
  Write ETL outcomes (rows processed, warnings, failures) to Supabase table for monitoring

- [ ] **Retry Mechanism**  
  Detect and reprocess failed `extracted_data` rows

- [ ] **Expose Trigger in UI**  
  Add a button or action in the DiningSix frontend to trigger `/run-etl`

- [ ] **Unit Tests / Dry-run Mode**  
  Add test mode to validate mappings without inserting into DB

---

## 🔐 Environment Variables

These are expected to be defined either in `.env` or via Render dashboard:

DB_NAME=
DB_USER=
DB_PASSWORD=
DB_HOST=
DB_PORT=
API_KEY= # used only by main.py if deployed


---

## 📜 License

Proprietary. All rights reserved by VergaraProjects.
