-- Remover versao antiga (sem p_data_vencimento) e recriar com o novo parametro
DROP FUNCTION IF EXISTS public.sieg_fin_registrar_disparo(TEXT, TEXT, NUMERIC, TEXT, TEXT, UUID);

CREATE OR REPLACE FUNCTION public.sieg_fin_registrar_disparo(
  p_telefone TEXT,
  p_nome_empresa TEXT,
  p_valor_em_aberto NUMERIC,
  p_empresa_id UUID,
  p_cnpj TEXT DEFAULT NULL,
  p_nome TEXT DEFAULT NULL,
  p_data_vencimento DATE DEFAULT NULL
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
  v_telefone_normalizado := public.sieg_fin_normalizar_telefone(p_telefone);

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
    COALESCE(p_valor_em_aberto, 0), p_data_vencimento,
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

GRANT EXECUTE ON FUNCTION public.sieg_fin_registrar_disparo TO authenticated, service_role;
