-- Sevk: ürün sevki istendi ve faturası kesildi.

alter table public.quotes
  add column if not exists dispatched_at timestamptz;

create index if not exists idx_quotes_dispatched_at
  on public.quotes (user_id, dispatched_at);
