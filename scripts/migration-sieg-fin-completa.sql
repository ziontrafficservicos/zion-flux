-- ============================================================
-- MIGRATION COMPLETA: Zion Flux → Padrão sieg_fin_*
-- Banco: zfgezrwksmuhnrmudnas
-- Data: 2026-03-21
-- Autor: JARVIS (Agente DB Sage)
-- ============================================================
-- REGRA: Todas as tabelas usam prefixo sieg_fin_
-- Este script cria APENAS tabelas que NÃO existem ainda.
-- Tabelas já existentes (sieg_fin_billings, sieg_fin_clients, etc.)
-- são mantidas intactas.
-- ============================================================

BEGIN;

-- ============================================================
-- 1. TABELA PRINCIPAL: sieg_fin_empresas (multi-tenancy)
-- Base de tudo — workspaces/tenants referenciam esta tabela
-- ============================================================
CREATE TABLE IF NOT EXISTS public.sieg_fin_empresas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  domain TEXT,
  database_key TEXT,
  settings JSONB DEFAULT '{}',
  branding JSONB DEFAULT '{}',
  logo_url TEXT,
  primary_color TEXT,
  segment TEXT,
  status TEXT DEFAULT 'active',
  active BOOLEAN DEFAULT true,
  max_users INTEGER DEFAULT 50,
  max_leads INTEGER DEFAULT 10000,
  plan_type TEXT DEFAULT 'basic' CHECK (plan_type IN ('basic', 'pro', 'enterprise')),
  billing_email TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- ============================================================
-- 2. sieg_fin_tenant_users (usuários por workspace)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.sieg_fin_tenant_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.sieg_fin_empresas(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member', 'viewer')),
  custom_permissions JSONB,
  active BOOLEAN DEFAULT true,
  bloqueado BOOLEAN DEFAULT false,
  bloqueado_em TIMESTAMPTZ,
  bloqueado_por UUID,
  ultimo_acesso TIMESTAMPTZ,
  criado_em TIMESTAMPTZ DEFAULT now(),
  atualizado_em TIMESTAMPTZ DEFAULT now(),
  UNIQUE(tenant_id, user_id)
);

