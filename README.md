# Business OS

A general-purpose business dashboard: track revenue and expenses, manage
tasks, and control access — all from one login.

## Stack

Next.js 16 (App Router) + TypeScript + Tailwind CSS v4 + hand-built
shadcn/ui-style components, backed by Supabase (Postgres + Auth + Realtime).

## Features

- **Dashboard** — revenue, expenses, net profit, open tasks, and a tier
  overview of every business area at a glance.
- **Finances** — an income/expense ledger with a running total, per area.
- **Tasks** — a shared to-do list with priority and due dates, per area.
- **Business areas** — a tiered unlock system (see below).
- **Settings** — account info, two-factor authentication, and a global
  automations kill switch.
- **RBAC** — the first account to sign up becomes the **Owner** (read/write);
  every account after that is a read-only **Viewer** until promoted.

All dates and currency are formatted for Germany (Europe/Berlin, EUR).

## Business areas & unlock tiers

The business is built up in stages, tracked in `business_areas`:

| Area | Starts | Unlocks |
| --- | --- | --- |
| Dropshipping | Unlocked | — the current focus |
| Passives Einkommen (Crypto & Trading) | Locked | Automatically on **17 September 2027** (Europe/Berlin) — no manual override |
| Personal Brand | Locked | Manually, by the owner, once Dropshipping is proven out |
| Kurse verkaufen | Locked | Manually, by the owner, once Dropshipping is proven out |
| Startup | Locked | Manually, by the owner, once Dropshipping is proven out |

The Dashboard also tracks Dropshipping revenue against a €500,000 goal
(`system_settings.revenue_goal`) as a visual milestone toward opening up the
manually-unlockable areas. More areas can be added later by inserting a row
into `business_areas` and adding its metadata to
`src/lib/business-areas.ts`.

## Getting started

1. Create a [Supabase](https://supabase.com) project.
2. Copy `.env.local.example` to `.env.local` and fill in
   `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` from
   Project Settings → API.
3. Run the migrations in `supabase/migrations/` in order (via the SQL editor
   or the Supabase CLI): `0001_foundation.sql`, `0002_general_dashboard.sql`,
   then `0003_business_areas.sql`.
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
adds `tasks` and `transactions`, the tables the dashboard reads from.
`0003_business_areas.sql` adds `business_areas` (the tier/unlock system), a
`revenue_goal` column on `system_settings`, and a nullable `business_area`
tag on both `tasks` and `transactions`. Row-level security restricts writes
to the owner role; reads are open to any authenticated user.
