/**
 * Optimized Invoice Lines Hook
 * Eliminates LATERAL joins and uses efficient query patterns
 */

import { useQuery } from '@tanstack/react-query';
import { getInvoiceLinesWithMaps } from '@/utils/optimizedPostgrestQueries';

interface UseOptimizedInvoiceLinesParams {
  organizationId: string;
  from: string;
  to: string;
  locationIds: string[];
  supplierIds: string[];
  limit?: number;
  enabled?: boolean;
}

export const useOptimizedInvoiceLines = ({
  organizationId,
  from,
  to,
  locationIds,
  supplierIds,
  limit = 200,
  enabled = true
}: UseOptimizedInvoiceLinesParams) => {
  return useQuery({
    queryKey: ['invoice-lines', organizationId, from, to, locationIds, supplierIds, limit],
    queryFn: () => getInvoiceLinesWithMaps({
      organizationId,
      from,
      to,
      locationIds,
      supplierIds,
      limit
    }),
    enabled: enabled && organizationId && locationIds.length > 0,
    staleTime: 2 * 60_000, // 2 minutes cache
    gcTime: 5 * 60_000, // 5 minutes garbage collection
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    // Retry configuration
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
  });
};




