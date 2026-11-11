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
