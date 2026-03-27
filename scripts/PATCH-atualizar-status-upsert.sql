-- ============================================================
-- PATCH: sieg_fin_atualizar_status → Logica UPSERT
-- ============================================================
-- Projeto: Zion Flux (SIEG Financeiro)
-- Banco: zfgezrwksmuhnrmudnas
-- Data: 2026-03-23
--
-- PROBLEMA:
--   Dos 2.107 disparos de cobranca, ~1.297 NAO foram registrados
--   no Supabase (connection error ~31%). Quando esses leads mudaram
--   de tag (T2, T3, T4), a RPC sieg_fin_atualizar_status retornava
--   erro porque o registro nao existia. Os dados se perderam.
--
-- SOLUCAO:
--   Adicionar logica UPSERT: se o registro NAO existe, cria um novo
--   com os dados minimos (telefone, tag, valores informados).
--   Se o registro JA existe, atualiza normalmente (comportamento atual).
--
-- INSTRUCOES:
--   1. Abra o Supabase Dashboard → SQL Editor
--   2. Cole TODO o conteudo deste arquivo
--   3. Clique em "Run"
--   4. Pronto! A funcao estara atualizada com logica UPSERT.
--
-- ROLLBACK:
--   Se precisar reverter, execute o script VERSAO-FINAL-rpcs-nicochat.sql
--   que contem a versao anterior da funcao.
--
-- IMPORTANTE: Este patch NAO altera sieg_fin_registrar_disparo.
-- ============================================================


-- ============================================================
-- PASSO 1: Limpar versoes anteriores (evita conflito de assinatura)
-- ============================================================
DROP FUNCTION IF EXISTS public.sieg_fin_atualizar_status(TEXT, TEXT, TEXT, TEXT, TEXT, NUMERIC, TEXT, TEXT, TEXT, TEXT, UUID);
DROP FUNCTION IF EXISTS public.sieg_fin_atualizar_status(TEXT, TEXT, TEXT, TEXT, TEXT, NUMERIC, TEXT, TEXT, DATE, TEXT, UUID);
DROP FUNCTION IF EXISTS public.sieg_fin_atualizar_status(TEXT, UUID, TEXT, TEXT, TEXT, TEXT, NUMERIC, TEXT, TEXT, TEXT, TEXT);


-- ============================================================
-- PASSO 2: Nova versao da RPC — com logica UPSERT
-- ============================================================
-- Chamada pelo NicoChat nos Pontos 2, 3, 4, 5:
--   Ponto 2: Cliente respondeu        → p_nova_tag = "T2 - RESPONDIDO"
--   Ponto 3: IA validou comprovante   → p_nova_tag = "T3 - PAGO IA", p_valor_recuperado, p_tipo_recuperacao = "ia"
--   Ponto 4: Transferiu pra humano    → p_nova_tag = "T4 - TRANSFERIDO", p_atendente
--   Ponto 5: Humano coletou pagamento → p_valor_recuperado, p_tipo_recuperacao = "humano", p_nota_csat, etc
--
-- NOVO COMPORTAMENTO (v2 — UPSERT):
--   - Se o registro EXISTE  → UPDATE (comportamento identico ao anterior)
--   - Se o registro NAO EXISTE → INSERT com dados minimos + tag informada
--     Isso resolve o gap dos leads que nao foram registrados pelo disparo
--     mas que responderam e mudaram de tag.
--
-- IMPORTANTE: p_empresa_id fica NO FINAL com DEFAULT
-- Se nao enviar empresa_id, usa o padrao da SIEG automaticamente
-- ============================================================
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
  v_financeiro_id UUID;
  v_is_new_record BOOLEAN := false;