-- ============================================================
-- 3. sieg_fin_membros_workspace (relação user-workspace)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.sieg_fin_membros_workspace (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL REFERENCES public.sieg_fin_empresas(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'member',
  PRIMARY KEY (user_id, workspace_id)
);

-- ============================================================
-- 4. sieg_fin_pending_invites (convites pendentes)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.sieg_fin_pending_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.sieg_fin_empresas(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'member',
  token TEXT NOT NULL UNIQUE,
  permissions TEXT,
  custom_data TEXT,
  invited_by UUID REFERENCES auth.users(id),
  accepted_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ DEFAULT (now() + interval '7 days'),
  criado_em TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- 5. sieg_fin_configuracoes_banco (config de bancos)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.sieg_fin_configuracoes_banco (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  chave_banco TEXT NOT NULL UNIQUE,
  url TEXT NOT NULL,
  chave_anon TEXT NOT NULL,
  nome_secreto_service_role TEXT,
  tenant_id UUID REFERENCES public.sieg_fin_empresas(id) ON DELETE CASCADE,
  ativo BOOLEAN DEFAULT true,
  criado_em TIMESTAMPTZ DEFAULT now(),
  criado_por UUID REFERENCES auth.users(id)
);

-- ============================================================
-- 6. sieg_fin_financeiro (dados financeiros SIEG)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.sieg_fin_financeiro (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID REFERENCES public.sieg_fin_empresas(id),
  nome TEXT,
  nome_empresa TEXT,
  cnpj TEXT,
  telefone TEXT,
  valor_em_aberto NUMERIC DEFAULT 0,
  valor_recuperado_ia NUMERIC DEFAULT 0,
  valor_recuperado_humano NUMERIC DEFAULT 0,
  em_negociacao NUMERIC DEFAULT 0,
  situacao TEXT,
  tag TEXT,
  atendente TEXT,
  data_pagamento DATE,
  data_vencimento DATE,
  data_pesquisa_enviada TIMESTAMPTZ,
  nota_csat NUMERIC,
  opiniao_csat TEXT,
  resposta_satisfacao TEXT,
  historico_conversa TEXT,
  observacoes TEXT,
  criado_em TIMESTAMPTZ DEFAULT now(),
  atualizado_em TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- 7. sieg_fin_atualizacao_geral (conversas/atendimentos principal)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.sieg_fin_atualizacao_geral (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id TEXT,
  message_id TEXT,
  empresa_id TEXT,
  nome_cliente TEXT,
  nome_empresa TEXT,
  telefone TEXT,
  cnpj TEXT,
  canal TEXT,
  tag TEXT,
  status_atendimento TEXT,
  agente TEXT,
  agente_2 TEXT,
  node_id TEXT,
  tipo_evento TEXT,
  data_evento TEXT,
  data_primeiro_contato TEXT,
  data_ultimo_contato TEXT,
  hora_contato TEXT,
  timestamp_inicio TEXT,
  timestamp_fim TEXT,
  qtd_mensagens TEXT,
  qtd_mensagens_ia TEXT,
  qtd_mensagens_cliente TEXT,
  qtd_transferencias TEXT,
  data_transferencia TEXT,
  motivo_transferencia TEXT,
  nota_csat TEXT,
  historico_completo TEXT,
  historico_conversa_ia TEXT,
  historico_conversa_humano TEXT,
  historico_formatado TEXT,
  ultima_mensagem_cliente TEXT,
  ultima_mensagem_texto TEXT,
  mensagem_ia_sugerida TEXT,
  mensagem_followup TEXT,
  mensagem_reengajamento TEXT,
  mensagem_final_1 TEXT,
  mensagem_final_2 TEXT,
  mensagem_pos_pagamento_1 TEXT,
  mensagem_pos_pagamento_2 TEXT,
  valor_fatura TEXT,
  valor_fatura_2 TEXT,
  valor_em_aberto TEXT,
  valor_pago TEXT,
  valor_total TEXT,
  data_vencimento TEXT,
  data_vencimento_novo TEXT,
  data_pagamento TEXT,
  forma_pagamento TEXT,
  link_boleto TEXT,
  codigo_barras TEXT,
  codigo_barras_2 TEXT,
  fatura_info TEXT,
  faturas_json TEXT,
  is_comprovante TEXT,
  tipo_comprovante TEXT,
  analise_comprovante TEXT,
  link_comprovante_1 TEXT,
  link_comprovante_2 TEXT,
  link_comprovante_3 TEXT,
  link_comprovante_4 TEXT,
  emoji_reacao TEXT,
  flag_1 TEXT,
  flag_2 TEXT,
  reason TEXT,
  prompt_sistema TEXT,
  erro_sistema TEXT,
  criado_em TEXT,
  atualizado_em TEXT
);

-- ============================================================
-- 8. sieg_fin_conversas_leads (conversas dos leads)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.sieg_fin_conversas_leads (
  id SERIAL PRIMARY KEY,
  lead_id TEXT,
  empresa_id UUID REFERENCES public.sieg_fin_empresas(id),
  nome TEXT,
  telefone TEXT,
  tag TEXT,
  source TEXT,
  analista TEXT,
  conversas JSONB,
  csat NUMERIC,
  csat_feedback TEXT,
  origem_atendimento TEXT,
  data_conclusao TIMESTAMPTZ,
  data_resposta_csat TIMESTAMPTZ,
  data_transferencia TIMESTAMPTZ,
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  criado_em TIMESTAMPTZ DEFAULT now(),
  atualizado_em TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- 9. sieg_fin_leads (cadastro de leads)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.sieg_fin_leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES public.sieg_fin_empresas(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  telefone TEXT NOT NULL,
  email TEXT,
  origem TEXT,
  status TEXT DEFAULT 'novo_lead',
  tags_atuais TEXT[],
  metadados JSONB,
  criado_em TIMESTAMPTZ DEFAULT now(),
  atualizado_em TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- 10. sieg_fin_disparos (disparos WhatsApp)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.sieg_fin_disparos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES public.sieg_fin_empresas(id) ON DELETE CASCADE,
  campanha_id UUID,
  lead_id UUID,
  nome TEXT,
  telefone TEXT,
  empresa TEXT,
  canal TEXT,
  tipo_disparo TEXT,
  status TEXT,
  mensagem_id TEXT,
  metadados JSONB,
  enviado_em TIMESTAMPTZ,
  criado_em TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- 11. sieg_fin_historico_tags_lead (histórico de tags)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.sieg_fin_historico_tags_lead (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id TEXT NOT NULL,
  empresa_id UUID REFERENCES public.sieg_fin_empresas(id),
  telefone TEXT NOT NULL,
  tag_anterior TEXT,
  tag_nova TEXT NOT NULL,
  estagio_anterior TEXT,
  estagio_novo TEXT,
  motivo TEXT,
  tempo_no_estagio_anterior NUMERIC,
  criado_por UUID,
  criado_em TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- 12. sieg_fin_historico_tags_financeiros
-- ============================================================
CREATE TABLE IF NOT EXISTS public.sieg_fin_historico_tags_financeiros (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  financeiro_id UUID NOT NULL,
  empresa_id UUID NOT NULL REFERENCES public.sieg_fin_empresas(id),
  telefone TEXT NOT NULL,
  cnpj TEXT,
  tag_anterior TEXT,
  tag_nova TEXT,
  valor_recuperado_ia NUMERIC,
  data_registro TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- 13. sieg_fin_historico_valores_financeiros
-- ============================================================
CREATE TABLE IF NOT EXISTS public.sieg_fin_historico_valores_financeiros (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  financeiro_id UUID NOT NULL,
  empresa_id UUID NOT NULL REFERENCES public.sieg_fin_empresas(id),
  telefone TEXT NOT NULL,
  cnpj TEXT,
  tipo_valor TEXT NOT NULL,
  valor_anterior NUMERIC,
  valor_novo NUMERIC,
  diferenca NUMERIC,
  data_registro TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- 14. sieg_fin_mapeamentos_tags_tenant
-- ============================================================
CREATE TABLE IF NOT EXISTS public.sieg_fin_mapeamentos_tags_tenant (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.sieg_fin_empresas(id) ON DELETE CASCADE,
  tag_externa TEXT NOT NULL,
  estagio_interno TEXT NOT NULL,
  rotulo_exibicao TEXT NOT NULL,
  descricao TEXT,
  ordem_exibicao INTEGER DEFAULT 0,
  ativo BOOLEAN DEFAULT true,
  criado_em TIMESTAMPTZ DEFAULT now(),
  atualizado_em TIMESTAMPTZ DEFAULT now(),
  criado_por UUID REFERENCES auth.users(id),
  UNIQUE(tenant_id, tag_externa)
);

-- ============================================================
-- 15. sieg_fin_custos_anuncios_tenant
-- ============================================================
CREATE TABLE IF NOT EXISTS public.sieg_fin_custos_anuncios_tenant (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.sieg_fin_empresas(id) ON DELETE CASCADE,
  dia DATE NOT NULL,
  valor DECIMAL(10, 2) NOT NULL DEFAULT 0,
  moeda TEXT DEFAULT 'BRL',
  origem TEXT DEFAULT 'manual',
  id_campanha TEXT,
  nome_campanha TEXT,
  impressoes INTEGER,
  cliques INTEGER,
  conversoes INTEGER,
  criado_em TIMESTAMPTZ DEFAULT now(),
  atualizado_em TIMESTAMPTZ DEFAULT now(),
  criado_por UUID REFERENCES auth.users(id),
  UNIQUE(tenant_id, dia, id_campanha)
);

-- ============================================================
-- 16. sieg_fin_contas_meta_ads
-- ============================================================
CREATE TABLE IF NOT EXISTS public.sieg_fin_contas_meta_ads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.sieg_fin_empresas(id) ON DELETE CASCADE,
  account_id TEXT NOT NULL,
  account_name TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  access_token TEXT,
  criado_em TIMESTAMPTZ DEFAULT now(),
  atualizado_em TIMESTAMPTZ DEFAULT now(),
  UNIQUE(workspace_id, account_id)
);

-- ============================================================
-- 17. sieg_fin_audit_log
-- ============================================================
CREATE TABLE IF NOT EXISTS public.sieg_fin_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.sieg_fin_empresas(id),
  user_id UUID REFERENCES auth.users(id),
  user_email TEXT,
  tabela TEXT NOT NULL,
  registro_id TEXT,
  acao TEXT NOT NULL CHECK (acao IN ('INSERT', 'UPDATE', 'DELETE')),
  dados_anteriores JSONB,
  dados_novos JSONB,
  campos_alterados TEXT[],
  ip_address TEXT,
  user_agent TEXT,
  descricao TEXT,
  criado_em TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- 18. sieg_fin_auditoria_sistema (LGPD)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.sieg_fin_auditoria_sistema (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id UUID,
  usuario_email VARCHAR(255),
  usuario_nome VARCHAR(255),
  empresa_id UUID,
  ip_address VARCHAR(45),
  user_agent TEXT,
  acao VARCHAR(100) NOT NULL,
  recurso VARCHAR(100),
  recurso_id VARCHAR(255),
  descricao TEXT,
  dados_anteriores JSONB,
  dados_novos JSONB,
  dados_sensiveis_acessados TEXT[],
  criado_em TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- 19. sieg_fin_campanhas
-- ============================================================
CREATE TABLE IF NOT EXISTS public.sieg_fin_campanhas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES public.sieg_fin_empresas(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  tipo TEXT NOT NULL,
  descricao TEXT,
  status TEXT DEFAULT 'ativa',
  data_inicio TIMESTAMPTZ,
  data_fim TIMESTAMPTZ,
  configuracoes JSONB,
  criado_em TIMESTAMPTZ DEFAULT now(),
  atualizado_em TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- 20. sieg_fin_eventos_lead
-- ============================================================
CREATE TABLE IF NOT EXISTS public.sieg_fin_eventos_lead (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL,
  empresa_id UUID NOT NULL REFERENCES public.sieg_fin_empresas(id) ON DELETE CASCADE,
  tipo_evento TEXT NOT NULL,
  campanha_id UUID,
  agente_responsavel TEXT,
  observacoes TEXT,
  tags_anteriores TEXT[],
  tags_novas TEXT[],
  dados_evento JSONB,
  criado_em TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- 21. sieg_fin_consentimento_lgpd
-- ============================================================
CREATE TABLE IF NOT EXISTS public.sieg_fin_consentimento_lgpd (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id UUID NOT NULL,
  usuario_email VARCHAR(255),
  tipo VARCHAR(100) NOT NULL,
  versao VARCHAR(20) NOT NULL,
  aceito BOOLEAN NOT NULL DEFAULT false,
  ip_address VARCHAR(45),
  user_agent TEXT,
  aceito_em TIMESTAMPTZ,
  revogado_em TIMESTAMPTZ,
  criado_em TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- 22. sieg_fin_solicitacoes_lgpd
-- ============================================================
CREATE TABLE IF NOT EXISTS public.sieg_fin_solicitacoes_lgpd (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id UUID,
  email_solicitante VARCHAR(255) NOT NULL,
  nome_solicitante VARCHAR(255),
  telefone_solicitante VARCHAR(50),
  tipo VARCHAR(100) NOT NULL,
  status VARCHAR(50) DEFAULT 'pendente',
  descricao TEXT,
  resposta TEXT,
  atendido_por UUID,
  atendido_por_nome VARCHAR(255),
  prazo_legal TIMESTAMPTZ,
  concluido_em TIMESTAMPTZ,
  criado_em TIMESTAMPTZ DEFAULT now(),
  atualizado_em TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- 23. sieg_fin_leads_asf
-- ============================================================
CREATE TABLE IF NOT EXISTS public.sieg_fin_leads_asf (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT,
  telefone TEXT,
  tag TEXT,
  historico_conversa TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- 24. sieg_fin_leads_asf_ofc
-- ============================================================
CREATE TABLE IF NOT EXISTS public.sieg_fin_leads_asf_ofc (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT,
  telefone TEXT,
  tag TEXT,
  canal_origem TEXT,
  data_entrada TIMESTAMPTZ,
  historico TEXT,
  resumo TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- 25. sieg_fin_leads_dr_premium
-- ============================================================
CREATE TABLE IF NOT EXISTS public.sieg_fin_leads_dr_premium (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT,
  telefone TEXT,
  tag TEXT,
  canal_origem TEXT,
  url_origem TEXT,
  data_entrada TIMESTAMPTZ,
  hora_entrada TEXT,
  mes TEXT,
  ano TEXT,
  produtos TEXT,
  desqualificado BOOLEAN DEFAULT false,
  criado_em TIMESTAMPTZ DEFAULT now(),
  atualizado_em TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- 26. sieg_fin_leads_dr_premium_tags
-- ============================================================
CREATE TABLE IF NOT EXISTS public.sieg_fin_leads_dr_premium_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  telefone TEXT NOT NULL,
  tag TEXT,
  historico_conversa TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- 27. sieg_fin_n8n_chat_histories
-- ============================================================
CREATE TABLE IF NOT EXISTS public.sieg_fin_n8n_chat_histories (
  id SERIAL PRIMARY KEY,
  session_id TEXT NOT NULL,
  message JSONB NOT NULL
);

-- ============================================================
-- 28. sieg_fin_confirmacao_inscricao
-- ============================================================
CREATE TABLE IF NOT EXISTS public.sieg_fin_confirmacao_inscricao (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT,
  telefone TEXT,
  tag TEXT,
  source TEXT,
  hora_resposta TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- 29. sieg_fin_superlive
-- ============================================================
CREATE TABLE IF NOT EXISTS public.sieg_fin_superlive (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT,
  telefone TEXT,
  email TEXT,
  cnpj TEXT,
  tag TEXT,
  agente TEXT,
  historico_ia TEXT,
  transferido_humano_em TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- 30. sieg_fin_user_settings (configurações do usuário)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.sieg_fin_user_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tenant_id UUID REFERENCES public.sieg_fin_empresas(id),
  settings JSONB DEFAULT '{}',
  default_workspace_id UUID,
  criado_em TIMESTAMPTZ DEFAULT now(),
  atualizado_em TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id)
);

-- ============================================================
-- 31. sieg_fin_analise_ia (análises de IA)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.sieg_fin_analise_ia (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id TEXT,
  workspace_id UUID REFERENCES public.sieg_fin_empresas(id),
  tipo TEXT,
  resultado JSONB,
  score NUMERIC,
  insights TEXT[],
  criado_em TIMESTAMPTZ DEFAULT now(),
  atualizado_em TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- 32. sieg_fin_analise_fluxos (análise de fluxos)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.sieg_fin_analise_fluxos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES public.sieg_fin_empresas(id),
  tipo TEXT,
  dados JSONB,
  resultado JSONB,
  criado_em TIMESTAMPTZ DEFAULT now(),
  atualizado_em TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- VIEWS
-- ============================================================

-- View: sieg_fin_database_configs (compatibilidade com nomes em inglês)
CREATE OR REPLACE VIEW public.sieg_fin_database_configs AS
SELECT
  id,
  nome as name,
  chave_banco as database_key,
  url,
  chave_anon as anon_key,
  nome_secreto_service_role as service_role_secret_name,
  ativo as active,
  criado_em as created_at,
  criado_por as created_by,
  tenant_id
FROM public.sieg_fin_configuracoes_banco;

-- View: sieg_fin_meta_ads_accounts (compatibilidade)
CREATE OR REPLACE VIEW public.sieg_fin_meta_ads_accounts AS
SELECT
  id,
  workspace_id,
  account_id,
  account_name,
  is_active,
  access_token,
  criado_em as created_at,
  atualizado_em as updated_at
FROM public.sieg_fin_contas_meta_ads;

-- View: sieg_fin_perfis_usuarios
CREATE OR REPLACE VIEW public.sieg_fin_perfis_usuarios AS
SELECT
  au.id,
  au.email,
  COALESCE(au.raw_user_meta_data->>'full_name', au.raw_user_meta_data->>'name', au.email) as nome_completo,
  au.created_at as criado_em
FROM auth.users au;

-- View: sieg_fin_workspaces (compatibilidade simplificada)
CREATE OR REPLACE VIEW public.sieg_fin_workspaces AS
SELECT
  id,
  nome as name,
  active,
  settings,
  created_at,
  updated_at
FROM public.sieg_fin_empresas;

-- View: sieg_fin_tenants_new
CREATE OR REPLACE VIEW public.sieg_fin_tenants_new AS
SELECT
  id,
  nome as name,
  slug,
  domain,
  database_key,
  settings,
  branding,
  active,
  max_users,
  max_leads,
  plan_type,
  billing_email,
  created_at,
  updated_at
FROM public.sieg_fin_empresas;

-- View: sieg_fin_tenant_workspaces
CREATE OR REPLACE VIEW public.sieg_fin_tenant_workspaces AS
SELECT
  tu.tenant_id,
  e.id,
  e.nome as name,
  e.slug,
  e.active,
  e.settings,
  e.branding,
  e.logo_url,
  e.primary_color,
  e.segment,
  e.status,
  tu.role,
  tu.custom_permissions,
  e.created_at,
  e.updated_at
FROM public.sieg_fin_tenant_users tu
JOIN public.sieg_fin_empresas e ON e.id = tu.tenant_id
WHERE tu.active = true;

-- View: sieg_fin_kpi_overview_daily
CREATE OR REPLACE VIEW public.sieg_fin_kpi_overview_daily AS
WITH leads_normalizados AS (
  SELECT
    l.empresa_id AS workspace_id,
    DATE(l.criado_em) AS dia,
    LOWER(COALESCE(l.status, 'novo_lead')) AS status_normalizado
  FROM public.sieg_fin_leads l
  WHERE l.empresa_id IS NOT NULL
)
SELECT
  ln.workspace_id,
  ln.dia AS day,
  COUNT(*) AS leads_recebidos,
  COUNT(*) FILTER (
    WHERE ln.status_normalizado IN ('qualificado', 'qualificados')
  ) AS leads_qualificados,
  COUNT(*) FILTER (
    WHERE ln.status_normalizado IN ('followup', 'follow-up', 'follow_up')
  ) AS leads_followup,
  COUNT(*) FILTER (
    WHERE ln.status_normalizado IN ('descartado', 'descartados', 'desqualificado', 'desqualificados')
  ) AS leads_descartados,
  COALESCE(SUM(c.valor), 0) AS investimento,
  CASE
    WHEN COUNT(*) FILTER (
      WHERE ln.status_normalizado IN ('qualificado', 'qualificados')
    ) > 0
    THEN COALESCE(SUM(c.valor), 0) /
      COUNT(*) FILTER (
        WHERE ln.status_normalizado IN ('qualificado', 'qualificados')
      )
    ELSE 0
  END AS cpl
FROM leads_normalizados ln
LEFT JOIN public.sieg_fin_custos_anuncios_tenant c
  ON c.tenant_id = ln.workspace_id
  AND c.dia = ln.dia
GROUP BY ln.workspace_id, ln.dia;

-- View: sieg_fin_tenant_conversations
CREATE OR REPLACE VIEW public.sieg_fin_tenant_conversations AS
SELECT
  cl.id,
  cl.lead_id,
  cl.empresa_id as tenant_id,
  cl.nome as name,
  cl.telefone as phone,
  cl.tag,
  cl.source,
  cl.analista as analyst,
  cl.conversas as conversations,
  cl.csat,
  cl.data_conclusao as completion_date,
  cl.data_transferencia as transfer_date,
  cl.criado_em as created_at,
  cl.atualizado_em as updated_at
FROM public.sieg_fin_conversas_leads cl;

-- View: sieg_fin_tenant_ad_costs
CREATE OR REPLACE VIEW public.sieg_fin_tenant_ad_costs AS
SELECT
  id,
  tenant_id,
  dia as day,
  valor as amount,
  moeda as currency,
  origem as source,
  id_campanha as campaign_id,
  nome_campanha as campaign_name,
  impressoes as impressions,
  cliques as clicks,
  conversoes as conversions,
  criado_em as created_at,
  atualizado_em as updated_at,
  criado_por as created_by
FROM public.sieg_fin_custos_anuncios_tenant;

-- View: sieg_fin_tenant_tag_mappings
CREATE OR REPLACE VIEW public.sieg_fin_tenant_tag_mappings AS
SELECT
  id,
  tenant_id,
  tag_externa as external_tag,
  estagio_interno as internal_stage,
  rotulo_exibicao as display_label,
  descricao as description,
  ordem_exibicao as display_order,
  ativo as active,
  criado_em as created_at,
  atualizado_em as updated_at,
  criado_por as created_by
FROM public.sieg_fin_mapeamentos_tags_tenant;

-- ============================================================
-- FUNCTIONS
-- ============================================================

-- Trigger: atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION sieg_fin_update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function: verificar membro do workspace
CREATE OR REPLACE FUNCTION public.sieg_fin_is_workspace_member(
  _user_id UUID,
  _workspace_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.sieg_fin_tenant_users
    WHERE user_id = _user_id
    AND tenant_id = _workspace_id
    AND active = true
  );
END;
$$;

-- Function: buscar workspaces do usuário
CREATE OR REPLACE FUNCTION public.sieg_fin_get_user_workspaces(
  _user_id UUID
)
RETURNS TABLE (workspace_id UUID)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT tenant_id as workspace_id
  FROM public.sieg_fin_tenant_users
  WHERE user_id = _user_id
  AND active = true;
END;
$$;

-- Function: membros do workspace com detalhes
CREATE OR REPLACE FUNCTION public.sieg_fin_get_workspace_members_with_details(
  p_workspace_id UUID
)
RETURNS TABLE (
  user_id UUID,
  user_email TEXT,
  user_name TEXT,
  role TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    tu.user_id,
    au.email::TEXT as user_email,
    COALESCE(au.raw_user_meta_data->>'full_name', au.raw_user_meta_data->>'name', au.email)::TEXT as user_name,
    tu.role::TEXT
  FROM public.sieg_fin_tenant_users tu
  JOIN auth.users au ON au.id = tu.user_id
  WHERE tu.tenant_id = p_workspace_id
  AND tu.active = true;
END;
$$;

-- Function: KPIs totais por período
CREATE OR REPLACE FUNCTION public.sieg_fin_kpi_totais_periodo(
  p_workspace_id UUID,
  p_from DATE,
  p_to DATE
)
RETURNS TABLE (
  total_leads_recebidos BIGINT,
  total_leads_qualificados BIGINT,
  total_leads_followup BIGINT,
  total_leads_descartados BIGINT,
  total_investimento NUMERIC,
  cpl_medio NUMERIC
)
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
  RETURN QUERY
  SELECT
    COALESCE(SUM(leads_recebidos), 0)::BIGINT,
    COALESCE(SUM(leads_qualificados), 0)::BIGINT,
    COALESCE(SUM(leads_followup), 0)::BIGINT,
    COALESCE(SUM(leads_descartados), 0)::BIGINT,
    COALESCE(SUM(investimento), 0)::NUMERIC,
    CASE
      WHEN COALESCE(SUM(leads_qualificados), 0) > 0
      THEN (COALESCE(SUM(investimento), 0) / SUM(leads_qualificados))::NUMERIC
      ELSE 0::NUMERIC
    END
  FROM public.sieg_fin_kpi_overview_daily
  WHERE workspace_id = p_workspace_id
    AND day >= p_from
    AND day <= p_to;
END;
$$;

-- Function: buscar audit logs
CREATE OR REPLACE FUNCTION public.sieg_fin_get_audit_logs(
  p_tenant_id UUID DEFAULT NULL,
  p_tabela TEXT DEFAULT NULL,
  p_acao TEXT DEFAULT NULL,
  p_user_id UUID DEFAULT NULL,
  p_data_inicio TIMESTAMPTZ DEFAULT NULL,
  p_data_fim TIMESTAMPTZ DEFAULT NULL,
  p_limite INT DEFAULT 100,
  p_offset INT DEFAULT 0
)
RETURNS TABLE (
  id UUID,
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
  criado_em TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    al.id, al.tenant_id, al.user_id, al.user_email,
    al.tabela, al.registro_id, al.acao,
    al.dados_anteriores, al.dados_novos, al.campos_alterados,
    al.descricao, al.criado_em
  FROM public.sieg_fin_audit_log al
  WHERE
    (p_tenant_id IS NULL OR al.tenant_id = p_tenant_id)
    AND (p_tabela IS NULL OR al.tabela = p_tabela)
    AND (p_acao IS NULL OR al.acao = p_acao)
    AND (p_user_id IS NULL OR al.user_id = p_user_id)
    AND (p_data_inicio IS NULL OR al.criado_em >= p_data_inicio)
    AND (p_data_fim IS NULL OR al.criado_em <= p_data_fim)
  ORDER BY al.criado_em DESC
  LIMIT p_limite
  OFFSET p_offset;
END;
$$;

-- Function: contar audit logs
CREATE OR REPLACE FUNCTION public.sieg_fin_count_audit_logs(
  p_tenant_id UUID DEFAULT NULL,
  p_tabela TEXT DEFAULT NULL,
  p_acao TEXT DEFAULT NULL,
  p_data_inicio TIMESTAMPTZ DEFAULT NULL,
  p_data_fim TIMESTAMPTZ DEFAULT NULL
)
RETURNS BIGINT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_count BIGINT;
BEGIN
  SELECT COUNT(*) INTO v_count
  FROM public.sieg_fin_audit_log al
  WHERE
    (p_tenant_id IS NULL OR al.tenant_id = p_tenant_id)
    AND (p_tabela IS NULL OR al.tabela = p_tabela)
    AND (p_acao IS NULL OR al.acao = p_acao)
    AND (p_data_inicio IS NULL OR al.criado_em >= p_data_inicio)
    AND (p_data_fim IS NULL OR al.criado_em <= p_data_fim);
  RETURN v_count;
END;
$$;

-- Function: contar disparos por status
CREATE OR REPLACE FUNCTION public.sieg_fin_contar_disparos_por_status(
  p_empresa_id UUID,
  p_data_inicio TEXT,
  p_data_fim TEXT
)
RETURNS TABLE (
  dia DATE,
  enviados BIGINT,
  numero_invalido BIGINT,
  suspensao BIGINT,
  total BIGINT
)
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
  RETURN QUERY
  SELECT
    DATE(d.enviado_em) as dia,
    COUNT(*) FILTER (WHERE d.status = 'enviado') as enviados,
    COUNT(*) FILTER (WHERE d.status = 'numero_invalido') as numero_invalido,
    COUNT(*) FILTER (WHERE d.status = 'suspensao') as suspensao,
    COUNT(*) as total
  FROM public.sieg_fin_disparos d
  WHERE d.empresa_id = p_empresa_id
    AND d.enviado_em >= p_data_inicio::TIMESTAMPTZ
    AND d.enviado_em <= p_data_fim::TIMESTAMPTZ
  GROUP BY DATE(d.enviado_em)
  ORDER BY dia;
END;
$$;

-- Function: contar disparos por dia
CREATE OR REPLACE FUNCTION public.sieg_fin_contar_disparos_por_dia(
  p_empresa_id UUID,
  p_data_inicio TEXT,
  p_data_fim TEXT
)
RETURNS TABLE (
  dia DATE,
  quantidade BIGINT
)
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
  RETURN QUERY
  SELECT
    DATE(d.enviado_em) as dia,
    COUNT(*) as quantidade
  FROM public.sieg_fin_disparos d
  WHERE d.empresa_id = p_empresa_id
    AND d.enviado_em >= p_data_inicio::TIMESTAMPTZ
    AND d.enviado_em <= p_data_fim::TIMESTAMPTZ
  GROUP BY DATE(d.enviado_em)
  ORDER BY dia;
END;
$$;

-- Function: registrar auditoria LGPD
CREATE OR REPLACE FUNCTION public.sieg_fin_registrar_auditoria(
  p_usuario_id UUID,
  p_usuario_email VARCHAR,
  p_usuario_nome VARCHAR,
  p_empresa_id UUID,
  p_acao VARCHAR,
  p_recurso VARCHAR,
  p_recurso_id VARCHAR,
  p_descricao TEXT DEFAULT NULL,
  p_dados_anteriores JSONB DEFAULT NULL,
  p_dados_novos JSONB DEFAULT NULL,
  p_dados_sensiveis TEXT[] DEFAULT NULL,
  p_ip_address VARCHAR DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
AS $$
DECLARE
  v_id UUID;
BEGIN
  INSERT INTO public.sieg_fin_auditoria_sistema (
    usuario_id, usuario_email, usuario_nome, empresa_id,
    acao, recurso, recurso_id, descricao,
    dados_anteriores, dados_novos, dados_sensiveis_acessados,
    ip_address, user_agent
  ) VALUES (
    p_usuario_id, p_usuario_email, p_usuario_nome, p_empresa_id,
    p_acao, p_recurso, p_recurso_id, p_descricao,
    p_dados_anteriores, p_dados_novos, p_dados_sensiveis,
    p_ip_address, p_user_agent
  ) RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;

-- Function: deletar usuário completo
CREATE OR REPLACE FUNCTION public.sieg_fin_deletar_usuario_completo(
  usuario_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM public.sieg_fin_tenant_users WHERE user_id = usuario_id;
  DELETE FROM public.sieg_fin_membros_workspace WHERE user_id = usuario_id;
  DELETE FROM public.sieg_fin_pending_invites WHERE invited_by = usuario_id;
  DELETE FROM public.sieg_fin_user_settings WHERE user_id = usuario_id;
  RETURN true;
END;
$$;

-- Function: permissões do usuário
CREATE OR REPLACE FUNCTION public.sieg_fin_get_user_permissions(
  p_user_id UUID,
  p_workspace_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_permissions JSONB;
  v_role TEXT;
BEGIN
  SELECT custom_permissions, role INTO v_permissions, v_role
  FROM public.sieg_fin_tenant_users
  WHERE user_id = p_user_id AND tenant_id = p_workspace_id AND active = true;

  IF v_permissions IS NOT NULL THEN
    RETURN v_permissions;
  END IF;

  RETURN jsonb_build_object('role', COALESCE(v_role, 'viewer'));
END;
$$;

-- Function: salvar permissões
CREATE OR REPLACE FUNCTION public.sieg_fin_save_user_permissions(
  p_user_id UUID,
  p_workspace_id UUID,
  p_permissions JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.sieg_fin_tenant_users
  SET custom_permissions = p_permissions,
      atualizado_em = now()
  WHERE user_id = p_user_id AND tenant_id = p_workspace_id;

  RETURN jsonb_build_object('success', true);
END;
$$;

-- Function: métricas de atendimentos
CREATE OR REPLACE FUNCTION public.sieg_fin_get_atendimentos_metrics(
  p_workspace_id UUID,
  p_table_name TEXT,
  p_data_hoje TEXT,
  p_primeiro_dia_mes TEXT,
  p_ultimo_dia_mes TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_count_hoje INTEGER;
  v_count_ia INTEGER;
  v_count_transferidos INTEGER;
  v_csat_data JSON;
  v_result JSON;
BEGIN
  EXECUTE format(
    'SELECT COUNT(*) FROM %I WHERE empresa_id = $1 AND criado_em >= $2 AND criado_em <= $3',
    p_table_name
  ) INTO v_count_hoje
  USING p_workspace_id, p_data_hoje || 'T00:00:00', p_data_hoje || 'T23:59:59';

  EXECUTE format(
    'SELECT COUNT(*) FROM %I WHERE empresa_id = $1 AND criado_em >= $2 AND criado_em <= $3 AND data_transferencia IS NULL',
    p_table_name
  ) INTO v_count_ia
  USING p_workspace_id, p_data_hoje || 'T00:00:00', p_data_hoje || 'T23:59:59';

  EXECUTE format(
    'SELECT COUNT(*) FROM %I WHERE empresa_id = $1 AND criado_em >= $2 AND criado_em <= $3 AND data_transferencia IS NOT NULL',
    p_table_name
  ) INTO v_count_transferidos
  USING p_workspace_id, p_data_hoje || 'T00:00:00', p_data_hoje || 'T23:59:59';

  EXECUTE format(
    'SELECT COALESCE(json_agg(row_to_json(t)), ''[]''::json) FROM (
      SELECT analista, csat, criado_em
      FROM %I
      WHERE empresa_id = $1
        AND analista IS NOT NULL
        AND csat IS NOT NULL
        AND criado_em >= $2
        AND criado_em <= $3
    ) t',
    p_table_name
  ) INTO v_csat_data
  USING p_workspace_id, p_primeiro_dia_mes, p_ultimo_dia_mes;

  v_result := json_build_object(
    'atendimentosHoje', COALESCE(v_count_hoje, 0),
    'atendimentosIA', COALESCE(v_count_ia, 0),
    'atendimentosTransferidos', COALESCE(v_count_transferidos, 0),
    'csatData', COALESCE(v_csat_data, '[]'::json)
  );

  RETURN v_result;
END;
$$;

-- Function: atualizar tag de conversa
CREATE OR REPLACE FUNCTION public.sieg_fin_update_conversation_tag(
  p_conversation_id TEXT,
  p_table_name TEXT,
  p_new_tag TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  EXECUTE format(
    'UPDATE %I SET tag = $1, atualizado_em = now() WHERE id = $2::uuid',
    p_table_name
  ) USING p_new_tag, p_conversation_id;
  RETURN true;
EXCEPTION WHEN OTHERS THEN
  RETURN false;
END;
$$;

-- ============================================================
-- INDEXES para performance
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_sieg_fin_financeiro_empresa ON public.sieg_fin_financeiro(empresa_id);
CREATE INDEX IF NOT EXISTS idx_sieg_fin_financeiro_tag ON public.sieg_fin_financeiro(tag);
CREATE INDEX IF NOT EXISTS idx_sieg_fin_financeiro_telefone ON public.sieg_fin_financeiro(telefone);
CREATE INDEX IF NOT EXISTS idx_sieg_fin_atualizacao_geral_empresa ON public.sieg_fin_atualizacao_geral(empresa_id);
CREATE INDEX IF NOT EXISTS idx_sieg_fin_atualizacao_geral_tag ON public.sieg_fin_atualizacao_geral(tag);
CREATE INDEX IF NOT EXISTS idx_sieg_fin_conversas_leads_empresa ON public.sieg_fin_conversas_leads(empresa_id);
CREATE INDEX IF NOT EXISTS idx_sieg_fin_leads_empresa ON public.sieg_fin_leads(empresa_id);
CREATE INDEX IF NOT EXISTS idx_sieg_fin_disparos_empresa ON public.sieg_fin_disparos(empresa_id);
CREATE INDEX IF NOT EXISTS idx_sieg_fin_historico_tags_lead_lead ON public.sieg_fin_historico_tags_lead(lead_id);
CREATE INDEX IF NOT EXISTS idx_sieg_fin_tenant_users_user ON public.sieg_fin_tenant_users(user_id);
CREATE INDEX IF NOT EXISTS idx_sieg_fin_tenant_users_tenant ON public.sieg_fin_tenant_users(tenant_id);
CREATE INDEX IF NOT EXISTS idx_sieg_fin_audit_log_tenant ON public.sieg_fin_audit_log(tenant_id);
CREATE INDEX IF NOT EXISTS idx_sieg_fin_audit_log_criado ON public.sieg_fin_audit_log(criado_em);
CREATE INDEX IF NOT EXISTS idx_sieg_fin_pending_invites_email ON public.sieg_fin_pending_invites(email);
CREATE INDEX IF NOT EXISTS idx_sieg_fin_pending_invites_workspace ON public.sieg_fin_pending_invites(workspace_id);

-- ============================================================
-- ENABLE RLS (ativar segurança por linha)
-- ============================================================
ALTER TABLE public.sieg_fin_empresas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sieg_fin_tenant_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sieg_fin_financeiro ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sieg_fin_conversas_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sieg_fin_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sieg_fin_disparos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sieg_fin_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sieg_fin_pending_invites ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- RLS POLICIES (permissivas para desenvolvimento)
-- Em produção, George deve revisar e restringir
-- ============================================================

-- Política: tenant_users podem ver seus próprios registros
CREATE POLICY "sieg_fin_tenant_users_select" ON public.sieg_fin_tenant_users
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "sieg_fin_tenant_users_all_owner" ON public.sieg_fin_tenant_users
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.sieg_fin_tenant_users tu
      WHERE tu.tenant_id = sieg_fin_tenant_users.tenant_id
      AND tu.user_id = auth.uid()
      AND tu.role IN ('owner', 'admin')
    )
  );

-- Política: empresas visíveis para membros
CREATE POLICY "sieg_fin_empresas_select" ON public.sieg_fin_empresas
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.sieg_fin_tenant_users tu
      WHERE tu.tenant_id = id
      AND tu.user_id = auth.uid()
      AND tu.active = true
    )
  );

-- Políticas permissivas para tabelas de dados (baseadas em empresa_id via tenant)
CREATE POLICY "sieg_fin_financeiro_select" ON public.sieg_fin_financeiro
  FOR SELECT USING (
    empresa_id IN (
      SELECT tenant_id FROM public.sieg_fin_tenant_users
      WHERE user_id = auth.uid() AND active = true
    )
  );

CREATE POLICY "sieg_fin_conversas_leads_select" ON public.sieg_fin_conversas_leads
  FOR SELECT USING (
    empresa_id IN (
      SELECT tenant_id FROM public.sieg_fin_tenant_users
      WHERE user_id = auth.uid() AND active = true
    )
  );

CREATE POLICY "sieg_fin_leads_select" ON public.sieg_fin_leads
  FOR SELECT USING (
    empresa_id IN (
      SELECT tenant_id FROM public.sieg_fin_tenant_users
      WHERE user_id = auth.uid() AND active = true
    )
  );

CREATE POLICY "sieg_fin_disparos_select" ON public.sieg_fin_disparos
  FOR SELECT USING (
    empresa_id IN (
      SELECT tenant_id FROM public.sieg_fin_tenant_users
      WHERE user_id = auth.uid() AND active = true
    )
  );

CREATE POLICY "sieg_fin_audit_log_select" ON public.sieg_fin_audit_log
  FOR SELECT USING (
    tenant_id IN (
      SELECT tenant_id FROM public.sieg_fin_tenant_users
      WHERE user_id = auth.uid() AND active = true
    )
  );

CREATE POLICY "sieg_fin_pending_invites_select" ON public.sieg_fin_pending_invites
  FOR SELECT USING (
    workspace_id IN (
      SELECT tenant_id FROM public.sieg_fin_tenant_users
      WHERE user_id = auth.uid() AND active = true
    )
  );

COMMIT;
