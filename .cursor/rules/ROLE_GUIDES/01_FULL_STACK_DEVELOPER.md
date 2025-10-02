# Full-Stack Developer Role Guide

## 🎯 Role Overview

As a Full-Stack Developer for the Procurement Management System, you'll be responsible for developing and maintaining both the frontend React dashboard and backend processing systems. You'll work with modern technologies including React, TypeScript, Python, and Supabase to build a comprehensive procurement solution.

## 🛠️ Technical Stack You'll Work With

### Frontend Technologies
- **React 18** with TypeScript
- **Vite** for build tooling and development
- **Tailwind CSS** for styling
- **React Router** for navigation
- **Zustand** for state management
- **React Query** for data fetching
- **Recharts** for data visualization
- **shadcn/ui** for UI components

### Backend Technologies
- **Python 3.8+** for processing services
- **FastAPI** for web services
- **PostgreSQL** via Supabase
- **Supabase** for backend-as-a-service
- **Nanonets API** for OCR processing
- **e-conomic API** for accounting integration

### Development Tools
- **Git** for version control
- **ESLint** for code linting
- **TypeScript** for type safety
- **Docker** for containerization
- **Render** for deployment

## 📋 Key Responsibilities

### 1. Frontend Development
- Build and maintain React components for the procurement dashboard
- Implement responsive UI designs using Tailwind CSS
- Create data visualization components with Recharts
- Develop form handling and data validation
- Implement real-time updates and notifications
- Ensure accessibility and cross-browser compatibility

### 2. Backend Development
- Develop and maintain Python processing services
- Build FastAPI endpoints for data operations
- Implement ETL pipelines for data transformation
- Create webhook handlers for external integrations
- Develop database queries and optimizations
- Implement authentication and authorization

### 3. Database Management
- Design and optimize database schemas
- Implement Row Level Security (RLS) policies
- Create database migrations and updates
- Optimize query performance
- Implement data validation and constraints

### 4. Integration Development
- Integrate with e-conomic accounting API
- Implement Nanonets OCR processing
- Build webhook systems for real-time data
- Create data mapping and transformation logic
- Handle error cases and retry mechanisms

## 🚀 Getting Started

### Prerequisites
1. **Node.js 18+** and npm
2. **Python 3.8+** and pip
3. **Git** for version control
4. **Supabase CLI** for database management
5. **Docker** (optional, for containerized development)

### Environment Setup

#### 1. Clone and Setup Frontend
```bash
cd procurement
npm install
cp .env.example .env
# Add your Supabase credentials to .env
npm run dev
```

#### 2. Setup Backend Services
```bash
cd procurement-system
pip install -r requirements.txt
# Setup environment variables for each service
```

#### 3. Database Setup
```bash
supabase start
supabase db reset
```

## 📁 Project Structure Understanding

### Frontend Structure (`procurement/`)
```
src/
├── components/          # Reusable UI components
│   ├── auth/           # Authentication components
│   ├── dashboard/      # Dashboard-specific components
│   ├── import/         # Data import components
│   └── ...
├── pages/              # Route-specific pages
├── hooks/              # Custom React hooks
├── store/              # Zustand state management
├── contexts/           # React contexts
├── utils/              # Utility functions
└── types.ts            # TypeScript type definitions
```

### Backend Structure (`procurement-system/`)
```
├── etl/                # ETL pipeline for data processing
├── nanonets-ingestion/ # Document ingestion service
├── nanonets-webhook/   # Webhook processing service
├── edge_function/      # Supabase edge functions
└── requirements.txt    # Python dependencies
```

## 🔧 Development Workflows

### 1. Feature Development
1. Create feature branch from main
2. Implement frontend components and pages
3. Develop backend services and APIs
4. Write database migrations if needed
5. Test integration between frontend and backend
6. Create pull request with comprehensive description

