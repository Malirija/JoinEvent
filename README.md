# JoinEvent

JoinEvent is a responsive event management application. Visitors can browse published events. Signed-in users can create and manage events, register for events, update their profile name, and view hosted-event and signup statistics. Paid events display a price and reserve a place only; JoinEvent does not process payments.

## Technology

- React 19 and JavaScript (ES modules; no TypeScript)
- Vite 8
- React Router 7
- Supabase JS, Supabase Auth, and PostgreSQL
- Recharts
- Lucide React
- Vercel static hosting with SPA rewrites

## Requirements

- Node.js 20.19+ or 22.12+
- npm
- A Supabase project
- Supabase CLI for applying migrations (optional if using the SQL Editor)

## Install and configure

From the project root, install dependencies:

```sh
npm install
```

Copy `.env.example` to `.env.local`:

```powershell
Copy-Item .env.example .env.local
```

Or on macOS/Linux:

```sh
cp .env.example .env.local
```

Set the following values in `.env.local`:

| Variable | Required | Description |
| --- | --- | --- |
| `VITE_SUPABASE_URL` | Yes | Supabase project URL, for example `https://project-ref.supabase.co`. |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | One key required | Supabase publishable key (preferred). |
| `VITE_SUPABASE_ANON_KEY` | One key required | Legacy public anon key; used if no publishable key is set. |
| `VITE_ZAPIER_WEBHOOK_URL` | Optional | Zapier Catch Hook URL called after successful event registration. |

Only Supabase publishable/anon keys belong in a browser app. Never add a
`service_role` key to a `VITE_` variable or commit one to the repository. Vite
variables are embedded in the browser build. The Zapier hook URL is therefore
public too; use a hook dedicated to this workflow. Restart the development
server after changing environment variables.

## Supabase database setup

The database has exactly three custom tables: `public.users`, `public.events`,
and `public.signups`. Supabase Auth identities are stored in its built-in
`auth.users`; the Auth trigger creates each corresponding public profile.

In Supabase Authentication settings, configure the local and deployed site URLs
and allowed redirect URLs. Apply the database using **one** of the following
methods.

### Recommended: Supabase CLI

Authenticate and link the project once:

```sh
supabase login
supabase link --project-ref YOUR_PROJECT_REF
```

Then apply every migration in order:

```sh
supabase db push
```

The ordered migrations are:

1. `supabase/migrations/20261111190000_joinevent_schema.sql` — base tables, constraints, Auth profile trigger, RPC functions, RLS, and indexes.
2. `supabase/migrations/20261112090000_events_module.sql` — event category/price columns, existing-profile backfill, and capacity-aware event read function.
3. `supabase/migrations/20261112100000_signup_read_functions.sql` — safe personal signup history and event-owner attendee reads.

### SQL Editor alternative

Run each complete file in the Supabase SQL Editor, in this exact order:

1. `database/01_schema/create_tables.sql`
2. `database/02_triggers/handle_new_user.sql`
3. `database/03_functions/register_for_event.sql`
4. `database/03_functions/cancel_event_signup.sql`
5. `database/03_functions/update_profile.sql`
6. `database/03_functions/get_event_creation_stats.sql`
7. `database/03_functions/get_event_statistics.sql`
8. `database/04_policies/enable_rls.sql`
9. `database/05_indexes/create_indexes.sql`
10. `supabase/migrations/20261112090000_events_module.sql`
11. `supabase/migrations/20261112100000_signup_read_functions.sql`

The numbered SQL files are the manual alternative to the base CLI migration;
do not apply both base setups to the same fresh database. The two later event
and signup-read migrations are required for the application features. See
[`database/README.md`](database/README.md) for database details. These scripts
are provided for execution in your project; this README does not assert that
they have been run against a live Supabase database.

### Optional seed data

Seed data requires an Auth user and is not applied by `supabase db push`:

1. Create a test user using the app or Supabase Authentication.
2. Copy that Auth user's UUID.
3. In `database/06_seed/seed.sql`, replace the placeholder owner UUID `20000000-0000-4000-8000-000000000001` with the real UUID.
4. Run the seed file in the SQL Editor.
5. Create a second Auth user to test registrations.

The Auth trigger creates the associated `public.users` profile. Seed events
include future published and draft events.

## Features and routes

- `/events` — public event list with title search, category and free/paid filters.
- `/events/:id` — event details and registration. Registration and cancellation use Supabase RPCs; paid events do not collect payments.
- `/` — authenticated overview of the signed-in user's hosted events.
- `/events/new` — authenticated event creation.
- `/events/:id/edit` — authenticated event editing; database RLS enforces ownership.
- `/my-events` — the signed-in user's events, with edit and delete actions.
- `/my-registrations` — the signed-in user's event registrations, with cancellation.
- `/profile` — account details and profile name update.
- `/statistics` — authenticated event and signup summary with a 24-hour creation chart.
- `/login` and `/register` — Supabase Auth screens.

Overview and Statistics are hidden from the sidebar when signed out, and their
routes are protected. My Events, My Registrations, and My Profile are shown to
signed-in users. Events remains publicly accessible.

Event forms require a title, one of the supported categories, a city from the
Location dropdown (Vilnius, Kaunas, Klaipėda, Utena, Panevėžys, Alytus,
Druskininkai, or Mažeikiai), a future start/end schedule, and a positive
integer capacity. Selecting a schedule date defaults its time to 12:00. End
time must be after start time. Free events have a zero price; paid events
require a positive price.

## Authentication, data access, and integrations

Supabase Auth persists the user's session. The Auth trigger creates the
corresponding `public.users` row; the frontend does not insert profiles
directly. RLS restricts private profile, event, and signup data. Event owners
can edit and delete their own events. Signup writes are only made through
`register_for_event` and `cancel_event_signup` RPC functions. Registration
locks the event row while checking capacity, preventing simultaneous signups
from exceeding it; cancelled signup rows are retained and can be reactivated.

After a successful `register_for_event` RPC, the app calls the optional Zapier
Catch Hook URL using GET query parameters:

- `paid`: `1` for a paid event, otherwise `0`
- `email`: the signed-in registrant's email
- `title`: the event title

For example: `?paid=1&email=marija.new.1992%40gmail.com&title=Event%20title`.
The browser URL-encodes parameter values. A webhook failure does not undo or
misreport the completed registration.

Statistics use Supabase RPCs. The chart groups all event records by creation
hour in `Europe/Vilnius` and displays all 24 hours, including zero-count hours.
Summary cards use the signed-in user's hosted events and their confirmed
signups.

## Local development and checks

Start Vite:

```sh
npm run dev
```

Available project scripts:

```sh
npm run lint
npm run build
npm run preview
```

## Deploy to Vercel

1. Push the project to GitHub and import it into Vercel.
2. Use the Vite build command `npm run build` and output directory `dist`.
3. Set `VITE_SUPABASE_URL` and either `VITE_SUPABASE_PUBLISHABLE_KEY` or `VITE_SUPABASE_ANON_KEY` in Vercel. Set `VITE_ZAPIER_WEBHOOK_URL` if signup notifications are needed.
4. Deploy. `vercel.json` rewrites nested app paths to `index.html` for React Router navigation and refreshes.
5. Add the production Vercel URL to Supabase Auth's site URL and allowed redirect URLs.

No custom backend, Edge Functions, payments, image uploads, or realtime
subscriptions are used.
