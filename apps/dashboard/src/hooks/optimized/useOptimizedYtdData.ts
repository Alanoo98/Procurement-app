/**
 * Optimized YTD Data Hook
 * Uses TanStack Query with proper caching to eliminate redundant calls
 */

import { useQuery } from '@tanstack/react-query';
import { getYtdLocations } from '@/utils/optimizedPostgrestQueries';

interface YtdLocationData {
  location_id: string;
  line_count: number;
  total_amount: number;
  total_after: number;
}

interface UseOptimizedYtdDataParams {
  organizationId: string;
  locationIds: string[];
  from: string;
  to: string;
  enabled?: boolean;
}

export const useOptimizedYtdData = ({
  organizationId,
  locationIds,
  from,
  to,
  enabled = true
}: UseOptimizedYtdDataParams) => {
  return useQuery({
    queryKey: ['ytd', organizationId, locationIds, from, to],
    queryFn: () => getYtdLocations({
      organizationId,
      locationIds,
      from,
      to
    }),
    enabled: enabled && organizationId && locationIds.length > 0,
    staleTime: 60_000, // 1 minute cache
    gcTime: 10 * 60_000, // 10 minutes garbage collection
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    // Retry configuration
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
};


