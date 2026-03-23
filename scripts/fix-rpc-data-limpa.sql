-- Atualizar sieg_fin_atualizar_status para limpar data de pagamento
-- Aceita formatos "sujos" como: "segunda-feira, 23/03/2026 23:59", "23/03/2026,", etc

DROP FUNCTION IF EXISTS public.sieg_fin_atualizar_status(TEXT, TEXT, TEXT, TEXT, TEXT, NUMERIC, TEXT, TEXT, TEXT, TEXT, UUID);

-- Funcao auxiliar para converter data BR (com sujeira) para DATE
CREATE OR REPLACE FUNCTION public.sieg_fin_converter_data_br(p_data TEXT)
RETURNS DATE
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  v_limpo TEXT;
  v_match TEXT;
  v_partes TEXT[];
BEGIN
  IF p_data IS NULL OR trim(p_data) = '' THEN
    RETURN NULL;
  END IF;

  -- Extrair apenas o padrao DD/MM/AAAA de qualquer texto
  -- Funciona com: "segunda-feira, 23/03/2026 23:59", "23/03/2026,", "23/03/2026", etc
  v_match := substring(p_data FROM '(\d{2}/\d{2}/\d{4})');

  IF v_match IS NOT NULL THEN
    -- Formato BR encontrado: DD/MM/AAAA -> AAAA-MM-DD
    v_partes := string_to_array(v_match, '/');
    RETURN (v_partes[3] || '-' || v_partes[2] || '-' || v_partes[1])::DATE;
  END IF;

  -- Tentar extrair formato ISO AAAA-MM-DD
  v_match := substring(p_data FROM '(\d{4}-\d{2}-\d{2})');
  IF v_match IS NOT NULL THEN
    RETURN v_match::DATE;
  END IF;

  -- Ultimo recurso: tentar converter direto
  RETURN trim(both ',' from trim(p_data))::DATE;
END;
$$;

