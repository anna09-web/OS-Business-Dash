-- Business OS — Phase 2: Manager Agent + task queue support
-- Per-agent budget/rate-limit caps, retry tracking on tasks, and an index
-- for the worker's polling query.

alter table public.tasks
  add column if not exists retry_count smallint not null default 0;

create index if not exists tasks_pending_poll_idx
  on public.tasks (priority, created_at)
  where status = 'pending';

-- ── agent_budgets (per-agent daily action/token caps) ───────────────────────
create table if not exists public.agent_budgets (
  agent text primary key,
  unit text not null check (unit in ('manager', 'reselling', 'agency', 'trading')),
  max_actions_per_day integer,
  actions_today integer not null default 0,
  max_tokens_per_day integer,
  tokens_today integer not null default 0,
  period_start date not null default current_date,
  updated_at timestamptz not null default now()
);

comment on table public.agent_budgets is 'One row per specialist agent. The Manager Agent worker (service role) enforces these caps before dispatching a task; a null max_* means uncapped.';

alter table public.agent_budgets enable row level security;

create policy "agent_budgets: any authenticated user can read" on public.agent_budgets
  for select using (auth.role() = 'authenticated');

create policy "agent_budgets: owner can write" on public.agent_budgets
  for all using (public.is_owner());
