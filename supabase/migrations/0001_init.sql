-- 0001_init.sql
-- Initial schema for the Bidix teklif (quote) management app.
-- Reconstructed from the application code (src/lib/database.types.ts and src/**).
--
-- Tables (all user-scoped via user_id -> auth.users):
--   products, quote_templates, signature_profiles, companies, quotes,
--   quote_items, demo_stats
-- Every user-owned table has RLS enabled with owner-only access.

-- =========================================================================
-- products
-- =========================================================================
create table if not exists public.products (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  name        text not null,
  brand       text,
  unit        text not null default 'Adet',
  unit_price  numeric not null default 0,
  vat_rate    numeric not null default 20,
  created_at  timestamptz default now()
);

-- =========================================================================
-- quote_templates
-- =========================================================================
create table if not exists public.quote_templates (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid not null references auth.users (id) on delete cascade,
  name               text not null,
  base_template_key  text not null default 'modern',
  config_json        jsonb,
  preview_image_url  text,
  preview_pdf_url    text,
  created_at         timestamptz default now()
);

-- =========================================================================
-- signature_profiles
-- =========================================================================
create table if not exists public.signature_profiles (
  id                   uuid primary key default gen_random_uuid(),
  user_id              uuid not null references auth.users (id) on delete cascade,
  signer_name          text not null,
  signer_title         text not null,
  signature_image_url  text,
  stamp_image_url      text,
  created_at           timestamptz default now()
);

-- =========================================================================
-- companies
-- =========================================================================
create table if not exists public.companies (
  id                    uuid primary key default gen_random_uuid(),
  user_id               uuid not null references auth.users (id) on delete cascade,
  title                 text not null,
  address               text,
  tax_office            text,
  tax_no                text,
  phone                 text,
  email                 text,
  iban                  text,
  logo_url              text,
  multiplier            numeric not null default 1,
  default_template_id   uuid references public.quote_templates (id) on delete set null,
  signature_profile_id  uuid references public.signature_profiles (id) on delete set null,
  created_at            timestamptz default now()
);

-- =========================================================================
-- quotes
-- =========================================================================
create table if not exists public.quotes (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references auth.users (id) on delete cascade,
  company_id        uuid not null references public.companies (id) on delete cascade,
  template_id       uuid references public.quote_templates (id) on delete set null,
  quote_no          text,
  customer_name     text,
  customer_company  text,
  currency          text not null default 'TRY',
  subtotal          numeric not null default 0,
  vat_total         numeric not null default 0,
  grand_total       numeric not null default 0,
  pdf_url           text,
  created_at        timestamptz default now()
);

-- =========================================================================
-- quote_items
-- =========================================================================
create table if not exists public.quote_items (
  id                     uuid primary key default gen_random_uuid(),
  quote_id               uuid not null references public.quotes (id) on delete cascade,
  product_id             uuid references public.products (id) on delete set null,
  product_name           text not null,
  product_brand          text,
  product_unit           text not null default 'Adet',
  quantity               numeric not null default 1,
  unit_price_effective   numeric not null,
  vat_rate               numeric not null default 20,
  line_subtotal          numeric not null,
  line_vat               numeric not null,
  line_total             numeric not null,
  sort_order             integer,
  created_at             timestamptz default now()
);

-- =========================================================================
-- demo_stats  (public demo offer generation counter, no auth required)
-- =========================================================================
create table if not exists public.demo_stats (
  id          uuid primary key default gen_random_uuid(),
  created_at  timestamptz default now()
);

-- Helpful indexes on foreign keys / lookups
create index if not exists idx_products_user_id             on public.products (user_id);
create index if not exists idx_quote_templates_user_id      on public.quote_templates (user_id);
create index if not exists idx_signature_profiles_user_id   on public.signature_profiles (user_id);
create index if not exists idx_companies_user_id            on public.companies (user_id);
create index if not exists idx_companies_default_template   on public.companies (default_template_id);
create index if not exists idx_companies_signature_profile  on public.companies (signature_profile_id);
create index if not exists idx_quotes_user_id               on public.quotes (user_id);
create index if not exists idx_quotes_company_id            on public.quotes (company_id);
create index if not exists idx_quotes_template_id           on public.quotes (template_id);
create index if not exists idx_quote_items_quote_id         on public.quote_items (quote_id);
create index if not exists idx_quote_items_product_id       on public.quote_items (product_id);

-- =========================================================================
-- Row Level Security
-- =========================================================================
alter table public.products           enable row level security;
alter table public.quote_templates    enable row level security;
alter table public.signature_profiles enable row level security;
alter table public.companies          enable row level security;
alter table public.quotes             enable row level security;
alter table public.quote_items        enable row level security;
alter table public.demo_stats         enable row level security;

-- Owner-only policies for user-scoped tables ------------------------------

-- products
create policy "products_select_own" on public.products
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "products_insert_own" on public.products
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "products_update_own" on public.products
  for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "products_delete_own" on public.products
  for delete to authenticated using ((select auth.uid()) = user_id);

-- quote_templates
create policy "quote_templates_select_own" on public.quote_templates
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "quote_templates_insert_own" on public.quote_templates
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "quote_templates_update_own" on public.quote_templates
  for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "quote_templates_delete_own" on public.quote_templates
  for delete to authenticated using ((select auth.uid()) = user_id);

-- signature_profiles
create policy "signature_profiles_select_own" on public.signature_profiles
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "signature_profiles_insert_own" on public.signature_profiles
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "signature_profiles_update_own" on public.signature_profiles
  for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "signature_profiles_delete_own" on public.signature_profiles
  for delete to authenticated using ((select auth.uid()) = user_id);

-- companies
create policy "companies_select_own" on public.companies
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "companies_insert_own" on public.companies
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "companies_update_own" on public.companies
  for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "companies_delete_own" on public.companies
  for delete to authenticated using ((select auth.uid()) = user_id);

-- quotes
create policy "quotes_select_own" on public.quotes
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "quotes_insert_own" on public.quotes
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "quotes_update_own" on public.quotes
  for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "quotes_delete_own" on public.quotes
  for delete to authenticated using ((select auth.uid()) = user_id);

-- quote_items (ownership derived from the parent quote)
create policy "quote_items_select_own" on public.quote_items
  for select to authenticated using (
    exists (select 1 from public.quotes q where q.id = quote_id and q.user_id = (select auth.uid()))
  );
create policy "quote_items_insert_own" on public.quote_items
  for insert to authenticated with check (
    exists (select 1 from public.quotes q where q.id = quote_id and q.user_id = (select auth.uid()))
  );
create policy "quote_items_update_own" on public.quote_items
  for update to authenticated using (
    exists (select 1 from public.quotes q where q.id = quote_id and q.user_id = (select auth.uid()))
  ) with check (
    exists (select 1 from public.quotes q where q.id = quote_id and q.user_id = (select auth.uid()))
  );
create policy "quote_items_delete_own" on public.quote_items
  for delete to authenticated using (
    exists (select 1 from public.quotes q where q.id = quote_id and q.user_id = (select auth.uid()))
  );

-- demo_stats: public demo counter. Anyone (anon or authenticated) may insert.
create policy "demo_stats_insert_public" on public.demo_stats
  for insert to anon, authenticated with check (true);
create policy "demo_stats_select_public" on public.demo_stats
  for select to anon, authenticated using (true);
