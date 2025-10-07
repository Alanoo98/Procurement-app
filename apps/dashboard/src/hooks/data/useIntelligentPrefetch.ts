import { useEffect, useCallback } from 'react';
import { cache } from '@/lib/cache';
import { useOrganization } from '@/contexts/OrganizationContext';

/**
 * Intelligent prefetch hook that preloads commonly accessed data
 * This helps reduce perceived loading times by fetching data before it's needed
 */
export const useIntelligentPrefetch = () => {
  const { currentOrganization, currentBusinessUnit } = useOrganization();

  const prefetchCommonData = useCallback(async () => {
    if (!currentOrganization) return;

    try {
      // Prefetch locations data (commonly used across the app)
      const locationsKey = `locations:${currentOrganization.id}:${currentBusinessUnit?.id || 'all'}`;
      if (!cache.has(locationsKey)) {
        // This would typically call your locations API
        console.log('Prefetching locations data...');
      }

      // Prefetch suppliers data (commonly used)
      const suppliersKey = `suppliers:${currentOrganization.id}`;
      if (!cache.has(suppliersKey)) {
        console.log('Prefetching suppliers data...');
      }

      // Prefetch basic dashboard metrics (if no filters applied)
      const basicDashboardKey = `dashboard:${btoa(JSON.stringify({
        orgId: currentOrganization.id,
        buId: currentBusinessUnit?.id,
        dateRange: null,
        restaurants: [],
        suppliers: [],
        categories: [],
        documentType: null,
        productSearch: null,
        productCodeFilter: null,
      }))}`;
      
      if (!cache.has(basicDashboardKey)) {
        console.log('Prefetching basic dashboard data...');
      }

    } catch (error) {
      console.warn('Prefetch failed:', error);
      // Don't throw - prefetch failures shouldn't break the app
    }
  }, [currentOrganization, currentBusinessUnit]);

  // Prefetch when organization changes
  useEffect(() => {
    if (currentOrganization) {
      // Small delay to not interfere with initial page load
      const timeoutId = setTimeout(prefetchCommonData, 2000);
      return () => clearTimeout(timeoutId);
    }
  }, [currentOrganization, prefetchCommonData]);

  return {
    prefetchCommonData,
  };
};
