-- invoice_lines keyset-paginated list RPC
-- Applies org/date/location/supplier/search filters and returns minimal columns + cursor

create or replace function public.invoice_lines_list(
  p_org uuid,
  p_start_date date default null,
  p_end_date date default null,
  p_location_ids uuid[] default null,
  p_supplier_ids uuid[] default null,
  p_category_ids uuid[] default null,
  p_search text default null,
  p_limit int default 50,
  p_after_invoice_date date default null,
  p_after_created_at timestamptz default null,
  p_after_id uuid default null
)
returns table (
  id uuid,
  invoice_date date,
  created_at timestamptz,
  invoice_number text,
  due_date date,
  delivery_date date,
  document_type text,
  product_code text,
  description text,
  quantity numeric,
  unit_price numeric,
  unit_price_after_discount numeric,
  total_price numeric,
  total_price_after_discount numeric,
  total_tax numeric,
  category_id uuid,
  location_id uuid,
  supplier_id uuid,
  cursor jsonb
) language sql stable as $$
  with base as (
    select il.id,
           il.invoice_date,
           il.created_at,
           il.invoice_number,
           il.due_date,
           il.delivery_date,
           il.document_type,
           il.product_code,
           il.description,
           il.quantity,
           il.unit_price,
           il.unit_price_after_discount,
           il.total_price,
           il.total_price_after_discount,
           il.total_tax,
           il.category_id,
           il.location_id,
           il.supplier_id
    from public.invoice_lines il
    where il.organization_id = p_org
      and (p_start_date is null or il.invoice_date >= p_start_date)
      and (p_end_date   is null or il.invoice_date <= p_end_date)
      and (p_location_ids is null or il.location_id = any(p_location_ids))
      and (p_supplier_ids is null or il.supplier_id = any(p_supplier_ids))
      and (p_category_ids is null or il.category_id = any(p_category_ids))
      and (
        p_search is null or (
          lower(il.description) like '%' || lower(p_search) || '%' or
          lower(il.product_code) like '%' || lower(p_search) || '%'
        )
      )
  ), seek as (
    select * from base
    where (
      p_after_id is null
      or (invoice_date, created_at, id) > (p_after_invoice_date, p_after_created_at, p_after_id)
    )
  )
  select s.id,
         s.invoice_date,
         s.created_at,
         s.invoice_number,
         s.due_date,
         s.delivery_date,
         s.document_type,
         s.product_code,
         s.description,
         s.quantity,
         s.unit_price,
         s.unit_price_after_discount,
         s.total_price,
         s.total_price_after_discount,
         s.total_tax,
         s.category_id,
         s.location_id,
         s.supplier_id,
         jsonb_build_object(
           'invoice_date', s.invoice_date,
           'created_at', s.created_at,
           'id', s.id
         ) as cursor
  from seek s
  order by s.invoice_date asc, s.created_at asc, s.id asc
  limit greatest(1, coalesce(p_limit, 50));
$$;


