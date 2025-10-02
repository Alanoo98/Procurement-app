# Supabase Edge Function ETL

This folder contains a Supabase Edge Function for triggering the ETL pipeline from the frontend.

## Usage

- Deploy this function to Supabase using the CLI:
  ```
  supabase functions deploy edge_function_etl
  ```

- Trigger from the frontend with a POST request:
  ```js
  await fetch('/functions/v1/edge_function_etl', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ organization_id: '...', year: 2025 })
  });
  ```

- The function will run the ETL logic and return a JSON response.

## Notes
- The ETL logic is currently a placeholder. You can implement your ETL in TypeScript or call your backend ETL service from here. 