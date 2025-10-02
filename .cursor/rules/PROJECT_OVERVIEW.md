# Procurement Management System - Project Overview

## 🎯 Project Vision

A comprehensive, AI-powered procurement management system designed specifically for restaurant groups and hospitality businesses. The system automates invoice processing, provides real-time price monitoring, and delivers actionable insights for cost optimization and supplier management.

## 🏗️ System Architecture

The project consists of three main components working together:

### 1. **Frontend Dashboard** (`procurement/`)
- **Technology**: React 18 + TypeScript + Vite + Tailwind CSS
- **Purpose**: User interface for procurement management
- **Key Features**: Real-time analytics, price monitoring, supplier management, document processing

### 2. **Backend Processing System** (`procurement-system/`)
- **Technology**: Python + FastAPI + PostgreSQL + Supabase
- **Purpose**: Automated data processing and AI-powered document extraction
- **Key Features**: OCR processing, ETL pipelines, webhook handling, data transformation

### 3. **Landing Page** (`procurement-landing-page/`)
- **Technology**: React + TypeScript + shadcn/ui
- **Purpose**: Marketing and user onboarding
- **Key Features**: Product showcase, feature demonstrations, user registration

## 🔄 Data Flow Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   e-conomic     │──▶│  Nanonets OCR    │───▶│   Webhook       │
│   API           │    │   Processing     │    │   Listener      │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                                                         │
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   React         │◀──│   Supabase       │◀───│  ETL Pipeline   │
│   Dashboard     │    │   Database       │    │   (Transform)   │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

## 📊 Core Business Features

### 1. **Document Management**
- Automated invoice processing from e-conomic accounting system
- AI-powered OCR extraction using Nanonets
- Credit note and purchase order tracking
- Document search and filtering capabilities

### 2. **Price Monitoring & Alerts**
- Real-time price variation detection
- Same-day price comparison across suppliers
- Historical price trend analysis
- Agreement violation tracking
- Potential savings calculation

### 3. **Supplier Management**
- Centralized supplier relationship management
- Supplier performance analytics
- Contact information and contract tracking
- Supplier mapping and standardization

### 4. **Location Management**
- Multi-location restaurant support
- Flexible location variant mapping
- Address and receiver name matching
- Business unit organization

### 5. **Product Catalog**
- Product standardization across suppliers
- Smart product mapping and categorization
- Price agreement tracking
- Product performance analytics

### 6. **Efficiency Analysis**
- PAX-based cost metrics (cost per guest)
- Restaurant performance comparison
- Product usage analysis
- Spend optimization insights

### 7. **Analytics & Reporting**
- Real-time dashboards
- Custom report generation
- Data visualization with charts
- Export capabilities

## 🗄️ Database Schema Overview

### Core Tables
- **`organizations`**: Multi-tenant support
- **`business_units`**: Organizational divisions
- **`locations`**: Restaurant locations
- **`suppliers`**: Supplier master data
- **`invoice_lines`**: Core transactional data
- **`price_alerts`**: Price monitoring
- **`price_negotiations`**: Price agreements
- **`pax`**: Guest count data
- **`extracted_data`**: Raw OCR data

### Key Features
- Multi-tenant architecture with complete data isolation
- Row Level Security (RLS) for data protection
- Comprehensive audit trails
- Performance-optimized indexing
- Materialized views for analytics

## 🛠️ Technology Stack

### Frontend
- **React 18** with TypeScript
- **Vite** for build tooling
- **Tailwind CSS** for styling
- **React Router** for navigation
- **Zustand** for state management
- **Recharts** for data visualization
- **React Query** for data fetching

### Backend
- **Python 3.8+** for processing
- **FastAPI** for web services
- **PostgreSQL** for database
- **Supabase** for backend-as-a-service
- **Nanonets** for AI-powered OCR
- **e-conomic API** for accounting integration

### Infrastructure
- **Render** for service deployment
- **Supabase Edge Functions** for serverless computing
- **GitHub** for version control
- **Environment-based configuration**

## 🚀 Deployment Architecture

### Production Services
1. **Webhook Service**: Receives OCR results from Nanonets
2. **ETL Pipeline**: Processes and transforms data (cron job)
3. **Ingestion Service**: Fetches documents from e-conomic
4. **Frontend Dashboard**: React application
5. **Landing Page**: Marketing site

### Development Environment
- Local development with hot reloading
- Docker containers for services
- Supabase local development
- Automated testing and linting

## 📈 Business Value Proposition

### For Restaurant Groups
- **Cost Reduction**: Automated price monitoring saves 5-15% on procurement costs
- **Time Savings**: 80% reduction in manual invoice processing
- **Better Negotiations**: Data-driven insights for supplier negotiations
- **Compliance**: Automated audit trails and documentation

### For Procurement Teams
- **Real-time Visibility**: Instant access to spending patterns
- **Proactive Alerts**: Early warning system for price changes
- **Efficiency Metrics**: PAX-based performance tracking
- **Supplier Management**: Centralized supplier relationship tracking

### For Management
- **Strategic Insights**: Executive dashboards with key metrics
- **Performance Tracking**: Location and product performance analysis
- **Risk Management**: Automated compliance and audit trails
- **Scalability**: Multi-location and multi-organization support

## 🔮 Future Roadmap

### Phase 1: Core Platform (Current)
- ✅ Document processing and OCR
- ✅ Price monitoring and alerts
- ✅ Basic analytics and reporting
- ✅ Multi-location support

### Phase 2: Advanced Features
- 🔄 AI-powered spend analysis
- 🔄 Automated supplier handling recommendations
- 🔄 Mobile application
- 🔄 Stock counting system

### Phase 3: Enterprise Features
- 📋 Advanced workflow automation
- 📋 Integration with ERP systems
- 📋 Advanced analytics and ML
- 📋 White-label solutions

## 🎯 Target Market

### Primary Market
- **Restaurant Groups**: 5+ locations
- **Hospitality Chains**: Hotels, resorts, food service
- **Food Service Companies**: Catering, institutional dining

### Secondary Market
- **Retail Chains**: Multi-location retail with procurement needs
- **Manufacturing**: Companies with complex supplier networks
- **Healthcare**: Hospital and healthcare facility food services

## 💼 Competitive Advantages

1. **Industry Specialization**: Built specifically for restaurant procurement
2. **AI-Powered Automation**: Advanced OCR and data processing
3. **Real-time Analytics**: Live dashboards and instant alerts
4. **Multi-tenant Architecture**: Scalable for multiple organizations
5. **Integration Ready**: Easy connection to existing accounting systems
6. **User Experience**: Modern, intuitive interface design

## 📊 Success Metrics

### Technical Metrics
- **Processing Speed**: < 30 seconds per invoice
- **OCR Accuracy**: > 95% data extraction accuracy
- **System Uptime**: > 99.9% availability
- **Response Time**: < 2 seconds for dashboard loads

### Business Metrics
- **Cost Savings**: 5-15% reduction in procurement costs
- **Time Savings**: 80% reduction in manual processing
- **User Adoption**: > 90% feature utilization
- **Customer Satisfaction**: > 4.5/5 rating

This procurement management system represents a comprehensive solution for modern restaurant groups seeking to optimize their procurement processes through automation, AI, and data-driven insights.
