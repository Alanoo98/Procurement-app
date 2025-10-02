# Components and Pages Organization

## New Structure Overview

The components and pages have been reorganized for better maintainability and logical grouping.

## Components Structure

```
src/components/
├── shared/                        # Shared/common components
│   ├── ui/                       # Basic UI components
│   │   ├── DashboardCard.tsx
│   │   ├── EmptyStates.tsx
│   │   ├── InfoTooltip.tsx
│   │   ├── Pagination.tsx
│   │   └── ResizableTable.tsx
│   ├── layout/                   # Layout components
│   │   ├── Sidebar.tsx
│   │   ├── GlobalFilters.tsx
│   │   ├── UserMenu.tsx
│   │   └── NotificationCenter.tsx
│   └── forms/                    # Form components
│       ├── LocationSelector.tsx
│       ├── OrganizationSelector.tsx
│       └── BusinessUnitSelector.tsx
├── features/                     # Feature-specific components
│   ├── auth/                     # Authentication components
│   ├── dashboard/                # Dashboard components
│   ├── products/                 # Product-related components
│   │   ├── ProductExportModal.tsx
│   │   ├── ProductLocationBreakdown.tsx
│   │   ├── ProductMapping.tsx
│   │   └── productDetail/
│   ├── analytics/                # Analytics components
│   │   ├── efficiency/
│   │   ├── cogs/
│   │   ├── cpg/
│   │   └── pax/
│   ├── alerts/                   # Alert components
│   │   ├── priceAlerts/
│   │   ├── priceAgreements/
│   │   └── ResolveAlertDialog.tsx
│   ├── cases/                    # Cases of concern
│   ├── import/                   # Data import
│   ├── booking/                  # Booking integration
│   └── budget/                   # Budget components
└── common/                       # Common utilities
    └── SearchableSelect.tsx
```

## Pages Structure

```
src/pages/
├── auth/                         # Authentication pages
├── dashboard/                    # Dashboard pages
│   └── Dashboard.tsx
├── products/                     # Product pages
│   ├── Products.tsx
│   ├── ProductDetail.tsx
│   ├── ProductCategories.tsx
│   ├── ProductTargets.tsx
│   └── ProductEfficiency.tsx
├── suppliers/                    # Supplier pages
│   └── Suppliers.tsx
├── documents/                    # Document pages
│   ├── Documents.tsx
│   └── DocumentDetail.tsx
├── analytics/                    # Analytics pages
│   ├── Efficiency.tsx
│   ├── CogsAnalysis.tsx
│   └── CogsDashboard.tsx
├── alerts/                       # Alert pages
│   └── PriceAlerts.tsx
├── cases/                        # Cases pages
│   └── CasesOfConcern.tsx
├── management/                   # Management pages
│   ├── Locations.tsx
│   ├── PaxManagement.tsx
│   └── StockCounting.tsx
├── import/                       # Import pages
│   └── ImportData.tsx
├── settings/                     # Settings pages
├── priceNegotiations/            # Price negotiation pages
├── help/                         # Help pages
│   └── Help.tsx
└── AIAnalyze.tsx                 # AI analysis page
```

## Benefits of New Organization

### 1. **Clear Separation of Concerns**
- **Shared components**: Reusable UI elements used across features
- **Feature components**: Business logic specific to features
- **Layout components**: Navigation and layout structure

### 2. **Better Maintainability**
- Related components are grouped together
- Easy to find and modify feature-specific code
- Clear ownership of components

### 3. **Improved Developer Experience**
- Logical folder structure makes navigation intuitive
- Easier to onboard new developers
- Clear patterns for where to add new components

### 4. **Scalability**
- Easy to add new features without cluttering
- Consistent organization patterns
- Supports team collaboration

## Import Path Updates

After this reorganization, you'll need to update import paths in your files. Here are the common patterns:

### Before:
```typescript
import { DashboardCard } from '../components/DashboardCard';
import { Sidebar } from '../components/Sidebar';
import { ProductMapping } from '../components/ProductMapping';
```

### After:
```typescript
import { DashboardCard } from '../components/shared/ui/DashboardCard';
import { Sidebar } from '../components/shared/layout/Sidebar';
import { ProductMapping } from '../components/features/products/ProductMapping';
```

## Migration Checklist

- [ ] Update all import paths in components
- [ ] Update all import paths in pages
- [ ] Update any barrel exports (index.ts files)
- [ ] Test that all components still render correctly
- [ ] Update any documentation that references old paths
- [ ] Update any build scripts or tools that reference old paths

## Best Practices

### Adding New Components

1. **Shared Components**: Add to `shared/` if used across multiple features
2. **Feature Components**: Add to appropriate `features/[feature]/` folder
3. **Layout Components**: Add to `shared/layout/` for navigation/layout
4. **Form Components**: Add to `shared/forms/` for reusable form elements

### Naming Conventions

- Use PascalCase for component files
- Use descriptive names that indicate purpose
- Group related components in subfolders when needed
- Use index.ts files for clean imports

This organization provides a solid foundation for scaling the application and maintaining code quality.
