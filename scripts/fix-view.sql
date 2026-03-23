DROP VIEW IF EXISTS public.sieg_fin_workspaces;

CREATE OR REPLACE VIEW public.sieg_fin_workspaces AS
SELECT
  id,
  nome as name,
  slug,
  id as tenant_id,
  segment,
  logo_url,
  primary_color,
  status,
  active,
  settings,
  database_key,
  created_at,
  updated_at
FROM public.sieg_fin_empresas;

GRANT SELECT ON public.sieg_fin_workspaces TO anon, authenticated, service_role;
