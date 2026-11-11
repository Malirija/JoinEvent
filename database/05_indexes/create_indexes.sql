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
