-- ============================================================
-- MIGRAÇÃO COMPLETA: Banco iifiijbrzcjgukjeywuf
-- Dashboard SIEG Financeiro - Zion Flux
-- Gerado em: 26/03/2026
-- ============================================================
-- RODAR NO SQL EDITOR DO SUPABASE EM ORDEM (de cima pra baixo)
-- ============================================================

-- ============================================================
-- FASE 1: AJUSTAR sieg_fin_financeiro (já existe)
-- ============================================================

ALTER TABLE public.sieg_fin_financeiro RENAME COLUMN created_at TO criado_em;
ALTER TABLE public.sieg_fin_financeiro RENAME COLUMN updated_at TO atualizado_em;
ALTER TABLE public.sieg_fin_financeiro ADD COLUMN IF NOT EXISTS observacoes TEXT;

-- ============================================================
-- FASE 2: TABELAS DE INFRAESTRUTURA
-- ============================================================

-- 2.1 Tenants (empresas/clientes)
CREATE TABLE IF NOT EXISTS public.sieg_fin_tenants_new (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  database_key TEXT DEFAULT 'sieg',
  domain TEXT,
  settings JSONB DEFAULT '{}',
  branding JSONB DEFAULT '{}',
  active BOOLEAN DEFAULT true,
  max_users INTEGER DEFAULT 50,
  max_leads INTEGER DEFAULT 10000,
  plan_type TEXT DEFAULT 'basic',
  billing_email TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.sieg_fin_tenants_new DISABLE ROW LEVEL SECURITY;

-- 2.2 Usuários do tenant
CREATE TABLE IF NOT EXISTS public.sieg_fin_tenant_users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID REFERENCES public.sieg_fin_tenants_new(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  role TEXT DEFAULT 'member',
  active BOOLEAN DEFAULT true,
  custom_permissions JSONB DEFAULT '{}',
  bloqueado BOOLEAN DEFAULT false,
  bloqueado_em TIMESTAMPTZ,
  bloqueado_por UUID,
  ultimo_acesso TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.sieg_fin_tenant_users DISABLE ROW LEVEL SECURITY;

-- 2.3 Configuração de bancos de dados
CREATE TABLE IF NOT EXISTS public.sieg_fin_database_configs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  database_key TEXT NOT NULL UNIQUE,
  url TEXT NOT NULL,
  anon_key TEXT NOT NULL,
  active BOOLEAN DEFAULT true,
  tenant_id UUID REFERENCES public.sieg_fin_tenants_new(id),
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.sieg_fin_database_configs DISABLE ROW LEVEL SECURITY;

-- 2.4 Perfis de usuários (view sobre auth.users)
CREATE OR REPLACE VIEW public.sieg_fin_perfis_usuarios AS
SELECT
  id,
  email,
  COALESCE(raw_user_meta_data->>'nome_completo', email) AS nome_completo,
  raw_user_meta_data->>'avatar_url' AS avatar_url
FROM auth.users;

GRANT SELECT ON public.sieg_fin_perfis_usuarios TO anon, authenticated;

-- 2.5 Configurações do usuário
CREATE TABLE IF NOT EXISTS public.sieg_fin_user_settings (
  user_id UUID PRIMARY KEY,
  default_workspace_id UUID,
  language TEXT DEFAULT 'pt-BR',
  theme TEXT DEFAULT 'dark'
);
ALTER TABLE public.sieg_fin_user_settings DISABLE ROW LEVEL SECURITY;

-- 2.6 Workspaces (compatibilidade com código legado)
CREATE TABLE IF NOT EXISTS public.sieg_fin_workspaces (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT,
  database TEXT DEFAULT 'sieg',
  tenant_id UUID REFERENCES public.sieg_fin_tenants_new(id),
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.sieg_fin_workspaces DISABLE ROW LEVEL SECURITY;

-- 2.7 Convites pendentes
CREATE TABLE IF NOT EXISTS public.sieg_fin_pending_invites (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID,
  tenant_id UUID REFERENCES public.sieg_fin_tenants_new(id),
  email TEXT NOT NULL,
  role TEXT DEFAULT 'member',
  token TEXT UNIQUE,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  used_at TIMESTAMPTZ,
  invited_by UUID
);
ALTER TABLE public.sieg_fin_pending_invites DISABLE ROW LEVEL SECURITY;

-- ============================================================
-- FASE 3: TABELAS DE FUNCIONALIDADES DO DASHBOARD
-- ============================================================

-- 3.1 Histórico de tags (jornada do lead)
CREATE TABLE IF NOT EXISTS public.sieg_fin_historico_tags_lead (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_id UUID,
  lead_id UUID,
  telefone TEXT,
  tag_anterior TEXT,
  tag_nova TEXT,
  estagio_anterior TEXT,
  estagio_novo TEXT,
  tempo_no_estagio_anterior NUMERIC,
  criado_em TIMESTAMPTZ DEFAULT now(),
  criado_por TEXT,
  motivo TEXT
);
ALTER TABLE public.sieg_fin_historico_tags_lead DISABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_hist_tags_empresa ON public.sieg_fin_historico_tags_lead(empresa_id);
CREATE INDEX IF NOT EXISTS idx_hist_tags_telefone ON public.sieg_fin_historico_tags_lead(telefone);

-- 3.2 Disparos (controle de envios)
CREATE TABLE IF NOT EXISTS public.sieg_fin_disparos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_id UUID,
  telefone TEXT,
  status TEXT DEFAULT 'enviado',
  criado_em TIMESTAMPTZ DEFAULT now(),
  conversas_count INTEGER DEFAULT 0
);
ALTER TABLE public.sieg_fin_disparos DISABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_disparos_empresa ON public.sieg_fin_disparos(empresa_id);
CREATE INDEX IF NOT EXISTS idx_disparos_telefone ON public.sieg_fin_disparos(telefone);

-- 3.3 KPI diário
CREATE TABLE IF NOT EXISTS public.sieg_fin_kpi_overview_daily (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID,
  day DATE,
  leads_recebidos INTEGER DEFAULT 0,
  leads_qualificados INTEGER DEFAULT 0,
  leads_followup INTEGER DEFAULT 0,
  leads_descartados INTEGER DEFAULT 0,
  investimento NUMERIC DEFAULT 0,
  cpl NUMERIC DEFAULT 0
);
ALTER TABLE public.sieg_fin_kpi_overview_daily DISABLE ROW LEVEL SECURITY;

-- 3.4 Mapeamento de tags
CREATE TABLE IF NOT EXISTS public.sieg_fin_mapeamentos_tags_tenant (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID REFERENCES public.sieg_fin_tenants_new(id),
  tag_externa TEXT NOT NULL,
  estagio_interno TEXT NOT NULL,
  rotulo_exibicao TEXT,
  descricao TEXT,
  ordem_exibicao INTEGER DEFAULT 0,
  ativo BOOLEAN DEFAULT true
);
ALTER TABLE public.sieg_fin_mapeamentos_tags_tenant DISABLE ROW LEVEL SECURITY;

-- ============================================================
-- FASE 4: TABELAS SECUNDÁRIAS
-- ============================================================

-- 4.1 Análise IA
CREATE TABLE IF NOT EXISTS public.sieg_fin_analise_ia (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID,
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  status TEXT DEFAULT 'pending',
  conversas_count INTEGER DEFAULT 0
);
ALTER TABLE public.sieg_fin_analise_ia DISABLE ROW LEVEL SECURITY;

-- 4.2 Análise de fluxos
CREATE TABLE IF NOT EXISTS public.sieg_fin_analise_fluxos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID,
  conversas_analisadas INTEGER DEFAULT 0,
  satisfacao_media NUMERIC DEFAULT 0,
  criado_em TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.sieg_fin_analise_fluxos DISABLE ROW LEVEL SECURITY;

-- 4.3 Custos de anúncios
CREATE TABLE IF NOT EXISTS public.sieg_fin_custos_anuncios_tenant (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID REFERENCES public.sieg_fin_tenants_new(id),
  day DATE,
  source TEXT,
  spend NUMERIC DEFAULT 0,
  impressions INTEGER DEFAULT 0,
  clicks INTEGER DEFAULT 0
);
ALTER TABLE public.sieg_fin_custos_anuncios_tenant DISABLE ROW LEVEL SECURITY;

-- 4.4 Contas Meta Ads
CREATE TABLE IF NOT EXISTS public.sieg_fin_meta_ads_accounts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID,
  account_id TEXT,
  account_name TEXT,
  is_active BOOLEAN DEFAULT true
);
ALTER TABLE public.sieg_fin_meta_ads_accounts DISABLE ROW LEVEL SECURITY;

-- 4.5 Auditoria do sistema
CREATE TABLE IF NOT EXISTS public.sieg_fin_auditoria_sistema (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID,
  acao TEXT,
  descricao TEXT,
  criado_em TIMESTAMPTZ DEFAULT now(),
  tabela TEXT,
  registro_id TEXT
);
ALTER TABLE public.sieg_fin_auditoria_sistema DISABLE ROW LEVEL SECURITY;

-- 4.6 Log de auditoria
CREATE TABLE IF NOT EXISTS public.sieg_fin_audit_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID,
  user_id UUID,
  user_email TEXT,
  tabela TEXT,
  registro_id TEXT,
  acao TEXT,
  dados_anteriores JSONB,
  dados_novos JSONB,
  campos_alterados TEXT[],
  descricao TEXT,
  criado_em TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.sieg_fin_audit_log DISABLE ROW LEVEL SECURITY;

-- ============================================================
-- FASE 5: RPCs (Funções do banco)
-- ============================================================

-- 5.1 Verificar se usuário é membro do workspace
CREATE OR REPLACE FUNCTION public.sieg_fin_is_workspace_member(_user_id UUID, _workspace_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.sieg_fin_tenant_users
    WHERE user_id = _user_id AND active = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5.2 Listar workspaces do usuário
CREATE OR REPLACE FUNCTION public.sieg_fin_get_user_workspaces(_user_id UUID)
RETURNS TABLE(workspace_id UUID) AS $$
BEGIN
  RETURN QUERY
  SELECT t.id AS workspace_id
  FROM public.sieg_fin_tenants_new t
  JOIN public.sieg_fin_tenant_users tu ON tu.tenant_id = t.id
  WHERE tu.user_id = _user_id AND tu.active = true AND t.active = true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5.3 Membros do workspace com detalhes
CREATE OR REPLACE FUNCTION public.sieg_fin_get_workspace_members_with_details(p_workspace_id UUID)
RETURNS TABLE(user_id UUID, role TEXT, email TEXT, nome_completo TEXT, bloqueado BOOLEAN, ultimo_acesso TIMESTAMPTZ) AS $$
BEGIN
  RETURN QUERY
  SELECT
    tu.user_id,
    tu.role,
    u.email,
    COALESCE(u.raw_user_meta_data->>'nome_completo', u.email) AS nome_completo,
    tu.bloqueado,
    tu.ultimo_acesso
  FROM public.sieg_fin_tenant_users tu
  LEFT JOIN auth.users u ON u.id = tu.user_id
  WHERE tu.tenant_id = p_workspace_id AND tu.active = true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5.4 Buscar permissões do usuário
CREATE OR REPLACE FUNCTION public.sieg_fin_get_user_permissions(_user_id UUID, _tenant_id UUID)
RETURNS JSONB AS $$
DECLARE
  perms JSONB;
BEGIN
  SELECT custom_permissions INTO perms
  FROM public.sieg_fin_tenant_users
  WHERE user_id = _user_id AND tenant_id = _tenant_id AND active = true;
  RETURN COALESCE(perms, '{}'::JSONB);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5.5 Salvar permissões do usuário
CREATE OR REPLACE FUNCTION public.sieg_fin_save_user_permissions(_user_id UUID, _tenant_id UUID, _permissions JSONB)
RETURNS VOID AS $$
BEGIN
  UPDATE public.sieg_fin_tenant_users
  SET custom_permissions = _permissions
  WHERE user_id = _user_id AND tenant_id = _tenant_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5.6 Deletar usuário completo
CREATE OR REPLACE FUNCTION public.sieg_fin_deletar_usuario_completo(usuario_id UUID)
RETURNS VOID AS $$
BEGIN
  DELETE FROM public.sieg_fin_tenant_users WHERE user_id = usuario_id;
  DELETE FROM public.sieg_fin_pending_invites WHERE invited_by = usuario_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5.7 Buscar audit logs
CREATE OR REPLACE FUNCTION public.sieg_fin_get_audit_logs(
  _tenant_id UUID,
  _limit INTEGER DEFAULT 50,
  _offset INTEGER DEFAULT 0
)
RETURNS TABLE(
  id UUID, tenant_id UUID, user_id UUID, user_email TEXT,
  tabela TEXT, registro_id TEXT, acao TEXT,
  dados_anteriores JSONB, dados_novos JSONB,
  campos_alterados TEXT[], descricao TEXT, criado_em TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT al.id, al.tenant_id, al.user_id, al.user_email,
         al.tabela, al.registro_id, al.acao,
         al.dados_anteriores, al.dados_novos,
         al.campos_alterados, al.descricao, al.criado_em
  FROM public.sieg_fin_audit_log al
  WHERE al.tenant_id = _tenant_id
  ORDER BY al.criado_em DESC
  LIMIT _limit OFFSET _offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5.8 Contar audit logs
CREATE OR REPLACE FUNCTION public.sieg_fin_count_audit_logs(_tenant_id UUID)
RETURNS BIGINT AS $$
BEGIN
  RETURN (SELECT COUNT(*) FROM public.sieg_fin_audit_log WHERE tenant_id = _tenant_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5.9 KPI totais por período
CREATE OR REPLACE FUNCTION public.sieg_fin_kpi_totais_periodo(
  _workspace_id UUID, _start_date DATE, _end_date DATE
)
RETURNS TABLE(
  leads_recebidos BIGINT, leads_qualificados BIGINT,
  leads_followup BIGINT, leads_descartados BIGINT,
  investimento NUMERIC, cpl NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COALESCE(SUM(k.leads_recebidos), 0)::BIGINT,
    COALESCE(SUM(k.leads_qualificados), 0)::BIGINT,
    COALESCE(SUM(k.leads_followup), 0)::BIGINT,
    COALESCE(SUM(k.leads_descartados), 0)::BIGINT,
    COALESCE(SUM(k.investimento), 0),
    CASE WHEN COALESCE(SUM(k.leads_recebidos), 0) > 0
      THEN COALESCE(SUM(k.investimento), 0) / SUM(k.leads_recebidos)
      ELSE 0
    END
  FROM public.sieg_fin_kpi_overview_daily k
  WHERE k.workspace_id = _workspace_id
    AND k.day BETWEEN _start_date AND _end_date;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5.10 Contar disparos por dia
CREATE OR REPLACE FUNCTION public.sieg_fin_contar_disparos_por_dia(_empresa_id UUID)
RETURNS TABLE(dia DATE, total BIGINT) AS $$
BEGIN
  RETURN QUERY
  SELECT DATE(d.criado_em) AS dia, COUNT(*)::BIGINT AS total
  FROM public.sieg_fin_disparos d
  WHERE d.empresa_id = _empresa_id
  GROUP BY DATE(d.criado_em)
  ORDER BY dia DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5.11 Contar disparos por status
CREATE OR REPLACE FUNCTION public.sieg_fin_contar_disparos_por_status(_empresa_id UUID)
RETURNS TABLE(status TEXT, total BIGINT) AS $$
BEGIN
  RETURN QUERY
  SELECT d.status, COUNT(*)::BIGINT AS total
  FROM public.sieg_fin_disparos d
  WHERE d.empresa_id = _empresa_id
  GROUP BY d.status;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- FASE 6: SEED — Dados mínimos para o dashboard funcionar
-- ============================================================

-- 6.1 Criar tenant SIEG Financeiro
INSERT INTO public.sieg_fin_tenants_new (id, name, slug, database_key, active, plan_type)
VALUES (
  'a0000000-0000-0000-0000-000000000001',
  'SIEG Financeiro',
  'sieg-financeiro',
  'sieg',
  true,
  'enterprise'
) ON CONFLICT (slug) DO NOTHING;

-- 6.2 Configuração do banco
INSERT INTO public.sieg_fin_database_configs (name, database_key, url, anon_key, active, tenant_id)
VALUES (
  'SIEG Financeiro',
  'sieg',
  'https://iifiijbrzcjgukjeywuf.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlpZmlpamJyemNqZ3VramV5d3VmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEyNzc1MDQsImV4cCI6MjA4Njg1MzUwNH0.MmpTaH2lwqXIxUazjf37MKuBm6NdEnBj31us6h0eEh8',
  true,
  'a0000000-0000-0000-0000-000000000001'
) ON CONFLICT (database_key) DO NOTHING;

-- 6.3 Workspace (compatibilidade)
INSERT INTO public.sieg_fin_workspaces (id, name, slug, database, tenant_id)
VALUES (
  'a0000000-0000-0000-0000-000000000001',
  'SIEG Financeiro',
  'sieg-financeiro',
  'sieg',
  'a0000000-0000-0000-0000-000000000001'
);

-- 6.4 Mapeamento de tags
INSERT INTO public.sieg_fin_mapeamentos_tags_tenant (tenant_id, tag_externa, estagio_interno, rotulo_exibicao, descricao, ordem_exibicao) VALUES
('a0000000-0000-0000-0000-000000000001', 't1_sem_resposta', 'novo_lead', 'T1 - Sem Resposta', 'Lead sem resposta inicial', 1),
('a0000000-0000-0000-0000-000000000001', 't2_respondeu', 'qualificacao', 'T2 - Respondeu', 'Lead respondeu à IA', 2),
('a0000000-0000-0000-0000-000000000001', 't3_pago_ia', 'qualificados', 'T3 - Pago IA', 'Lead pagou via IA', 3),
('a0000000-0000-0000-0000-000000000001', 't3_pago_humano', 'qualificados', 'T3 - Pago Humano', 'Lead pagou via humano', 4),
('a0000000-0000-0000-0000-000000000001', 't4_em_negociacao', 'followup', 'T4 - Em Negociação', 'Lead em negociação', 5),
('a0000000-0000-0000-0000-000000000001', 't5_passivel_suspensao', 'descartados', 'T5 - Passível de Suspensão', 'Lead passível de suspensão', 6);

-- ============================================================
-- PRONTO! Agora falta:
-- 1. Criar um usuário no Supabase Auth (Authentication > Users > Add user)
-- 2. Vincular o usuário ao tenant (rodar SQL abaixo trocando o USER_ID)
-- ============================================================

-- DEPOIS DE CRIAR O USUÁRIO, RODAR ISSO (trocar pelo user_id real):
-- INSERT INTO public.sieg_fin_tenant_users (tenant_id, user_id, role, active)
-- VALUES ('a0000000-0000-0000-0000-000000000001', 'SEU_USER_ID_AQUI', 'owner', true);
