-- Event module fields and a safe, count-enriched public event listing RPC.
-- Backfill profiles for Auth users who existed before the profile trigger was installed.
insert into public.users (id, name)
select a.id,
       left(coalesce(
         nullif(btrim(a.raw_user_meta_data ->> 'name'), ''),
         nullif(btrim(a.raw_user_meta_data ->> 'full_name'), ''),
         nullif(btrim(a.raw_user_meta_data ->> 'display_name'), ''),
         nullif(btrim(a.raw_user_meta_data ->> 'first_name'), ''),
         nullif(btrim(a.email), ''),
         'JoinEvent user'
       ), 100)
from auth.users as a
on conflict (id) do nothing;

alter table public.events
  add column if not exists category text not null default 'Other',
  add column if not exists price numeric(10, 2) not null default 0;

alter table public.events
  drop constraint if exists events_category_check,
  add constraint events_category_check check (
    category in ('Technology', 'Business', 'Workshop', 'Networking', 'Arts & Culture', 'Community', 'Other')
  ),
  drop constraint if exists events_price_check,
  add constraint events_price_check check (price >= 0);

create index if not exists events_category_starts_idx
  on public.events (category, starts_at)
  where status = 'published';

-- Aggregate signup capacity without exposing signup records to public callers.
-- Published events are public; draft/cancelled rows are returned only to owners.
create or replace function public.get_events_with_capacity(p_event_id uuid default null)
returns table (
  event_id uuid,
  owner_id uuid,
  title text,
  description text,
  category text,
  location text,
  starts_at timestamptz,
  ends_at timestamptz,
  capacity integer,
  price numeric,
  status text,
  created_at timestamptz,
  active_signups bigint,
  available_capacity bigint
)
language sql
stable
security definer
set search_path = pg_catalog, public
as $function$
  select e.id,
         e.owner_id,
         e.title,
         e.description,
         e.category,
         e.location,
         e.starts_at,
         e.ends_at,
         e.capacity,
         e.price,
         e.status,
         e.created_at,
         (count(s.id) filter (where s.status = 'active'))::bigint,
         case when e.capacity is null then null::bigint
              else greatest(e.capacity::bigint - (count(s.id) filter (where s.status = 'active')), 0::bigint) end
  from public.events as e
  left join public.signups as s on s.event_id = e.id
  where (p_event_id is null or e.id = p_event_id)
    and (e.status = 'published' or e.owner_id = auth.uid())
  group by e.id
  order by e.starts_at asc;
$function$;

revoke all on function public.get_events_with_capacity(uuid) from public;
grant execute on function public.get_events_with_capacity(uuid) to anon, authenticated;
