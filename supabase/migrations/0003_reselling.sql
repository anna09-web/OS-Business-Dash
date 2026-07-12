-- Business OS — Phase 3: Reselling unit
-- Vinted/Depop have no seller API, so listings are drafted here and posted
-- manually; "publishing" in this system just means the draft is ready to
-- copy onto the marketplace and marked active once it's live there.

create table if not exists public.suppliers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  contact text,
  notes text,
  created_at timestamptz not null default now()
);

alter table public.suppliers enable row level security;

create policy "suppliers: any authenticated user can read" on public.suppliers
  for select using (auth.role() = 'authenticated');

create policy "suppliers: owner can write" on public.suppliers
  for all using (public.is_owner());

-- ── inventory_items (physical stock, marketplace-agnostic) ─────────────────
create table if not exists public.inventory_items (
  id uuid primary key default gen_random_uuid(),
  sku text not null unique,
  title text not null,
  brand text,
  category text,
  condition text,
  description text,
  cost_price numeric(10, 2) not null default 0,
  supplier_id uuid references public.suppliers (id) on delete set null,
  quantity_on_hand integer not null default 1,
  reorder_point integer,
  photo_url text,
  status text not null default 'sourcing' check (status in ('sourcing', 'listed', 'sold', 'delisted')),
  acquired_at date not null default current_date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists inventory_items_status_idx on public.inventory_items (status);

alter table public.inventory_items enable row level security;

create policy "inventory_items: any authenticated user can read" on public.inventory_items
  for select using (auth.role() = 'authenticated');

create policy "inventory_items: owner can write" on public.inventory_items
  for all using (public.is_owner());

-- ── listings (one row per marketplace posting of an item) ──────────────────
create table if not exists public.listings (
  id uuid primary key default gen_random_uuid(),
  inventory_item_id uuid not null references public.inventory_items (id) on delete cascade,
  marketplace text not null check (marketplace in ('vinted', 'depop')),
  external_url text,
  title text,
  description text,
  category text,
  keywords text[],
  list_price numeric(10, 2),
  currency text not null default 'GBP',
  competitor_price numeric(10, 2),
  min_margin_pct numeric(5, 2) not null default 20,
  max_discount_pct numeric(5, 2) not null default 15,
  status text not null default 'draft' check (status in ('draft', 'pending_review', 'active', 'sold', 'delisted')),
  listed_at timestamptz,
  sold_at timestamptz,
  sold_price numeric(10, 2),
  marketplace_fee numeric(10, 2),
  shipping_cost numeric(10, 2),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists listings_inventory_item_idx on public.listings (inventory_item_id);
create index if not exists listings_status_idx on public.listings (status);

alter table public.listings enable row level security;

create policy "listings: any authenticated user can read" on public.listings
  for select using (auth.role() = 'authenticated');

create policy "listings: owner can write" on public.listings
  for all using (public.is_owner());

-- ── buyer_messages (Support Agent input/output; no live inbox API) ─────────
create table if not exists public.buyer_messages (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings (id) on delete cascade,
  from_buyer text not null,
  draft_reply text,
  is_negative boolean,
  status text not null default 'pending_draft' check (status in ('pending_draft', 'drafted', 'sent')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists buyer_messages_listing_idx on public.buyer_messages (listing_id);

alter table public.buyer_messages enable row level security;

create policy "buyer_messages: any authenticated user can read" on public.buyer_messages
  for select using (auth.role() = 'authenticated');

create policy "buyer_messages: owner can write" on public.buyer_messages
  for all using (public.is_owner());
