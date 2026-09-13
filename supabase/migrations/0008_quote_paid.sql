-- Payment against a dispatched quote (cari ekstre alacak).

alter table public.quotes
  add column if not exists paid_at timestamptz;
