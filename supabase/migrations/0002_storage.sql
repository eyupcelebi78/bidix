-- 0002_storage.sql
-- Storage buckets + policies for the Bidix app.
--
-- Buckets (all public, because the app reads files via getPublicUrl):
--   quotes  -> generated quote/offer PDFs
--             * authenticated users write under `${user.id}/...`
--             * public demo route writes under `demo/...` (unauthenticated)
--   logos   -> company logos (authenticated writes under `${user.id}/...`)
--   stamps  -> signature stamps (authenticated writes under `${user.id}/...`)

insert into storage.buckets (id, name, public)
values
  ('quotes', 'quotes', true),
  ('logos',  'logos',  true),
  ('stamps', 'stamps', true)
on conflict (id) do update set public = excluded.public;

-- Public read access for all three buckets --------------------------------
create policy "public_read_app_buckets" on storage.objects
  for select to anon, authenticated
  using (bucket_id in ('quotes', 'logos', 'stamps'));

-- quotes: authenticated users manage their own folder ---------------------
create policy "quotes_insert_own" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'quotes' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "quotes_update_own" on storage.objects
  for update to authenticated
  using (bucket_id = 'quotes' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'quotes' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "quotes_delete_own" on storage.objects
  for delete to authenticated
  using (bucket_id = 'quotes' and (storage.foldername(name))[1] = auth.uid()::text);

-- quotes: unauthenticated demo route writes under the `demo/` prefix -------
create policy "quotes_insert_demo" on storage.objects
  for insert to anon, authenticated
  with check (bucket_id = 'quotes' and (storage.foldername(name))[1] = 'demo');

-- logos: authenticated users manage their own folder ----------------------
create policy "logos_insert_own" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'logos' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "logos_update_own" on storage.objects
  for update to authenticated
  using (bucket_id = 'logos' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'logos' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "logos_delete_own" on storage.objects
  for delete to authenticated
  using (bucket_id = 'logos' and (storage.foldername(name))[1] = auth.uid()::text);

-- stamps: authenticated users manage their own folder ---------------------
create policy "stamps_insert_own" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'stamps' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "stamps_update_own" on storage.objects
  for update to authenticated
  using (bucket_id = 'stamps' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'stamps' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "stamps_delete_own" on storage.objects
  for delete to authenticated
  using (bucket_id = 'stamps' and (storage.foldername(name))[1] = auth.uid()::text);
