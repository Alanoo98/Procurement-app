import { useCachedData } from '../data/useCachedData';
import { keys } from '@/lib/cache';
import { useOrganization } from '@/contexts/OrganizationContext';

/**
 * Example: How to use the clean caching system
 * 
 * This shows how simple it is to cache any data:
 * 1. Import useCachedData and keys
 * 2. Create a fetcher function
 * 3. Use the hook
 * 
 * That's it! No complex logic, no messy state management.
 */

// Example 1: Cached dashboard data
export function useExampleDashboardData() {
  const { currentOrganization, currentBusinessUnit } = useOrganization();
  
  return useCachedData({
    key: currentOrganization ? keys.dashboard(currentOrganization.id, currentBusinessUnit?.id) : '',
    fetcher: async () => {
      if (!currentOrganization) throw new Error('No organization');
      
      // Your API call here
      const response = await fetch(`/api/dashboard/${currentOrganization.id}`);
      return response.json();
    },
    ttl: 10 * 60 * 1000, // 10 minutes
    enabled: !!currentOrganization,
  });
}

// Example 2: Cached products with filters
export function useExampleProducts(filters?: any) {
  const { currentOrganization } = useOrganization();
  
  return useCachedData({
    key: currentOrganization ? keys.products(currentOrganization.id, JSON.stringify(filters)) : '',
    fetcher: async () => {
      if (!currentOrganization) throw new Error('No organization');
      
      // Your API call here
      const response = await fetch(`/api/products/${currentOrganization.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(filters),
      });
      return response.json();
    },
    ttl: 5 * 60 * 1000, // 5 minutes
    enabled: !!currentOrganization,
  });
}

// Example 3: Cached suppliers
export function useExampleSuppliers() {
  const { currentOrganization } = useOrganization();
  
  return useCachedData({
    key: currentOrganization ? keys.suppliers(currentOrganization.id) : '',
    fetcher: async () => {
      if (!currentOrganization) throw new Error('No organization');
      
      // Your API call here
      const response = await fetch(`/api/suppliers/${currentOrganization.id}`);
      return response.json();
    },
    ttl: 15 * 60 * 1000, // 15 minutes
    enabled: !!currentOrganization,
  });
}
