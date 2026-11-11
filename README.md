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

   Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` to your Supabase project values when you are ready to connect the frontend. The current UI does not require Supabase credentials.

3. Start the development server:

   ```bash
   npm run dev
   ```

Vite prints the local URL in the terminal. To produce and preview a production build, run `npm run build` and `npm run preview`.

## Routes

- `/` — overview dashboard
- `/events` — event list placeholder
- `/statistics` — statistics placeholder
- `/profile` — profile settings placeholder
- `/login` — sign-in placeholder

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
