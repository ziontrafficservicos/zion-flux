-- Atualizar sieg_fin_atualizar_status para aceitar data_pagamento no formato BR
-- Aceita: "23/03/2026", "23/03/2026 23:59", "23/03/2026 23:59:00", "2026-03-23"
-- Muda p_data_pagamento de DATE para TEXT e converte internamente

DROP FUNCTION IF EXISTS public.sieg_fin_atualizar_status(TEXT, TEXT, TEXT, TEXT, TEXT, NUMERIC, TEXT, TEXT, DATE, TEXT, UUID);

CREATE OR REPLACE FUNCTION public.sieg_fin_atualizar_status(
  p_telefone TEXT,
  p_nova_tag TEXT DEFAULT NULL,
  p_valor_recuperado TEXT DEFAULT NULL,
  p_tipo_recuperacao TEXT DEFAULT NULL,
  p_atendente TEXT DEFAULT NULL,
  p_nota_csat NUMERIC DEFAULT NULL,
  p_opiniao_csat TEXT DEFAULT NULL,
  p_historico_conversa TEXT DEFAULT NULL,
  p_data_pagamento TEXT DEFAULT NULL,
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
  v_valor NUMERIC;
  v_data_pagamento DATE;
  v_data_limpa TEXT;
  v_partes TEXT[];
BEGIN
  -- Normalizar telefone
  v_telefone_normalizado := public.sieg_fin_normalizar_telefone(p_telefone);

  -- Converter valor: trocar virgula por ponto e remover pontos de milhar
  v_valor := CASE
    WHEN p_valor_recuperado IS NOT NULL AND p_valor_recuperado != '' THEN
      replace(replace(p_valor_recuperado, '.', ''), ',', '.')::NUMERIC
    ELSE NULL
  END;

  -- Converter data de pagamento: aceita formato BR (DD/MM/AAAA) com ou sem hora
  -- "23/03/2026" -> 2026-03-23
  -- "23/03/2026 23:59" -> 2026-03-23
  -- "23/03/2026 23:59:00" -> 2026-03-23
  -- "2026-03-23" -> 2026-03-23
  IF p_data_pagamento IS NOT NULL AND p_data_pagamento != '' THEN
    -- Pegar apenas a parte da data (antes do espaco, se tiver hora)
    v_data_limpa := split_part(p_data_pagamento, ' ', 1);

    IF v_data_limpa ~ '^\d{2}/\d{2}/\d{4}$' THEN
      -- Formato BR: DD/MM/AAAA
      v_partes := string_to_array(v_data_limpa, '/');
      v_data_pagamento := (v_partes[3] || '-' || v_partes[2] || '-' || v_partes[1])::DATE;
    ELSE
      -- Formato ISO ou qualquer outro que o Postgres entenda
      v_data_pagamento := v_data_limpa::DATE;
    END IF;
  END IF;

  -- Buscar registro MAIS RECENTE para este telefone
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

GRANT EXECUTE ON FUNCTION public.sieg_fin_atualizar_status TO anon, authenticated, service_role;
