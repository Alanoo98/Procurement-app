import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useOrganization } from '@/contexts/OrganizationContext';

export const useSupplierManagement = () => {
  const { currentOrganization } = useOrganization();
  const [isUpdating, setIsUpdating] = useState(false);

  const toggleSupplierActive = async (supplierId: string, isActive: boolean) => {
    if (!currentOrganization) {
      throw new Error('No organization selected');
    }

    setIsUpdating(true);
    try {
      const { error } = await supabase
        .from('suppliers')
        .update({ active: isActive })
        .eq('supplier_id', supplierId)
        .eq('organization_id', currentOrganization.id);

      if (error) {
        throw error;
      }

      return true;
    } catch (error) {
      console.error('Error updating supplier active status:', error);
      throw error;
    } finally {
      setIsUpdating(false);
    }
  };

  const getSupplierActiveStatus = async (supplierId: string): Promise<boolean> => {
    if (!currentOrganization) {
      throw new Error('No organization selected');
    }

    try {
      const { data, error } = await supabase
        .from('suppliers')
        .select('active')
        .eq('supplier_id', supplierId)
        .eq('organization_id', currentOrganization.id)
        .single();

      if (error) {
        throw error;
      }

      return data?.active || false;
    } catch (error) {
      console.error('Error fetching supplier active status:', error);
      return false;
    }
  };

  return {
    toggleSupplierActive,
    getSupplierActiveStatus,
    isUpdating,
  };
};
