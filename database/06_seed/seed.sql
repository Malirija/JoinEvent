-- Sample events for local/demo use. This file deliberately does not create Auth
-- users or profile rows. First create an Auth user through Supabase Auth, then
-- replace the owner UUID below with that Auth user's UUID (the trigger creates
-- the matching public.users profile). Re-run this file to upsert the examples.
-- Use a second Auth user if you want to test attendee signup flows.

insert into public.events (
  id, owner_id, title, description, location, starts_at, ends_at, capacity, status, created_at
)
values
  (
    '10000000-0000-4000-8000-000000000001',
    '20000000-0000-4000-8000-000000000001',
    'Vilnius Product & Design Meetup',
    'An evening for local product builders and designers to share ideas.',
    'Tech Arts, Vilnius',
    '2030-06-18 18:00:00+03', '2030-06-18 21:00:00+03', 120, 'published',
    '2025-02-04 09:00:00+00'
  ),
  (
    '10000000-0000-4000-8000-000000000002',
    '20000000-0000-4000-8000-000000000001',
    'Community Coffee Morning',
    'Meet neighbors, exchange notes, and start the day together.',
    'Coffee1, Vilnius',
    '2030-07-02 09:00:00+03', '2030-07-02 10:30:00+03', 40, 'published',
    '2025-04-15 05:30:00+00'
  ),
  (
    '10000000-0000-4000-8000-000000000003',
    '20000000-0000-4000-8000-000000000001',
    'Autumn Ideas Festival',
    'A draft event example. Publish it when registration is ready.',
    'Lukiškės Prison 2.0, Vilnius',
    '2030-09-12 12:00:00+03', '2030-09-12 18:00:00+03', 300, 'draft',
    '2025-08-20 12:00:00+00'
  )
on conflict (id) do update set
  owner_id = excluded.owner_id,
  title = excluded.title,
  description = excluded.description,
  location = excluded.location,
  starts_at = excluded.starts_at,
  ends_at = excluded.ends_at,
  capacity = excluded.capacity,
  status = excluded.status,
  created_at = excluded.created_at,
  updated_at = now();
