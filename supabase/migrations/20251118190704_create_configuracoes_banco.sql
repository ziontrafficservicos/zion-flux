-- Migration: Create configuracoes_banco table
-- Created: 2024-11-18
-- Description: Database configurations table (Portuguese names)

-- Create configuracoes_banco table
CREATE TABLE IF NOT EXISTS public.configuracoes_banco (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  chave_banco TEXT NOT NULL UNIQUE,
  url TEXT NOT NULL,
  chave_anon TEXT NOT NULL,
  nome_secreto_service_role TEXT,
  tenant_id UUID REFERENCES public.empresas(id) ON DELETE CASCADE,
  ativo BOOLEAN DEFAULT true,
  criado_em TIMESTAMPTZ DEFAULT now(),
  criado_por UUID REFERENCES auth.users(id)
);

-- Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_configuracoes_banco_tenant ON configuracoes_banco(tenant_id);
CREATE INDEX IF NOT EXISTS idx_configuracoes_banco_chave ON configuracoes_banco(chave_banco);
CREATE INDEX IF NOT EXISTS idx_configuracoes_banco_ativo ON configuracoes_banco(ativo) WHERE ativo = true;

-- Criar view database_configs para compatibilidade com código existente
CREATE OR REPLACE VIEW public.database_configs AS
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
FROM public.configuracoes_banco;

-- Comentários para documentação
COMMENT ON TABLE configuracoes_banco IS 'Configurações de banco de dados por tenant';
COMMENT ON COLUMN configuracoes_banco.chave_banco IS 'Chave única do banco (ex: asf, sieg)';
COMMENT ON COLUMN configuracoes_banco.url IS 'URL do Supabase';
COMMENT ON COLUMN configuracoes_banco.chave_anon IS 'Chave anônima do Supabase';

-- Inserir configuração padrão para o tenant existente
INSERT INTO public.configuracoes_banco (tenant_id, nome, chave_banco, url, chave_anon)
SELECT 
  id as tenant_id,
  'Banco Principal' as nome,
  'asf' as chave_banco,
  'https://wrebkgazdlyjenbpexnc.supabase.co' as url,
  '' as chave_anon -- Use variável de ambiente
FROM public.empresas 
WHERE ativa = true 
LIMIT 1
ON CONFLICT (chave_banco) DO NOTHING;
