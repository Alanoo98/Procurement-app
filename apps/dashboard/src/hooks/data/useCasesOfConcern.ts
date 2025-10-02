import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useOrganization } from '@/contexts/OrganizationContext';
import {
  CaseOfConcern,
  CaseOfConcernWithUsers,
  CaseConcernUpdateWithUser,
  CreateCaseOfConcernInput,
  UpdateCaseOfConcernInput,
  CaseOfConcernFilterOptions,
  ConcernStatus,
  ConcernPriority,
  ConcernType,
} from '../../types';

interface UseCasesOfConcernReturn {
  cases: CaseOfConcernWithUsers[];
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  createCase: (input: CreateCaseOfConcernInput) => Promise<CaseOfConcern>;
  updateCase: (id: string, input: UpdateCaseOfConcernInput) => Promise<CaseOfConcern>;
  deleteCase: (id: string) => Promise<void>;
  addComment: (caseId: string, comment: string) => Promise<void>;
  getCaseTimeline: (caseId: string) => Promise<CaseConcernUpdateWithUser[]>;
}

export const useCasesOfConcern = (filters?: CaseOfConcernFilterOptions): UseCasesOfConcernReturn => {
  const { currentOrganization } = useOrganization();
  const [cases, setCases] = useState<CaseOfConcernWithUsers[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const buildQuery = useCallback(() => {
    if (!currentOrganization) return null;

    let query = supabase
      .from('cases_of_concern_with_users')
      .select('*')
      .eq('organization_id', currentOrganization.id);

    if (filters) {
      if (filters.status && filters.status.length > 0) {
        query = query.in('status', filters.status);
      }
      if (filters.priority && filters.priority.length > 0) {
        query = query.in('priority', filters.priority);
      }
      if (filters.concern_type && filters.concern_type.length > 0) {
        query = query.in('concern_type', filters.concern_type);
      }
      if (filters.assigned_to && filters.assigned_to.length > 0) {
        query = query.in('assigned_to', filters.assigned_to);
      }
      if (filters.created_by && filters.created_by.length > 0) {
        query = query.in('created_by', filters.created_by);
      }
      if (filters.tags && filters.tags.length > 0) {
        query = query.overlaps('tags', filters.tags);
      }
      if (filters.search) {
        query = query.or(`title.ilike.%${filters.search}%,description.ilike.%${filters.search}%`);
      }
      if (filters.date_from) {
        query = query.gte('created_at', filters.date_from);
      }
      if (filters.date_to) {
        query = query.lte('created_at', filters.date_to);
      }
    }

    return query.order('created_at', { ascending: false });
  }, [currentOrganization, filters]);

  const fetchCases = useCallback(async () => {
    if (!currentOrganization) return;

    setIsLoading(true);
    setError(null);

    try {
      const query = buildQuery();
      if (!query) return;

      const { data, error: fetchError } = await query;

      if (fetchError) {
        throw fetchError;
      }

      setCases(data || []);
    } catch (err) {
      console.error('Error fetching cases of concern:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch cases of concern');
    } finally {
      setIsLoading(false);
    }
  }, [currentOrganization, buildQuery]);

  const createCase = useCallback(async (input: CreateCaseOfConcernInput): Promise<CaseOfConcern> => {
    if (!currentOrganization) {
      throw new Error('No organization selected');
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('User not authenticated');
    }

    const caseData = {
      ...input,
      organization_id: currentOrganization.id,
      created_by: user.id,
      last_updated_by: user.id,
      status: 'open' as ConcernStatus,
      priority: input.priority || 'medium' as ConcernPriority,
      tags: input.tags || [],
      metadata: input.metadata || {},
    };

    const { data, error: insertError } = await supabase
      .from('cases_of_concern')
      .insert(caseData)
      .select()
      .single();

    if (insertError) {
      throw insertError;
    }

    // Refetch to get the updated list with user information
    await fetchCases();
    return data;
  }, [currentOrganization, fetchCases]);

  const updateCase = useCallback(async (id: string, input: UpdateCaseOfConcernInput): Promise<CaseOfConcern> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('User not authenticated');
    }

    const updateData = {
      ...input,
      last_updated_by: user.id,
    };

    const { data, error: updateError } = await supabase
      .from('cases_of_concern')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      throw updateError;
    }

    // Refetch to get the updated list
    await fetchCases();
    return data;
  }, [fetchCases]);

  const deleteCase = useCallback(async (id: string): Promise<void> => {
    const { error: deleteError } = await supabase
      .from('cases_of_concern')
      .delete()
      .eq('id', id);

    if (deleteError) {
      throw deleteError;
    }

    // Refetch to get the updated list
    await fetchCases();
  }, [fetchCases]);

  const addComment = useCallback(async (caseId: string, comment: string): Promise<void> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('User not authenticated');
    }

    const { error: insertError } = await supabase
      .from('case_concern_updates')
      .insert({
        case_id: caseId,
        update_type: 'comment',
        comment,
        updated_by: user.id,
      });

    if (insertError) {
      throw insertError;
    }
  }, []);

  const getCaseTimeline = useCallback(async (caseId: string): Promise<CaseConcernUpdateWithUser[]> => {
    const { data, error: fetchError } = await supabase
      .from('case_concern_timeline')
      .select('*')
      .eq('case_id', caseId)
      .order('created_at', { ascending: false });

    if (fetchError) {
      throw fetchError;
    }

    return data || [];
  }, []);

  useEffect(() => {
    fetchCases();
  }, [fetchCases]);

  return {
    cases,
    isLoading,
    error,
    refetch: fetchCases,
    createCase,
    updateCase,
    deleteCase,
    addComment,
    getCaseTimeline,
  };
};

