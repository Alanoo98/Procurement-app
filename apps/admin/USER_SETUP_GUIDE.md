# User Management Setup Guide

This guide explains how to set up the complete user management system with the new `users` table that extends Supabase Auth users with profile information.

## Database Setup

### 1. Create the Users Table

Run the SQL migration to create the users table and related functions:

```sql
-- Execute the contents of sql/create_users_table.sql
```

This will create:
- `users` table with profile information
- RLS policies for security
- Triggers to automatically create user profiles
- Functions to handle user creation and updates

### 2. Key Features

The new system provides:

- **Full Name Storage**: Users can have proper display names
- **Avatar Support**: Profile pictures can be stored
- **Organization Linking**: Direct relationship to organizations
- **Automatic Profile Creation**: Profiles are created when users sign up
- **Admin Portal Integration**: Full CRUD operations for user management

## User Creation Options

The admin portal now provides two ways to create users:

### 1. Full Auth Integration (Recommended)
- Creates Supabase Auth user
- Creates user profile in `users` table
- Creates organization membership
- Auto-confirms email
- Complete authentication setup

### 2. Basic User Creation
- Creates organization membership only
- For users who already have auth accounts
- Useful for linking existing users to organizations

## Login Form Updates

The login form now includes:
- **Full Name Field**: Collected during signup
- **Email Validation**: Proper email format checking
- **Organization Selection**: Choose organization during signup
- **Metadata Storage**: Full name stored in auth metadata

## Database Schema

```sql
CREATE TABLE public.users (
  id uuid NOT NULL,                    -- References auth.users(id)
  full_name text NULL,                 -- User's display name
  avatar_url text NULL,                -- Profile picture URL
  organization_id uuid NULL,           -- Primary organization
  created_at timestamp with time zone NULL DEFAULT now(),
  updated_at timestamp with time zone NULL DEFAULT now(),
  CONSTRAINT users_pkey PRIMARY KEY (id),
  CONSTRAINT users_id_fkey FOREIGN KEY (id) REFERENCES auth.users (id) ON DELETE CASCADE,
  CONSTRAINT users_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES organizations (id)
);
```

## RLS Policies

The system includes comprehensive Row Level Security policies:

- Users can view/update their own profile
- Organization admins can view users in their organization
- Super admins can manage all users
- Proper isolation between organizations

## Usage Examples

### Creating a User with Full Auth

```typescript
// In the admin portal
const { data, error } = await supabase.auth.admin.createUser({
  email: 'user@example.com',
  password: 'temporary-password',
  email_confirm: true,
  user_metadata: {
    full_name: 'John Doe',
    organization_id: 'org-uuid',
  }
});
```

### Fetching Users with Profile Data

```typescript
const { data } = await supabase
  .from('organization_users')
  .select(`
    *,
    organizations (*),
    users (*)
  `);
```

## Migration from Existing System

If you have existing users:

1. Run the SQL migration to create the `users` table
2. The triggers will automatically create profiles for new signups
3. For existing users, you may need to manually create profile records
4. Update your user management code to use the new structure

## Security Considerations

- All user data is protected by RLS policies
- Organization isolation is enforced
- Admin access is properly controlled
- User profiles are automatically cleaned up when auth users are deleted

## Troubleshooting

### Common Issues

1. **RLS Policy Errors**: Ensure your admin user has proper permissions
2. **Trigger Not Firing**: Check that the trigger functions are properly created
3. **Profile Not Created**: Verify the auth user metadata includes required fields

### Debugging

Enable debug logging in your Supabase client:

```typescript
const supabase = createClient(url, key, {
  auth: {
    debug: true
  }
});
```

## Next Steps

1. Run the SQL migration
2. Test user creation in the admin portal
3. Verify login form works with full name collection
4. Test user profile updates
5. Ensure RLS policies work correctly

The system is now ready for production use with complete user management capabilities!
