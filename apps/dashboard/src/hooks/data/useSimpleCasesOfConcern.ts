import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useOrganization } from '@/contexts/OrganizationContext';
import {
  CaseOfConcern,
  CreateCaseOfConcernInput,
  UpdateCaseOfConcernInput,
  CaseComment,
  CreateCaseCommentInput,
} from '../../types';

// Extended interface to include user information and comments
interface CaseOfConcernWithUser extends CaseOfConcern {
  creator_name?: string;
  comments?: CaseComment[];
  comments_count?: number;
}


interface UseSimpleCasesOfConcernReturn {
  cases: CaseOfConcernWithUser[];
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  createCase: (input: CreateCaseOfConcernInput) => Promise<CaseOfConcern>;
  updateCase: (id: string, input: UpdateCaseOfConcernInput) => Promise<CaseOfConcern>;
  deleteCase: (id: string) => Promise<void>;
  addComment: (input: CreateCaseCommentInput) => Promise<CaseComment>;
  deleteComment: (commentId: string) => Promise<void>;
}

export const useSimpleCasesOfConcern = (): UseSimpleCasesOfConcernReturn => {
  const { currentOrganization } = useOrganization();
  const [cases, setCases] = useState<CaseOfConcernWithUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCases = useCallback(async () => {
    if (!currentOrganization) return;

    setIsLoading(true);
    setError(null);

    try {
      // Fetch cases with user information and comments
      const { data, error: fetchError } = await supabase
        .from('cases_of_concern')
        .select(`
          *,
          users!cases_of_concern_created_by_fkey (
            full_name
          ),
          case_comments (
            id,
            comment,
            created_at,
            user_id,
            users!case_comments_user_id_fkey (
              full_name
            )
          )
        `)
        .eq('organization_id', currentOrganization.id)
        .order('created_at', { ascending: false });

      if (fetchError) {
        throw fetchError;
      }

      // Transform the data to include creator name and comments
      const casesWithUsers: CaseOfConcernWithUser[] = (data || []).map(caseItem => {
        // Get creator name with fallback
        let creatorName = 'Unknown User';
        if (caseItem.users?.full_name) {
          creatorName = caseItem.users.full_name;
        }

        return {
          ...caseItem,
          creator_name: creatorName,
          comments: (caseItem.case_comments || []).map((comment: { id: string; comment: string; created_at: string; user_id: string; users?: { full_name?: string } }) => ({
            id: comment.id,
            case_id: caseItem.id,
            user_id: comment.user_id,
            comment: comment.comment,
            created_at: comment.created_at,
            updated_at: comment.created_at,
            user_name: comment.users?.full_name || 'Unknown User'
          })),
          comments_count: caseItem.case_comments?.length || 0
        };
      });

      setCases(casesWithUsers);
    } catch (err) {
      console.error('Error fetching cases of concern:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch cases of concern');
    } finally {
      setIsLoading(false);
    }
  }, [currentOrganization]);

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
      concern_type: input.concern_type || 'other',
      status: 'open' as const,
    };

    const { data, error: insertError } = await supabase
      .from('cases_of_concern')
      .insert(caseData)
      .select()
      .single();

    if (insertError) {
      console.error('Database error creating case:', insertError);
      throw new Error(`Failed to create case: ${insertError.message}`);
    }

    await fetchCases();
    return data;
  }, [currentOrganization, fetchCases]);

  const updateCase = useCallback(async (id: string, input: UpdateCaseOfConcernInput): Promise<CaseOfConcern> => {
    const { data, error: updateError } = await supabase
      .from('cases_of_concern')
      .update(input)
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      throw updateError;
    }

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

    await fetchCases();
  }, [fetchCases]);

  const addComment = useCallback(async (input: CreateCaseCommentInput): Promise<CaseComment> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('User not authenticated');
    }

    const { data, error: insertError } = await supabase
      .from('case_comments')
      .insert({
        case_id: input.case_id,
        user_id: user.id,
        comment: input.comment
      })
      .select(`
        *,
        users!case_comments_user_id_fkey (
          full_name
        )
      `)
      .single();

    if (insertError) {
      console.error('Database error adding comment:', insertError);
      throw new Error(`Failed to add comment: ${insertError.message}`);
    }

    await fetchCases();
    return {
      id: data.id,
      case_id: data.case_id,
      user_id: data.user_id,
      comment: data.comment,
      created_at: data.created_at,
      updated_at: data.updated_at,
      user_name: data.users?.full_name || 'Unknown User'
    };
  }, [fetchCases]);

  const deleteComment = useCallback(async (commentId: string): Promise<void> => {
    const { error: deleteError } = await supabase
      .from('case_comments')
      .delete()
      .eq('id', commentId);

    if (deleteError) {
      console.error('Database error deleting comment:', deleteError);
      throw new Error(`Failed to delete comment: ${deleteError.message}`);
    }

    await fetchCases();
  }, [fetchCases]);

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
    deleteComment,
  };
};
