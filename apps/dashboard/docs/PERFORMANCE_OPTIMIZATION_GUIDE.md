# Database Performance Optimization Guide

## Overview

This guide documents the performance optimizations implemented to address slow PostgreSQL queries identified in the system. The optimizations target the most expensive queries that were consuming significant database resources.

## Performance Issues Identified

Based on `pg_stat_statements` analysis, the following queries were identified as performance bottlenecks:

### 1. Most Expensive Queries (Total Execution Time > 1M ms)

1. **Pending Category Mappings Query** (1.5M+ ms)
   - Query: `SELECT * FROM pending_category_mappings WHERE organization_id = ? AND status = ?`
   - Issue: Missing indexes on organization_id and status
   - Solution: Added composite index `idx_pending_category_mappings_org_status`

2. **Invoice Lines with Joins** (1.2M+ ms)
   - Query: Complex joins with suppliers and locations
   - Issue: Expensive LATERAL joins and missing indexes
   - Solution: Optimized query structure and added strategic indexes

3. **Invoice Lines Date Range Queries** (767K+ ms)
   - Query: Date range filtering with location and supplier filters
   - Issue: Missing composite indexes for common filter combinations
   - Solution: Added `idx_invoice_lines_org_date_location` index

## Implemented Optimizations

### 1. Database Indexes

Created strategic indexes targeting the most common query patterns:

```sql
-- Most critical indexes for performance
CREATE INDEX CONCURRENTLY idx_invoice_lines_org_date_location 
ON invoice_lines (organization_id, invoice_date, location_id);

CREATE INDEX CONCURRENTLY idx_pending_category_mappings_org_status 
ON pending_category_mappings (organization_id, status);

CREATE INDEX CONCURRENTLY idx_invoice_lines_org_product_code 
ON invoice_lines (organization_id, product_code);
```

### 2. Query Optimization

#### A) Eliminated Expensive COUNT Queries

**Before:**
```typescript
// Expensive - forces COUNT(*) on large tables
const { data, count } = await query.select('*', { count: 'exact' });
```

**After:**
```typescript
// Optimized - disables count by default
// Added 'Prefer: count=none' header to Supabase client
const { data } = await query.select('*');
```

#### B) Replaced OFFSET Pagination with Cursor Pagination

**Before:**
```typescript
// Expensive - OFFSET becomes slower with large datasets
const { data } = await query
  .range(offset, offset + pageSize - 1);
```

**After:**
```typescript
// Efficient - cursor-based pagination
const result = await fetchWithCursorPagination(query, {
  limit: pageSize,
  cursor: lastRecordId,
  orderBy: 'invoice_date',
  orderDirection: 'asc'
});
```

#### C) Optimized Query Structure

**Before:**
```typescript
// Multiple separate queries
const locations = await supabase.from('locations').select('*');
const suppliers = await supabase.from('suppliers').select('*');
const invoiceLines = await supabase.from('invoice_lines').select('*');
```

**After:**
```typescript
// Single optimized query with minimal data transfer
const query = new OptimizedInvoiceQuery()
  .organization(orgId)
  .dateRange(startDate, endDate)
  .locations(locationIds)
  .select(['id', 'invoice_date', 'total_price_after_discount'])
  .orderBy('invoice_date', 'asc');
```

### 3. Caching Strategy

Implemented intelligent caching to reduce database load:

```typescript
// Cache frequently accessed data
const cacheKey = `dashboard-data-${orgId}-${dateRange}`;
const cachedData = cache.get(cacheKey);
if (cachedData) return cachedData;

// Cache for 10 minutes
cache.set(cacheKey, data, 10 * 60 * 1000);
```

### 4. Query Monitoring

Added performance monitoring to track query metrics:

```typescript
const startTime = Date.now();
const result = await query.execute();
const duration = Date.now() - startTime;

PerformanceMonitoring.logQueryMetrics('InvoiceLines', startTime, result.length);
```

## Performance Improvements

### Expected Results

1. **Query Execution Time**: 60-80% reduction in average query time
2. **Database Load**: 50-70% reduction in database CPU usage
3. **Memory Usage**: 40-60% reduction in memory consumption
4. **User Experience**: Faster page loads and more responsive UI

