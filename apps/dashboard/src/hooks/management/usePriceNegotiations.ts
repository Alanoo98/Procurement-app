import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useOrganization } from '@/contexts/OrganizationContext';
import { useFilterStore } from '@/store/filterStore';
import { toast } from 'sonner';

export type PriceNegotiation = {
  id: string;
  productCode: string;
  description: string;
  supplierId: string;
  supplier: string;
  requestedBy: string;
  requestedAt: Date;
  status: 'active' | 'resolved';
  targetPrice: number;
  currentPrice: number;
  effectiveDate?: Date;
  comment?: string;
  resolutionNote?: string;
  resolvedAt?: Date;
  unitType: string;
  unitSubtype?: string;
  businessUnitId?: string;
};

export const usePriceNegotiations = () => {
  const { currentOrganization, currentBusinessUnit } = useOrganization();
  const {
    dateRange,
    suppliers,
  } = useFilterStore();
  const [negotiations, setNegotiations] = useState<PriceNegotiation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchNegotiations = async () => {
      if (!currentOrganization) return;
      
      setIsLoading(true);
      setError(null);

      try {
        let query = supabase
          .from('price_negotiations')
          .select(`
            id,
            product_code,
            description,
            supplier_id,
            supplier,
            requested_by,
            requested_at,
            status,
            target_price,
            current_price,
            effective_date,
            comment,
            resolution_note,
            resolved_at,
            unit_type,
            unit_subtype,
            business_unit_id
          `)
          .eq('organization_id', currentOrganization.id);
          
        // Apply business unit filter if selected
        if (currentBusinessUnit) {
          query = query.eq('business_unit_id', currentBusinessUnit.id);
        }

        // Note: Price negotiations are not filtered by date range
        // as they represent ongoing management tasks that should always be visible

        if (suppliers.length > 0) {
          query = query.in('supplier_id', suppliers);
        }
        
        const { data, error } = await query.order('requested_at', { ascending: false });

        if (error) throw error;
        
        const processedData = data.map(item => ({
          id: item.id,
          productCode: item.product_code,
          description: item.description || '',
          supplierId: item.supplier_id,
          supplier: item.supplier || '',
          requestedBy: item.requested_by,
          requestedAt: new Date(item.requested_at),
          status: item.status as 'active' | 'resolved',
          targetPrice: item.target_price,
          currentPrice: item.current_price,
          effectiveDate: item.effective_date ? new Date(item.effective_date) : undefined,
          comment: item.comment,
          resolutionNote: item.resolution_note,
          resolvedAt: item.resolved_at ? new Date(item.resolved_at) : undefined,
          unitType: item.unit_type || '',
          unitSubtype: item.unit_subtype,
          businessUnitId: item.business_unit_id
        }));
        
        setNegotiations(processedData);
      } catch (err) {
        console.error('Error fetching price negotiations:', err);
        setError(err as Error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchNegotiations();
  }, [currentOrganization, currentBusinessUnit, suppliers]);

  const createNegotiation = async (negotiation: Omit<PriceNegotiation, 'id' | 'requestedAt' | 'status'>) => {
    if (!currentOrganization) {
      throw new Error('No organization selected');
    }

    try {
      const { data, error } = await supabase
        .from('price_negotiations')
        .insert({
          organization_id: currentOrganization.id,
          business_unit_id: currentBusinessUnit?.id || null,
          product_code: negotiation.productCode,
          description: negotiation.description,
          supplier_id: negotiation.supplierId,
          supplier: negotiation.supplier,
          requested_by: negotiation.requestedBy,
          target_price: negotiation.targetPrice,
          current_price: negotiation.currentPrice,
          effective_date: negotiation.effectiveDate,
          comment: negotiation.comment,
          unit_type: negotiation.unitType,
          unit_subtype: negotiation.unitSubtype
        })
        .select()
        .single();

      if (error) throw error;
      
      const newNegotiation: PriceNegotiation = {
        id: data.id,
        productCode: data.product_code,
        description: data.description || '',
        supplierId: data.supplier_id,
        supplier: data.supplier || '',
        requestedBy: data.requested_by,
        requestedAt: new Date(data.requested_at),
        status: data.status as 'active' | 'resolved',
        targetPrice: data.target_price,
        currentPrice: data.current_price,
        effectiveDate: data.effective_date ? new Date(data.effective_date) : undefined,
        comment: data.comment,
        resolutionNote: data.resolution_note,
        resolvedAt: data.resolved_at ? new Date(data.resolved_at) : undefined,
        unitType: data.unit_type || '',
        unitSubtype: data.unit_subtype,
        businessUnitId: data.business_unit_id
      };
      
      setNegotiations(prev => [newNegotiation, ...prev]);
      return newNegotiation;
    } catch (err) {
      console.error('Error creating price negotiation:', err);
      throw err;
    }
  };

  const updateNegotiation = async (id: string, updates: Partial<PriceNegotiation>) => {
    try {
      const updateData: any = {};
      
      if (updates.status !== undefined) updateData.status = updates.status;
      if (updates.targetPrice !== undefined) updateData.target_price = updates.targetPrice;
      if (updates.effectiveDate !== undefined) updateData.effective_date = updates.effectiveDate;
      if (updates.comment !== undefined) updateData.comment = updates.comment;
      if (updates.resolutionNote !== undefined) updateData.resolution_note = updates.resolutionNote;
      
      // If status is being set to 'resolved', set resolved_at timestamp
      if (updates.status === 'resolved') {
        updateData.resolved_at = new Date().toISOString();
      }
      
      const { data, error } = await supabase
        .from('price_negotiations')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      
      const updatedNegotiation: PriceNegotiation = {
        id: data.id,
        productCode: data.product_code,
        description: data.description || '',
        supplierId: data.supplier_id,
        supplier: data.supplier || '',
        requestedBy: data.requested_by,
        requestedAt: new Date(data.requested_at),
        status: data.status as 'active' | 'resolved',
        targetPrice: data.target_price,
        currentPrice: data.current_price,
        effectiveDate: data.effective_date ? new Date(data.effective_date) : undefined,
        comment: data.comment,
        resolutionNote: data.resolution_note,
        resolvedAt: data.resolved_at ? new Date(data.resolved_at) : undefined,
        unitType: data.unit_type || '',
        unitSubtype: data.unit_subtype,
        businessUnitId: data.business_unit_id
      };
      
      setNegotiations(prev => prev.map(n => n.id === id ? updatedNegotiation : n));
      return updatedNegotiation;
    } catch (err) {
      console.error('Error updating price negotiation:', err);
      throw err;
    }
  };

  const deleteNegotiation = async (id: string) => {
    try {
      const { error } = await supabase
        .from('price_negotiations')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      setNegotiations(prev => prev.filter(n => n.id !== id));
    } catch (err) {
      console.error('Error deleting price negotiation:', err);
      throw err;
    }
  };

  const runPriceAlertDetection = async () => {
    if (!currentOrganization) {
      toast.error('No organization selected');
      return;
    }

    try {
      const { data, error } = await supabase
        .rpc('run_price_alert_detection', {
          p_organization_id: currentOrganization.id
        });

      if (error) throw error;
      
      toast.success(`Detected ${data} new price alerts`);
      return data;
    } catch (err) {
      console.error('Error running price alert detection:', err);
      toast.error('Failed to run price alert detection');
      throw err;
    }
  };

  return {
    negotiations,
    isLoading,
    error,
    createNegotiation,
    updateNegotiation,
    deleteNegotiation,
    runPriceAlertDetection
  };
};
