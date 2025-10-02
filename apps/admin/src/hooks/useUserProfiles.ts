import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { User } from '../types/database';
import { toast } from 'react-hot-toast';

export const useUserProfiles = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data: usersData, error: usersError } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false });

      if (usersError) throw usersError;

      setUsers(usersData || []);
    } catch (err: any) {
      setError(err.message);
      toast.error('Failed to fetch user profiles');
    } finally {
      setLoading(false);
    }
  };

  const createUserProfile = async (userData: any) => {
    try {
      const { data, error } = await supabase
        .from('users')
        .insert(userData)
        .select()
        .single();

      if (error) throw error;

      toast.success('User profile created successfully');
      await fetchUsers();
      return data;
    } catch (err: any) {
      toast.error('Failed to create user profile');
      throw err;
    }
  };

  const updateUserProfile = async (id: string, updates: any) => {
    try {
      const { data, error } = await supabase
        .from('users')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      toast.success('User profile updated successfully');
      await fetchUsers();
      return data;
    } catch (err: any) {
      toast.error('Failed to update user profile');
      throw err;
    }
  };

  const deleteUserProfile = async (id: string) => {
    try {
      const { error } = await supabase
        .from('users')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast.success('User profile deleted successfully');
      await fetchUsers();
    } catch (err: any) {
      toast.error('Failed to delete user profile');
      throw err;
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  return {
    users,
    loading,
    error,
    refetch: fetchUsers,
    createUserProfile,
    updateUserProfile,
    deleteUserProfile,
  };
};
