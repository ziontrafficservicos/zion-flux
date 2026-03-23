-- Fix: Adicionar policies RLS de SELECT nas tabelas de historico
-- Sem essas policies, RLS bloqueia todas as leituras (dashboard mostra R$ 0)

CREATE POLICY sieg_fin_historico_tags_select
  ON public.sieg_fin_historico_tags_financeiros
  FOR SELECT
  USING (
    empresa_id IN (
      SELECT tenant_id FROM sieg_fin_tenant_users
      WHERE user_id = auth.uid() AND active = true
    )
  );

CREATE POLICY sieg_fin_historico_valores_select
  ON public.sieg_fin_historico_valores_financeiros
  FOR SELECT
  USING (
    empresa_id IN (
      SELECT tenant_id FROM sieg_fin_tenant_users
      WHERE user_id = auth.uid() AND active = true
    )
  );
