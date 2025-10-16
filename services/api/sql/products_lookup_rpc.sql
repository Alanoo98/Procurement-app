-- products lookup with search + keyset pagination from invoice_lines
-- Returns distinct (product_code, description, supplier_id) per org, optional supplier filter

create or replace function public.products_lookup_list(
  p_org uuid,
  p_supplier_id uuid default null,
  p_search text default null,
  p_limit int default 50,
  p_after_description text default null,
  p_after_product_code text default null,
  p_after_supplier_id uuid default null
)
returns table (
  product_code text,
  description text,
  supplier_id uuid,
  cursor jsonb
) language sql stable as $$
  with base as (
    select distinct il.product_code, il.description, il.supplier_id
    from public.invoice_lines il
    where il.organization_id = p_org
      and (p_supplier_id is null or il.supplier_id = p_supplier_id)
      and (
        p_search is null or (
          lower(il.description) like '%' || lower(p_search) || '%' or
          lower(il.product_code) like '%' || lower(p_search) || '%'
        )
      )
  ), seek as (
    select * from base
    where (
      p_after_product_code is null -- first page
      or (description, product_code, supplier_id) > (p_after_description, p_after_product_code, p_after_supplier_id)
    )
  )
  select s.product_code,
         s.description,
         s.supplier_id,
         jsonb_build_object(
           'description', s.description,
           'product_code', s.product_code,
           'supplier_id', s.supplier_id
         ) as cursor
  from seek s
  order by s.description asc nulls last, s.product_code asc nulls last, s.supplier_id asc nulls last
  limit greatest(1, coalesce(p_limit, 50));
$$;




