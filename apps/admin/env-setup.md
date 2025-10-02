# Environment Setup for Admin Portal

To connect the admin portal to your Supabase database, you need to create a `.env` file in the `procurement-admin` directory with the following variables:

```bash
# Create the .env file
touch .env
```

Then add these variables to the `.env` file:

```
VITE_SUPABASE_URL=your_supabase_project_url_here
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key_here
```

## How to find these values:

1. Go to your Supabase project dashboard
2. Click on "Settings" in the left sidebar
3. Click on "API" 
4. Copy the "Project URL" and "anon public" key
5. Replace the placeholder values in your `.env` file

## Example:

```
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

After setting up the environment variables, restart the development server:

```bash
npm run dev
```

The admin portal should now connect to your Supabase database and display real data.




