<!-- 84ff2efb-8065-42fd-b701-e3c1d78dfac9 9e02fe5d-ce8f-4450-b766-eaa3dd9db4bd -->
# Supabase Query Optimization Plan

### 1) Database: make queries fast at the source

#### Prioritized high-impact indexes (copy-paste)

-- 1) Common filter: org + date-range + order path

create index concurrently if not exists idx_invoice_lines_org_date_created_id

on public.invoice_lines (organization_id, invoice_date, created_at, id);

-- 2) Location filters with date

create index concurrently if not exists idx_invoice_lines_org_loc_date_id

on public.invoice_lines (organization_id, location_id, invoice_date, id);

-- 3) Supplier filters with date

create index concurrently if not exists idx_invoice_lines_org_supplier_date_id

on public.invoice_lines (organization_id, supplier_id, invoice_date, id);

-- 4) Product code lookups

create index concurrently if not exists idx_invoice_lines_org_product_code

on public.invoice_lines (organization_id, product_code);

-- 5) Trigram search for description/product_code (ILIKE)

create extension if not exists pg_trgm;

create index concurrently if not exists idx_invoice_lines_description_trgm

on public.invoice_lines using gin (description gin_trgm_ops)

where description is not null and description <> '';

create index concurrently if not exists idx_invoice_lines_product_code_trgm

on public.invoice_lines using gin (product_code gin_trgm_ops)

where product_code is not null and product_code <> '';

-- 6) Pending category mappings pagination

create index concurrently if not exists idx_pending_cat_map_org_status_id

on public.pending_category_mappings (organization_id, status, id);

-- Validate with EXPLAIN (example)

explain (analyze, buffers)

select product_code, description, quantity, unit_price, invoice_date, location_id, supplier_id

from public.invoice_lines

where organization_id = '<ORG_UUID>'

and invoice_date between '2024-01-01' and '2025-12-31'

and location_id = any('{<LOC1>,<LOC2>}'::uuid[])

order by invoice_date asc, created_at asc

limit 50;

- Add targeted indexes for common filters/sorts (products, suppliers, locations, categories, active flags, updated_at). Place SQL in `services/api/sql/performance_optimization_indexes.sql` and run via Supabase SQL editor.
- Replace complex client-side filters with a single RPC that pushes filtering/sorting into SQL. Create `products_list` RPC with keyset pagination.
- For heavy aggregates on dashboard, create materialized views refreshed on schedule (or via triggers) to avoid full scans.
- Avoid SELECT *: define tight column projections in views/RPCs.

Minimal example (RPC for products list with keyset pagination):

```sql
create or replace function public.products_list(
  p_limit int default 50,
  p_after text default null,        -- cursor (e.g., product_id||'|'||coalesce(updated_at::text,''))
  p_search text default null,       -- ILIKE on name/sku
  p_category_ids uuid[] default null,
  p_supplier_ids uuid[] default null,
  p_sort_by text default 'updated_at',
  p_sort_dir text default 'desc'
)
returns table (
  product_id uuid,
  name text,
  sku text,
  category_id uuid,
  supplier_id uuid,
  price numeric,
  updated_at timestamptz,
  cursor text
) language plpgsql as $$
-- Implementation computes keyset cursor and applies WHEREs + ORDER BY using indexes
$$;
```

### 2) API layer: batch and reduce round-trips

- If dashboard needs multiple datasets, add one RPC or edge function that returns a compact payload (products meta + suppliers meta + categories). Place code under `apps/dashboard/supabase/functions/` or RPCs under `services/api/sql/`.

### 3) Frontend data access patterns

- Use keyset/cursor pagination utility in `apps/dashboard/src/utils/cursorPagination.ts` for products: update `apps/dashboard/src/hooks/data/useAllProducts.ts` and the products pages to consume `nextCursor` instead of page numbers.
- Preload on sign-in: in `apps/dashboard/src/main.tsx` (or auth context), after auth session resolves, prefetch:
  - products meta: `product_id, name, updated_at` (first 1–2 pages)
  - suppliers lookup: `supplier_id, name`
  - categories lookup

Seed the cache (`apps/dashboard/src/lib/cache.ts`) so initial navigation is instant.

- Background refresh: quietly refetch in the background using staleness TTLs; keep cached data for instant paint.
- Narrow selects: update hooks to request minimal columns; add detail fetch on row expand/click.
- Parallelize independent queries (suppliers/categories) and debounce search.

### 4) Observability and guardrails

- Capture Supabase query duration and response sizes (enable logs in Supabase, add client-side timing). Track P50/P95 and bytes.
- Add feature flag to fall back to old path if needed.

### 5) Rollout

Based on your evidence:

- Queries without organization_id filter are doing Seq Scan; ensure all app queries include `organization_id` so `ix_il_org_date_asc` can be used.
- Heavy PostgREST queries use LATERAL per-row lookups; replace with a single JOIN on PKs or hydrate names separately.
- OFFSET pagination is common; switch to keyset `(invoice_date, created_at, id)`.
- Redundant indexes exist; drop duplicates to save write overhead.

#### Safe immediate SQL actions

-- Add if missing in other tables

create index concurrently if not exists idx_pending_cat_map_org_status_id

on public.pending_category_mappings (organization_id, status, id);

-- Drop duplicate indexes (pick one of supplier)

drop index concurrently if exists public.idx_invoice_lines_supplier_id;

-- (keeps public.idx_invoice_lines_supplier)

drop index concurrently if exists public.idx_invoice_lines_invoice_number;

-- (keep trigram ix_il_invoice_trgm for fuzzy search; recreate btree only if equality probes are frequent)

-- Ensure stats are fresh

analyze public.invoice_lines;

- Ship DB indexes first, then RPC, then frontend migration to cursor + prefetch. Validate with logs/Sentry before enabling globally.

Key files to change:

- `services/api/sql/performance_optimization_indexes.sql` (new)
- `services/api/sql/products_list_rpc.sql` (new)
- `apps/dashboard/src/hooks/data/useAllProducts.ts` (edit to use RPC + cursor)
- `apps/dashboard/src/pages/products/ProductTargets.tsx` (consume cursor + minimal columns)
- `apps/dashboard/src/lib/supabase.ts` (ensure RPC typed client)
- `apps/dashboard/src/lib/cache.ts` (ensure hydration helpers)
- `apps/dashboard/src/main.tsx` or `apps/dashboard/src/contexts/*Auth*` (sign-in prefetch)

### To-dos

- [ ] Create and apply product/supplier/category filter/sort indexes
- [ ] Create products_list RPC with keyset pagination and tight columns
- [ ] Add RPC/edge function to batch dashboard meta payload
- [ ] Adapt cursorPagination.ts for products and expose nextCursor
- [ ] Refactor useAllProducts to call products_list RPC + cursor
- [ ] Reduce columns in hooks; add detail fetch on demand
- [ ] Prefetch hot datasets post sign-in and seed cache
- [ ] Implement background refresh and TTLs in cache layer
- [ ] Add request timing/size metrics to measure P50/P95