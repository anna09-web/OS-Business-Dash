# Business OS

A command-center dashboard for running three businesses from one login:
**Reselling** (Vinted/Depop), **AI Agency**, and **Day Trading** (paper-first).
A Manager Agent (Phase 2+) routes tasks to specialist agents; every
financial or client-facing action goes through a human approval queue.

## Stack

Next.js 16 (App Router) + TypeScript + Tailwind CSS v4 + hand-built
shadcn/ui-style components, backed by Supabase (Postgres + Auth + Realtime).

## Build status

- [x] **Phase 1 — Foundation**: auth, DB schema, dashboard shell, RBAC
- [ ] Phase 2 — Manager Agent + task queue
- [ ] Phase 3 — Reselling unit
- [ ] Phase 4 — Agency unit
- [ ] Phase 5 — Trading unit (paper only)
- [ ] Phase 6 — Polish
- [ ] Phase 7 — Live trading gate (opt-in, later)

## Getting started

1. Create a [Supabase](https://supabase.com) project.
2. Copy `.env.local.example` to `.env.local` and fill in
   `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` from
   Project Settings → API.
3. Run the migration in `supabase/migrations/0001_foundation.sql` against
   your project (via the SQL editor or the Supabase CLI).
4. Enable **Email** auth and, if you want the login form to also support an
   authenticator app, enable **TOTP** under Auth → MFA in the dashboard —
   the Settings page has a 2FA enrollment flow built in.
5. Install dependencies and run the dev server:

   ```bash
   npm install
   npm run dev
   ```

The first account you sign up with becomes the **Owner**; every account
after that is a read-only **Viewer** until the owner promotes it.

## Schema

`supabase/migrations/0001_foundation.sql` creates the shared foundation used
by every unit: `profiles` (RBAC), `system_settings` (kill switch + trading
mode), `tasks`, `agent_logs` (append-only audit trail), and `approvals`
(human-in-the-loop gate). Row-level security restricts writes to the owner
role; reads are open to any authenticated user.

## A note on marketplaces

Vinted and Depop don't publish an official seller API the way eBay/Amazon/
Shopify do, so the Reselling unit's inventory sync (Phase 3) will need a
different approach than the original spec assumed — most likely manual/CSV
import rather than a live API integration.
