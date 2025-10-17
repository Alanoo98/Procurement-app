/**
 * UNIFIED CASES OF CONCERN HOOK
 * 
 * This replaces both useCasesOfConcern and useSimpleCasesOfConcern
 * with a single, configurable hook that can handle both simple and complex use cases.
 */

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useOrganization } from '@/contexts/OrganizationContext';
import { useAuth } from '@/contexts/AuthContext';
import { cache } from '@/lib/cache';
import {
  CaseOfConcern,
  CreateCaseOfConcernInput,
  UpdateCaseOfConcernInput,
  ConcernType,
} from '../../types';

// Define missing types locally
export interface CaseOfConcernWithUsers extends CaseOfConcern {
  users?: { full_name?: string };
  case_comments?: CaseComment[];
}

export interface CaseConcernUpdateWithUser {
  id: string;
  case_id: string;
  update_type: string;
  description: string;
  created_at: string;
  users?: { full_name?: string };
}

export interface CaseOfConcernFilterOptions {
  status?: 'open' | 'resolved';
  priority?: 'low' | 'medium' | 'high';
  type?: ConcernType;
  dateFrom?: string;
  dateTo?: string;
}

export interface CaseComment {
  id: string;
  case_id: string;
  comment: string;
  user_id: string;
  created_at: string;
  users?: { full_name?: string };
}

export interface CreateCaseCommentInput {
  case_id: string;
  comment: string;
}

interface UseCasesOfConcernOptions {
  // Simple mode for basic CRUD operations
  simple?: boolean;
  // Include user information and comments
  includeUsers?: boolean;
  // Include comments
  includeComments?: boolean;
  // Cache TTL in milliseconds
  cacheTtl?: number;
}

interface UseCasesOfConcernReturn {
  cases: CaseOfConcernWithUsers[];
  users: Array<{ id?: string; full_name?: string }>; // Back-compat placeholder
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  createCase: (input: CreateCaseOfConcernInput) => Promise<CaseOfConcern>;
  updateCase: (id: string, input: UpdateCaseOfConcernInput) => Promise<CaseOfConcern>;
  deleteCase: (id: string) => Promise<void>;
  addComment: (input: CreateCaseCommentInput) => Promise<CaseComment>;
  deleteComment: (commentId: string) => Promise<void>;
  getCaseTimeline: (caseId: string) => Promise<CaseConcernUpdateWithUser[]>;
}

