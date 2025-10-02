# Hooks Organization

This folder contains all React hooks organized by category for better maintainability and readability.

## 📁 Folder Structure

### 🔐 `auth/` - Authentication & User Management
Hooks related to user authentication, session management, and access control.

- `useUserData` - User profile and organization data
- `useSessionManager` - Supabase session management
- `useOrganizationContext` - Organization and business unit context
- `useDataAccess` - Data access permissions
- `useAccessControl` - Access control logic
- `useRoleAccess` - Role-based access control

### 📊 `data/` - Core Data Fetching
Hooks for fetching and caching core application data.

- `useCachedData` - Generic caching hook
- `useGroupedLocations` - Location data with grouping
- `useLocations` - Basic location data
- `useAllProducts` - Product data fetching
- `useDocuments` - Document management
- `useDocumentDetail` - Individual document details
- `usePaxData` - PAX booking data

### 📈 `metrics/` - Analytics & Metrics
Hooks for analytics, reporting, and data visualization.

- `useDashboardData` - Dashboard metrics and KPIs
- `useProductMetrics` - Product performance metrics
- `useSupplierMetricsAnalysis` - Supplier analytics
- `useInvoiceMetrics` - Invoice analysis
- `useLocationMetrics` - Location performance
- `useEfficiencyData` - Efficiency analysis
- `useRestaurantComparisons` - Restaurant comparison data
- `useSuppliers` - Supplier data and metrics

### 🎛️ `management/` - Business Logic & Management
Hooks for business operations and data management.

- `useProductManagement` - Product CRUD operations
- `useSupplierManagement` - Supplier management
- `usePriceAgreements` - Price agreement management
- `usePriceNegotiations` - Price negotiation logic
- `useSupplierConsolidation` - Product consolidation opportunities
- `useProductTargets` - Product target management
- `useInefficientProducts` - Inefficiency analysis
- `usePriceAlerts` - Price alert management
- `usePriceAlertsState` - Price alert state management
- `useProductDetail` - Product detail management

### 🔧 `utils/` - Utility & Helper Hooks
Utility hooks for common operations and data processing.

- `useFilteredData` - Data filtering utilities
- `useBusinessUnitsWithLocations` - Business unit data
- `usePendingMappings` - Pending mapping management
- `useProductMappingsSupabase` - Product mapping operations
- `useMappings` - General mapping utilities
- `useResolvePendingMapping` - Mapping resolution
- `useProcessedTracker` - Processing status tracking
- `useMaterializedViewRefresh` - Database view refresh

### 🎨 `ui/` - UI & Navigation
Hooks for UI state management and navigation.

- `useNavigationState` - Navigation state management
- `usePagination` - Pagination utilities
- `useTableColumns` - Table column management
- `useCachedDataExample` - Caching examples

## 📦 Import Usage

### Import from specific category:
```typescript
import { useUserData, useSessionManager } from '../hooks/auth';
import { useDashboardData, useProductMetrics } from '../hooks/metrics';
import { useCachedData } from '../hooks/data';
```

### Import from main index (all hooks):
```typescript
import { useUserData, useDashboardData, useCachedData } from '../hooks';
```

### Import individual hooks:
```typescript
import { useUserData } from '../hooks/auth/useUserData';
import { useDashboardData } from '../hooks/metrics/useDashboardData';
```

## 🎯 Benefits

1. **Better Organization** - Hooks are grouped by purpose
2. **Easier Navigation** - Find hooks quickly by category
3. **Cleaner Imports** - Import only what you need
4. **Better Maintainability** - Related hooks are together
5. **Scalability** - Easy to add new hooks to appropriate categories

## 📝 Adding New Hooks

When adding new hooks, place them in the appropriate category:

- **Authentication/User**: `auth/`
- **Data Fetching**: `data/`
- **Analytics/Metrics**: `metrics/`
- **Business Logic**: `management/`
- **Utilities**: `utils/`
- **UI/Navigation**: `ui/`

Don't forget to:
1. Add the hook to the category's `index.ts`
2. Update this README if needed
3. Follow the existing naming conventions