### 2. Bug Fixes
1. Reproduce the issue locally
2. Identify root cause (frontend/backend/database)
3. Implement fix with appropriate tests
4. Test across different scenarios
5. Document the fix and prevention measures

### 3. Database Changes
1. Create migration file with descriptive name
2. Test migration on local database
3. Update TypeScript types if needed
4. Update frontend code to handle schema changes
5. Test data integrity and performance

## 🧪 Testing Strategy

### Frontend Testing
- **Unit Tests**: Test individual components and hooks
- **Integration Tests**: Test component interactions
- **E2E Tests**: Test complete user workflows
- **Accessibility Tests**: Ensure WCAG compliance

### Backend Testing
- **Unit Tests**: Test individual functions and classes
- **Integration Tests**: Test API endpoints and database operations
- **Performance Tests**: Test ETL pipeline performance
- **Error Handling**: Test error scenarios and edge cases

## 📊 Key Features to Understand

### 1. Multi-tenant Architecture
- Organizations and business units
- Row Level Security (RLS) implementation
- Data isolation between tenants

### 2. Real-time Data Processing
- Webhook handling for instant updates
- ETL pipeline for data transformation
- Caching strategies for performance

### 3. Document Processing
- OCR integration with Nanonets
- Document parsing and data extraction
- Error handling and retry mechanisms

### 4. Analytics and Reporting
- Data aggregation and calculations
- Chart generation and visualization
- Export functionality

## 🔍 Common Development Tasks

### Adding New Pages
1. Create page component in `src/pages/`
2. Add route in `App.tsx`
3. Add navigation link in `Sidebar.tsx`
4. Implement data fetching with React Query
5. Add proper TypeScript types

### Creating New API Endpoints
1. Add endpoint in Supabase Edge Functions
2. Update TypeScript types
3. Create React Query hooks
4. Implement error handling
5. Add loading states

### Database Schema Changes
1. Create migration file
2. Update TypeScript interfaces
3. Modify frontend components
4. Update API endpoints
5. Test data integrity

## 🚨 Important Considerations

### Security
- Always validate user input
- Implement proper authentication checks
- Use Row Level Security (RLS) policies
- Sanitize data before database operations
- Follow OWASP security guidelines

### Performance
- Optimize database queries
- Implement proper caching strategies
- Use pagination for large datasets
- Optimize bundle size for frontend
- Monitor and optimize ETL pipeline performance

### Data Integrity
- Implement proper error handling
- Use database transactions where appropriate
- Validate data at multiple levels
- Implement retry mechanisms for external APIs
- Maintain audit trails for important operations

## 📚 Learning Resources

### Frontend
- [React Documentation](https://react.dev/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [React Query Documentation](https://tanstack.com/query/latest)

### Backend
- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [Supabase Documentation](https://supabase.com/docs)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [Python Best Practices](https://docs.python-guide.org/)

### General
- [Git Best Practices](https://git-scm.com/book/en/v2)
- [Docker Documentation](https://docs.docker.com/)
- [API Design Best Practices](https://restfulapi.net/)

## 🎯 Success Metrics

### Code Quality
- Maintain > 90% test coverage
- Keep TypeScript strict mode enabled
- Follow ESLint rules consistently
- Document complex functions and components

### Performance
- Page load times < 2 seconds
- API response times < 500ms
- ETL pipeline processing < 30 seconds per batch
- Database query optimization

### User Experience
- Responsive design across all devices
- Intuitive navigation and workflows
- Fast and reliable data updates
- Comprehensive error handling

## 🔄 Daily Workflow

1. **Morning**: Review pull requests and issues
2. **Development**: Work on assigned features/bugs
3. **Testing**: Test changes locally and in staging
4. **Code Review**: Review team members' code
5. **Documentation**: Update documentation as needed
6. **Deployment**: Deploy changes to production

This role requires a strong understanding of both frontend and backend development, with particular focus on data processing, real-time updates, and user experience optimization.
