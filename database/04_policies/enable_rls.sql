-- Enable row-level security and grant only the operations exposed by policy.
alter table public.users enable row level security;
alter table public.events enable row level security;
alter table public.signups enable row level security;

-- Remove broad defaults before applying narrowly scoped client privileges.
revoke all on table public.users, public.events, public.signups from anon, authenticated;

grant select on table public.users to authenticated;
grant update (name) on table public.users to authenticated;
grant select on table public.events to anon, authenticated;
grant insert, update, delete on table public.events to authenticated;
grant select on table public.signups to authenticated;

drop policy if exists users_select_own on public.users;
create policy users_select_own on public.users
  for select to authenticated
  using (id = (select auth.uid()));

drop policy if exists users_update_own on public.users;
create policy users_update_own on public.users
  for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

drop policy if exists events_public_read on public.events;
create policy events_public_read on public.events
  for select to anon, authenticated
  using (status = 'published' or owner_id = (select auth.uid()));

drop policy if exists events_insert_own on public.events;
create policy events_insert_own on public.events
  for insert to authenticated
  with check (owner_id = (select auth.uid()));

drop policy if exists events_update_own on public.events;
create policy events_update_own on public.events
  for update to authenticated
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));

drop policy if exists events_delete_own on public.events;
create policy events_delete_own on public.events
  for delete to authenticated
  using (owner_id = (select auth.uid()));

drop policy if exists signups_read_own_or_owned_event on public.signups;
create policy signups_read_own_or_owned_event on public.signups
  for select to authenticated
  using (
    user_id = (select auth.uid())
    or exists (
      select 1 from public.events as e
      where e.id = signups.event_id and e.owner_id = (select auth.uid())
    )
  );

-- No client INSERT/UPDATE/DELETE privileges or policies are granted for signups.
-- Registration and cancellation are performed only by the RPC functions.
