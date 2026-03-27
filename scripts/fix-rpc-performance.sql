-- RPC otimizada para alto volume (840+ disparos simultâneos)
-- Remove verificações de T5 do momento do disparo (será feita separadamente)
-- Reduz de 6 operações para 3 INSERTs diretos

-- Remover TODAS as versoes existentes
DROP FUNCTION IF EXISTS public.sieg_fin_registrar_disparo(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, UUID);
DROP FUNCTION IF EXISTS public.sieg_fin_registrar_disparo(TEXT, TEXT, TEXT, UUID, TEXT, TEXT, TEXT);

CREATE OR REPLACE FUNCTION public.sieg_fin_registrar_disparo(
  p_telefone TEXT,
  p_nome_empresa TEXT,
  p_valor_em_aberto TEXT,
  p_cnpj TEXT DEFAULT NULL,
  p_nome TEXT DEFAULT NULL,
  p_data_vencimento TEXT DEFAULT NULL,
  p_empresa_id UUID DEFAULT '0935278d-410d-435c-bc79-adcd8349064b'::UUID
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_financeiro_id UUID;
  v_disparo_id UUID;
  v_agora TIMESTAMPTZ := now();
  v_telefone_normalizado TEXT;
  v_valor NUMERIC;
  v_data_vencimento DATE;
BEGIN
  -- Normalizar telefone (funcao IMMUTABLE, muito rapida)
  v_telefone_normalizado := public.sieg_fin_normalizar_telefone(p_telefone);

  -- Converter valor BR
  v_valor := COALESCE(
    NULLIF(
      replace(replace(COALESCE(p_valor_em_aberto, '0'), '.', ''), ',', '.'),
      ''
    )::NUMERIC,
    0
  );

  -- Converter data BR
  v_data_vencimento := public.sieg_fin_converter_data_br(p_data_vencimento);

  -- INSERT 1: financeiro (registro principal)
  INSERT INTO public.sieg_fin_financeiro (
    empresa_id, telefone, nome_empresa, nome, cnpj,
    valor_em_aberto, data_vencimento, tag, situacao,
    criado_em, atualizado_em
  ) VALUES (
    p_empresa_id, v_telefone_normalizado, p_nome_empresa,
    COALESCE(p_nome, p_nome_empresa), p_cnpj,
    v_valor, v_data_vencimento,
    'T1 - SEM RESPOSTA', 'pendente', v_agora, v_agora
  )
  RETURNING id INTO v_financeiro_id;

  -- INSERT 2: disparo
  INSERT INTO public.sieg_fin_disparos (
    empresa_id, telefone, nome, empresa, status,
    tipo_disparo, canal, enviado_em, criado_em
  ) VALUES (
    p_empresa_id, v_telefone_normalizado,
    COALESCE(p_nome, p_nome_empresa), p_nome_empresa,
    'enviado', 'cobranca', 'whatsapp', v_agora, v_agora
  )
  RETURNING id INTO v_disparo_id;

  -- INSERT 3: historico de tags
  INSERT INTO public.sieg_fin_historico_tags_financeiros (
    financeiro_id, empresa_id, telefone, cnpj,
    tag_anterior, tag_nova, data_registro
  ) VALUES (
    v_financeiro_id, p_empresa_id, v_telefone_normalizado,
    p_cnpj, NULL, 'T1 - SEM RESPOSTA', v_agora
  );

  -- Retorno minimo (menos dados = resposta mais rapida)
  RETURN json_build_object(
    'sucesso', true,
    'id', v_financeiro_id
  );

EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object(
    'sucesso', false,
    'erro', SQLERRM
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.sieg_fin_registrar_disparo TO anon, authenticated, service_role;
