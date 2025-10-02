export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          full_name: string | null;
          avatar_url: string | null;
          organization_id: string | null;
          created_at: string | null;
          updated_at: string | null;
        };
        Insert: {
          id: string;
          full_name?: string | null;
          avatar_url?: string | null;
          organization_id?: string | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Update: {
          id?: string;
          full_name?: string | null;
          avatar_url?: string | null;
          organization_id?: string | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
      };
      organizations: {
        Row: {
          id: string;
          name: string;
          slug: string;
          settings: any;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          slug: string;
          settings?: any;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          slug?: string;
          settings?: any;
          created_at?: string;
          updated_at?: string;
        };
      };
      organization_users: {
        Row: {
          organization_id: string;
          user_id: string;
          role: 'owner' | 'admin' | 'member';
          created_at: string;
        };
        Insert: {
          organization_id: string;
          user_id: string;
          role: 'owner' | 'admin' | 'member';
          created_at?: string;
        };
        Update: {
          organization_id?: string;
          user_id?: string;
          role?: 'owner' | 'admin' | 'member';
          created_at?: string;
        };
      };
      business_units: {
        Row: {
          id: string;
          organization_id: string;
          name: string;
          type: string;
          settings: any;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          name: string;
          type: string;
          settings?: any;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          name?: string;
          type?: string;
          settings?: any;
          created_at?: string;
          updated_at?: string;
        };
      };
      locations: {
        Row: {
          location_id: string;
          name: string;
          address: string;
          country: string;
          organization_id: string;
          business_unit_id: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          location_id?: string;
          name: string;
          address: string;
          country: string;
          organization_id: string;
          business_unit_id: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          location_id?: string;
          name?: string;
          address?: string;
          country?: string;
          organization_id?: string;
          business_unit_id?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      organization_invitations: {
        Row: {
          id: string;
          email: string;
          organization_id: string;
          role: 'admin' | 'member';
          status: 'pending' | 'accepted' | 'expired' | 'cancelled';
          invited_by: string;
          sent_at: string;
          expires_at: string;
          accepted_at?: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          email: string;
          organization_id: string;
          role: 'admin' | 'member';
          status?: 'pending' | 'accepted' | 'expired' | 'cancelled';
          invited_by: string;
          sent_at?: string;
          expires_at: string;
          accepted_at?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          organization_id?: string;
          role?: 'admin' | 'member';
          status?: 'pending' | 'accepted' | 'expired' | 'cancelled';
          invited_by?: string;
          sent_at?: string;
          expires_at?: string;
          accepted_at?: string;
          created_at?: string;
        };
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
  };
}

// Helper types for the admin portal
export type User = Database['public']['Tables']['users']['Row'];
export type UserInsert = Database['public']['Tables']['users']['Insert'];
export type UserUpdate = Database['public']['Tables']['users']['Update'];

export type Organization = Database['public']['Tables']['organizations']['Row'];
export type OrganizationInsert = Database['public']['Tables']['organizations']['Insert'];
export type OrganizationUpdate = Database['public']['Tables']['organizations']['Update'];

export type OrganizationUser = Database['public']['Tables']['organization_users']['Row'];
export type OrganizationUserInsert = Database['public']['Tables']['organization_users']['Insert'];
export type OrganizationUserUpdate = Database['public']['Tables']['organization_users']['Update'];

export type BusinessUnit = Database['public']['Tables']['business_units']['Row'];
export type BusinessUnitInsert = Database['public']['Tables']['business_units']['Insert'];
export type BusinessUnitUpdate = Database['public']['Tables']['business_units']['Update'];

export type Location = Database['public']['Tables']['locations']['Row'];
export type LocationInsert = Database['public']['Tables']['locations']['Insert'];
export type LocationUpdate = Database['public']['Tables']['locations']['Update'];

export type OrganizationInvitation = Database['public']['Tables']['organization_invitations']['Row'];
export type OrganizationInvitationInsert = Database['public']['Tables']['organization_invitations']['Insert'];
export type OrganizationInvitationUpdate = Database['public']['Tables']['organization_invitations']['Update'];

// Extended types for admin portal with additional computed fields
export interface UserWithOrganization extends OrganizationUser {
  organizations: Organization;
  users?: User; // Reference to the users table for profile data
  user_email?: string;
  user_name?: string;
  last_login?: string;
}

export interface OrganizationWithStats extends Organization {
  user_count: number;
  business_unit_count: number;
  location_count: number;
}

export interface BusinessUnitWithStats extends BusinessUnit {
  organization: Organization;
  location_count: number;
  user_count: number;
}

export interface LocationWithDetails extends Location {
  organization: Organization;
  business_unit: BusinessUnit;
}