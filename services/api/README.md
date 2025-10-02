# Procurement API Service

Backend API service for the procurement management system. Handles document processing, ETL pipelines, and data transformation.

## 🚀 Quick Start

### Prerequisites
- Python 3.11+
- PostgreSQL database
- Docker & Docker Compose

### Development Setup

1. **Install dependencies**
   ```bash
   pip install -r requirements.txt
   ```

2. **Set up environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your credentials
   ```

3. **Start database services**
   ```bash
   npm run docker:up
   ```

4. **Run the API**
   ```bash
   python main.py
   ```

## 📁 Project Structure

```
services/api/
├── etl/                             # ETL Pipeline
│   ├── transform_pipeline/          # Core transformation logic
│   │   ├── mappings/               # Fuzzy matching for suppliers/locations
│   │   ├── normalizers/            # Data cleaning and normalization
│   │   └── transform_and_insert.py # Main ETL script
│   └── requirements.txt
├── nanonets-ingestion/              # Document ingestion service
├── nanonets-webhook/                # Webhook processing service
├── edge_function/                   # Supabase Edge Functions
└── requirements.txt                 # Global dependencies
```

## 🔧 Available Scripts

- `python main.py` - Start the API server
- `python etl/transform_pipeline/transform_and_insert.py` - Run ETL pipeline
- `python nanonets-ingestion/main.py` - Process documents
- `python nanonets-webhook/webhook_listener.py` - Start webhook service

## 🚀 Deployment

- **API**: Deploy to Render
- **ETL**: Deploy as cron job
- **Webhooks**: Deploy as web service
- **Database**: Managed by Supabase 