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
