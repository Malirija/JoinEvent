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
