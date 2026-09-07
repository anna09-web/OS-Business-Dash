-- Tiered business areas: Dropshipping is unlocked from day one; every other
-- area is locked until it earns its unlock — either a fixed date (Crypto &
-- Trading, gated to 2027-09-17) or a manual owner decision once a milestone
-- (e.g. a proven, scaled Dropshipping store) is judged to be met.

create table public.business_areas (
  slug text primary key,
  name text not null,
  locked boolean not null default true,
  unlock_at timestamptz,
  sort_order smallint not null default 0,
  updated_at timestamptz not null default now()
);

comment on table public.business_areas is 'One row per business tier. locked=false means manually unlocked; unlock_at is a hard, date-based unlock that applies regardless of locked (used for the Crypto & Trading age gate).';

insert into public.business_areas (slug, name, locked, unlock_at, sort_order) values
  ('dropshipping', 'Dropshipping', false, null, 1),
  ('crypto_trading', 'Passives Einkommen (Crypto & Trading)', true, '2027-09-17T00:00:00+02:00', 2),
  ('personal_brand', 'Personal Brand', true, null, 3),
  ('courses', 'Kurse verkaufen', true, null, 4),
  ('startup', 'Startup', true, null, 5);

alter table public.business_areas enable row level security;

create policy "business_areas: any authenticated user can read" on public.business_areas
  for select using (auth.role() = 'authenticated');

create policy "business_areas: owner can update" on public.business_areas
  for update using (public.is_owner());

-- ── revenue milestone (Dropshipping → 500k€ target) ────────────────────────
alter table public.system_settings add column if not exists revenue_goal numeric(12, 2) not null default 500000;

-- ── tag transactions & tasks to a business area (nullable = general) ──────
alter table public.transactions add column if not exists business_area text references public.business_areas (slug);
alter table public.tasks add column if not exists business_area text references public.business_areas (slug);

create index if not exists transactions_business_area_idx on public.transactions (business_area);
create index if not exists tasks_business_area_idx on public.tasks (business_area);
