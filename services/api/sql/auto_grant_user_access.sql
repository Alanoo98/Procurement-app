-- Auto-grant org-wide access for users upon signup/verification or org change
-- Creates a trigger function and triggers on users table to upsert into user_business_unit_access

-- Safety: create extension if missing (for gen_random_uuid)
do $$ begin
  perform 1 from pg_extension where extname = 'pgcrypto';
  if not found then
    create extension pgcrypto;
  end if;
exception when others then
  -- ignore if no permission
  null;
end $$;

-- Function to upsert access when a user is added or their organization changes
create or replace function public.auto_grant_user_access() returns trigger as $$
declare
  v_user_id uuid;
  v_org_id uuid;
begin
  v_user_id := coalesce(new.id, old.id);
  v_org_id := new.organization_id;

  if v_org_id is null then
    return new;
  end if;

  insert into public.user_business_unit_access as uba (
    user_id,
    organization_id,
    business_unit_id,
    role,
    permissions,
    granted_by,
    is_active,
    created_at,
    updated_at
  ) values (
    v_user_id,
    v_org_id,
    null,
    'member',
    '{}'::jsonb,
    null,
    true,
    now(),
    now()
  )
  on conflict (user_id, organization_id, business_unit_id)
  do update set
    is_active = excluded.is_active,
    role = excluded.role,
    permissions = excluded.permissions,
    updated_at = now();

  return new;
end;
$$ language plpgsql security definer set search_path = public;

-- Trigger on insert
drop trigger if exists trg_auto_grant_user_access_ins on public.users;
create trigger trg_auto_grant_user_access_ins
after insert on public.users
for each row
execute function public.auto_grant_user_access();

-- Trigger on update when organization_id changes
drop trigger if exists trg_auto_grant_user_access_upd on public.users;
create trigger trg_auto_grant_user_access_upd
after update of organization_id on public.users
for each row
when (new.organization_id is distinct from old.organization_id)
execute function public.auto_grant_user_access();

-- Backfill convenience statement (run once manually if needed):
-- insert into public.user_business_unit_access (user_id, organization_id, business_unit_id, role, permissions, granted_by, is_active, created_at, updated_at)
-- select u.id, u.organization_id, null, 'member', '{}'::jsonb, null, true, now(), now()
-- from public.users u
-- where u.organization_id is not null
--   and not exists (
--     select 1 from public.user_business_unit_access uba
--     where uba.user_id = u.id
--       and uba.organization_id = u.organization_id
--       and uba.business_unit_id is null
--   );


