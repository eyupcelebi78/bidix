-- Customers: tracked by unique tax number per user, linked to quotes.

create table if not exists public.customers (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  name        text not null,
  tax_no      text not null,
  created_at  timestamptz default now(),
  unique (user_id, tax_no)
);

create index if not exists idx_customers_user_id on public.customers (user_id);
create index if not exists idx_customers_tax_no on public.customers (user_id, tax_no);

alter table public.quotes
  add column if not exists customer_id uuid references public.customers (id) on delete set null;

create index if not exists idx_quotes_customer_id on public.quotes (customer_id);

alter table public.customers enable row level security;

create policy "customers_select_own" on public.customers
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "customers_insert_own" on public.customers
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "customers_update_own" on public.customers
  for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "customers_delete_own" on public.customers
  for delete to authenticated using ((select auth.uid()) = user_id);