// Hook for getting a single case with timeline
export const useCaseOfConcern = (caseId: string) => {
  const { currentOrganization } = useOrganization();
  const [caseData, setCaseData] = useState<CaseOfConcernWithUsers | null>(null);
  const [timeline, setTimeline] = useState<CaseConcernUpdateWithUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCase = useCallback(async () => {
    if (!currentOrganization || !caseId) return;

    setIsLoading(true);
    setError(null);

    try {
      // Fetch case data
      const { data: caseResult, error: caseError } = await supabase
        .from('cases_of_concern_with_users')
        .select('*')
        .eq('id', caseId)
        .eq('organization_id', currentOrganization.id)
        .single();

      if (caseError) {
        throw caseError;
      }

      setCaseData(caseResult);

      // Fetch timeline
      const { data: timelineResult, error: timelineError } = await supabase
        .from('case_concern_timeline')
        .select('*')
        .eq('case_id', caseId)
        .order('created_at', { ascending: false });

      if (timelineError) {
        throw timelineError;
      }

      setTimeline(timelineResult || []);
    } catch (err) {
      console.error('Error fetching case of concern:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch case of concern');
    } finally {
      setIsLoading(false);
    }
  }, [currentOrganization, caseId]);

  useEffect(() => {
    fetchCase();
  }, [fetchCase]);

  return {
    caseData,
    timeline,
    isLoading,
    error,
    refetch: fetchCase,
  };
};

// Hook for getting organization users for assignment
export const useOrganizationUsers = () => {
  const { currentOrganization } = useOrganization();
  const [users, setUsers] = useState<Array<{ id: string; email: string; name?: string }>>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchUsers = useCallback(async () => {
    if (!currentOrganization) return;

    setIsLoading(true);
    setError(null);

    try {
      console.log('Fetching users for organization:', currentOrganization.id);
      
      const { data, error: fetchError } = await supabase
        .from('users')
        .select('id, full_name')
        .eq('organization_id', currentOrganization.id);

      if (fetchError) {
        console.error('Database error fetching users:', fetchError);
        throw fetchError;
      }

      console.log('Fetched users data:', data);

      // For now, just use the data from users table
      // Email will be empty but we can use full_name for display
      const userList = (data || []).map(user => ({
        id: user.id,
        email: '', // We'll need to get this from auth context or another way
        name: user.full_name || '',
      }));

      console.log('Processed user list:', userList);
      setUsers(userList);
    } catch (err) {
      console.error('Error fetching organization users:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch users');
    } finally {
      setIsLoading(false);
    }
  }, [currentOrganization]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  return {
    users,
    isLoading,
    error,
    refetch: fetchUsers,
  };
};
