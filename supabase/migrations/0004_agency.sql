-- Business OS — Phase 4: AI Agency unit
-- Client pipeline, Outreach/Content/QA/Billing agent drafts. Every
-- client-facing or financial artifact is a draft here first — sending an
-- outreach message, delivering content, or emailing an invoice reminder is
-- always a manual step the owner does after approving the draft.

create table if not exists public.clients (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  contact_name text,
  contact_email text,
  status text not null default 'lead' check (status in ('lead', 'proposal', 'active', 'delivered', 'billed')),
  value numeric(10, 2),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists clients_status_idx on public.clients (status);

alter table public.clients enable row level security;

create policy "clients: any authenticated user can read" on public.clients
  for select using (auth.role() = 'authenticated');

create policy "clients: owner can write" on public.clients
  for all using (public.is_owner());

-- ── deliverables (Content Agent + QA Agent output) ──────────────────────────
create table if not exists public.deliverables (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients (id) on delete cascade,
  kind text not null default 'content' check (kind in ('content', 'code', 'other')),
  title text not null,
  brief text,
  draft_content text,
  qa_notes text,
  status text not null default 'pending_draft' check (status in ('pending_draft', 'drafted', 'approved', 'delivered')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists deliverables_client_idx on public.deliverables (client_id);

alter table public.deliverables enable row level security;

create policy "deliverables: any authenticated user can read" on public.deliverables
  for select using (auth.role() = 'authenticated');

create policy "deliverables: owner can write" on public.deliverables
  for all using (public.is_owner());

-- ── outreach_messages (Outreach Agent output) ───────────────────────────────
create table if not exists public.outreach_messages (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients (id) on delete cascade,
  channel text not null default 'email' check (channel in ('email', 'dm')),
  to_contact text,
  subject text,
  draft_body text,
  status text not null default 'pending_draft' check (status in ('pending_draft', 'drafted', 'sent')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists outreach_messages_client_idx on public.outreach_messages (client_id);

alter table public.outreach_messages enable row level security;

create policy "outreach_messages: any authenticated user can read" on public.outreach_messages
  for select using (auth.role() = 'authenticated');

create policy "outreach_messages: owner can write" on public.outreach_messages
  for all using (public.is_owner());

-- ── invoices (Billing Agent) ─────────────────────────────────────────────────
create table if not exists public.invoices (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients (id) on delete cascade,
  amount numeric(10, 2) not null,
  currency text not null default 'GBP',
  status text not null default 'draft' check (status in ('draft', 'sent', 'overdue', 'paid')),
  due_date date,
  sent_at timestamptz,
  paid_at timestamptz,
  reminder_draft text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists invoices_client_idx on public.invoices (client_id);
create index if not exists invoices_status_idx on public.invoices (status);

alter table public.invoices enable row level security;

create policy "invoices: any authenticated user can read" on public.invoices
  for select using (auth.role() = 'authenticated');

create policy "invoices: owner can write" on public.invoices
  for all using (public.is_owner());
