import { useCallback, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';

type ProductCursor = { description: string | null; product_code: string | null; supplier_id: string | null };

export type ProductLookupRow = {
  product_code: string | null;
  description: string | null;
  supplier_id: string | null;
  cursor: ProductCursor;
};

export function useProductsLookup(params: {
  organizationId: string;
  supplierId?: string;
  search?: string | null;
  pageSize?: number;
}) {
  const { organizationId, supplierId, search = null, pageSize = 50 } = params;
  const [items, setItems] = useState<ProductLookupRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const nextCursorRef = useRef<ProductCursor | undefined>(undefined);
  const hasMoreRef = useRef(true);

  const reset = useCallback(() => {
    setItems([]);
    setError(null);
    nextCursorRef.current = undefined;
    hasMoreRef.current = true;
  }, []);

  const loadMore = useCallback(async () => {
    if (loading || !hasMoreRef.current || !organizationId) return;
    setLoading(true);
    setError(null);
    try {
      const { data, error: rpcError } = await supabase.rpc<ProductLookupRow>('products_lookup_list', {
        p_org: organizationId,
        p_supplier_id: supplierId ?? null,
        p_search: search,
        p_limit: pageSize,
        p_after_description: nextCursorRef.current?.description ?? null,
        p_after_product_code: nextCursorRef.current?.product_code ?? null,
        p_after_supplier_id: nextCursorRef.current?.supplier_id ?? null,
      });
      if (rpcError) throw rpcError;
      const rows = data ?? [];
      if (!rows.length) {
        hasMoreRef.current = false;
        return;
      }
      setItems(prev => (prev.length ? [...prev, ...rows] : rows));
      nextCursorRef.current = rows[rows.length - 1]?.cursor;
      if (rows.length < pageSize) hasMoreRef.current = false;
    } catch (e) {
      setError(e);
    } finally {
      setLoading(false);
    }
  }, [loading, organizationId, supplierId, search, pageSize]);

  return { items, loading, error, loadMore, reset, hasMore: hasMoreRef.current };
}




