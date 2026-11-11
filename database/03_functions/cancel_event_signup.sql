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
