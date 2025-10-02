-- Transactional RPC to finalize a product category mapping
-- Responsibilities (atomic):
-- 1) Reuse existing mapping or create a new one
-- 2) Update invoice_lines to set category_mapping_id, category_id, category_pending=false
-- 3) Approve and delete matching pending_category_mappings
--
-- Usage:
--   select * from finalize_category_mapping(
--     org_id => '...',
--     p_category_id => '...',
--     p_variant_name => 'Salat 75g Ruccula',
--     p_variant_code => null,
--     p_variant_supplier => null,
--     p_apply_to_all_suppliers => true
--   );

create or replace function finalize_category_mapping(
  org_id uuid,
  p_category_id uuid,
  p_variant_name text,
  p_variant_code text default null,
  p_variant_supplier text default null,
  p_apply_to_all_suppliers boolean default true
)
returns table (
  mapping_id uuid,
  affected_invoice_lines integer,
  approved_pending integer,
  deleted_pending integer
) language plpgsql as $$
declare
  v_mapping_id uuid;
  v_affected_invoice_lines integer := 0;
  v_approved_pending integer := 0;
  v_deleted_pending integer := 0;
begin
  -- 1) Reuse existing mapping or create a new one (NULL-safe)
  select m.mapping_id
  into v_mapping_id
  from product_category_mappings m
  where m.organization_id = org_id
    and m.category_id = p_category_id
    and m.variant_product_name = p_variant_name
    and ( (p_variant_code is null and m.variant_product_code is null) or (m.variant_product_code = p_variant_code) )
    and ( (p_variant_supplier is null and m.variant_supplier_name is null) or (m.variant_supplier_name = p_variant_supplier) )
    and m.is_active = true
  limit 1;

  if v_mapping_id is null then
    insert into product_category_mappings(
      mapping_id, organization_id, category_id, variant_product_name,
      variant_product_code, variant_supplier_name, is_active
    ) values (
      gen_random_uuid(), org_id, p_category_id, p_variant_name,
      p_variant_code, p_variant_supplier, true
    ) returning mapping_id into v_mapping_id;
  end if;

  -- 2) Update invoice_lines (NULL-safe matching)
  if p_variant_code is null then
    if p_apply_to_all_suppliers or p_variant_supplier is null then
      update invoice_lines il
      set category_mapping_id = v_mapping_id,
          category_id = p_category_id,
          category_pending = false,
          updated_at = now()
      where il.organization_id = org_id
        and il.description = p_variant_name
        and il.product_code is null;
    else
      update invoice_lines il
      set category_mapping_id = v_mapping_id,
          category_id = p_category_id,
          category_pending = false,
          updated_at = now()
      where il.organization_id = org_id
        and il.description = p_variant_name
        and il.product_code is null
        and il.variant_supplier_name = p_variant_supplier;
    end if;
  else
    if p_apply_to_all_suppliers or p_variant_supplier is null then
      update invoice_lines il
      set category_mapping_id = v_mapping_id,
          category_id = p_category_id,
          category_pending = false,
          updated_at = now()
      where il.organization_id = org_id
        and il.description = p_variant_name
        and il.product_code = p_variant_code;
    else
      update invoice_lines il
      set category_mapping_id = v_mapping_id,
          category_id = p_category_id,
          category_pending = false,
          updated_at = now()
      where il.organization_id = org_id
        and il.description = p_variant_name
        and il.product_code = p_variant_code
        and il.variant_supplier_name = p_variant_supplier;
    end if;
  end if;
  GET DIAGNOSTICS v_affected_invoice_lines = ROW_COUNT;

  -- 3) Approve matching pending rows (NULL-safe)
  if p_apply_to_all_suppliers or p_variant_supplier is null then
    update pending_category_mappings pcm
    set status = 'approved', updated_at = now()
    where pcm.organization_id = org_id
      and pcm.variant_product_name = p_variant_name
      and ( (p_variant_code is null and pcm.variant_product_code is null) or (pcm.variant_product_code = p_variant_code) )
      and pcm.status = 'pending';
  else
    update pending_category_mappings pcm
    set status = 'approved', updated_at = now()
    where pcm.organization_id = org_id
      and pcm.variant_product_name = p_variant_name
      and ( (p_variant_code is null and pcm.variant_product_code is null) or (pcm.variant_product_code = p_variant_code) )
      and pcm.variant_supplier_name = p_variant_supplier
      and pcm.status = 'pending';
  end if;
  GET DIAGNOSTICS v_approved_pending = ROW_COUNT;

  -- Delete all approved rows for this key (supplier scope per flag)
  if p_apply_to_all_suppliers or p_variant_supplier is null then
    delete from pending_category_mappings pcm
    where pcm.organization_id = org_id
      and pcm.variant_product_name = p_variant_name
      and ( (p_variant_code is null and pcm.variant_product_code is null) or (pcm.variant_product_code = p_variant_code) )
      and pcm.status = 'approved';
  else
    delete from pending_category_mappings pcm
    where pcm.organization_id = org_id
      and pcm.variant_product_name = p_variant_name
      and ( (p_variant_code is null and pcm.variant_product_code is null) or (pcm.variant_product_code = p_variant_code) )
      and pcm.variant_supplier_name = p_variant_supplier
      and pcm.status = 'approved';
  end if;
  GET DIAGNOSTICS v_deleted_pending = ROW_COUNT;

  return query select v_mapping_id, v_affected_invoice_lines, v_approved_pending, v_deleted_pending;
end;
$$;

-- SECURITY: allow execution to authenticated users; rely on RLS inside statements
revoke all on function finalize_category_mapping(uuid, uuid, text, text, text, boolean) from public;
grant execute on function finalize_category_mapping(uuid, uuid, text, text, text, boolean) to authenticated;


