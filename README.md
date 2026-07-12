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
- [x] **Phase 2 — Manager Agent + task queue**: worker process, budget caps,
      retry-then-escalate, kill switch enforcement
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
3. Run the migrations in `supabase/migrations/` against your project, in
   order (via the SQL editor or the Supabase CLI).
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

`supabase/migrations/0002_manager_agent.sql` adds `agent_budgets`
(per-agent daily action/token caps) and a `retry_count` column on `tasks`.

## Manager Agent worker

The Manager Agent runs as a standalone Node process, not inside the Next.js
request cycle, per the architecture doc. It's a plan → act → observe loop:

1. Check the kill switch (`system_settings.agents_paused`) — if paused, do
   nothing this tick. Re-checked before every individual task, not just
   once per tick.
2. Fetch up to 5 pending tasks (oldest/highest-priority first).
3. Route each one via `src/worker/registry.ts` — a plain `unit:type` → agent
   lookup table. Routing is rule-based by construction (task `type` already
   determines the agent), so no LLM call is needed to decide where a task
   goes.
4. If no agent is registered for that task type yet, or the agent is over
   its daily budget, escalate it (visible on the Agents page) instead of
   running it.
5. Otherwise dispatch with a 30s timeout. On failure, retry once with a 30s
   backoff; a second failure escalates. Every decision is written to
   `agent_logs`.

Run it with:

```bash
npm run worker
```

You'll also need `SUPABASE_SERVICE_ROLE_KEY` in `.env.local` (Project
Settings → API → service_role) — the worker uses it to bypass RLS, since
it's a trusted backend process, not a user session. Never expose this key
to the browser.

Specialist agents (Lister, Repricer, Outreach, Strategy Runner, ...) don't
exist yet — they're added in Phases 3-5 by registering handlers in
`src/worker/registry.ts`. Until then, any task type without a handler gets
escalated automatically, which is exactly what you'd want: nothing silently
gets stuck.

Pure decision logic (budget checks, retry-vs-escalate) is unit-tested
without needing a live database:

```bash
npm run test:worker
```

## A note on marketplaces

Vinted and Depop don't publish an official seller API the way eBay/Amazon/
Shopify do, so the Reselling unit's inventory sync (Phase 3) will need a
different approach than the original spec assumed — most likely manual/CSV
import rather than a live API integration.
