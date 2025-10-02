# Procurement Management System

AI-powered procurement management system for restaurant groups and hospitality businesses.

## 🚀 Quick Start

### Prerequisites
- Node.js 20+ (recommended)
- Python 3.11+
- Docker & Docker Compose (optional)

### Development Setup

1. **Clone and install**
   ```bash
   git clone https://github.com/Alanoo98/Procurement-app.git
   cd "Procurement"
   npm install
   ```

2. **Start individual applications**
   ```bash
   # Dashboard (main app)
   cd apps/dashboard
   npm install
   npm run dev
   # Access: http://localhost:3000
   
   # Admin portal
   cd apps/admin
   npm install
   npm run dev
   # Access: http://localhost:3001
   
   # Landing page
   cd apps/landing
   npm install
   npm run dev
   # Access: http://localhost:3002
   ```

3. **Or start all at once** (if you have all dependencies installed)
   ```bash
   npm run dev
   ```

## 📁 Project Structure

```
Procurement/
├── apps/                    # Frontend applications
│   ├── dashboard/          # Main dashboard (React + Vite)
│   ├── admin/              # Admin interface (React + Vite)
│   └── landing/            # Marketing site (React + Vite)
├── services/               # Backend services
│   └── api/                # Main API service (Python)
├── docs/                   # Documentation
├── .github/workflows/      # CI/CD workflows
└── vercel.json            # Vercel configuration
```

## 🔧 Available Scripts

### Root Level
- `npm run dev` - Start all applications (if dependencies installed)
- `npm run build` - Build all applications
- `npm run test` - Run all tests
- `npm run lint` - Lint all code
- `npm run docker:up` - Start database services
- `npm run docker:down` - Stop database services

### Individual Apps
Each app has its own scripts:
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

## 🚀 Deployment

### Frontend Applications
- **Dashboard**: Deploy to Vercel (main app)
- **Admin**: Deploy to Vercel (admin portal)
- **Landing**: Deploy to Vercel (marketing site)

### Backend Services
- **API**: Deploy to Render
- **Database**: Managed by Supabase

### Environment Variables
Each app needs its own environment variables:
- **Dashboard**: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`
- **Admin**: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`
- **Landing**: `VITE_API_URL` (optional)

## 🛠️ Tech Stack

- **Frontend**: React 18, TypeScript, Vite, Tailwind CSS
- **Backend**: Python, FastAPI
- **Database**: Supabase (PostgreSQL)
- **Deployment**: Vercel (frontend), Render (backend)
- **CI/CD**: GitHub Actions
