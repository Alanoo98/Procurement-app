
# Nanonets x e-conomic PDF Integration

This project automates the process of:

1. Fetching invoice PDF documents from the e-conomic API.
2. Uploading the PDFs to a Nanonets OCR model for data extraction.
3. Printing results or errors based on the API responses.

---

## 📦 Project Structure

```
nanonets_integration/
│
├── main.py                 # Entry script: fetch and send documents
├── economic_client.py      # Handles e-conomic API interaction
├── nanonets_client.py      # Handles Nanonets OCR upload
├── config.py               # Stores API keys and config
├── requirements.txt        # Python dependencies
└── README.md               # You're here!
```

---

## 🚀 How to Use

### 1. Install Dependencies

```bash
python -m venv venv
.env\Scriptsctivate     # for Windows
pip install -r requirements.txt
```

### 2. Configure API Keys

Edit `config.py`:

```python
# config.py

# e-conomic
ECONOMIC_APP_SECRET = 'your-app-secret-token'
ECONOMIC_GRANT_TOKEN = 'your-agreement-grant-token'
ECONOMIC_BASE_URL = 'https://apis.e-conomic.com/documentsapi/v2.0.0'

# Nanonets
NANONETS_API_KEY = 'your-nanonets-api-key'
NANONETS_MODEL_ID = 'your-nanonets-model-id'
```

### 3. Run Script

```bash
python main.py <ACCOUNTING_YEAR> <NUM_DOCUMENTS> [async: true|false]
```

#### Examples:

```bash
python main.py 2025 10
```
This uploads 10 documents from year 2025 (default async mode).

```bash
python main.py 2024 5 false
```
This uploads 5 documents from year 2024 synchronously.

---

## 🧠 Notes

- Uses **cursor-based pagination** to fetch documents efficiently.
- You can control the number of documents and whether uploads are async/sync.
- `input` filename in the Nanonets response is used for verification.

---


## 📜 License

Proprietary. All rights reserved by VergaraProjects.
