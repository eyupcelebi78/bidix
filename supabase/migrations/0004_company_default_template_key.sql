ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS default_template_key text;
UPDATE public.companies SET default_template_key = 'modern' WHERE default_template_key IS NULL;
