# JoinEvent

JoinEvent is a responsive event management MVP. Users can discover published
events, create and manage their own events, register for events, and review
account and attendance statistics. Supabase Auth and PostgreSQL are the only
authentication and data services. Paid events only display a ticket price;
the app does not process payments.

## Technology stack

- React 19 and JavaScript (ES modules; no TypeScript)
- Vite 8
- React Router 7
- Supabase JS client and Supabase PostgreSQL/Auth
- Recharts
- Lucide React
- Vercel static hosting with SPA route rewrites

## Requirements

- Node.js 20.19+ or 22.12+
- npm
- A Supabase project
- Supabase CLI for applying migrations (optional if using the SQL Editor)

## Installation

Install dependencies from the project root:

```sh
npm install
```

Copy the environment template to a local environment file:

```sh
# macOS / Linux
cp .env.example .env.local

# Windows PowerShell
Copy-Item .env.example .env.local
```

Set the project values described below, then restart Vite after changing them.
`.env.local` is ignored by Git.

## Environment variables

The Vite client reads these public browser variables:

| Variable | Required | Description |
| --- | --- | --- |
| `VITE_SUPABASE_URL` | Yes | Supabase project URL, such as `https://<project-ref>.supabase.co` |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | One key required | Supabase publishable key. Preferred for new projects. |
| `VITE_SUPABASE_ANON_KEY` | One key required | Legacy anon/public key. Used when the publishable key is not set. |
| `VITE_ZAPIER_WEBHOOK_URL` | Optional | Zapier Catch Hook base URL called after a successful event registration. |

Only a publishable/anon key belongs in a browser application. **Never put a
`service_role` key in a `VITE_` variable or commit it to this repository.**
Database access is controlled by RLS and authenticated RPC functions.

## Supabase setup

1. Create a Supabase project and copy its Project URL and publishable (or anon)
   key into `.env.local`. Add `VITE_ZAPIER_WEBHOOK_URL` there if you want signup
   notifications sent to Zapier.
2. In Supabase Authentication settings, configure the site URL and allowed
   redirect URLs for local development and the deployed Vercel domain.
3. Apply the database migrations using one of the methods below.

### Apply migrations with the Supabase CLI

Authenticate and link the project once:

```sh
supabase login
supabase link --project-ref YOUR_PROJECT_REF
```

Push all ordered migrations:

```sh
supabase db push
```

Migration order is:

1. `supabase/migrations/20261111190000_joinevent_schema.sql` — the three
   application tables, Auth profile trigger, RPC functions, RLS policies, and
   base indexes.
2. `supabase/migrations/20261112090000_events_module.sql` — event category and
   price fields, existing-profile backfill, and public capacity-aware event
   reads.
3. `supabase/migrations/20261112100000_signup_read_functions.sql` — private
   signup history and owner-only attendee reads.

### Apply SQL manually in the Supabase SQL Editor

Run the following complete files, one at a time, in this order:

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

Do not run both the consolidated CLI schema migration and the numbered base
SQL scripts on the same fresh database. The numbered files are the manual
alternative to the consolidated base migration. The event and signup-read
migrations are required after either setup method.

For more details, see [database/README.md](database/README.md).

## Seed data

Seed data is optional and does not create or bypass Supabase Auth users:

1. Create a user through the application or Supabase Authentication.
2. Copy that Auth user's UUID.
3. In `database/06_seed/seed.sql`, replace the placeholder owner UUID
   `20000000-0000-4000-8000-000000000001` with the real UUID.
4. Run the whole seed file once in the Supabase SQL Editor.
5. Create a second Auth user to test event registration.

The Auth trigger creates a corresponding `public.users` profile. Seed events
use future dates; one is a draft and is visible only to its owner.

## Local development

Start the Vite development server:

```sh
npm run dev
```

Useful checks and preview commands:

```sh
npm run lint
npm run build
npm run preview
```

## Application routes

- `/` — authenticated dashboard
- `/events` — public event list
- `/events/new` — create an event (authenticated)
- `/events/:id` — event details and registration
- `/events/:id/edit` — edit an owned event (authenticated and RLS-protected)
- `/statistics` — authenticated event statistics
- `/profile` — authenticated profile, hosted events, and registrations
- `/login` and `/register` — Supabase Auth screens

## Database and security notes

The app has exactly three custom tables: `public.users`, `public.events`, and
`public.signups`. Authentication identities remain in Supabase's built-in
`auth.users`. RLS limits profile and signup data to the current user and
enforces event ownership. Signup changes are made only through the
`register_for_event` and `cancel_event_signup` RPC functions. The registration
RPC locks the event row while it checks capacity to handle concurrent
registrations safely.

After `register_for_event` succeeds, the browser calls the configured Zapier
Catch Hook with a GET request and these query parameters: `paid` (`1` for a
paid event, `0` for a free event), `email` (the signed-in registrant), and
`title` (the event title). For example, a hook receives
`?paid=1&email=marija.new.1992%40gmail.com&title=renginisapiemena`. The Zapier
URL is delivered to the browser as a Vite environment variable, so it is public
in the built app; use a hook dedicated to this workflow. Webhook failure does
not undo a completed registration.

The Statistics page uses `get_event_creation_stats()` for the 24-hour
Europe/Vilnius event-creation chart and `get_event_statistics(uuid)` for
confirmed signups on events owned by the signed-in user. The hourly chart
includes all historical event records.

## Deployment to Vercel

1. Push the repository to GitHub and import it into Vercel.
2. Select the Vite framework preset or configure these build settings:
   - Build command: `npm run build`
   - Output directory: `dist`
3. Add `VITE_SUPABASE_URL` and either
   `VITE_SUPABASE_PUBLISHABLE_KEY` or `VITE_SUPABASE_ANON_KEY` in the Vercel
   project Environment Variables for the environments you use. Add
   `VITE_ZAPIER_WEBHOOK_URL` to enable signup notifications.
4. Deploy. The included `vercel.json` rewrites application paths to `index.html`
   so direct navigation and refreshes on nested React Router routes work.
5. Add the production Vercel URL to Supabase Auth's site and redirect URL
   configuration.

Vercel builds the frontend with the public Supabase key. No service-role key,
custom backend, Edge Function, payment processor, file upload, or realtime
subscription is used.
