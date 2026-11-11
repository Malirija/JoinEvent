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
