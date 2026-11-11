# JoinEvent

JoinEvent is a responsive event management dashboard frontend built with React, Vite, and JavaScript. The current release is a UI starter: routes and reusable components are in place, while authentication and event workflows are not implemented.

## Requirements

- Node.js 20.19+ or 22.12+
- npm

## Getting started

1. Install dependencies:

   ```bash
   npm install
   ```

2. Create a local environment file:

   ```bash
   cp .env.example .env
   ```

   Set `VITE_SUPABASE_URL` and either `VITE_SUPABASE_PUBLISHABLE_KEY` or `VITE_SUPABASE_ANON_KEY` to your Supabase project values. Both key formats are supported; the publishable key takes precedence if both are present. Restart Vite after changing `.env`.

3. Start the development server:

   ```bash
   npm run dev
   ```

Vite prints the local URL in the terminal. To produce and preview a production build, run `npm run build` and `npm run preview`.

## Authentication

Registration and login use Supabase Auth directly. Supabase persists the
session in the browser, and the database trigger creates the matching profile
row from the registration name metadata. The frontend does not insert profile
rows itself. Depending on the Supabase project's email confirmation settings,
registration may redirect to the login screen with a message to confirm email.
The overview, statistics, and profile routes require authentication; the
events list remains public.

## Routes

- `/` — overview dashboard
- `/events` — event list placeholder
- `/statistics` — statistics placeholder
- `/profile` — profile settings placeholder
- `/login` — sign-in placeholder

## Supabase database

The database schema, RLS policies, RPC functions, seed instructions, and exact
SQL Editor execution order are documented in [database/README.md](database/README.md).

## Project structure

```text
src/
  components/
    common/       Loading, ErrorMessage, EmptyState, ConfirmDialog
    dashboard/    Dashboard-specific reusable components
    layout/       Application shell and navigation
  lib/            Supabase client initialization
  pages/          Route-level page components
```

## Scripts

- `npm run dev` — start Vite in development mode
- `npm run build` — create the production bundle in `dist/`
- `npm run preview` — serve the production bundle locally
- `npm run lint` — run ESLint
