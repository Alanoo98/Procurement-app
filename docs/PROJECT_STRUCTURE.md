# Procurement System - Project Structure

## 📁 Organized Project Structure

```
Procurement d6/
├── apps/                          # Main applications
│   ├── procurement/               # Main React dashboard app
│   ├── procurement-admin/         # Admin interface
│   └── procurement-landing-page/  # Marketing landing page
├── services/                      # Backend services
│   └── procurement-system/        # Python backend services
├── docs/                          # Documentation
│   ├── demos/                     # Demo videos and presentations
│   └── PROJECT_STRUCTURE.md      # This file
└── README.md                      # Main project README
```

## 🎯 Application Purposes

### Frontend Applications (`apps/`)

1. **`procurement/`** - Main Dashboard
   - React 18 + TypeScript + Vite
   - User interface for procurement management
   - Real-time analytics, price monitoring, supplier management

2. **`procurement-admin/`** - Admin Interface
   - React + TypeScript
   - User management, organization setup
   - Administrative functions

3. **`procurement-landing-page/`** - Marketing Site
   - React + shadcn/ui
   - Product showcase and user onboarding
   - Marketing and sales

### Backend Services (`services/`)

1. **`procurement-system/`** - Backend Processing
   - Python + FastAPI + PostgreSQL
   - Document processing, ETL pipelines
   - API endpoints and data processing

### Documentation (`docs/`)

- Project documentation
- Demo videos and presentations
- Implementation guides
- API documentation

## 🚀 Benefits of This Structure

1. **Clear Separation**: Frontend apps, backend services, and docs are clearly separated
2. **Scalability**: Easy to add new applications or services
3. **Maintainability**: Each component has its own purpose and dependencies
4. **Team Collaboration**: Different teams can work on different parts independently
5. **Deployment**: Each app can be deployed independently

## 📋 Next Steps

1. Move applications to `apps/` folder
2. Move backend services to `services/` folder
3. Consolidate documentation in `docs/` folder
4. Update deployment configurations
5. Update README files with new structure
