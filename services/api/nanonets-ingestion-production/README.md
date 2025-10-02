# Nanonets x e-conomic PDF Integration (Production)

This folder automates the **production ingestion** of invoice PDFs from the e-conomic API and uploads them to a Nanonets OCR model for data extraction. It is designed for scheduled, reliable, and scalable operation (e.g., as a Render cron job).

---

## 📦 Project Structure

```
nanonets-ingestion-production/
│
├── main.py                 # Entry script: fetch and send documents for all restaurants
├── economic_client.py      # Handles e-conomic API interaction
├── nanonets_client.py      # Handles Nanonets OCR upload
├── processed_tracker.py    # Tracks processed and pending documents
├── config.py               # Stores API keys and config (use env vars in production)
├── requirements.txt        # Python dependencies
└── README.md               # You're here!
```

---

## 🚀 How to Use (Production)

### 1. Install Dependencies

```bash
python -m venv venv
source venv/bin/activate  # or .\venv\Scripts\activate on Windows
pip install -r requirements.txt
```

### 2. Configure Environment Variables

Set the following environment variables (e.g., in Render dashboard or a .env file):

- `ECONOMIC_APP_SECRET` (your e-conomic app secret)
- `ECONOMIC_GRANT_TOKEN_1`, `ECONOMIC_GRANT_TOKEN_2`, ... (one per restaurant)
- `ECONOMIC_BASE_URL` (usually https://apis.e-conomic.com/documentsapi/v2.0.0)
- `NANONETS_API_KEY` (your Nanonets API key)
- `NANONETS_MODEL_ID` (your Nanonets model ID)

### 3. Run Script (Locally or as Cron Job)

```bash
python main.py <ACCOUNTING_YEAR> <NUM_DOCUMENTS> [async: true|false]
```

#### Example (fetch 10 docs per restaurant for 2025):
```bash
python main.py 2025 10
```

---

## 🕒 Render Cron Job Setup Example

Add to your `render.yaml`:

```
services:
  - type: cron
    name: invoice-ingestion-production
    env: python
    plan: free
    schedule: "0 6 * * *"  # Every day at 6am
    buildCommand: pip install -r requirements.txt
    startCommand: python main.py 2025 10
    envVars:
      - key: ECONOMIC_APP_SECRET
        sync: false
      - key: ECONOMIC_GRANT_TOKEN_1
        sync: false
      # ...add all tokens
      - key: NANONETS_API_KEY
        sync: false
      - key: NANONETS_MODEL_ID
        sync: false
```

---

## 🧠 Notes

- Only **non-processed invoices** are fetched and uploaded.
- Each restaurant is processed in sequence, with a delay to avoid API rate limits.
- All status and errors are logged for monitoring.
- Designed for reliability and easy scaling.

---

## 📜 License

Proprietary. All rights reserved by VergaraProjects. 