### Monitoring Metrics

- **Average Query Duration**: Target < 500ms
- **Slow Query Count**: Target < 5% of total queries
- **Cache Hit Rate**: Target > 80%
- **Database CPU Usage**: Target < 70%

## Implementation Checklist

### ✅ Completed

- [x] Added `Prefer: count=none` header to Supabase client
- [x] Implemented cursor-based pagination utilities
- [x] Updated dashboard data hooks to use cursor pagination
- [x] Updated efficiency data hooks to use cursor pagination
- [x] Updated location metrics hooks to use cursor pagination
- [x] Updated PAX data hooks to use cursor pagination
- [x] Created strategic database indexes
- [x] Implemented query optimization utilities
- [x] Added performance monitoring components

### 🔄 In Progress

- [ ] Deploy database indexes to production
- [ ] Monitor performance metrics in production
- [ ] Fine-tune cache TTL values
- [ ] Optimize remaining slow queries

### 📋 Next Steps

1. **Deploy Indexes**: Run the performance optimization indexes script
2. **Monitor Performance**: Use the QueryPerformanceMonitor component
3. **Fine-tune**: Adjust cache settings based on usage patterns
4. **Optimize Further**: Address any remaining slow queries

## Usage Examples

### Cursor Pagination

```typescript
import { fetchWithCursorPagination } from '@/utils/cursorPagination';

// Fetch first page
const result = await fetchWithCursorPagination(query, {
  limit: 1000,
  orderBy: 'invoice_date',
  orderDirection: 'asc'
});

// Fetch next page using cursor
const nextResult = await fetchWithCursorPagination(query, {
  limit: 1000,
  cursor: result.nextCursor,
  orderBy: 'invoice_date',
  orderDirection: 'asc'
});
```

### Optimized Query Builder

```typescript
import { QueryOptimization } from '@/utils/queryOptimization';

const query = QueryOptimization.createInvoiceQuery()
  .organization(orgId)
  .dateRange(startDate, endDate)
  .locations(locationIds)
  .suppliers(supplierIds)
  .select(QueryOptimization.getMinimalInvoiceColumns())
  .orderBy('invoice_date', 'asc');

const result = await query.execute();
```

### Performance Monitoring

```typescript
import { PerformanceMonitoring } from '@/utils/queryOptimization';

const startTime = Date.now();
const result = await query.execute();
const duration = Date.now() - startTime;

PerformanceMonitoring.logQueryMetrics('DashboardData', startTime, result.length);

if (PerformanceMonitoring.isSlowQuery(duration)) {
  const suggestions = PerformanceMonitoring.suggestOptimization({
    duration,
    rowCount: result.length,
    hasJoins: false,
    hasTextSearch: false
  });
  console.log('Optimization suggestions:', suggestions);
}
```

## Troubleshooting

### Common Issues

1. **Index Creation Fails**
   - Use `CREATE INDEX CONCURRENTLY` to avoid blocking
   - Check for existing indexes before creating new ones

2. **Cursor Pagination Issues**
   - Ensure consistent ordering across pagination calls
   - Handle edge cases where cursor might be null

3. **Cache Invalidation**
   - Implement proper cache invalidation strategies
   - Use cache versioning for data updates

### Performance Debugging

1. **Enable Query Logging**
   ```sql
   ALTER SYSTEM SET log_statement = 'all';
   ALTER SYSTEM SET log_min_duration_statement = 1000;
   ```

2. **Monitor Query Performance**
   ```sql
   SELECT query, total_exec_time, mean_exec_time, calls 
   FROM pg_stat_statements 
   ORDER BY total_exec_time DESC 
   LIMIT 10;
   ```

3. **Check Index Usage**
   ```sql
   SELECT schemaname, tablename, indexname, idx_scan, idx_tup_read, idx_tup_fetch
   FROM pg_stat_user_indexes 
   ORDER BY idx_scan DESC;
   ```

## Conclusion

These optimizations should significantly improve database performance and user experience. The combination of strategic indexing, cursor pagination, and query optimization addresses the root causes of the slow queries identified in the performance analysis.

Regular monitoring and fine-tuning will ensure continued optimal performance as the system scales.

