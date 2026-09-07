-- Business Dashboard — rebuild as a general-purpose business dashboard.
-- Drops the unit/agent-specific schema (Reselling/Agency/Trading, agent_logs,
-- approvals) and replaces it with a generic tasks + transactions model.

-- ── system_settings: drop trading mode, rename kill switch ─────────────────
alter table public.system_settings drop column if exists trading_mode;
alter table public.system_settings rename column agents_paused to automations_paused;

comment on table public.system_settings is 'Singleton row. automations_paused is the global kill switch for any connected automation.';

-- ── drop agent-era tables ────────────────────────────────────────────────
drop table if exists public.approvals;
drop table if exists public.agent_logs;
drop table if exists public.tasks;

-- ── tasks (generic to-dos) ───────────────────────────────────────────────
create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  status text not null default 'todo' check (status in ('todo', 'in_progress', 'done')),
  priority text not null default 'medium' check (priority in ('low', 'medium', 'high')),
  due_date date,
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index tasks_status_idx on public.tasks (status);

alter table public.tasks enable row level security;

create policy "tasks: any authenticated user can read" on public.tasks
  for select using (auth.role() = 'authenticated');

create policy "tasks: owner can write" on public.tasks
  for insert with check (public.is_owner());

create policy "tasks: owner can update" on public.tasks
  for update using (public.is_owner());

create policy "tasks: owner can delete" on public.tasks
  for delete using (public.is_owner());

-- ── transactions (income / expense ledger) ──────────────────────────────
create table public.transactions (
  id uuid primary key default gen_random_uuid(),
  type text not null check (type in ('income', 'expense')),
  category text not null,
  description text,
  amount numeric(12, 2) not null check (amount >= 0),
  occurred_on date not null default current_date,
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now()
);

create index transactions_occurred_on_idx on public.transactions (occurred_on desc);

alter table public.transactions enable row level security;

create policy "transactions: any authenticated user can read" on public.transactions
  for select using (auth.role() = 'authenticated');

create policy "transactions: owner can write" on public.transactions
  for insert with check (public.is_owner());

create policy "transactions: owner can update" on public.transactions
  for update using (public.is_owner());

create policy "transactions: owner can delete" on public.transactions
  for delete using (public.is_owner());
