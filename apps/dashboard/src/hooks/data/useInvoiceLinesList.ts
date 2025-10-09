import { useCallback, useMemo, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';

type InvoiceCursor = {
  invoice_date: string;
  created_at: string;
  id: string;
};

export type InvoiceLineRow = {
  id: string;
  invoice_date: string;
  created_at: string;
  invoice_number?: string | null;
  due_date?: string | null;
  delivery_date?: string | null;
  document_type?: string | null;
  product_code: string | null;
  description: string | null;
  quantity?: number | null;
  unit_price?: number | null;
  unit_price_after_discount?: number | null;
  total_price?: number | null;
  total_price_after_discount?: number | null;
  total_tax?: number | null;
  category_id?: string | null;
  location_id: string | null;
  location_name?: string | null;
  location_address?: string | null;
  supplier_id: string | null;
  supplier_name?: string | null;
  supplier_address?: string | null;
  cursor: InvoiceCursor;
};

export type UseInvoiceLinesListParams = {
  organizationId: string;
  startDate?: string;
  endDate?: string;
  locationIds?: string[];
  supplierIds?: string[];
  search?: string | null;
  pageSize?: number;
  enabled?: boolean;
};

export function useInvoiceLinesList(params: UseInvoiceLinesListParams) {
  const {
    organizationId,
    startDate,
    endDate,
    locationIds,
    supplierIds,
    search = null,
    pageSize = 50,
    enabled = true
  } = params;

  const [items, setItems] = useState<InvoiceLineRow[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const nextCursorRef = useRef<InvoiceCursor | undefined>(undefined);
  const hasMoreRef = useRef(true);

  const reset = useCallback(() => {
    setItems([]);
    setError(null);
    nextCursorRef.current = undefined;
    hasMoreRef.current = true;
  }, []);

  const canLoad = useMemo(() => enabled && !!organizationId && hasMoreRef.current, [enabled, organizationId]);

  const loadMore = useCallback(async () => {
    if (!canLoad || isLoading) return;
    setIsLoading(true);
    setError(null);
    try {
      const { data, error: rpcError } = await supabase.rpc<InvoiceLineRow>('invoice_lines_list', {
        p_org: organizationId,
        p_start_date: startDate ?? null,
        p_end_date: endDate ?? null,
        p_location_ids: locationIds && locationIds.length ? locationIds : null,
        p_supplier_ids: supplierIds && supplierIds.length ? supplierIds : null,
        p_search: search,
        p_limit: pageSize,
        p_after_invoice_date: nextCursorRef.current?.invoice_date ?? null,
        p_after_created_at: nextCursorRef.current?.created_at ?? null,
        p_after_id: nextCursorRef.current?.id ?? null
      });
      if (rpcError) throw rpcError;
      const newRows = data ?? [];
      if (!newRows.length) {
        hasMoreRef.current = false;
        return;
      }
      const merged = items.length ? [...items, ...newRows] : newRows;
      setItems(merged);
      nextCursorRef.current = newRows[newRows.length - 1]?.cursor;
      if (newRows.length < pageSize) {
        hasMoreRef.current = false;
      }
    } catch (e) {
      setError(e);
    } finally {
      setIsLoading(false);
    }
  }, [canLoad, isLoading, organizationId, startDate, endDate, locationIds, supplierIds, search, pageSize, items]);

  const refresh = useCallback(async () => {
    reset();
    await loadMore();
  }, [reset, loadMore]);

  return {
    items,
    isLoading,
    error,
    loadMore,
    refresh,
    hasMore: hasMoreRef.current,
    nextCursor: nextCursorRef.current
  };
}


