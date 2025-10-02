# Service Role Key Setup Guide

## The Problem
You're seeing this error:
```
403 (Forbidden) - "User not allowed"
```

This happens because the admin API requires the **service role key**, not the anon key.

## Solution: Add Service Role Key

### 1. Get Your Service Role Key

1. Go to your Supabase project dashboard
2. Navigate to **Settings** → **API**
3. Copy the **service_role** key (not the anon key)

### 2. Add to Environment Variables

Create or update your `.env` file in the `procurement-admin` directory:

```env
# Existing variables
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

# Add this new variable
VITE_SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
```

### 3. Restart Your Development Server

After adding the environment variable:
```bash
npm run dev
# or
yarn dev
```

### 4. Verify It's Working

Check the browser console - you should see:
```
useUsers: Auth API test result: {success: true, totalUsers: X}
```

Instead of:
```
useUsers: Auth API test result: {success: false, error: 'User not allowed'}
```

## Security Notes

⚠️ **Important Security Considerations:**

1. **Never commit the service role key to version control**
2. **Add `.env` to your `.gitignore` file**
3. **The service role key has full admin access to your database**
4. **Only use it in trusted environments (like your admin portal)**

## What This Fixes

With the service role key configured:
- ✅ User emails will be displayed properly
- ✅ Full names will be shown instead of UUIDs
- ✅ Admin operations will work correctly
- ✅ User management will be fully functional

## Alternative Solutions

If you can't use the service role key:

### Option 1: Database Function
Create a database function that can access auth.users:

```sql
CREATE OR REPLACE FUNCTION public.get_user_email(user_id uuid)
RETURNS text AS $$
BEGIN
  RETURN (SELECT email FROM auth.users WHERE id = user_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### Option 2: Store Email in Users Table
Add email to the users table and keep it in sync:

```sql
ALTER TABLE public.users ADD COLUMN email text;
```

## Testing

After setup, the user management page should show:
- **Name**: "John Doe" instead of UUID
- **Email**: "john@example.com" instead of UUID
- **Proper user information** from the database

The system will gracefully fall back to showing UUIDs if the service role key is not configured, but with the key, you'll get full user information display.
