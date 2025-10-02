import { useEffect, useState, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { useOrganization } from '@/contexts/OrganizationContext';

export interface ProductTargetProgress {
  id: string;
  organization_id: string;
  business_unit_id?: string;
  product_code: string;
  product_name?: string;
  supplier_id?: string;
  supplier_name?: string;
  location_id?: string;
  target_quantity?: number;
  target_spend?: number;
  start_date: string;
  end_date: string;
  notes?: string;
  created_at: string;
  updated_at: string;
  quantity_sold: number;
  spend_achieved: number;
  quantity_progress_pct?: number;
  spend_progress_pct?: number;
  contract_time_progress_pct: number;
  status: string;
  days_left: number;
}

export const useProductTargets = () => {
  const { currentOrganization } = useOrganization();
  const [targets, setTargets] = useState<ProductTargetProgress[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchTargets = useCallback(async () => {
    if (!currentOrganization?.id) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const { data, error: fetchError } = await supabase
        .from('product_targets')
        .select('*')
        .eq('organization_id', currentOrganization.id)
        .order('end_date', { ascending: true });

      if (fetchError) throw fetchError;

      // Get product descriptions for all unique product codes
      const uniqueProductCodes = [...new Set((data || []).map(target => target.product_code).filter(Boolean))];
      let productDescriptions: Record<string, string> = {};
      
      if (uniqueProductCodes.length > 0) {
        const { data: productData } = await supabase
          .from('invoice_lines')
          .select('product_code, description')
          .in('product_code', uniqueProductCodes)
          .not('product_code', 'is', null);
        
        // Create a map of product codes to descriptions
        productDescriptions = (productData || []).reduce((acc, product) => {
          if (product.product_code && !acc[product.product_code]) {
            acc[product.product_code] = product.description || product.product_code;
          }
          return acc;
        }, {} as Record<string, string>);
      }

      // Get supplier names for all unique supplier IDs
      const uniqueSupplierIds = [...new Set((data || []).map(target => target.supplier_id).filter(Boolean))];
      let supplierNames: Record<string, string> = {};
      
      if (uniqueSupplierIds.length > 0) {
        const { data: supplierData } = await supabase
          .from('suppliers')
          .select('supplier_id, name')
          .in('supplier_id', uniqueSupplierIds);
        
        // Create a map of supplier IDs to names
        supplierNames = (supplierData || []).reduce((acc, supplier) => {
          acc[supplier.supplier_id] = supplier.name || '-';
          return acc;
        }, {} as Record<string, string>);
      }
      
      // Calculate actual metrics for each target
      const processedTargets = await Promise.all((data || []).map(async (target) => {
        const endDate = new Date(target.end_date);
        const now = new Date();
        const daysLeft = Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        
        // Calculate time progress
        const timeProgress = Math.max(0, Math.min(((now.getTime() - new Date(target.start_date).getTime()) / (endDate.getTime() - new Date(target.start_date).getTime())) * 100, 100));
        
        // Query invoice_lines for this specific product target
        let invoiceQuery = supabase
          .from('invoice_lines')
          .select('quantity, total_price_after_discount, invoice_date')
          .eq('organization_id', currentOrganization.id)
          .eq('product_code', target.product_code)
          .gte('invoice_date', target.start_date)
          .lte('invoice_date', target.end_date);
        
        // Apply supplier filter if specified
        if (target.supplier_id) {
          invoiceQuery = invoiceQuery.eq('supplier_id', target.supplier_id);
        }
        
        // Apply location filter if specified
        if (target.location_id) {
          invoiceQuery = invoiceQuery.eq('location_id', target.location_id);
        }
        
        const { data: invoiceData, error: invoiceError } = await invoiceQuery;
        
        if (invoiceError) {
          console.error('Error fetching invoice data for target:', target.id, invoiceError);
        }
        
        // Calculate actual quantities and spend
        const quantitySold = (invoiceData || []).reduce((sum, line) => sum + (line.quantity || 0), 0);
        const spendAchieved = (invoiceData || []).reduce((sum, line) => sum + (line.total_price_after_discount || 0), 0);
        
        // Calculate progress percentages
        const quantityProgress = target.target_quantity ? (quantitySold / target.target_quantity) * 100 : 0;
        const spendProgress = target.target_spend ? (spendAchieved / target.target_spend) * 100 : 0;
        
        // Use the same status calculation logic as the ProductTargets page
        const getStatus = (quantityPct?: number, spendPct?: number, contractPct?: number) => {
          if (contractPct === undefined) return 'On Track';
          const progress = Math.max(quantityPct || 0, spendPct || 0);
          if (progress >= contractPct) return 'On Track';
          if (progress >= contractPct * 0.8) return 'At Risk';
          return 'Behind';
        };
        
        const status = getStatus(quantityProgress, spendProgress, timeProgress);
        
        return {
          ...target,
          product_name: productDescriptions[target.product_code] || target.product_code || 'No Product Code',
          supplier_name: supplierNames[target.supplier_id] || '-',
          quantity_sold: quantitySold,
          spend_achieved: spendAchieved,
          quantity_progress_pct: quantityProgress,
          spend_progress_pct: spendProgress,
          contract_time_progress_pct: timeProgress,
          days_left: daysLeft,
          status
        };
      }));
      
      setTargets(processedTargets);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch product targets'));
    } finally {
      setIsLoading(false);
    }
  }, [currentOrganization?.id]);

  useEffect(() => {
    fetchTargets();
  }, [fetchTargets]);

  return { data: targets, isLoading, error, fetchTargets };
};

// New hook for dashboard summary data
export const useProductTargetsSummary = () => {
  const { data: targets, isLoading, error } = useProductTargets();
  
  const summary = useMemo(() => {
    if (!targets) return null;
    
    const totalTargets = targets.length;
    const onTrack = targets.filter(t => t.status === 'On Track').length;
    const atRisk = targets.filter(t => t.status === 'At Risk').length;
    const behind = targets.filter(t => t.status === 'Behind').length;
    
    // Get targets that need attention (behind or at risk with less than 30 days left)
    const needsAttention = targets.filter(t => 
      (t.status === 'Behind' || t.status === 'At Risk') && t.days_left <= 30
    );
    
    // Get targets ending soon (within 7 days)
    const endingSoon = targets.filter(t => t.days_left <= 7 && t.days_left > 0);
    
    // Calculate total spend achieved across all targets
    const totalSpendAchieved = targets.reduce((sum, t) => sum + (t.spend_achieved || 0), 0);
    const totalQuantitySold = targets.reduce((sum, t) => sum + (t.quantity_sold || 0), 0);
    
    return {
      totalTargets,
      onTrack,
      atRisk,
      behind,
      needsAttention: needsAttention.length,
      endingSoon: endingSoon.length,
      totalSpendAchieved,
      totalQuantitySold,
      recentTargets: targets.slice(0, 5) // Show 5 most recent targets
    };
  }, [targets]);
  
  return { data: summary, isLoading, error };
}; 
