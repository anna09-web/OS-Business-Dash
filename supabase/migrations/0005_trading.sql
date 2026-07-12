-- Business OS — Phase 5: Day Trading unit (paper only)
-- Risk rules are hard-coded constraints the Risk Manager Agent evaluates in
-- code (src/worker/trading/risk-manager.ts), not something an LLM
-- interprets — the veto cannot be talked around by a prompt. This table is
-- just where the owner configures the numbers; system_settings.trading_mode
-- (Phase 1) already gates paper vs live and defaults to paper.

create table if not exists public.trading_risk_rules (
  id smallint primary key default 1 check (id = 1),
  starting_equity numeric(12, 2) not null default 10000,
  max_daily_loss_pct numeric(5, 2) not null default 3,
  max_drawdown_pct numeric(5, 2) not null default 10,
  max_position_size numeric(12, 2) not null default 1000,
  max_concurrent_trades smallint not null default 3,
  updated_at timestamptz not null default now()
);

comment on table public.trading_risk_rules is 'Singleton. Hard limits the Risk Manager Agent enforces on every proposed trade — max position size, max concurrent open trades, max daily loss %, max drawdown % from peak equity.';

insert into public.trading_risk_rules (id) values (1) on conflict (id) do nothing;

alter table public.trading_risk_rules enable row level security;

create policy "trading_risk_rules: any authenticated user can read" on public.trading_risk_rules
  for select using (auth.role() = 'authenticated');

create policy "trading_risk_rules: owner can update" on public.trading_risk_rules
  for update using (public.is_owner());

-- ── trades (the trade journal) ──────────────────────────────────────────────
create table if not exists public.trades (
  id uuid primary key default gen_random_uuid(),
  symbol text not null,
  side text not null check (side in ('long', 'short')),
  quantity numeric(12, 4) not null,
  entry_price numeric(12, 4) not null,
  exit_price numeric(12, 4),
  entry_at timestamptz not null default now(),
  exit_at timestamptz,
  status text not null default 'open' check (status in ('open', 'closed', 'vetoed')),
  rationale_entry text,
  rationale_exit text,
  pnl numeric(12, 2),
  veto_reason text,
  alpaca_order_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists trades_status_idx on public.trades (status);
create index if not exists trades_entry_at_idx on public.trades (entry_at);

alter table public.trades enable row level security;

create policy "trades: any authenticated user can read" on public.trades
  for select using (auth.role() = 'authenticated');

create policy "trades: owner can write" on public.trades
  for all using (public.is_owner());