CREATE OR REPLACE FUNCTION public.sieg_fin_atualizar_status(
  p_telefone TEXT,
  p_empresa_id UUID,
  p_nova_tag TEXT DEFAULT NULL,
  p_valor_recuperado TEXT DEFAULT NULL,
  p_tipo_recuperacao TEXT DEFAULT NULL,
  p_atendente TEXT DEFAULT NULL,
  p_nota_csat NUMERIC DEFAULT NULL,
  p_opiniao_csat TEXT DEFAULT NULL,
  p_historico_conversa TEXT DEFAULT NULL,
  p_data_pagamento TEXT DEFAULT NULL,
  p_observacoes TEXT DEFAULT NULL
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
  v_valor NUMERIC;
  v_data_pagamento DATE;
BEGIN
  v_telefone_normalizado := public.sieg_fin_normalizar_telefone(p_telefone);

  -- Converter valor BR
  v_valor := CASE
    WHEN p_valor_recuperado IS NOT NULL AND p_valor_recuperado != '' THEN
      replace(replace(p_valor_recuperado, '.', ''), ',', '.')::NUMERIC
    ELSE NULL
  END;

  -- Converter data BR (aceita qualquer formato sujo)
  v_data_pagamento := public.sieg_fin_converter_data_br(p_data_pagamento);

  SELECT id, tag, valor_recuperado_ia, valor_recuperado_humano, cnpj
  INTO v_registro
  FROM public.sieg_fin_financeiro
  WHERE telefone = v_telefone_normalizado
    AND empresa_id = p_empresa_id
  ORDER BY criado_em DESC
  LIMIT 1;

  IF v_registro.id IS NULL THEN
    RETURN json_build_object(
      'sucesso', false,
      'erro', 'Registro nao encontrado para o telefone: ' || p_telefone,
      'telefone', v_telefone_normalizado
    );
  END IF;

  v_tag_anterior := v_registro.tag;

  UPDATE public.sieg_fin_financeiro
  SET
    tag = COALESCE(p_nova_tag, tag),
    valor_recuperado_ia = CASE
      WHEN p_tipo_recuperacao = 'ia' AND v_valor IS NOT NULL
        THEN COALESCE(valor_recuperado_ia, 0) + v_valor
      ELSE valor_recuperado_ia
    END,
    valor_recuperado_humano = CASE
      WHEN p_tipo_recuperacao = 'humano' AND v_valor IS NOT NULL
        THEN COALESCE(valor_recuperado_humano, 0) + v_valor
      ELSE valor_recuperado_humano
    END,
    atendente = COALESCE(p_atendente, atendente),
    nota_csat = COALESCE(p_nota_csat, nota_csat),
    opiniao_csat = COALESCE(p_opiniao_csat, opiniao_csat),
    historico_conversa = COALESCE(p_historico_conversa, historico_conversa),
    data_pagamento = COALESCE(v_data_pagamento, data_pagamento),
    observacoes = COALESCE(p_observacoes, observacoes),
    situacao = CASE
      WHEN v_valor IS NOT NULL AND v_valor > 0
        THEN 'concluido'
      ELSE situacao
    END,
    atualizado_em = v_agora
  WHERE id = v_registro.id;

  IF p_nova_tag IS NOT NULL AND (v_tag_anterior IS DISTINCT FROM p_nova_tag) THEN
    INSERT INTO public.sieg_fin_historico_tags_financeiros (
      financeiro_id, empresa_id, telefone, cnpj,
      tag_anterior, tag_nova,
      valor_recuperado_ia, data_registro
    ) VALUES (
      v_registro.id, p_empresa_id, v_telefone_normalizado,
      v_registro.cnpj, v_tag_anterior, p_nova_tag,
      CASE WHEN p_tipo_recuperacao = 'ia' THEN v_valor ELSE NULL END,
      v_agora
    );
  END IF;

  IF v_valor IS NOT NULL AND v_valor > 0 THEN
    INSERT INTO public.sieg_fin_historico_valores_financeiros (
      financeiro_id, empresa_id, telefone, cnpj,
      tipo_valor, valor_anterior, valor_novo, diferenca, data_registro
    ) VALUES (
      v_registro.id, p_empresa_id, v_telefone_normalizado,
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
        WHEN p_tipo_recuperacao = 'ia' THEN COALESCE(v_registro.valor_recuperado_ia, 0) + v_valor
        WHEN p_tipo_recuperacao = 'humano' THEN COALESCE(v_registro.valor_recuperado_humano, 0) + v_valor
        ELSE v_valor
      END,
      v_valor,
      v_agora
    );
  END IF;

  RETURN json_build_object(
    'sucesso', true,
    'financeiro_id', v_registro.id,
    'tag_anterior', v_tag_anterior,
    'tag_nova', COALESCE(p_nova_tag, v_tag_anterior),
    'valor_recuperado', v_valor,
    'tipo_recuperacao', p_tipo_recuperacao,
    'data_pagamento', v_data_pagamento,
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

-- Tambem atualizar sieg_fin_registrar_disparo para usar a funcao auxiliar
DROP FUNCTION IF EXISTS public.sieg_fin_registrar_disparo(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, UUID);

CREATE OR REPLACE FUNCTION public.sieg_fin_registrar_disparo(
  p_telefone TEXT,
  p_nome_empresa TEXT,
  p_valor_em_aberto TEXT,
  p_empresa_id UUID,
  p_cnpj TEXT DEFAULT NULL,
  p_nome TEXT DEFAULT NULL,
  p_data_vencimento TEXT DEFAULT NULL
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
  v_valor NUMERIC;
  v_data_vencimento DATE;
BEGIN
  v_telefone_normalizado := public.sieg_fin_normalizar_telefone(p_telefone);

  v_valor := COALESCE(
    NULLIF(
      replace(replace(COALESCE(p_valor_em_aberto, '0'), '.', ''), ',', '.'),
      ''
    )::NUMERIC,
    0
  );

  -- Converter data usando funcao auxiliar (aceita formato BR com sujeira)
  v_data_vencimento := public.sieg_fin_converter_data_br(p_data_vencimento);

  SELECT COUNT(*)
  INTO v_total_disparos
  FROM public.sieg_fin_disparos
  WHERE telefone = v_telefone_normalizado
    AND empresa_id = p_empresa_id
    AND status = 'enviado';

  IF v_total_disparos >= 9 THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.sieg_fin_financeiro
      WHERE telefone = v_telefone_normalizado
        AND empresa_id = p_empresa_id
        AND (COALESCE(valor_recuperado_ia, 0) > 0 OR COALESCE(valor_recuperado_humano, 0) > 0)
    ) THEN
      v_tag := 'T5 - PASSIVEL DE SUSPENSAO';
    END IF;
  END IF;

  INSERT INTO public.sieg_fin_financeiro (
    empresa_id, telefone, nome_empresa, nome, cnpj,
    valor_em_aberto, data_vencimento, tag, situacao,
    criado_em, atualizado_em
  ) VALUES (
    p_empresa_id, v_telefone_normalizado, p_nome_empresa,
    COALESCE(p_nome, p_nome_empresa), p_cnpj,
    v_valor, v_data_vencimento,
    v_tag, 'pendente', v_agora, v_agora
  )
  RETURNING id INTO v_financeiro_id;

  INSERT INTO public.sieg_fin_disparos (
    empresa_id, telefone, nome, empresa, status,
    tipo_disparo, canal, enviado_em, criado_em
  ) VALUES (
    p_empresa_id, v_telefone_normalizado,
    COALESCE(p_nome, p_nome_empresa), p_nome_empresa,
    'enviado', 'cobranca', 'whatsapp', v_agora, v_agora
  )
  RETURNING id INTO v_disparo_id;

  INSERT INTO public.sieg_fin_historico_tags_financeiros (
    financeiro_id, empresa_id, telefone, cnpj,
    tag_anterior, tag_nova, data_registro
  ) VALUES (
    v_financeiro_id, p_empresa_id, v_telefone_normalizado,
    p_cnpj, NULL, v_tag, v_agora
  );

  RETURN json_build_object(
    'sucesso', true,
    'financeiro_id', v_financeiro_id,
    'disparo_id', v_disparo_id,
    'tag', v_tag,
    'total_disparos_anteriores', v_total_disparos,
    'valor_registrado', v_valor,
    'data_vencimento', v_data_vencimento,
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

GRANT EXECUTE ON FUNCTION public.sieg_fin_converter_data_br TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.sieg_fin_registrar_disparo TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.sieg_fin_atualizar_status TO authenticated, service_role;