BEGIN
  -- Normalizar telefone
  v_telefone_normalizado := public.sieg_fin_normalizar_telefone(p_telefone);

  -- Converter valor BR ("1.297,90" → 1297.90)
  v_valor := CASE
    WHEN p_valor_recuperado IS NOT NULL AND p_valor_recuperado != '' THEN
      replace(replace(p_valor_recuperado, '.', ''), ',', '.')::NUMERIC
    ELSE NULL
  END;

  -- Converter data BR (aceita formato sujo)
  v_data_pagamento := public.sieg_fin_converter_data_br(p_data_pagamento);

  -- Buscar registro MAIS RECENTE para este telefone
  SELECT id, tag, valor_recuperado_ia, valor_recuperado_humano, cnpj
  INTO v_registro
  FROM public.sieg_fin_financeiro
  WHERE telefone = v_telefone_normalizado
    AND empresa_id = p_empresa_id
  ORDER BY criado_em DESC
  LIMIT 1;

  -- ============================================================
  -- NOVO: Se nao encontrou registro, CRIA um novo (logica UPSERT)
  -- Isso resolve o gap dos leads que nao foram registrados pelo
  -- sieg_fin_registrar_disparo (connection error) mas que
  -- responderam e mudaram de tag via NicoChat.
  -- ============================================================
  IF v_registro.id IS NULL THEN
    v_is_new_record := true;
    v_tag_anterior := NULL;

    INSERT INTO public.sieg_fin_financeiro (
      empresa_id,
      telefone,
      nome_empresa,
      nome,
      tag,
      situacao,
      atendente,
      valor_recuperado_ia,
      valor_recuperado_humano,
      nota_csat,
      opiniao_csat,
      historico_conversa,
      data_pagamento,
      observacoes,
      criado_em,
      atualizado_em
    ) VALUES (
      p_empresa_id,
      v_telefone_normalizado,
      NULL,  -- nome_empresa desconhecido (nao veio no disparo)
      NULL,  -- nome desconhecido
      COALESCE(p_nova_tag, 'T2 - RESPONDIDO'),  -- se nao informar tag, assume T2 (respondeu)
      CASE
        WHEN v_valor IS NOT NULL AND v_valor > 0 THEN 'concluido'
        ELSE 'pendente'
      END,
      p_atendente,
      CASE WHEN p_tipo_recuperacao = 'ia' AND v_valor IS NOT NULL THEN v_valor ELSE 0 END,
      CASE WHEN p_tipo_recuperacao = 'humano' AND v_valor IS NOT NULL THEN v_valor ELSE 0 END,
      p_nota_csat,
      p_opiniao_csat,
      p_historico_conversa,
      v_data_pagamento,
      COALESCE(p_observacoes, 'Registro criado automaticamente via atualizar_status (sem disparo registrado)'),
      v_agora,
      v_agora
    )
    RETURNING id INTO v_financeiro_id;

    -- Registrar no historico de tags (criacao)
    INSERT INTO public.sieg_fin_historico_tags_financeiros (
      financeiro_id, empresa_id, telefone, cnpj,
      tag_anterior, tag_nova,
      valor_recuperado_ia, data_registro
    ) VALUES (
      v_financeiro_id, p_empresa_id, v_telefone_normalizado,
      NULL,  -- cnpj desconhecido
      NULL,  -- sem tag anterior (registro novo)
      COALESCE(p_nova_tag, 'T2 - RESPONDIDO'),
      CASE WHEN p_tipo_recuperacao = 'ia' THEN v_valor ELSE NULL END,
      v_agora
    );

    -- Registrar valor recuperado no historico (se houver)
    IF v_valor IS NOT NULL AND v_valor > 0 THEN
      INSERT INTO public.sieg_fin_historico_valores_financeiros (
        financeiro_id, empresa_id, telefone, cnpj,
        tipo_valor, valor_anterior, valor_novo, diferenca, data_registro
      ) VALUES (
        v_financeiro_id, p_empresa_id, v_telefone_normalizado,
        NULL,  -- cnpj desconhecido
        CASE
          WHEN p_tipo_recuperacao = 'ia' THEN 'recuperado_ia'
          WHEN p_tipo_recuperacao = 'humano' THEN 'recuperado_humano'
          ELSE 'recuperado'
        END,
        0,       -- valor_anterior = 0 (registro novo)
        v_valor, -- valor_novo = valor informado
        v_valor, -- diferenca = valor total (era 0)
        v_agora
      );
    END IF;

    -- Retorno indicando que foi CRIADO (nao atualizado)
    RETURN json_build_object(
      'sucesso', true,
      'financeiro_id', v_financeiro_id,
      'tag_anterior', NULL,
      'tag_nova', COALESCE(p_nova_tag, 'T2 - RESPONDIDO'),
      'valor_recuperado', v_valor,
      'tipo_recuperacao', p_tipo_recuperacao,
      'data_pagamento', v_data_pagamento,
      'registro_criado', true,
      'mensagem', 'Registro criado automaticamente e status atualizado (sem disparo anterior)'
    );
  END IF;

  -- ============================================================
  -- FLUXO EXISTENTE: Registro encontrado → UPDATE normal
  -- (comportamento 100% identico ao anterior)
  -- ============================================================
  v_tag_anterior := v_registro.tag;

  -- Atualizar registro financeiro
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

  -- Registrar mudanca de tag no historico
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

  -- Registrar valor recuperado no historico
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
    'registro_criado', false,
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
-- PASSO 3: Permissoes (regarantir acesso)
-- ============================================================
GRANT EXECUTE ON FUNCTION public.sieg_fin_atualizar_status TO anon, authenticated, service_role;


-- ============================================================
-- PASSO 4: Recarregar cache do PostgREST
-- ============================================================
NOTIFY pgrst, 'reload schema';


-- ============================================================
-- PRONTO! A funcao sieg_fin_atualizar_status agora tem logica UPSERT.
--
-- TESTE RAPIDO:
--   Chamar com um telefone que NAO existe no banco:
--   POST /rest/v1/rpc/sieg_fin_atualizar_status
--   { "p_telefone": "5511999999999", "p_nova_tag": "T2 - RESPONDIDO" }
--
--   Resultado esperado:
--   { "sucesso": true, "registro_criado": true, ... }
--
-- COMO IDENTIFICAR registros criados via UPSERT:
--   SELECT * FROM sieg_fin_financeiro
--   WHERE observacoes LIKE '%criado automaticamente%';
-- ============================================================
