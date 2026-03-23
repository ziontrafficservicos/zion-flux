-- ============================================================
-- RPCs de Integracao NicoChat → Supabase
-- Projeto: Zion Flux (SIEG Financeiro)
-- Banco: zfgezrwksmuhnrmudnas
-- Data: 2026-03-22
-- ============================================================

-- ============================================================
-- INDICES COMPOSTOS (performance para busca por empresa+telefone+data)
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_sieg_fin_financeiro_empresa_tel_criado
  ON public.sieg_fin_financeiro(empresa_id, telefone, criado_em DESC);

CREATE INDEX IF NOT EXISTS idx_sieg_fin_disparos_empresa_tel_criado
  ON public.sieg_fin_disparos(empresa_id, telefone, criado_em DESC);

-- ============================================================
-- FUNCAO AUXILIAR: Normalizar telefone
-- Remove +, espacos, hifens, parenteses
-- ============================================================
CREATE OR REPLACE FUNCTION public.sieg_fin_normalizar_telefone(p_telefone TEXT)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  RETURN regexp_replace(
    COALESCE(p_telefone, ''),
    '[^0-9]',
    '',
    'g'
  );
END;
$$;

-- ============================================================
-- RPC 1: sieg_fin_registrar_disparo
-- Chamada pelo NicoChat quando um template de cobranca e disparado
-- Cria registro novo em financeiro + disparo + historico
-- ============================================================
CREATE OR REPLACE FUNCTION public.sieg_fin_registrar_disparo(
  p_telefone TEXT,
  p_nome_empresa TEXT,
  p_valor_em_aberto NUMERIC,
  p_cnpj TEXT DEFAULT NULL,
  p_nome TEXT DEFAULT NULL,
  p_data_vencimento DATE DEFAULT NULL,
  p_empresa_id UUID DEFAULT '0935278d-410d-435c-bc79-adcd8349064b'::UUID
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_financeiro_id UUID;
  v_disparo_id UUID;
  v_tag TEXT := 'T1 - SEM RESPOSTA';
  v_agora TIMESTAMPTZ := now();
  v_telefone_normalizado TEXT;
  v_total_disparos BIGINT;
BEGIN
  -- Normalizar telefone
  v_telefone_normalizado := public.sieg_fin_normalizar_telefone(p_telefone);

  -- Verificar quantos disparos anteriores este telefone ja recebeu
  SELECT COUNT(*)
  INTO v_total_disparos
  FROM public.sieg_fin_disparos
  WHERE telefone = v_telefone_normalizado
    AND empresa_id = p_empresa_id
    AND status = 'enviado';

  -- Se 10+ disparos sem pagamento, marcar como T5
  IF v_total_disparos >= 9 THEN
    -- Verificar se tem algum pagamento registrado
    IF NOT EXISTS (
      SELECT 1 FROM public.sieg_fin_financeiro
      WHERE telefone = v_telefone_normalizado
        AND empresa_id = p_empresa_id
        AND (COALESCE(valor_recuperado_ia, 0) > 0 OR COALESCE(valor_recuperado_humano, 0) > 0)
    ) THEN
      v_tag := 'T5 - PASSIVEL DE SUSPENSAO';
    END IF;
  END IF;

  -- PASSO 1: INSERT em sieg_fin_financeiro
  INSERT INTO public.sieg_fin_financeiro (
    empresa_id,
    telefone,
    nome_empresa,
    nome,
    cnpj,
    valor_em_aberto,
    data_vencimento,
    tag,
    situacao,
    criado_em,
    atualizado_em
  ) VALUES (
    p_empresa_id,
    v_telefone_normalizado,
    p_nome_empresa,
    COALESCE(p_nome, p_nome_empresa),
    p_cnpj,
    COALESCE(p_valor_em_aberto, 0),
    p_data_vencimento,
    v_tag,
    'pendente',
    v_agora,
    v_agora
  )
  RETURNING id INTO v_financeiro_id;

  -- PASSO 2: INSERT em sieg_fin_disparos
  INSERT INTO public.sieg_fin_disparos (
    empresa_id,
    telefone,
    nome,
    empresa,
    status,
    tipo_disparo,
    canal,
    enviado_em,
    criado_em
  ) VALUES (
    p_empresa_id,
    v_telefone_normalizado,
    COALESCE(p_nome, p_nome_empresa),
    p_nome_empresa,
    'enviado',
    'cobranca',
    'whatsapp',
    v_agora,
    v_agora
  )
  RETURNING id INTO v_disparo_id;

  -- PASSO 3: INSERT em sieg_fin_historico_tags_financeiros
  INSERT INTO public.sieg_fin_historico_tags_financeiros (
    financeiro_id,
    empresa_id,
    telefone,
    cnpj,
    tag_anterior,
    tag_nova,
    data_registro
  ) VALUES (
    v_financeiro_id,
    p_empresa_id,
    v_telefone_normalizado,
    p_cnpj,
    NULL,
    v_tag,
    v_agora
  );

  -- RETORNO
  RETURN json_build_object(
    'sucesso', true,
    'financeiro_id', v_financeiro_id,
    'disparo_id', v_disparo_id,
    'tag', v_tag,
    'total_disparos_anteriores', v_total_disparos,
    'mensagem', 'Disparo registrado com sucesso'
  );

EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object(
    'sucesso', false,
    'erro', SQLERRM,
    'detalhe', SQLSTATE
  );
END;
$$;

-- ============================================================
-- RPC 2: sieg_fin_atualizar_status
-- Chamada pelo NicoChat quando tag muda ou pagamento e coletado
-- Encontra o registro mais recente do telefone e atualiza
-- ============================================================
CREATE OR REPLACE FUNCTION public.sieg_fin_atualizar_status(
  p_telefone TEXT,
  p_nova_tag TEXT DEFAULT NULL,
  p_valor_recuperado NUMERIC DEFAULT NULL,
  p_tipo_recuperacao TEXT DEFAULT NULL,
  p_atendente TEXT DEFAULT NULL,
  p_nota_csat NUMERIC DEFAULT NULL,
  p_opiniao_csat TEXT DEFAULT NULL,
  p_historico_conversa TEXT DEFAULT NULL,
  p_data_pagamento DATE DEFAULT NULL,
  p_observacoes TEXT DEFAULT NULL,
  p_empresa_id UUID DEFAULT '0935278d-410d-435c-bc79-adcd8349064b'::UUID
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_registro RECORD;
  v_tag_anterior TEXT;
  v_agora TIMESTAMPTZ := now();
  v_telefone_normalizado TEXT;
BEGIN
  -- Normalizar telefone
  v_telefone_normalizado := public.sieg_fin_normalizar_telefone(p_telefone);

  -- PASSO 1: Buscar registro MAIS RECENTE para este telefone
  SELECT id, tag, valor_recuperado_ia, valor_recuperado_humano, cnpj
  INTO v_registro
  FROM public.sieg_fin_financeiro
  WHERE telefone = v_telefone_normalizado
    AND empresa_id = p_empresa_id
  ORDER BY criado_em DESC
  LIMIT 1;

  -- Se nao encontrou, retornar erro
  IF v_registro.id IS NULL THEN
    RETURN json_build_object(
      'sucesso', false,
      'erro', 'Registro nao encontrado para o telefone: ' || p_telefone,
      'telefone', v_telefone_normalizado
    );
  END IF;

  v_tag_anterior := v_registro.tag;

  -- PASSO 2: UPDATE condicional em sieg_fin_financeiro
  UPDATE public.sieg_fin_financeiro
  SET
    tag = COALESCE(p_nova_tag, tag),
    valor_recuperado_ia = CASE
      WHEN p_tipo_recuperacao = 'ia' AND p_valor_recuperado IS NOT NULL
        THEN COALESCE(valor_recuperado_ia, 0) + p_valor_recuperado
      ELSE valor_recuperado_ia
    END,
    valor_recuperado_humano = CASE
      WHEN p_tipo_recuperacao = 'humano' AND p_valor_recuperado IS NOT NULL
        THEN COALESCE(valor_recuperado_humano, 0) + p_valor_recuperado
      ELSE valor_recuperado_humano
    END,
    atendente = COALESCE(p_atendente, atendente),
    nota_csat = COALESCE(p_nota_csat, nota_csat),
    opiniao_csat = COALESCE(p_opiniao_csat, opiniao_csat),
    historico_conversa = COALESCE(p_historico_conversa, historico_conversa),
    data_pagamento = COALESCE(p_data_pagamento, data_pagamento),
    observacoes = COALESCE(p_observacoes, observacoes),
    situacao = CASE
      WHEN p_valor_recuperado IS NOT NULL AND p_valor_recuperado > 0
        THEN 'concluido'
      ELSE situacao
    END,
    atualizado_em = v_agora
  WHERE id = v_registro.id;

  -- PASSO 3: Registrar mudanca de tag no historico (se mudou)
  IF p_nova_tag IS NOT NULL AND (v_tag_anterior IS DISTINCT FROM p_nova_tag) THEN
    INSERT INTO public.sieg_fin_historico_tags_financeiros (
      financeiro_id,
      empresa_id,
      telefone,
      cnpj,
      tag_anterior,
      tag_nova,
      valor_recuperado_ia,
      data_registro
    ) VALUES (
      v_registro.id,
      p_empresa_id,
      v_telefone_normalizado,
      v_registro.cnpj,
      v_tag_anterior,
      p_nova_tag,
      CASE WHEN p_tipo_recuperacao = 'ia' THEN p_valor_recuperado ELSE NULL END,
      v_agora
    );
  END IF;

  -- PASSO 4: Registrar valor recuperado no historico de valores (se houve)
  IF p_valor_recuperado IS NOT NULL AND p_valor_recuperado > 0 THEN
    INSERT INTO public.sieg_fin_historico_valores_financeiros (
      financeiro_id,
      empresa_id,
      telefone,
      cnpj,
      tipo_valor,
      valor_anterior,
      valor_novo,
      diferenca,
      data_registro
    ) VALUES (
      v_registro.id,
      p_empresa_id,
      v_telefone_normalizado,
      v_registro.cnpj,
      CASE
        WHEN p_tipo_recuperacao = 'ia' THEN 'recuperado_ia'
        WHEN p_tipo_recuperacao = 'humano' THEN 'recuperado_humano'
        ELSE 'recuperado'
      END,
      CASE
        WHEN p_tipo_recuperacao = 'ia' THEN COALESCE(v_registro.valor_recuperado_ia, 0)
        WHEN p_tipo_recuperacao = 'humano' THEN COALESCE(v_registro.valor_recuperado_humano, 0)
        ELSE 0
      END,
      CASE
        WHEN p_tipo_recuperacao = 'ia' THEN COALESCE(v_registro.valor_recuperado_ia, 0) + p_valor_recuperado
        WHEN p_tipo_recuperacao = 'humano' THEN COALESCE(v_registro.valor_recuperado_humano, 0) + p_valor_recuperado
        ELSE p_valor_recuperado
      END,
      p_valor_recuperado,
      v_agora
    );
  END IF;

  -- RETORNO
  RETURN json_build_object(
    'sucesso', true,
    'financeiro_id', v_registro.id,
    'tag_anterior', v_tag_anterior,
    'tag_nova', COALESCE(p_nova_tag, v_tag_anterior),
    'valor_recuperado', p_valor_recuperado,
    'tipo_recuperacao', p_tipo_recuperacao,
    'mensagem', 'Status atualizado com sucesso'
  );

EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object(
    'sucesso', false,
    'erro', SQLERRM,
    'detalhe', SQLSTATE
  );
END;
$$;

-- ============================================================
-- PERMISSOES: NicoChat usa anon key, precisa de GRANT
-- ============================================================
GRANT EXECUTE ON FUNCTION public.sieg_fin_normalizar_telefone TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.sieg_fin_registrar_disparo TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.sieg_fin_atualizar_status TO anon, authenticated, service_role;
