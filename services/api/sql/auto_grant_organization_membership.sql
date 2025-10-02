-- Auto-add organization membership for users when organization_id is set/changed

create or replace function public.auto_grant_organization_membership() returns trigger as $$
declare
  v_user_id uuid := coalesce(new.id, old.id);
  v_org_id uuid := new.organization_id;
begin
  if v_org_id is null then
    return new;
  end if;

  -- Upsert into organization_users (assumes table exists with (user_id, organization_id, role, created_at))
  insert into public.organization_users as ou (
    user_id,
    organization_id,
    role,
    created_at
  ) values (
    v_user_id,
    v_org_id,
    'member',
    now()
  )
  on conflict (user_id, organization_id)
  do update set role = excluded.role;

  return new;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists trg_auto_grant_org_membership_ins on public.users;
create trigger trg_auto_grant_org_membership_ins
after insert on public.users
for each row
execute function public.auto_grant_organization_membership();

drop trigger if exists trg_auto_grant_org_membership_upd on public.users;
create trigger trg_auto_grant_org_membership_upd
after update of organization_id on public.users
for each row
when (new.organization_id is distinct from old.organization_id)
execute function public.auto_grant_organization_membership();

-- Backfill convenience (run once if needed):
-- insert into public.organization_users (user_id, organization_id, role, created_at)
-- select u.id, u.organization_id, 'member', now()
-- from public.users u
-- where u.organization_id is not null
--   and not exists (
--     select 1 from public.organization_users ou
--     where ou.user_id = u.id and ou.organization_id = u.organization_id
--   );


