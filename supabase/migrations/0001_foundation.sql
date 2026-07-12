-- Business OS — Phase 1 foundation schema
-- Profiles (RBAC), shared task queue, audit log, approval queue, system settings (kill switch).

-- ── profiles ────────────────────────────────────────────────────────────────
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  full_name text,
  role text not null default 'viewer' check (role in ('owner', 'viewer')),
  created_at timestamptz not null default now()
);

comment on table public.profiles is 'One row per authenticated user. First user to sign up becomes owner; everyone after is a read-only viewer until promoted.';

create or replace function public.is_owner()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.profiles where id = auth.uid() and role = 'owner'
  );
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, role)
  values (
    new.id,
    new.email,
    case when exists (select 1 from public.profiles) then 'viewer' else 'owner' end
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

alter table public.profiles enable row level security;

create policy "profiles: self or owner can read" on public.profiles
  for select using (id = auth.uid() or public.is_owner());

create policy "profiles: owner can update roles" on public.profiles
  for update using (public.is_owner());

create policy "profiles: self can update own name" on public.profiles
  for update using (id = auth.uid());

-- ── system_settings (singleton: kill switch + trading mode) ────────────────
create table if not exists public.system_settings (
  id smallint primary key default 1 check (id = 1),
  agents_paused boolean not null default false,
  paused_at timestamptz,
  paused_by uuid references public.profiles (id),
  trading_mode text not null default 'paper' check (trading_mode in ('paper', 'live')),
  updated_at timestamptz not null default now()
);

comment on table public.system_settings is 'Singleton row. agents_paused is the global kill switch; trading_mode gates paper vs live trading and defaults to paper.';

insert into public.system_settings (id) values (1) on conflict (id) do nothing;

alter table public.system_settings enable row level security;

create policy "system_settings: any authenticated user can read" on public.system_settings
  for select using (auth.role() = 'authenticated');

create policy "system_settings: owner can update" on public.system_settings
  for update using (public.is_owner());

-- ── tasks (shared queue across Manager Agent + specialist agents) ──────────
create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  unit text not null check (unit in ('manager', 'reselling', 'agency', 'trading')),
  type text not null,
  status text not null default 'pending' check (status in ('pending', 'in_progress', 'completed', 'failed', 'escalated')),
  assigned_agent text,
  priority smallint not null default 3,
  payload jsonb not null default '{}'::jsonb,
  result jsonb,
  error text,
  due_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists tasks_unit_status_idx on public.tasks (unit, status);

alter table public.tasks enable row level security;

create policy "tasks: any authenticated user can read" on public.tasks
  for select using (auth.role() = 'authenticated');

create policy "tasks: owner can write" on public.tasks
  for insert with check (public.is_owner());

create policy "tasks: owner can update" on public.tasks
  for update using (public.is_owner());

create policy "tasks: owner can delete" on public.tasks
  for delete using (public.is_owner());

-- ── agent_logs (immutable audit trail) ──────────────────────────────────────
create table if not exists public.agent_logs (
  id uuid primary key default gen_random_uuid(),
  agent text not null,
  unit text not null check (unit in ('manager', 'reselling', 'agency', 'trading')),
  task_id uuid references public.tasks (id) on delete set null,
  action text not null,
  detail jsonb not null default '{}'::jsonb,
  level text not null default 'info' check (level in ('info', 'warn', 'error')),
  created_at timestamptz not null default now()
);

create index if not exists agent_logs_created_at_idx on public.agent_logs (created_at desc);

alter table public.agent_logs enable row level security;

create policy "agent_logs: any authenticated user can read" on public.agent_logs
  for select using (auth.role() = 'authenticated');

create policy "agent_logs: owner can write" on public.agent_logs
  for insert with check (public.is_owner());

-- no update/delete policy: the audit log is append-only, even for the owner.

-- ── approvals (human-in-the-loop gate for external/financial actions) ──────
create table if not exists public.approvals (
  id uuid primary key default gen_random_uuid(),
  unit text not null check (unit in ('manager', 'reselling', 'agency', 'trading')),
  kind text not null,
  task_id uuid references public.tasks (id) on delete set null,
  title text not null,
  summary text,
  before jsonb,
  after jsonb,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  requested_by text not null,
  decided_by uuid references public.profiles (id),
  decided_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists approvals_status_idx on public.approvals (status);

alter table public.approvals enable row level security;

create policy "approvals: any authenticated user can read" on public.approvals
  for select using (auth.role() = 'authenticated');

create policy "approvals: owner can write" on public.approvals
  for insert with check (public.is_owner());

create policy "approvals: owner can decide" on public.approvals
  for update using (public.is_owner());
