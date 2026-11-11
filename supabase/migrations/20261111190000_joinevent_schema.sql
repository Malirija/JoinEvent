
-- ============================================================================
-- Source: database/01_schema/create_tables.sql
-- ============================================================================

-- JoinEvent core schema. Run this file first in the Supabase SQL Editor.
-- Uses Supabase Auth's auth.users as the identity source. Exactly three
-- application tables are created in the public schema.

create table if not exists public.users (
  id uuid primary key references auth.users (id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 100),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.users (id) on delete cascade,
  title text not null check (char_length(btrim(title)) between 1 and 160),
  description text not null default '',
  location text not null default '',
  starts_at timestamptz not null,
  ends_at timestamptz,
  capacity integer check (capacity is null or capacity > 0),
  status text not null default 'draft'
    check (status in ('draft', 'published', 'cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint events_end_after_start check (ends_at is null or ends_at > starts_at)
);

create table if not exists public.signups (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events (id) on delete cascade,
  user_id uuid not null references public.users (id) on delete cascade,
  status text not null default 'active' check (status in ('active', 'cancelled')),
  registered_at timestamptz not null default now(),
  cancelled_at timestamptz,
  constraint signups_event_user_unique unique (event_id, user_id),
  constraint signups_cancellation_state check (
    (status = 'active' and cancelled_at is null)
    or (status = 'cancelled' and cancelled_at is not null)
  )
);

comment on table public.users is 'Application profile for a corresponding Supabase Auth user.';
comment on table public.events is 'Events created by JoinEvent users.';
comment on table public.signups is 'One signup row per user and event; cancelled rows can be reactivated.';


-- ============================================================================
-- Source: database/02_triggers/handle_new_user.sql
-- ============================================================================

-- Creates a profile whenever Supabase Auth creates an auth.users record.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $function$
declare
  profile_name text;
begin
  profile_name := coalesce(
    nullif(btrim(new.raw_user_meta_data ->> 'name'), ''),
    nullif(btrim(new.raw_user_meta_data ->> 'full_name'), ''),
    nullif(btrim(new.raw_user_meta_data ->> 'display_name'), ''),
    nullif(btrim(new.raw_user_meta_data ->> 'first_name'), ''),
    nullif(btrim(new.email), ''),
    'JoinEvent user'
  );

  insert into public.users (id, name)
  values (new.id, left(profile_name, 100))
  on conflict (id) do update
    set name = excluded.name,
        updated_at = now();

  return new;
end;
$function$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

revoke all on function public.handle_new_user() from public, anon, authenticated;


-- ============================================================================
-- Source: database/03_functions/register_for_event.sql
-- ============================================================================

-- Register the authenticated user for an event. Locking the event row serializes
-- registrations to that event, so capacity cannot be exceeded by concurrent calls.
create or replace function public.register_for_event(p_event_id uuid)
returns table (signup_id uuid, signup_status text, result_message text)
language plpgsql
security definer
set search_path = pg_catalog, public
as $function$
declare
  current_user_id uuid := auth.uid();
  target_event public.events%rowtype;
  existing_signup public.signups%rowtype;
  active_count bigint;
begin
  if current_user_id is null then
    raise exception using errcode = '28000', message = 'You must be signed in to register.';
  end if;

  select e.* into target_event
  from public.events as e
  where e.id = p_event_id
  for update;

  if not found then
    raise exception using errcode = 'P0002', message = 'Event not found.';
  end if;
  if target_event.status <> 'published' then
    raise exception using errcode = '22023', message = 'This event is not open for registration.';
  end if;
  if target_event.starts_at <= now() then
    raise exception using errcode = '22023', message = 'Registration is closed because this event has started.';
  end if;
  if target_event.owner_id = current_user_id then
    raise exception using errcode = '22023', message = 'You cannot register for your own event.';
  end if;

  select s.* into existing_signup
  from public.signups as s
  where s.event_id = p_event_id and s.user_id = current_user_id
  for update;

  if found and existing_signup.status = 'active' then
    raise exception using errcode = '23505', message = 'You are already registered for this event.';
  end if;

  select count(*) into active_count
  from public.signups as s
  where s.event_id = p_event_id and s.status = 'active';

  if target_event.capacity is not null and active_count >= target_event.capacity then
    raise exception using errcode = '22023', message = 'This event is full.';
  end if;

  if existing_signup.id is not null then
    update public.signups as s
       set status = 'active', registered_at = now(), cancelled_at = null
     where s.id = existing_signup.id
     returning s.id, s.status into signup_id, signup_status;
    result_message := 'Your cancelled signup has been reactivated.';
  else
    insert into public.signups (event_id, user_id)
    values (p_event_id, current_user_id)
    returning id, status into signup_id, signup_status;
    result_message := 'You are registered for this event.';
  end if;

  return next;
end;
$function$;

revoke all on function public.register_for_event(uuid) from public, anon;
grant execute on function public.register_for_event(uuid) to authenticated;


-- ============================================================================
-- Source: database/03_functions/cancel_event_signup.sql
-- ============================================================================

-- Cancel the signed-in user's signup. Event owners cannot cancel on behalf of attendees.
create or replace function public.cancel_event_signup(p_event_id uuid)
returns table (signup_id uuid, signup_status text, result_message text)
language plpgsql
security definer
set search_path = pg_catalog, public
as $function$
declare
  current_user_id uuid := auth.uid();
begin
  if current_user_id is null then
    raise exception using errcode = '28000', message = 'You must be signed in to cancel a signup.';
  end if;

  update public.signups as s
     set status = 'cancelled', cancelled_at = now()
   where s.event_id = p_event_id
     and s.user_id = current_user_id
     and s.status = 'active'
  returning s.id, s.status into signup_id, signup_status;

  if not found then
    if exists (
      select 1 from public.signups as s
      where s.event_id = p_event_id and s.user_id = current_user_id
    ) then
      raise exception using errcode = '22023', message = 'Your signup is already cancelled.';
    end if;
    raise exception using errcode = 'P0002', message = 'No signup found for this event and user.';
  end if;

  result_message := 'Your signup has been cancelled.';
  return next;
end;
$function$;

revoke all on function public.cancel_event_signup(uuid) from public, anon;
grant execute on function public.cancel_event_signup(uuid) to authenticated;


-- ============================================================================
-- Source: database/03_functions/update_profile.sql
-- ============================================================================

-- Update only the caller's profile name. The identity and timestamps are controlled here.
create or replace function public.update_profile(p_name text)
returns public.users
language plpgsql
security definer
set search_path = pg_catalog, public
as $function$
declare
  current_user_id uuid := auth.uid();
  updated_profile public.users%rowtype;
begin
  if current_user_id is null then
    raise exception using errcode = '28000', message = 'You must be signed in to update your profile.';
  end if;
  if p_name is null or char_length(btrim(p_name)) not between 1 and 100 then
    raise exception using errcode = '22023', message = 'Name must contain between 1 and 100 characters.';
  end if;

  update public.users as u
     set name = btrim(p_name), updated_at = now()
   where u.id = current_user_id
  returning u.* into updated_profile;

  if not found then
    raise exception using errcode = 'P0002', message = 'Profile not found.';
  end if;
  return updated_profile;
end;
$function$;

revoke all on function public.update_profile(text) from public, anon;
grant execute on function public.update_profile(text) to authenticated;


-- ============================================================================
-- Source: database/03_functions/get_event_creation_stats.sql
-- ============================================================================

-- Returns a 24-hour local-time distribution across every event ever created.
-- Hour is derived after converting the stored timestamptz to Europe/Vilnius.
create or replace function public.get_event_creation_stats()
returns table (local_creation_hour integer, event_count bigint)
language plpgsql
stable
security definer
set search_path = pg_catalog, public
as $function$
begin
  if auth.uid() is null then
    raise exception using errcode = '28000', message = 'You must be signed in to view event statistics.';
  end if;

  return query
  select extract(hour from (e.created_at at time zone 'Europe/Vilnius'))::integer,
         count(*)::bigint
  from public.events as e
  group by 1
  order by 1;
end;
$function$;

revoke all on function public.get_event_creation_stats() from public, anon;
grant execute on function public.get_event_creation_stats() to authenticated;


-- ============================================================================
-- Source: database/03_functions/get_event_statistics.sql
-- ============================================================================

-- Per-event attendance summary. Only the event owner can request this data.
create or replace function public.get_event_statistics(p_event_id uuid)
returns table (
  event_id uuid,
  active_signups bigint,
  cancelled_signups bigint,
  capacity integer,
  remaining_capacity bigint
)
language plpgsql
stable
security definer
set search_path = pg_catalog, public
as $function$
declare
  current_user_id uuid := auth.uid();
  target_capacity integer;
  active_total bigint;
  cancelled_total bigint;
begin
  if current_user_id is null then
    raise exception using errcode = '28000', message = 'You must be signed in to view event statistics.';
  end if;

  select e.capacity into target_capacity
  from public.events as e
  where e.id = p_event_id and e.owner_id = current_user_id;

  if not found then
    raise exception using errcode = 'P0002', message = 'Event not found or you do not own it.';
  end if;

  select count(*) filter (where s.status = 'active'),
         count(*) filter (where s.status = 'cancelled')
    into active_total, cancelled_total
  from public.signups as s
  where s.event_id = p_event_id;

  return query select p_event_id, active_total, cancelled_total, target_capacity,
    case when target_capacity is null then null::bigint
         else greatest(target_capacity::bigint - active_total, 0::bigint) end;
end;
$function$;

revoke all on function public.get_event_statistics(uuid) from public, anon;
grant execute on function public.get_event_statistics(uuid) to authenticated;


-- ============================================================================
-- Source: database/04_policies/enable_rls.sql
-- ============================================================================

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


-- ============================================================================
-- Source: database/05_indexes/create_indexes.sql
-- ============================================================================

-- Foreign-key and common event-discovery/statistics indexes.
create index if not exists events_owner_id_idx
  on public.events (owner_id);
create index if not exists events_public_start_idx
  on public.events (starts_at)
  where status = 'published';
create index if not exists events_status_created_idx
  on public.events (status, created_at desc);

-- The UNIQUE(event_id, user_id) constraint already indexes both columns in
-- that order; these indexes support lookups by attendee and capacity counts.
create index if not exists signups_user_id_idx
  on public.signups (user_id);
create index if not exists signups_active_event_idx
  on public.signups (event_id)
  where status = 'active';
create index if not exists signups_event_status_idx
  on public.signups (event_id, status);