export const useCasesOfConcern = (
  filters?: CaseOfConcernFilterOptions,
  options: UseCasesOfConcernOptions = {}
): UseCasesOfConcernReturn => {
  const {
    simple = false,
    includeUsers = true,
    includeComments = true,
    cacheTtl = 5 * 60 * 1000, // 5 minutes
  } = options;

  const { currentOrganization } = useOrganization();
  const { user } = useAuth();
  const [cases, setCases] = useState<CaseOfConcernWithUsers[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Create cache key
  const cacheKey = `cases:${currentOrganization?.id}:${JSON.stringify(filters)}:${simple}`;

  // Check cache first
  const getCachedData = useCallback(() => {
    return cache.get<CaseOfConcernWithUsers[]>(cacheKey);
  }, [cacheKey]);

  // Cache the result
  const setCachedData = useCallback((data: CaseOfConcernWithUsers[]) => {
    cache.set(cacheKey, data, cacheTtl);
  }, [cacheKey, cacheTtl]);

  const fetchCases = useCallback(async () => {
    if (!currentOrganization) return;

    // Check cache first
    const cachedData = getCachedData();
    if (cachedData) {
      setCases(cachedData);
      setIsLoading(false);
      setError(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Build a safe select string without stray commas
      const selectFields: string[] = ['*'];
      if (includeUsers) selectFields.push('users!cases_of_concern_created_by_fkey(full_name)');
      if (includeComments) selectFields.push('case_comments(*,users!case_comments_user_id_fkey(full_name))');

      let query = supabase
        .from('cases_of_concern')
        .select(selectFields.join(','))
        .eq('organization_id', currentOrganization.id);

      // Apply filters
      if (filters?.status) {
        query = query.eq('status', filters.status);
      }
      if (filters?.priority) {
        query = query.eq('priority', filters.priority);
      }
      if (filters?.type) {
        query = query.eq('concern_type', filters.type);
      }
      if (filters?.dateFrom) {
        query = query.gte('created_at', filters.dateFrom);
      }
      if (filters?.dateTo) {
        query = query.lte('created_at', filters.dateTo);
      }

      const { data, error: fetchError } = await query.order('created_at', { ascending: false });

      if (fetchError) throw fetchError;

      const typed = (data as unknown as CaseOfConcernWithUsers[]) || [];
      setCases(typed);
      setCachedData(typed);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch cases');
      setCases([]);
    } finally {
      setIsLoading(false);
    }
  }, [currentOrganization, filters, includeUsers, includeComments, getCachedData, setCachedData]);

  // CRUD operations
  const createCase = useCallback(async (input: CreateCaseOfConcernInput): Promise<CaseOfConcern> => {
    if (!currentOrganization) throw new Error('No organization');

    const { data, error } = await supabase
      .from('cases_of_concern')
      .insert({
        ...input,
        organization_id: currentOrganization.id,
      })
      .select()
      .single();

    if (error) throw error;

    // Clear cache and refetch
    cache.delete(cacheKey);
    await fetchCases();

    return data;
  }, [currentOrganization, cacheKey, fetchCases]);

  const updateCase = useCallback(async (id: string, input: UpdateCaseOfConcernInput): Promise<CaseOfConcern> => {
    const { data, error } = await supabase
      .from('cases_of_concern')
      .update(input)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    // Clear cache and refetch
    cache.delete(cacheKey);
    await fetchCases();

    return data;
  }, [cacheKey, fetchCases]);

  const deleteCase = useCallback(async (id: string): Promise<void> => {
    const { error } = await supabase
      .from('cases_of_concern')
      .delete()
      .eq('id', id);

    if (error) throw error;

    // Clear cache and refetch
    cache.delete(cacheKey);
    await fetchCases();
  }, [cacheKey, fetchCases]);

  const addComment = useCallback(async (input: CreateCaseCommentInput): Promise<CaseComment> => {
    if (!user?.id) {
      throw new Error('User not authenticated');
    }
    
    const { data, error } = await supabase
      .from('case_comments')
      .insert({
        ...input,
        user_id: user.id
      })
      .select(`
        *,
        users!case_comments_user_id_fkey(full_name)
      `)
      .single();

    if (error) {
      console.error('Supabase error in addComment:', error);
      throw error;
    }

    // Clear cache and refetch
    cache.delete(cacheKey);
    await fetchCases();

    return data;
  }, [cacheKey, fetchCases, user?.id]);

  const deleteComment = useCallback(async (commentId: string): Promise<void> => {
    const { error } = await supabase
      .from('case_comments')
      .delete()
      .eq('id', commentId);

    if (error) throw error;

    // Clear cache and refetch
    cache.delete(cacheKey);
    await fetchCases();
  }, [cacheKey, fetchCases]);

  const getCaseTimeline = useCallback(async (caseId: string): Promise<CaseConcernUpdateWithUser[]> => {
    const { data, error } = await supabase
      .from('case_concern_updates')
      .select(`
        *,
        users(full_name)
      `)
      .eq('case_id', caseId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }, []);

  useEffect(() => {
    fetchCases();
  }, [fetchCases]);

  return {
    cases,
    users: [], // Empty array for backward compatibility
    isLoading,
    error,
    refetch: fetchCases,
    createCase,
    updateCase,
    deleteCase,
    addComment,
    deleteComment,
    getCaseTimeline,
  };
};
