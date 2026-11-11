-- Creates a profile whenever Supabase Auth creates an auth.users record.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $function$
declare
  profile_name text;
begin
  profile_name := coalesce(
    nullif(btrim(new.raw_user_meta_data ->> 'name'), ''),
    nullif(btrim(new.raw_user_meta_data ->> 'full_name'), ''),
    nullif(btrim(new.raw_user_meta_data ->> 'display_name'), ''),
    nullif(btrim(new.raw_user_meta_data ->> 'first_name'), ''),
    nullif(btrim(new.email), ''),
    'JoinEvent user'
  );

  insert into public.users (id, name)
  values (new.id, left(profile_name, 100))
  on conflict (id) do update
    set name = excluded.name,
        updated_at = now();

  return new;
end;
$function$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

revoke all on function public.handle_new_user() from public, anon, authenticated;
