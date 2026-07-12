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
- [x] **Phase 3 — Reselling unit**: inventory + listings + Lister/Repricer/
      Support agents, approval queue wired to real side effects
- [x] **Phase 4 — Agency unit**: client pipeline, Outreach/Content/QA/Billing
      agents, invoices
- [x] **Phase 5 — Trading unit (paper only)**: risk rules, non-overridable
      Risk Manager veto, trade journal, optional Alpaca paper integration
- [x] **Phase 6 — Polish**: live realtime updates, pending-approvals
      notification badge, CSV report exports
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

`supabase/migrations/0003_reselling.sql` adds `suppliers`, `inventory_items`,
`listings` (one row per marketplace posting of an item), and
`buyer_messages`.

`supabase/migrations/0004_agency.sql` adds `clients` (with a lead → proposal
→ active → delivered → billed pipeline status), `deliverables`,
`outreach_messages`, and `invoices`.

`supabase/migrations/0005_trading.sql` adds `trading_risk_rules` (singleton:
starting equity, max daily loss %, max drawdown %, max position size, max
concurrent trades) and `trades` (the trade journal, including vetoed
proposals).

`supabase/migrations/0006_realtime.sql` adds `agent_logs`, `approvals`, and
`tasks` to the `supabase_realtime` publication, so the live UI updates in
Phase 6 actually receive `postgres_changes` events. Row-level security still
governs which rows a given client receives over the socket, same as any
other read.

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

Every specialist agent (Lister, Repricer, Support, Outreach, Content, QA,
Billing, Strategy Runner) registers its handler into
`src/worker/registry.ts` — see the Reselling, Agency, and Trading sections
below. Any task type without a registered handler still gets escalated
automatically rather than getting stuck silently, which matters for future
units.

Pure decision logic (budget checks, retry-vs-escalate) is unit-tested
without needing a live database:

```bash
npm run test:worker
```

## Reselling unit

Vinted and Depop don't publish an official seller API the way eBay/Amazon/
Shopify do, so nothing here calls out to a marketplace directly:

- **Inventory** is managed in-app (manual entry or CSV import/export) rather
  than synced live from a marketplace.
- **Lister Agent** (`src/worker/reselling/lister-agent.ts`) drafts a title,
  description, category, price, and keywords from an inventory item —
  optionally reading a product photo (vision) — using the Claude API, and
  writes the draft to the approval queue. Approving it fills in the listing
  fields; you then copy them onto Vinted/Depop yourself and click "Mark
  active" with the live URL.
- **Repricer Agent** (`src/worker/reselling/pricing.ts`) is pure rule-based
  logic, no LLM: given a manually-entered competitor price, it suggests a
  new price bounded by a minimum margin over cost and a maximum discount per
  adjustment, and puts the suggestion in the approval queue.
- **Support Agent** (`src/worker/reselling/support-agent.ts`) drafts a reply
  to a buyer message you log manually, and flags negative sentiment for you
  to review before sending — there's no live inbox integration to send it
  automatically.

All three write to the same `approvals` table from Phase 1; approving or
rejecting from the Agents or Reselling page (`src/app/actions/approvals.ts`)
applies the change immediately — nothing here auto-publishes anything to a
marketplace.

Requires `ANTHROPIC_API_KEY` in `.env.local` for the Lister and Support
Agents (the Repricer needs nothing beyond the database). Defaults to
`claude-opus-4-8`; override with `CLAUDE_MODEL` if you want a cheaper model
for this workload.

## AI Agency unit

- **Client pipeline** (`clients.status`): lead → proposal → active →
  delivered → billed. The Agency page renders it as five columns; moving a
  client is a plain dropdown, not drag-and-drop.
- **Outreach Agent** (`src/worker/agency/outreach-agent.ts`) drafts a
  prospecting email or DM for a lead, into the approval queue.
- **Content Agent** (`content-agent.ts`) drafts a deliverable (copy, a
  brief, a report) from a title + brief you set on the deliverable.
- **Dev/QA Agent** (`qa-agent.ts`) is scoped down from the original spec —
  it reads a code/text deliverable and drafts a report (issues, suggestions)
  for you to review. It does not execute code, run tests, or open PRs; doing
  that safely needs a sandboxed execution environment and per-client repo
  access this build doesn't have yet.
- **Billing Agent** (`billing-agent.ts`) drafts an overdue-payment reminder
  once an invoice's due date has passed. Invoice creation and marking
  sent/paid are plain owner actions — no agent or approval needed for those,
  since nothing external happens until you manually email the client.

All four write to the same `approvals` table as Reselling; approving
applies the draft (fills in the outreach message, deliverable content, QA
notes, or reminder text) via the same `decideApproval` action.

## Day Trading unit (paper only)

Framed the same way the spec insists on: paper by default, and the Risk
Manager's veto is code, not a prompt, so nothing can talk it out of
enforcing the limits.

- **Risk Manager** (`src/worker/trading/risk-manager.ts`) is a pure,
  unit-tested function — `evaluateTrade(rules, accountState, proposedTrade)`
  — checked against max position size, max concurrent open trades, max
  daily loss %, and max drawdown % from peak equity. Every proposed trade
  goes through it before it's ever recorded as open.
- **Strategy Runner** (`src/worker/trading/handlers.ts`): there's no
  automated signal generation yet, because that needs your actual strategy
  rules (trend-following, mean-reversion, whatever you trade) and a live
  market feed, neither of which this build has. For now, proposing a trade
  from the Trading page *is* the Strategy Runner's input — the agent's job
  is running that proposal through the Risk Manager and journaling the
  result (open or vetoed).
- **Alpaca** (`alpaca-client.ts`) is optional and best-effort: if
  `ALPACA_API_KEY_ID` / `ALPACA_SECRET_KEY` are set, an approved trade is
  also submitted to Alpaca's paper endpoint; if not, it's still journaled
  locally as a paper simulation. A failed Alpaca call never blocks or
  retries the local trade record, since retrying could double-submit the
  order at the broker.
- **Reporter**: the end-of-day summary (win rate, average reward:risk,
  drawdown vs. limit) is computed directly from the trade journal on the
  Trading page — no separate scheduled job.
- `system_settings.trading_mode` (Phase 1) still gates paper vs. live and
  defaults to `paper`; there is no live-trading path in this build (Phase 7,
  later, opt-in only).

## Phase 6 — Polish

- **Live updates via Supabase Realtime**: the Overview activity feed, and
  the Agents page's approval queue and escalated-tasks list, subscribe to
  `postgres_changes` and update without a manual refresh — this was called
  out in the original spec's UI/UX section but not actually wired up until
  now. A small badge in the top bar shows a live pending-approvals count
  across all three units, visible from every page.
- **CSV report exports**: alongside the existing inventory export, added a
  sold-listings P/L export (Reselling), an invoices export (Agency), and a
  full trade-journal export (Trading).
- **Deliberately not built**: a demand-forecasting chart (Reselling's
  "extra feature") and a real email/Slack approval digest (from the
  Manager Agent spec). Both need data or infrastructure this build doesn't
  have yet — forecasting needs real sales history to forecast from (there
  isn't any yet, so a chart would just be empty), and a digest needs an
  email/Slack service credential nobody's configured. The in-app realtime
  badge covers the same "don't miss an approval" need without either.
