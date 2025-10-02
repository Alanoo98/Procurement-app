# Procurement Management System

AI-powered procurement management system for restaurant groups and hospitality businesses.

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- Python 3.11+
- Docker & Docker Compose

### Development Setup

1. **Clone and install**
   ```bash
   git clone <your-repo-url>
   cd procurement-system
   npm install
   ```

2. **Start database services**
   ```bash
   npm run docker:up
   ```

3. **Start all applications**
   ```bash
   npm run dev
   ```

4. **Access applications**
   - Dashboard: http://localhost:3000
   - Admin: http://localhost:3001  
   - Landing: http://localhost:3002

## 📁 Project Structure

```
procurement-system/
├── apps/                    # Frontend applications
│   ├── dashboard/          # Main dashboard
│   ├── admin/              # Admin interface
│   └── landing/            # Marketing site
├── services/               # Backend services
│   └── api/                # Main API service
├── docs/                   # Documentation
└── docker-compose.yml      # Local development
```

## 🔧 Available Scripts

- `npm run dev` - Start all applications
- `npm run build` - Build all applications
- `npm run test` - Run all tests
- `npm run lint` - Lint all code
- `npm run docker:up` - Start database services
- `npm run docker:down` - Stop database services

## 🚀 Deployment

- **Frontend**: Deploy to Vercel
- **Backend**: Deploy to Render
- **Database**: Managed by Supabase
