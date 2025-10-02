# Absolute Imports Guide

## Overview

We've configured absolute imports to replace relative imports (`../`) throughout the project. This makes the codebase more maintainable and easier to refactor.

## Import Paths

### Base Paths
- `@/` - Points to `src/`
- `@/components/` - Points to `src/components/`
- `@/pages/` - Points to `src/pages/`
- `@/hooks/` - Points to `src/hooks/`
- `@/store/` - Points to `src/store/`
- `@/contexts/` - Points to `src/contexts/`
- `@/utils/` - Points to `src/utils/`
- `@/types/` - Points to `src/types/`
- `@/lib/` - Points to `src/lib/`

## Examples

### Before (Relative Imports)
```typescript
import { DashboardSettings } from '../components/dashboard/DashboardSettings';
import { useDashboardData } from '../hooks/metrics';
import { formatCurrency } from '../utils/format';
```

### After (Absolute Imports)
```typescript
import { DashboardSettings } from '@/components/features/dashboard/DashboardSettings';
import { useDashboardData } from '@/hooks/metrics';
import { formatCurrency } from '@/utils/format';
```

## Benefits

1. **Scalability**: No more counting `../` levels
2. **Refactoring**: Move files without breaking imports
3. **Readability**: Clear, consistent import paths
4. **IDE Support**: Better autocomplete and navigation
5. **Maintainability**: Easier to understand file relationships

## Migration Rules

### Components
- `../components/` → `@/components/`
- `../components/shared/` → `@/components/shared/`
- `../components/features/` → `@/components/features/`

### Pages
- `../pages/` → `@/pages/`

### Hooks
- `../hooks/` → `@/hooks/`

### Store
- `../store/` → `@/store/`

### Contexts
- `../contexts/` → `@/contexts/`

### Utils
- `../utils/` → `@/utils/`

### Types
- `../types/` → `@/types/`

### Lib
- `../lib/` → `@/lib/`

## Configuration Files Updated

1. **TypeScript**: `config/tsconfig.app.json` - Added path mapping
2. **Vite**: `config/vite.config.ts` - Added alias resolution

## IDE Support

Most modern IDEs (VS Code, WebStorm) will automatically recognize these path mappings and provide:
- Autocomplete for absolute imports
- Go-to-definition functionality
- Import suggestions
