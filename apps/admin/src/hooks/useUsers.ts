import { useState, useEffect } from 'react';
import { supabase, supabaseAdmin } from '../lib/supabase';
import { UserWithOrganization } from '../types/database';
import { toast } from 'react-hot-toast';

export const useUsers = () => {
  const [users, setUsers] = useState<UserWithOrganization[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      setError(null);


      // Fetch organization users with organization details
      const { data: usersData, error: usersError } = await supabase
        .from('organization_users')
        .select(`
          *,
          organizations (*)
        `);

      if (usersError) throw usersError;

      // Fetch user profiles from users table
      const userIds = usersData?.map((user: any) => user.user_id) || [];
      let userProfiles = new Map();
      
      if (userIds.length > 0) {
        try {
          const { data: profilesData, error: profilesError } = supabaseAdmin
            ? await supabaseAdmin.from('users').select('*').in('id', userIds)
            : { data: [], error: { message: 'Admin client not configured' } };
          
          if (profilesError) {
            console.warn('useUsers: Could not fetch user profiles:', profilesError);
          } else {
            profilesData?.forEach((profile: any) => {
              userProfiles.set(profile.id, profile);
            });
          }
        } catch (profilesErr) {
          console.warn('Could not fetch user profiles:', profilesErr);
        }
      }

      // Fetch auth users for email and metadata
      let authUsers: any[] = [];
      if (userIds.length > 0) {
        try {
          const { data: authData, error: authError } = supabaseAdmin 
            ? await supabaseAdmin.auth.admin.listUsers()
            : { data: null, error: { message: 'Admin client not configured' } };
          
          if (authError) {
            console.warn('useUsers: Auth admin API error:', authError);
          } else if (authData?.users) {
            authUsers = authData.users;
          }
        } catch (authErr) {
          console.warn('useUsers: Exception fetching auth users:', authErr);
        }
      }

      // Create a map of user IDs to auth user data
      const authUserMap = new Map();
      authUsers.forEach(authUser => {
        authUserMap.set(authUser.id, authUser);
      });

      // Process users with profile data from users table and auth data
      const usersWithDetails: UserWithOrganization[] = usersData?.map((user: any) => {
        const authUser = authUserMap.get(user.user_id);
        const userProfile = userProfiles.get(user.user_id);
        
        
        // Determine the best email to display
        let displayEmail = user.user_id; // Default fallback
        if (authUser?.email) {
          displayEmail = authUser.email;
        } else if (userProfile?.full_name) {
          // If we have a full name but no email, show a placeholder
          displayEmail = 'Email not available';
        }
        
        // Determine the best name to display
        let displayName = user.user_id; // Default fallback
        if (userProfile?.full_name) {
          displayName = userProfile.full_name;
        } else if (authUser?.user_metadata?.full_name) {
          displayName = authUser.user_metadata.full_name;
        } else if (authUser?.user_metadata?.name) {
          displayName = authUser.user_metadata.name;
        } else if (authUser?.email) {
          displayName = authUser.email.split('@')[0];
        }
        
        const processedUser = {
          ...user,
          user_email: displayEmail,
          user_name: displayName,
          last_login: authUser?.last_sign_in_at ? 
                     new Date(authUser.last_sign_in_at).toLocaleDateString() : 
                     'Unknown',
        };
        
        
        return processedUser;
      }) || [];

      setUsers(usersWithDetails);
    } catch (err: any) {
      setError(err.message);
      toast.error('Failed to fetch users');
    } finally {
      setLoading(false);
    }
  };

  const createUser = async (userData: any) => {
    try {
      const { data, error } = await supabase
        .from('organization_users')
        .insert(userData)
        .select()
        .single();

      if (error) throw error;

      toast.success('User created successfully');
      await fetchUsers();
      return data;
    } catch (err: any) {
      toast.error('Failed to create user');
      throw err;
    }
  };

  const updateUser = async (organizationId: string, userId: string, updates: any) => {
    try {
      const { data, error } = await supabase
        .from('organization_users')
        .update(updates)
        .eq('organization_id', organizationId)
        .eq('user_id', userId)
        .select()
        .single();

      if (error) throw error;

      toast.success('User updated successfully');
      await fetchUsers();
      return data;
    } catch (err: any) {
      toast.error('Failed to update user');
      throw err;
    }
  };

  const deleteUser = async (organizationId: string, userId: string) => {
    try {
      const { error } = await supabase
        .from('organization_users')
        .delete()
        .eq('organization_id', organizationId)
        .eq('user_id', userId);

      if (error) throw error;

      toast.success('User deleted successfully');
      await fetchUsers();
    } catch (err: any) {
      toast.error('Failed to delete user');
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
    createUser,
    updateUser,
    deleteUser,
  };
};
