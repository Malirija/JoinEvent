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
