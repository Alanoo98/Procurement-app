import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { OrganizationInvitation } from '../types/database';
import { toast } from 'react-hot-toast';

export const useInvitations = () => {
  const [invitations, setInvitations] = useState<OrganizationInvitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchInvitations = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data: invitationsData, error: invitationsError } = await supabase
        .from('organization_invitations')
        .select('*')
        .order('created_at', { ascending: false });

      if (invitationsError) throw invitationsError;

      setInvitations(invitationsData || []);
    } catch (err: any) {
      setError(err.message);
      toast.error('Failed to fetch invitations');
    } finally {
      setLoading(false);
    }
  };

  const createInvitation = async (invitation: any) => {
    try {
      const { data, error } = await supabase
        .from('organization_invitations')
        .insert(invitation)
        .select()
        .single();

      if (error) throw error;

      // Silent success - invitation sent
      await fetchInvitations();
      return data;
    } catch (err: any) {
      toast.error('Failed to send invitation');
      throw err;
    }
  };

  const updateInvitation = async (id: string, updates: any) => {
    try {
      const { data, error } = await supabase
        .from('organization_invitations')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      // Silent success - invitation updated
      await fetchInvitations();
      return data;
    } catch (err: any) {
      toast.error('Failed to update invitation');
      throw err;
    }
  };

  const deleteInvitation = async (id: string) => {
    try {
      const { error } = await supabase
        .from('organization_invitations')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast.success('Invitation deleted successfully');
      await fetchInvitations();
    } catch (err: any) {
      toast.error('Failed to delete invitation');
      throw err;
    }
  };

  const resendInvitation = async (id: string) => {
    try {
      const { data, error } = await supabase
        .from('organization_invitations')
        .update({ 
          sent_at: new Date().toISOString(),
          status: 'pending'
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      toast.success('Invitation resent successfully');
      await fetchInvitations();
      return data;
    } catch (err: any) {
      toast.error('Failed to resend invitation');
      throw err;
    }
  };

  const cancelInvitation = async (id: string) => {
    try {
      const { data, error } = await supabase
        .from('organization_invitations')
        .update({ status: 'cancelled' })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      toast.success('Invitation cancelled successfully');
      await fetchInvitations();
      return data;
    } catch (err: any) {
      toast.error('Failed to cancel invitation');
      throw err;
    }
  };

  useEffect(() => {
    fetchInvitations();
  }, []);

  return {
    invitations,
    loading,
    error,
    refetch: fetchInvitations,
    createInvitation,
    updateInvitation,
    deleteInvitation,
    resendInvitation,
    cancelInvitation,
  };
};
