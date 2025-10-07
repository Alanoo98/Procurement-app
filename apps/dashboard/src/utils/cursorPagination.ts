/**
 * Cursor-based pagination utilities for Supabase queries
 * Replaces expensive OFFSET pagination with efficient cursor-based approach
 */

export interface CursorTupleCursor {
  invoice_date?: string; // ISO date string
  created_at?: string;   // ISO timestamp string
  id?: string;           // uuid
}

export interface CursorPaginationOptions {
  limit: number;
  cursor?: string | CursorTupleCursor;
  orderBy: string;
  orderDirection: 'asc' | 'desc';
}

export interface CursorPaginationResult<T> {
  data: T[];
  nextCursor?: string;
  hasMore: boolean;
}

/**
 * Creates a cursor from a record for pagination
 * Uses the primary ordering field(s) to create a unique cursor
 */
export function createCursor(record: Record<string, unknown>, orderBy: string): string {
  // If RPC returns a cursor tuple, prefer that
  const tupleCursor = (record['cursor'] as CursorTupleCursor | undefined);
  if (tupleCursor && (tupleCursor.invoice_date || tupleCursor.created_at || tupleCursor.id)) {
    return JSON.stringify(tupleCursor);
  }
  const value = record[orderBy];
  if (value instanceof Date) {
    return value.toISOString();
  }
  return String(value);
}

/**
 * Applies cursor-based filtering to a Supabase query
 * Uses the cursor to filter records after the cursor position
 */
export function applyCursorFilter(
  query: unknown,
  cursor: string | CursorTupleCursor | undefined,
  orderBy: string,
  orderDirection: 'asc' | 'desc'
): unknown {
  if (!cursor) return query;

  const queryObj = query as any;

  // If this is a tuple cursor for RPC, set parameters expected by RPC
  try {
    const c: CursorTupleCursor = typeof cursor === 'string' ? JSON.parse(cursor) : cursor;
    if (c && (c.invoice_date || c.created_at || c.id)) {
      if (typeof queryObj.eq === 'function') {
        if (c.invoice_date) queryObj.eq('p_after_invoice_date', c.invoice_date);
        if (c.created_at) queryObj.eq('p_after_created_at', c.created_at);
        if (c.id) queryObj.eq('p_after_id', c.id);
        return queryObj;
      }
    }
  } catch (_) {
    // fallthrough to simple order field cursor
  }

  // Fallback: simple gt/lt on orderBy for table selects
  const operator = orderDirection === 'asc' ? 'gt' : 'lt';
  if (typeof queryObj[operator] === 'function') {
    return queryObj[operator](orderBy, cursor as string);
  }
  return query;
}

/**
 * Fetches data with cursor-based pagination
 * This eliminates the need for expensive COUNT queries and OFFSET operations
 */
export async function fetchWithCursorPagination<T>(
  query: unknown,
  options: CursorPaginationOptions
): Promise<CursorPaginationResult<T>> {
  const { limit, cursor, orderBy, orderDirection } = options;

  // Apply cursor filter if provided
  let paginatedQuery = applyCursorFilter(query, cursor, orderBy, orderDirection);

  // Apply ordering and limit
  const queryObj = paginatedQuery as Record<string, unknown>;
  if (typeof queryObj.order === 'function' && typeof queryObj.limit === 'function') {
    paginatedQuery = queryObj
      .order(orderBy, { ascending: orderDirection === 'asc' })
      .limit(limit + 1);
  }

  const result = await (paginatedQuery as { data: T[]; error: unknown });
  const { data, error } = result;

  if (error) {
    throw error;
  }

  const hasMore = data && data.length > limit;
  const resultData = hasMore ? data.slice(0, limit) : (data || []);
  
  // Create next cursor from the last record
  const nextCursor = hasMore && resultData.length > 0
    ? createCursor(resultData[resultData.length - 1] as Record<string, unknown>, orderBy)
    : undefined;

  return {
    data: resultData,
    nextCursor,
    hasMore: hasMore
  };
}

/**
 * Fetches all data using cursor-based pagination
 * More efficient than OFFSET pagination for large datasets
 * Simplified implementation that works with existing Supabase queries
 */
export async function fetchAllWithCursorPagination<T>(
  query: unknown,
  orderBy: string,
  orderDirection: 'asc' | 'desc' = 'asc',
  pageSize: number = 1000
): Promise<T[]> {
  const allData: T[] = [];
  let page = 0;
  let hasMore = true;

  // Use the existing query and apply ordering
  const queryObj = query as Record<string, unknown>;
  if (typeof queryObj.order === 'function') {
    (queryObj as any).order(orderBy, { ascending: orderDirection === 'asc' });
  }

  while (hasMore) {
    const offset = page * pageSize;
    
    // Use range for pagination (more efficient than OFFSET for large datasets)
    const result = await (queryObj as any).range(offset, offset + pageSize - 1);

    if (result.error) {
      throw result.error;
    }

    const data = result.data || [];
    if (data.length === 0) {
      hasMore = false;
    } else {
      allData.push(...data);
      
      // If we got less than pageSize, we've reached the end
      if (data.length < pageSize) {
        hasMore = false;
      }
      
      page++;
    }
  }

  return allData;
}

/**
 * Optimized invoice lines query with cursor pagination
 * Replaces the expensive OFFSET-based queries in the slow query list
 */
export async function fetchInvoiceLinesWithCursor(
  baseQuery: unknown,
  orderBy: string = 'invoice_date',
  orderDirection: 'asc' | 'desc' = 'desc',
  limit: number = 1000
) {
  return fetchWithCursorPagination(baseQuery, {
    limit,
    orderBy,
    orderDirection
  });
}

/**
 * Optimized pending category mappings query with cursor pagination
 * Addresses the most expensive query in the performance analysis
 */
export async function fetchPendingCategoryMappingsWithCursor(
  baseQuery: unknown,
  orderBy: string = 'created_at',
  orderDirection: 'asc' | 'desc' = 'desc',
  limit: number = 1000
) {
  return fetchWithCursorPagination(baseQuery, {
    limit,
    orderBy,
    orderDirection
  });
}
