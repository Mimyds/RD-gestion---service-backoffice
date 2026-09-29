-- Evolve the initial invoice-only schema without losing existing data.
-- `public.users` stores the single business configuration for each Auth user.
alter table public.profiles rename to users;

alter table public.users
  rename column user_id to id;

alter table public.users
  add column email text,
  add column phone text,
  add column siret text,
  add column vat_number text,
  add column bank_details text,
  add column legal_mentions text,
  add column invoice_template jsonb not null default '{}'::jsonb,
  add column letter_template jsonb not null default '{}'::jsonb,
  add column created_at timestamptz not null default now(),
  add constraint users_invoice_template_object check (jsonb_typeof(invoice_template) = 'object'),
  add constraint users_letter_template_object check (jsonb_typeof(letter_template) = 'object');

-- Ensure every existing and future Auth account has its business settings row.
insert into public.users (id)
select id from auth.users
on conflict (id) do nothing;

create or replace function public.create_user_settings()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.users (id) values (new.id)
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger auth_user_created
after insert on auth.users
for each row execute function public.create_user_settings();

drop policy "Owner manages profile" on public.users;
create policy "User manages own settings"
  on public.users for all to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

create table public.clients (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  type text not null default 'entreprise' check (type in ('entreprise', 'particulier')),
  company_name text,
  first_name text,
  last_name text,
  email text,
  phone text,
  address_line1 text,
  address_line2 text,
  postal_code text,
  city text,
  country text not null default 'France',
  siret text,
  vat_number text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, id),
  check (
    (type = 'entreprise' and nullif(btrim(company_name), '') is not null)
    or
    (type = 'particulier' and (
      nullif(btrim(first_name), '') is not null
      or nullif(btrim(last_name), '') is not null
    ))
  )
);

create index clients_user_name_idx
  on public.clients (user_id, company_name, last_name, first_name);

alter table public.clients enable row level security;
create policy "User manages own clients"
  on public.clients for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- Keep invoice dates, totals, lines and document snapshots inside payload.
alter table public.invoices rename column owner_id to user_id;
alter index public.invoices_owner_created_idx rename to invoices_user_created_idx;

alter table public.invoices
  add column client_id uuid,
  add constraint invoices_payload_object check (jsonb_typeof(payload) = 'object'),
  add constraint invoices_user_client_fk
    foreign key (user_id, client_id)
    references public.clients(user_id, id)
    on delete set null (client_id);

create index invoices_client_idx
  on public.invoices (user_id, client_id)
  where client_id is not null;

drop policy "Owner manages invoices" on public.invoices;
create policy "User manages own invoices"
  on public.invoices for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create table public.letters (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  client_id uuid,
  subject text not null,
  status text not null default 'brouillon'
    check (status in ('brouillon', 'finalisé', 'envoyé', 'archivé')),
  payload jsonb not null default '{}'::jsonb
    check (jsonb_typeof(payload) = 'object'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint letters_user_client_fk
    foreign key (user_id, client_id)
    references public.clients(user_id, id)
    on delete set null (client_id)
);

create index letters_user_created_idx
  on public.letters (user_id, created_at desc);
create index letters_client_idx
  on public.letters (user_id, client_id)
  where client_id is not null;

alter table public.letters enable row level security;
create policy "User manages own letters"
  on public.letters for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- Keep updated_at reliable for writes made outside the application API too.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger users_set_updated_at
before update on public.users
for each row execute function public.set_updated_at();

create trigger clients_set_updated_at
before update on public.clients
for each row execute function public.set_updated_at();

create trigger invoices_set_updated_at
before update on public.invoices
for each row execute function public.set_updated_at();

create trigger letters_set_updated_at
before update on public.letters
for each row execute function public.set_updated_at();
