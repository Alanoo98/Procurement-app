/**
 * Optimized Pending Categories Hook
 * Uses cursor pagination to eliminate expensive OFFSET queries
 */

import { useQuery } from '@tanstack/react-query';
import { getPendingCategoryMappings } from '@/utils/optimizedPostgrestQueries';

interface UseOptimizedPendingCategoriesParams {
  organizationId: string;
  status: string;
  limit?: number;
  cursor?: string;
  enabled?: boolean;
}

export const useOptimizedPendingCategories = ({
  organizationId,
  status,
  limit = 200,
  cursor,
  enabled = true
}: UseOptimizedPendingCategoriesParams) => {
  return useQuery({
    queryKey: ['pending-categories', organizationId, status, limit, cursor],
    queryFn: () => getPendingCategoryMappings({
      organizationId,
      status,
      limit,
      cursor
    }),
    enabled: enabled && organizationId,
    staleTime: 30_000, // 30 seconds cache
    gcTime: 2 * 60_000, // 2 minutes garbage collection
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    // Retry configuration
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 5000),
  });
};




