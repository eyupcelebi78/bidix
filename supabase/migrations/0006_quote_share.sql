-- Public quote links + customer contact for WhatsApp / e-posta.

alter table public.customers
  add column if not exists phone text,
  add column if not exists email text;

alter table public.quotes
  add column if not exists share_token text,
  add column if not exists status text not null default 'draft',
  add column if not exists sent_via text,
  add column if not exists sent_at timestamptz,
  add column if not exists viewed_at timestamptz,
  add column if not exists responded_at timestamptz;

update public.quotes
set share_token = encode(gen_random_bytes(16), 'hex')
where share_token is null;

alter table public.quotes
  alter column share_token set default encode(gen_random_bytes(16), 'hex'),
  alter column share_token set not null;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'quotes_share_token_key'
  ) then
    alter table public.quotes add constraint quotes_share_token_key unique (share_token);
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'quotes_status_check'
  ) then
    alter table public.quotes add constraint quotes_status_check
      check (status in ('draft', 'sent', 'viewed', 'accepted', 'rejected'));
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'quotes_sent_via_check'
  ) then
    alter table public.quotes add constraint quotes_sent_via_check
      check (sent_via is null or sent_via in ('whatsapp', 'email'));
  end if;
end $$;

create index if not exists idx_quotes_share_token on public.quotes (share_token);
create index if not exists idx_quotes_status on public.quotes (user_id, status);

create or replace function public.get_public_quote(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  q public.quotes;
  result jsonb;
begin
  if p_token is null or length(p_token) < 16 then
    return null;
  end if;

  select * into q from public.quotes where share_token = p_token;
  if not found then
    return null;
  end if;

  if q.status in ('draft', 'sent') then
    update public.quotes
      set status = 'viewed',
          viewed_at = coalesce(viewed_at, now())
      where id = q.id
        and status in ('draft', 'sent');
  elsif q.viewed_at is null then
    update public.quotes
      set viewed_at = now()
      where id = q.id;
  end if;

  select jsonb_build_object(
    'quote', jsonb_build_object(
      'quote_no', q.quote_no,
      'customer_name', q.customer_name,
      'customer_company', q.customer_company,
      'currency', q.currency,
      'subtotal', q.subtotal,
      'vat_total', q.vat_total,
      'grand_total', q.grand_total,
      'pdf_url', q.pdf_url,
      'created_at', q.created_at,
      'status', (select status from public.quotes where id = q.id)
    ),
    'company', (
      select jsonb_build_object(
        'title', c.title,
        'phone', c.phone,
        'email', c.email
      )
      from public.companies c
      where c.id = q.company_id
    ),
    'items', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'product_name', i.product_name,
        'product_brand', i.product_brand,
        'product_unit', i.product_unit,
        'quantity', i.quantity,
        'unit_price_effective', i.unit_price_effective,
        'line_total', i.line_total
      ) order by i.sort_order), '[]'::jsonb)
      from public.quote_items i
      where i.quote_id = q.id
    )
  ) into result;

  return result;
end;
$$;

create or replace function public.respond_public_quote(p_token text, p_action text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  q public.quotes;
begin
  if p_token is null or length(p_token) < 16 then
    return jsonb_build_object('ok', false, 'error', 'invalid');
  end if;
  if p_action not in ('accepted', 'rejected') then
    return jsonb_build_object('ok', false, 'error', 'invalid');
  end if;

  select * into q from public.quotes where share_token = p_token;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'not_found');
  end if;
  if q.status in ('accepted', 'rejected') then
    return jsonb_build_object('ok', true, 'status', q.status);
  end if;

  update public.quotes
    set status = p_action,
        viewed_at = coalesce(viewed_at, now()),
        responded_at = now()
    where id = q.id;

  return jsonb_build_object('ok', true, 'status', p_action);
end;
$$;

revoke all on function public.get_public_quote(text) from public;
revoke all on function public.respond_public_quote(text, text) from public;
grant execute on function public.get_public_quote(text) to anon, authenticated;
grant execute on function public.respond_public_quote(text, text) to anon, authenticated;
