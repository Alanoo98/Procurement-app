import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabaseServiceRoleKey = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

// Check if environment variables are set
const isConfigured = supabaseUrl && supabaseAnonKey;

if (!isConfigured) {
  console.warn('Supabase environment variables not configured. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your .env file');
}

// Create a mock client if environment variables are not set
const mockSupabase = {
  from: (table: string) => {
    console.log('Mock Supabase: from called with table:', table);
    return {
      select: (query?: string) => {
        console.log('Mock Supabase: select called with query:', query);
        return {
          eq: () => ({ data: [], error: null }),
          order: () => ({ data: [], error: null }),
          single: () => ({ data: null, error: { message: 'Not configured' } })
        };
      },
      insert: () => ({
        select: () => ({
          single: () => ({ data: null, error: { message: 'Not configured' } })
        })
      }),
      update: () => ({
        eq: () => ({
          select: () => ({
            single: () => ({ data: null, error: { message: 'Not configured' } })
          })
        })
      }),
      delete: () => ({
        eq: () => ({ error: { message: 'Not configured' } })
      })
    };
  }
};

// Regular client for normal operations
export const supabase = isConfigured 
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true
      },
      global: {
        headers: {
          'X-Client-Info': 'procurement-admin-portal'
        },
      },
    })
  : mockSupabase as any;

// Admin client for admin operations (requires service role key)
export const supabaseAdmin = isConfigured && supabaseServiceRoleKey
  ? createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      },
      global: {
        headers: {
          'X-Client-Info': 'procurement-admin-portal-admin'
        },
      },
    })
  : null;
