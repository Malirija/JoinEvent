# JoinEvent database setup

This directory contains the PostgreSQL schema for Supabase. It creates exactly
three application tables in `public`: `users`, `events`, and `signups`. User
authentication remains in Supabase's built-in `auth.users` table; there is no
separate authentication table.

## Apply everything with Supabase CLI (recommended)

The database structure is in the ordered migrations under `supabase/migrations/`.
The ordered migrations add the event category and price fields, capacity-aware
event reads, and signup-history reads required by the Events module. From the
project root, link the project if you have not already linked it, then push migrations:

```powershell
supabase link --project-ref YOUR_PROJECT_REF
supabase db push
```

Replace `YOUR_PROJECT_REF` with the reference shown in the Supabase dashboard.
If the project is already linked, run only `supabase db push`. The migrations
create the three tables, Auth trigger, RPC functions, RLS policies, grants,
event fields, and indexes in dependency order. The Events migration also creates
profile rows for Auth users who existed before the profile trigger was added,
so their event-owner foreign key is valid.

The CLI migration does not include sample data. Seed rows depend on a real Auth
user UUID, so create that user first and follow the optional seed steps below.
The numbered SQL files in `database/` remain available for manual SQL Editor
execution. For the Events module fields and listing RPC, also run the contents
of `supabase/migrations/20261112090000_events_module.sql` after the base files.

## SQL Editor execution order

Open **Supabase Dashboard → SQL Editor**, create a query for each file, and run
them in this exact order:

1. `01_schema/create_tables.sql` — creates the three tables and constraints.
2. `02_triggers/handle_new_user.sql` — installs the Auth-to-profile trigger.
3. `03_functions/register_for_event.sql` — registration RPC.
4. `03_functions/cancel_event_signup.sql` — cancellation RPC.
5. `03_functions/update_profile.sql` — profile-name RPC.
6. `03_functions/get_event_creation_stats.sql` — local-hour creation totals.
7. `03_functions/get_event_statistics.sql` — per-event signup totals.
8. `04_policies/enable_rls.sql` — grants and row-level security policies.
9. `05_indexes/create_indexes.sql` — lookup and filtering indexes.
10. `supabase/migrations/20261112090000_events_module.sql` — event category,
    price, and capacity-aware read RPC.
11. `supabase/migrations/20261112100000_signup_read_functions.sql` — secure
    attendee and personal signup reads.
12. Optional: `06_seed/seed.sql` — example event rows.

Run each complete file as a single SQL Editor query. The schema, trigger,
functions, policies, indexes, and event module migration are safe to re-run for
this initial setup.
Seed setup is also repeatable for its fixed event IDs.

## Seed setup

The seed file does not create users or bypass Supabase Auth. Before running it:

1. In **Authentication → Users**, create a test Auth user (or sign up through
   the application once Auth is connected).
2. Copy that user's UUID.
3. In `06_seed/seed.sql`, replace each sample
   `20000000-0000-4000-8000-000000000001` owner UUID with the copied UUID.
   The `handle_new_user` trigger creates the corresponding `public.users` row.
4. Run the seed file in the SQL Editor.
5. Create a second Auth user if you want to test registering for an event.

The sample events use future dates and include both `published` and `draft`
statuses. Seed owner IDs must refer to actual Auth users because of the foreign
key to `public.users`.

## Data model

- `public.users.id` is the primary key and references `auth.users.id` with
  `ON DELETE CASCADE`. Profile names are sourced from Auth metadata (`name`,
  then common full/display/first-name keys, then email).
- `public.events.owner_id` references `public.users.id`. Event status is
  `draft`, `published`, or `cancelled`; only published events are public.
- `public.signups` has a unique `(event_id, user_id)` pair. A cancelled signup
  keeps its row so `register_for_event` can reactivate it.
- Event capacity is nullable for unlimited attendance. Event start/end checks,
  name lengths, capacity, statuses, and signup cancellation state are guarded
  by constraints.

## Access and RPC behavior

- RLS is enabled on all three application tables.
- Users can select their own profile and update only its `name` column. The
  `update_profile(text)` RPC validates `auth.uid()` and the name length.
- Anyone can read published events. Authenticated owners can read all their
  event statuses and create, edit, or delete their own events.
- Authenticated users can read their own signups. An event owner can read
  signups for events they own. Clients receive no direct signup write grant or
  write policy; use the RPCs instead.
- `register_for_event(uuid)` locks the event row before checking status, start
  time, ownership, duplicate signup, and capacity. This serializes concurrent
  registrations for an event. Cancelled signups can be reactivated.
- `cancel_event_signup(uuid)` only cancels the caller's active signup.
- `get_event_creation_stats()` groups all historical event records by local
  hour of creation in `Europe/Vilnius` (hours with zero records are omitted).
  It is available to authenticated users and returns aggregate counts only.
- `get_event_statistics(uuid)` returns active/cancelled signup totals and
  capacity for an event owned by the caller.

Privileged RPCs and the trigger use `SECURITY DEFINER`, set
`search_path = pg_catalog, public`, qualify application tables, and never use
or expose a service-role credential. The client should call these functions
through Supabase RPC; no Edge Function or custom backend is needed.

## Assumptions

No separate schema document was present in the starter repository. This
implementation uses `title`, `description`, `location`, `starts_at`, `ends_at`,
`capacity`, and `status` for events; profile `name`; and `active`/`cancelled`
signup states. Event creation statistics are a 24-bin local-hour distribution
across the complete event history.

These scripts are provided for you to run in your Supabase project. They have
not been executed against a live Supabase project as part of this change.
