# Business OS

A general-purpose business dashboard: track revenue and expenses, manage
tasks, and control access — all from one login.

## Stack

Next.js 16 (App Router) + TypeScript + Tailwind CSS v4 + hand-built
shadcn/ui-style components, backed by Supabase (Postgres + Auth + Realtime).

## Features

- **Dashboard** — revenue, expenses, net profit, and open tasks at a glance.
- **Finances** — an income/expense ledger with a running total.
- **Tasks** — a shared to-do list with priority and due dates.
- **Settings** — account info, two-factor authentication, and a global
  automations kill switch.
- **RBAC** — the first account to sign up becomes the **Owner** (read/write);
  every account after that is a read-only **Viewer** until promoted.

## Getting started

1. Create a [Supabase](https://supabase.com) project.
2. Copy `.env.local.example` to `.env.local` and fill in
   `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` from
   Project Settings → API.
3. Run the migrations in `supabase/migrations/` in order (via the SQL editor
   or the Supabase CLI): `0001_foundation.sql` then `0002_general_dashboard.sql`.
4. Enable **Email** auth and, if you want the login form to also support an
   authenticator app, enable **TOTP** under Auth → MFA in the dashboard —
   the Settings page has a 2FA enrollment flow built in.
5. Install dependencies and run the dev server:

   ```bash
   npm install
   npm run dev
   ```

## Schema

`supabase/migrations/0001_foundation.sql` creates `profiles` (RBAC) and
`system_settings` (the automations kill switch). `0002_general_dashboard.sql`
adds `tasks` and `transactions`, the tables the dashboard reads from. Row-level
security restricts writes to the owner role; reads are open to any
authenticated user.
