-- 0003_optimize_rls_initplan.sql
-- Performance: wrap auth.uid() in (select ...) so Postgres evaluates it once
-- per query instead of once per row (fixes the auth_rls_initplan advisor).
-- NOTE: 0001_init.sql already defines the policies in this optimized form; this
-- migration exists to bring an already-provisioned database up to date.

-- products
alter policy "products_select_own" on public.products using ((select auth.uid()) = user_id);
alter policy "products_insert_own" on public.products with check ((select auth.uid()) = user_id);
alter policy "products_update_own" on public.products using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
alter policy "products_delete_own" on public.products using ((select auth.uid()) = user_id);

-- quote_templates
alter policy "quote_templates_select_own" on public.quote_templates using ((select auth.uid()) = user_id);
alter policy "quote_templates_insert_own" on public.quote_templates with check ((select auth.uid()) = user_id);
alter policy "quote_templates_update_own" on public.quote_templates using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
alter policy "quote_templates_delete_own" on public.quote_templates using ((select auth.uid()) = user_id);

-- signature_profiles
alter policy "signature_profiles_select_own" on public.signature_profiles using ((select auth.uid()) = user_id);
alter policy "signature_profiles_insert_own" on public.signature_profiles with check ((select auth.uid()) = user_id);
alter policy "signature_profiles_update_own" on public.signature_profiles using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
alter policy "signature_profiles_delete_own" on public.signature_profiles using ((select auth.uid()) = user_id);

-- companies
alter policy "companies_select_own" on public.companies using ((select auth.uid()) = user_id);
alter policy "companies_insert_own" on public.companies with check ((select auth.uid()) = user_id);
alter policy "companies_update_own" on public.companies using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
alter policy "companies_delete_own" on public.companies using ((select auth.uid()) = user_id);

-- quotes
alter policy "quotes_select_own" on public.quotes using ((select auth.uid()) = user_id);
alter policy "quotes_insert_own" on public.quotes with check ((select auth.uid()) = user_id);
alter policy "quotes_update_own" on public.quotes using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
alter policy "quotes_delete_own" on public.quotes using ((select auth.uid()) = user_id);

-- quote_items (ownership via parent quote)
alter policy "quote_items_select_own" on public.quote_items using (exists (select 1 from public.quotes q where q.id = quote_id and q.user_id = (select auth.uid())));
alter policy "quote_items_insert_own" on public.quote_items with check (exists (select 1 from public.quotes q where q.id = quote_id and q.user_id = (select auth.uid())));
alter policy "quote_items_update_own" on public.quote_items using (exists (select 1 from public.quotes q where q.id = quote_id and q.user_id = (select auth.uid()))) with check (exists (select 1 from public.quotes q where q.id = quote_id and q.user_id = (select auth.uid())));
alter policy "quote_items_delete_own" on public.quote_items using (exists (select 1 from public.quotes q where q.id = quote_id and q.user_id = (select auth.uid())));
