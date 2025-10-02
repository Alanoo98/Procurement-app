// Utility function to test auth API access
import { supabaseAdmin } from '../lib/supabase';

export const testAuthAPI = async () => {
  try {
    console.log('Testing auth API access...');
    
    // Test 1: Check if we can access the admin API
    if (!supabaseAdmin) {
      return {
        success: false,
        error: 'Admin client not configured',
        suggestion: 'Please set VITE_SUPABASE_SERVICE_ROLE_KEY in your .env file'
      };
    }
    
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.listUsers();
    
    if (authError) {
      console.error('Auth API Error:', authError);
      return {
        success: false,
        error: authError.message,
        suggestion: 'Check if your Supabase project has proper admin API access configured'
      };
    }
    
    if (authData?.users) {
      console.log('Auth API Success:', {
        totalUsers: authData.users.length,
        sampleUser: authData.users[0] ? {
          id: authData.users[0].id,
          email: authData.users[0].email,
          hasMetadata: !!authData.users[0].user_metadata
        } : null
      });
      
      return {
        success: true,
        totalUsers: authData.users.length,
        sampleUser: authData.users[0]
      };
    }
    
    return {
      success: false,
      error: 'No users data received',
      suggestion: 'Check your Supabase project configuration'
    };
    
  } catch (error: any) {
    console.error('Auth API Exception:', error);
    return {
      success: false,
      error: error.message,
      suggestion: 'Check your Supabase client configuration and network connection'
    };
  }
};

// Function to get a specific user's email by ID
export const getUserEmailById = async (userId: string) => {
  try {
    if (!supabaseAdmin) {
      console.error('Admin client not configured');
      return null;
    }
    
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.listUsers();
    
    if (authError) {
      console.error('Error fetching auth users:', authError);
      return null;
    }
    
    const user = authData?.users?.find(u => u.id === userId);
    return user?.email || null;
    
  } catch (error) {
    console.error('Exception fetching user email:', error);
    return null;
  }
};
