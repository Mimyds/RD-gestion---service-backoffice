create table public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  issuer text not null default '', issuer_address text not null default '', issuer_details text not null default '',
  updated_at timestamptz not null default now()
);
create table public.invoices (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  number text not null, status text not null default 'brouillon' check (status in ('brouillon','envoyée','payée')),
  payload jsonb not null, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique (owner_id, number)
);
create index invoices_owner_created_idx on public.invoices (owner_id, created_at desc);
alter table public.profiles enable row level security;
alter table public.invoices enable row level security;
create policy "Owner manages profile" on public.profiles for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "Owner manages invoices" on public.invoices for all to authenticated using ((select auth.uid()) = owner_id) with check ((select auth.uid()) = owner_id);
