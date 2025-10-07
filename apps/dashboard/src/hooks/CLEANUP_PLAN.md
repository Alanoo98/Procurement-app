# 🧹 Hook Cleanup Plan

## 🚨 **CRITICAL REDUNDANCIES TO REMOVE**

### **1. Cases of Concern - CONSOLIDATE**
**REMOVE:**
- ❌ `useCasesOfConcern.ts` (data/)
- ❌ `useSimpleCasesOfConcern.ts` (data/)

**REPLACE WITH:**
- ✅ `useCasesOfConcernUnified.ts` (data/) - Single configurable hook

**MIGRATION:**
```typescript
// OLD
import { useCasesOfConcern } from '@/hooks/data/useCasesOfConcern';
import { useSimpleCasesOfConcern } from '@/hooks/data/useSimpleCasesOfConcern';

// NEW
import { useCasesOfConcernUnified } from '@/hooks/data/useCasesOfConcernUnified';

// Simple mode
const { cases, createCase, updateCase } = useCasesOfConcernUnified(filters, { simple: true });

// Full mode
const { cases, createCase, updateCase, addComment, getCaseTimeline } = useCasesOfConcernUnified(filters, { 
  includeUsers: true, 
  includeComments: true 
});
```

### **2. Supplier Analytics - CONSOLIDATE**
**REMOVE:**
- ❌ `useSuppliers.ts` (metrics/)
- ❌ `useSupplierMetricsAnalysis.ts` (metrics/)

**REPLACE WITH:**
- ✅ `useSupplierAnalyticsUnified.ts` (metrics/) - Single comprehensive hook

**MIGRATION:**
```typescript
// OLD
import { useSupplierMetrics } from '@/hooks/metrics/useSuppliers';
import { useSupplierMetricsAnalysis } from '@/hooks/metrics/useSupplierMetricsAnalysis';

// NEW
import { useSupplierAnalyticsUnified } from '@/hooks/metrics/useSupplierAnalyticsUnified';

// Basic metrics
const { data, isLoading } = useSupplierAnalyticsUnified();

// With analytics
const { data, isLoading } = useSupplierAnalyticsUnified({
  includeAnalytics: true,
  includeConsolidation: true,
  includeTrends: true
});
```

### **3. Inefficient Products - CONSOLIDATE**
**REMOVE:**
- ❌ `useDashboardInefficientProducts.ts` (metrics/)

**KEEP:**
- ✅ `useInefficientProducts.ts` (management/) - Main hook

**MODIFY:**
- Add `view: 'dashboard' | 'full'` option to `useInefficientProducts`

### **4. Price Alerts - KEEP SEPARATE**
**KEEP BOTH:**
- ✅ `usePriceAlerts.ts` (management/) - Data fetching
- ✅ `usePriceAlertsState.ts` (management/) - UI state management

**REASON:** Good separation of concerns

## 🔧 **OPTIMIZATION OPPORTUNITIES**

### **1. Caching Template Usage**
**CURRENT:** Many hooks have custom caching logic
**IMPROVE:** Use `createCachingHelpers` template for consistency

### **2. Hook Organization**
**CURRENT:** Some hooks are in wrong categories
**IMPROVE:** Move hooks to correct categories

### **3. Type Definitions**
**CURRENT:** Duplicate type definitions across hooks
**IMPROVE:** Centralize common types

## 📊 **IMPACT ANALYSIS**

### **Files to Delete:**
- `hooks/data/useCasesOfConcern.ts` (347 lines)
- `hooks/data/useSimpleCasesOfConcern.ts` (233 lines)
- `hooks/metrics/useSuppliers.ts` (859 lines)
- `hooks/metrics/useSupplierMetricsAnalysis.ts` (282 lines)
- `hooks/metrics/useDashboardInefficientProducts.ts` (85 lines)

**Total Lines Removed:** ~1,806 lines
**Estimated Bundle Size Reduction:** ~15-20%

### **Files to Add:**
- `hooks/data/useCasesOfConcernUnified.ts` (200 lines)
- `hooks/metrics/useSupplierAnalyticsUnified.ts` (300 lines)

**Total Lines Added:** ~500 lines
**Net Reduction:** ~1,306 lines

## 🚀 **IMPLEMENTATION STEPS**

### **Phase 1: Create Unified Hooks**
1. ✅ Create `useCasesOfConcernUnified.ts`
2. ✅ Create `useSupplierAnalyticsUnified.ts`
3. Add caching to all remaining hooks

### **Phase 2: Update Imports**
1. Find all usages of old hooks
2. Update imports to use unified hooks
3. Test functionality

### **Phase 3: Remove Redundant Hooks**
1. Delete old hook files
2. Update index files
3. Update documentation

### **Phase 4: Optimize Remaining Hooks**
1. Apply caching template to all hooks
2. Consolidate similar functionality
3. Improve type definitions

## 📈 **EXPECTED BENEFITS**

### **Performance:**
- ✅ Reduced bundle size (~15-20%)
- ✅ Better caching consistency
- ✅ Fewer duplicate API calls

### **Maintainability:**
- ✅ Single source of truth for similar functionality
- ✅ Consistent patterns across hooks
- ✅ Easier to add new features

### **Developer Experience:**
- ✅ Clearer hook purposes
- ✅ Better TypeScript support
- ✅ Easier to find and use hooks

## ⚠️ **RISKS & MITIGATION**

### **Risk:** Breaking changes during migration
**Mitigation:** 
- Keep old hooks during transition
- Gradual migration with feature flags
- Comprehensive testing

### **Risk:** Performance regression
**Mitigation:**
- Benchmark before/after
- Monitor cache hit rates
- A/B test critical paths

## 🎯 **SUCCESS METRICS**

- [ ] Bundle size reduced by 15-20%
- [ ] All hooks use consistent caching
- [ ] No duplicate functionality
- [ ] Improved developer experience
- [ ] Maintained or improved performance
