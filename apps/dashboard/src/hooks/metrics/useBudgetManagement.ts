import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useOrganization } from '@/contexts/OrganizationContext';

export interface MonthlyBudget {
  id: string;
  organization_id: string;
  location_id: string;
  business_unit_id?: string;
  year: number;
  month: number;
  revenue_budget: number;
  cogs_budget: number;
  currency: string;
  notes?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface BudgetWithLocation extends MonthlyBudget {
  location_name: string;
}

export const useBudgetManagement = (selectedYear?: number, selectedMonth?: number) => {
  const { currentOrganization } = useOrganization();
  const [budgets, setBudgets] = useState<BudgetWithLocation[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchBudgets = async () => {
      if (!currentOrganization) {
        setBudgets([]);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const currentDate = new Date();
        const targetYear = selectedYear || currentDate.getFullYear();
        const targetMonth = selectedMonth || (currentDate.getMonth() + 1);

        const { data: budgetData, error: budgetError } = await supabase
          .from('monthly_budget')
          .select(`
            *,
            locations!left(name)
          `)
          .eq('organization_id', currentOrganization.id)
          .eq('year', targetYear)
          .eq('month', targetMonth);

        if (budgetError) {
          throw budgetError;
        }

        const budgetsWithLocation = budgetData?.map(budget => ({
          ...budget,
          location_name: budget.locations?.name || 'Unknown Location'
        })) || [];

        setBudgets(budgetsWithLocation);
      } catch (err) {
        console.error('Error fetching budgets:', err);
        setError(err instanceof Error ? err : new Error('Failed to fetch budgets'));
      } finally {
        setIsLoading(false);
      }
    };

    fetchBudgets();
  }, [currentOrganization, selectedYear, selectedMonth]);

  return { budgets, isLoading, error };
};

export const useSaveBudget = () => {
  const { currentOrganization } = useOrganization();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const saveBudget = async (budgetData: {
    location_id: string;
    year: number;
    month: number;
    revenue_budget: number;
    cogs_budget: number;
    currency: string;
    notes?: string;
  }) => {
    if (!currentOrganization) {
      throw new Error('No organization selected');
    }

    setIsLoading(true);
    setError(null);

    try {
      const { data, error } = await supabase
        .from('monthly_budget')
        .upsert({
          organization_id: currentOrganization.id,
          location_id: budgetData.location_id,
          year: budgetData.year,
          month: budgetData.month,
          revenue_budget: budgetData.revenue_budget,
          cogs_budget: budgetData.cogs_budget,
          currency: budgetData.currency,
          notes: budgetData.notes,
          created_by: (await supabase.auth.getUser()).data.user?.id
        }, {
          onConflict: 'organization_id,location_id,year,month'
        })
        .select()
        .single();

      if (error) {
        throw error;
      }

      return data;
    } catch (err) {
      console.error('Error saving budget:', err);
      setError(err instanceof Error ? err : new Error('Failed to save budget'));
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const deleteBudget = async (budgetId: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const { error } = await supabase
        .from('monthly_budget')
        .delete()
        .eq('id', budgetId);

      if (error) {
        throw error;
      }
    } catch (err) {
      console.error('Error deleting budget:', err);
      setError(err instanceof Error ? err : new Error('Failed to delete budget'));
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  return { saveBudget, deleteBudget, isLoading, error };
};

