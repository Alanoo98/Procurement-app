/**
 * Shared spending query utilities
 * Ensures both COGS Dashboard and Deep Dive Analysis use identical queries
 */

import { supabase } from '@/lib/supabase';

export interface SpendingQueryParams {
  organizationId: string;
  year: number;
  month: number;
  locationId?: string; // Optional - if provided, filters to specific location
  includeAllLocations?: boolean; // Flag to distinguish all-locations queries
}

export interface SpendingQueryResult {
  location_id: string;
  invoice_date: string;
  total_price_after_discount: string | null;
  total_price: string | null;
  currency: string;
  product_code: string | null;
  description: string | null;
  category_id: string | null;
  category_mapping_id: string | null;
  supplier_id: string | null;
  suppliers?: { name: string }[] | null;
  document_type: string;
  quantity: number;
}

/**
 * Get spending data using the exact same query logic for both COGS Dashboard and Deep Dive Analysis
 */
export async function getSpendingData(params: SpendingQueryParams): Promise<SpendingQueryResult[]> {
  const { organizationId, year, month, locationId, includeAllLocations } = params;
  
  // Calculate date range - use the same logic as Deep Dive Analysis
  const endDate = new Date(year, month, 0);
  const startDateStr = `${year}-${String(month).padStart(2, '0')}-01`;
  const endDateStr = `${year}-${String(month).padStart(2, '0')}-${String(endDate.getDate()).padStart(2, '0')}`;
  
  let query = supabase
    .from('invoice_lines')
    .select(`
      location_id,
      invoice_date,
      total_price_after_discount,
      total_price,
      currency,
      product_code,
      description,
      category_id,
      category_mapping_id,
      supplier_id,
      suppliers!supplier_id(name),
      document_type,
      quantity
    `)
    .eq('organization_id', organizationId)
    .gte('invoice_date', startDateStr)
    .lte('invoice_date', endDateStr)
    // Include both invoices and credit notes, but handle them properly
    .in('document_type', ['Faktura', 'Invoice', 'Kreditnota', 'Credit note']);
  
  // If locationId is provided, filter to that specific location
  if (locationId) {
    query = query.eq('location_id', locationId);
  }
  
  const { data, error } = await query;
  
  if (error) {
    throw error;
  }
  
  // Debug logging
  console.log('Debug - getSpendingData query params:', {
    organizationId,
    year,
    month,
    locationId,
    includeAllLocations,
    startDateStr,
    endDateStr
  });
  console.log('Debug - getSpendingData result count:', data?.length || 0);
  console.log('Debug - getSpendingData first few records:', data?.slice(0, 3));
  
  return data || [];
}

