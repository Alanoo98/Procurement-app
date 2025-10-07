/**
 * Query optimization utilities for Supabase
 * Implements best practices to avoid expensive database operations
 */

import { supabase } from '@/lib/supabase';

/**
 * Optimized invoice lines query builder
 * Avoids expensive joins and uses efficient filtering
 */
export class OptimizedInvoiceQuery {
  private query: any;

  constructor() {
    this.query = supabase.from('invoice_lines');
  }

  /**
   * Apply organization filter (most important filter)
   */
  organization(orgId: string): this {
    this.query = this.query.eq('organization_id', orgId);
    return this;
  }

  /**
   * Apply business unit filter
   */
  businessUnit(businessUnitId: string): this {
    this.query = this.query.eq('business_unit_id', businessUnitId);
    return this;
  }

  /**
   * Apply date range filter (use index-friendly range queries)
   */
  dateRange(start: string, end: string): this {
    this.query = this.query
      .gte('invoice_date', start)
      .lte('invoice_date', end);
    return this;
  }

  /**
   * Apply location filter (use IN clause for multiple locations)
   * Fixed: Removed tautology query pattern
   */
  locations(locationIds: string[]): this {
    if (locationIds.length > 0) {
      this.query = this.query.in('location_id', locationIds);
    } else {
      // When no locations selected, show all mapped locations only
      this.query = this.query.not('location_id', 'is', null);
    }
    return this;
  }

  /**
   * Apply supplier filter
   */
  suppliers(supplierIds: string[]): this {
    if (supplierIds.length > 0) {
      this.query = this.query.in('supplier_id', supplierIds);
    }
    return this;
  }

  /**
   * Apply category filter
   */
  categories(categoryIds: string[]): this {
    if (categoryIds.length > 0) {
      this.query = this.query.in('category_id', categoryIds);
    }
    return this;
  }

  /**
   * Apply document type filter
   */
  documentType(docType: string): this {
    if (docType === 'Faktura') {
      this.query = this.query.in('document_type', ['Faktura', 'Invoice']);
    } else if (docType === 'Kreditnota') {
      this.query = this.query.in('document_type', ['Kreditnota', 'Credit note']);
    }
    return this;
  }

  /**
   * Apply product code filter
   */
  productCodeFilter(filter: string): this {
    if (filter === 'with_codes') {
      this.query = this.query
        .not('product_code', 'is', null)
        .neq('product_code', '');
    } else if (filter === 'without_codes') {
      this.query = this.query.or('product_code.is.null,product_code.eq.');
    }
    return this;
  }

  /**
   * Apply description filter (avoid expensive text searches)
   */
  descriptionFilter(description: string): this {
    if (description && description.trim()) {
      this.query = this.query.ilike('description', `%${description.trim()}%`);
    }
    return this;
  }

  /**
   * Select only necessary columns to reduce data transfer
   */
  select(columns: string[]): this {
    this.query = this.query.select(columns.join(', '));
    return this;
  }

  /**
   * Apply ordering for cursor pagination
   */
  orderBy(field: string, direction: 'asc' | 'desc' = 'asc'): this {
    this.query = this.query.order(field, { ascending: direction === 'asc' });
    return this;
  }

  /**
   * Apply limit
   */
  limit(count: number): this {
    this.query = this.query.limit(count);
    return this;
  }

  /**
   * Get the query object
   */
  getQuery() {
    return this.query;
  }

  /**
   * Execute the query
   */
  async execute() {
    return await this.query;
  }
}

/**
 * Optimized pending category mappings query
 * Addresses the most expensive query in the system
 */
export class OptimizedPendingCategoryQuery {
  private query: any;

  constructor() {
    this.query = supabase.from('pending_category_mappings');
  }

  organization(orgId: string): this {
    this.query = this.query.eq('organization_id', orgId);
    return this;
  }

  status(status: string): this {
    this.query = this.query.eq('status', status);
    return this;
  }

  select(columns: string[]): this {
    this.query = this.query.select(columns.join(', '));
    return this;
  }

  orderBy(field: string, direction: 'asc' | 'desc' = 'asc'): this {
    this.query = this.query.order(field, { ascending: direction === 'asc' });
    return this;
  }

  limit(count: number): this {
    this.query = this.query.limit(count);
    return this;
  }

  getQuery() {
    return this.query;
  }

  async execute() {
    return await this.query;
  }
}

/**
 * Query optimization helpers
 */
export const QueryOptimization = {
  /**
   * Create an optimized invoice lines query
   */
  createInvoiceQuery: () => new OptimizedInvoiceQuery(),

  /**
   * Create an optimized pending category mappings query
   */
  createPendingCategoryQuery: () => new OptimizedPendingCategoryQuery(),

  /**
   * Get minimal columns for invoice lines to reduce data transfer
   */
  getMinimalInvoiceColumns: () => [
    'id',
    'invoice_number',
    'invoice_date',
    'document_type',
    'product_code',
    'description',
    'quantity',
    'unit_type',
    'unit_price',
    'unit_price_after_discount',
    'total_price',
    'total_price_after_discount',
    'supplier_id',
    'location_id',
    'category_id'
  ],

  /**
   * Get minimal columns for pending category mappings
   */
  getMinimalPendingCategoryColumns: () => [
    'variant_product_name',
    'variant_product_code',
    'variant_supplier_name'
  ],

  /**
   * Check if query should use cursor pagination
   */
  shouldUseCursorPagination: (estimatedRows: number) => estimatedRows > 1000,

  /**
   * Get optimal page size based on query complexity
   */
  getOptimalPageSize: (hasJoins: boolean, hasTextSearch: boolean) => {
    if (hasJoins && hasTextSearch) return 100;
    if (hasJoins || hasTextSearch) return 500;
    return 1000;
  }
};

/**
 * Performance monitoring utilities
 */
export const PerformanceMonitoring = {
  /**
   * Log query performance metrics
   */
  logQueryMetrics: (queryName: string, startTime: number, rowCount: number) => {
    const duration = Date.now() - startTime;
    console.log(`Query Performance: ${queryName}`, {
      duration: `${duration}ms`,
      rows: rowCount,
      rowsPerSecond: Math.round((rowCount / duration) * 1000)
    });
  },

  /**
   * Check if query is taking too long
   */
  isSlowQuery: (duration: number, threshold: number = 5000) => duration > threshold,

  /**
   * Suggest optimization based on query metrics
   */
  suggestOptimization: (metrics: {
    duration: number;
    rowCount: number;
    hasJoins: boolean;
    hasTextSearch: boolean;
  }) => {
    const suggestions: string[] = [];

    if (metrics.duration > 5000) {
      suggestions.push('Consider adding database indexes');
    }

    if (metrics.rowCount > 10000 && !metrics.hasJoins) {
      suggestions.push('Consider using cursor pagination');
    }

    if (metrics.hasTextSearch && metrics.duration > 2000) {
      suggestions.push('Consider using full-text search indexes');
    }

    if (metrics.hasJoins && metrics.duration > 3000) {
      suggestions.push('Consider denormalizing data or using materialized views');
    }

    return suggestions;
  }
};
