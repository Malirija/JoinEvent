-- Read-only RPCs used for signup status and owner attendee lists.
-- Signup mutations remain restricted to register_for_event/cancel_event_signup.

create or replace function public.get_my_signups()
returns table (
  signup_id uuid,
  event_id uuid,
  signup_status text,
  registered_at timestamptz,
  cancelled_at timestamptz,
  event_title text,
  event_category text,
  event_location text,
  event_starts_at timestamptz,
  event_status text,
  event_capacity integer,
  event_price numeric,
  active_signups bigint,
  available_capacity bigint
)
language plpgsql
stable
security definer
set search_path = pg_catalog, public
as $function$
declare
  current_user_id uuid := auth.uid();
begin
  if current_user_id is null then
    raise exception using errcode = '28000', message = 'You must be signed in to view your registrations.';
  end if;

  return query
  select s.id,
         e.id,
         s.status,
         s.registered_at,
         s.cancelled_at,
         e.title,
         e.category,
         e.location,
         e.starts_at,
         e.status,
         e.capacity,
         e.price,
         counts.active_count,
         case when e.capacity is null then null::bigint
              else greatest(e.capacity::bigint - counts.active_count, 0::bigint) end
  from public.signups as s
  join public.events as e on e.id = s.event_id
  cross join lateral (
    select count(*)::bigint as active_count
    from public.signups as active_signup
    where active_signup.event_id = e.id and active_signup.status = 'active'
  ) as counts
  where s.user_id = current_user_id
  order by e.starts_at asc;
end;
$function$;

revoke all on function public.get_my_signups() from public, anon;
grant execute on function public.get_my_signups() to authenticated;

create or replace function public.get_event_signups(p_event_id uuid)
returns table (
  signup_id uuid,
  user_id uuid,
  attendee_name text,
  signup_status text,
  registered_at timestamptz,
  cancelled_at timestamptz
)
language plpgsql
stable
security definer
set search_path = pg_catalog, public
as $function$
declare
  current_user_id uuid := auth.uid();
begin
  if current_user_id is null then
    raise exception using errcode = '28000', message = 'You must be signed in to view event registrations.';
  end if;
  if not exists (
    select 1 from public.events as e
    where e.id = p_event_id and e.owner_id = current_user_id
  ) then
    raise exception using errcode = '42501', message = 'Only the event creator can view registrations.';
  end if;

  return query
  select s.id, s.user_id, u.name, s.status, s.registered_at, s.cancelled_at
  from public.signups as s
  join public.users as u on u.id = s.user_id
  where s.event_id = p_event_id
  order by s.registered_at desc;
end;
$function$;

revoke all on function public.get_event_signups(uuid) from public, anon;
grant execute on function public.get_event_signups(uuid) to authenticated;
