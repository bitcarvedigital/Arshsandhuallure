-- Arsh Sandhu Allure — Client Portal schema
-- Migration 1/4: extensions, helper functions, tables

create extension if not exists pgcrypto;

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table public.admins (
  user_id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  created_at timestamptz not null default now()
);

create table public.clients (
  id uuid primary key default gen_random_uuid(),
  user_id uuid unique references auth.users (id) on delete set null,
  full_name text not null,
  email text not null,
  phone text,
  event_type text,
  event_date date,
  ready_time time,
  booked_time time,
  getting_ready_address text,
  services text check (services in ('hair', 'makeup', 'both')),
  party_size int,
  amount_services numeric(10,2),
  amount_travel numeric(10,2),
  amount_total numeric(10,2),
  amount_retainer numeric(10,2),
  amount_balance numeric(10,2),
  referral_source text,
  status text not null default 'invited' check (status in ('invited', 'active', 'archived')),
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index clients_email_lower_idx on public.clients (lower(email));

-- ---------------------------------------------------------------------------
-- Helper functions (security definer so RLS policies can use them without
-- recursion; defined after the tables they read)
-- ---------------------------------------------------------------------------

create or replace function public.is_admin()
returns boolean
language sql stable security definer
set search_path = public
as $$
  select exists (select 1 from public.admins where user_id = auth.uid());
$$;

create or replace function public.my_client_id()
returns uuid
language sql stable security definer
set search_path = public
as $$
  select id from public.clients where user_id = auth.uid();
$$;

grant execute on function public.is_admin() to anon, authenticated;
grant execute on function public.my_client_id() to anon, authenticated;

create table public.admin_notes (
  client_id uuid primary key references public.clients (id) on delete cascade,
  notes text not null default '',
  difficulty text check (difficulty in ('easy', 'medium', 'hard')),
  updated_at timestamptz not null default now()
);

create table public.invite_tokens (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients (id) on delete cascade,
  token_hash text not null,
  expires_at timestamptz not null default (now() + interval '7 days'),
  used_at timestamptz,
  created_at timestamptz not null default now()
);

create index invite_tokens_client_idx on public.invite_tokens (client_id);
create index invite_tokens_hash_idx on public.invite_tokens (token_hash);

-- Party share links are shareable by design (whole bridal party uses one URL),
-- revocable and expiring; the raw token is stored so the bride can re-display
-- her link. Account-creating invite tokens above stay hashed.
create table public.party_share_tokens (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients (id) on delete cascade,
  token text not null unique,
  expires_at timestamptz not null,
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);

create index party_share_tokens_client_idx on public.party_share_tokens (client_id);

create table public.party_members (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients (id) on delete cascade,
  is_bride boolean not null default false,
  name text not null default '',
  relation text not null default '',
  services text check (services in ('hair', 'makeup', 'both')),
  skin_type text check (skin_type in ('normal', 'dry', 'oily', 'combination', 'sensitive')),
  hair_length text check (hair_length in ('short', 'medium', 'long', 'extensions', 'clip_ins')),
  hair_texture text check (hair_texture in ('straight', 'wavy', 'curly', 'coily')),
  likes text not null default '',
  dislikes text not null default '',
  foundation_brand text not null default '',
  foundation_shade text not null default '',
  allergies text not null default '',
  skin_concerns text not null default '',
  photos jsonb not null default '{}'::jsonb,
  source text not null default 'bride' check (source in ('bride', 'party_link', 'admin')),
  status text not null default 'draft' check (status in ('draft', 'pending', 'approved', 'changes_requested')),
  submitted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index party_members_one_bride_idx on public.party_members (client_id) where is_bride;
create index party_members_client_idx on public.party_members (client_id);

create table public.intakes (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients (id) on delete cascade,
  version int not null default 1,
  payload jsonb not null default '{}'::jsonb,
  status text not null default 'draft' check (status in ('draft', 'pending', 'approved', 'changes_requested', 'superseded')),
  review_message text,
  submitted_at timestamptz,
  reviewed_at timestamptz,
  reviewed_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (client_id, version)
);

create table public.agreement_terms (
  id uuid primary key default gen_random_uuid(),
  version int not null unique,
  body jsonb not null,
  created_at timestamptz not null default now()
);

create table public.agreements (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients (id) on delete cascade,
  version int not null default 1,
  snapshot jsonb not null,
  terms_version int not null references public.agreement_terms (version),
  photo_consent text not null check (photo_consent in ('agrees', 'does_not_agree')),
  signed_name text not null,
  agreed boolean not null,
  signed_at timestamptz not null default now(),
  ip_address text,
  user_agent text,
  status text not null default 'signed' check (status in ('awaiting_signature', 'signed', 'approved')),
  created_at timestamptz not null default now(),
  unique (client_id, version)
);

create table public.client_documents (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients (id) on delete cascade,
  doc_type text not null check (doc_type in ('agreement', 'timeline', 'hair_guide', 'skin_guide')),
  visible boolean not null default false,
  content jsonb,
  file_path text,
  updated_at timestamptz not null default now(),
  unique (client_id, doc_type)
);

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients (id) on delete cascade,
  kind text not null check (kind in ('retainer', 'final')),
  amount numeric(10,2),
  status text not null default 'due' check (status in ('due', 'received')),
  method text not null default 'etransfer',
  received_at timestamptz,
  marked_by uuid references auth.users (id) on delete set null,
  stripe_payment_link text,
  stripe_session_id text,
  created_at timestamptz not null default now(),
  unique (client_id, kind)
);

create table public.submissions (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients (id) on delete cascade,
  kind text not null check (kind in ('agreement', 'intake', 'party_member')),
  ref_id uuid not null,
  status text not null default 'pending' check (status in ('pending', 'approved', 'changes_requested')),
  message text,
  reviewed_at timestamptz,
  reviewed_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);

create index submissions_status_idx on public.submissions (status);
create index submissions_client_idx on public.submissions (client_id);

create table public.app_settings (
  key text primary key,
  value text not null default '',
  updated_at timestamptz not null default now()
);

-- updated_at maintenance
create trigger clients_touch before update on public.clients
  for each row execute function public.touch_updated_at();
create trigger admin_notes_touch before update on public.admin_notes
  for each row execute function public.touch_updated_at();
create trigger party_members_touch before update on public.party_members
  for each row execute function public.touch_updated_at();
create trigger intakes_touch before update on public.intakes
  for each row execute function public.touch_updated_at();
create trigger client_documents_touch before update on public.client_documents
  for each row execute function public.touch_updated_at();

-- Supabase model: table grants are broad, RLS (migration 2) is the actual gate.
-- Explicit because objects created by the migration role don't inherit the
-- platform's default privileges.
grant usage on schema public to anon, authenticated, service_role;
grant all on all tables in schema public to anon, authenticated, service_role;
grant all on all sequences in schema public to anon, authenticated, service_role;
alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
