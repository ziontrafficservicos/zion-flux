-- ============================================================
-- VERSAO FINAL CONSOLIDADA — RPCs NicoChat → Supabase
-- ============================================================
-- Projeto: Zion Flux (SIEG Financeiro)
-- Banco: zfgezrwksmuhnrmudnas
-- Atualizado em: 2026-03-23
--
-- INSTRUCOES:
--   Este e o UNICO arquivo que deve ser executado.
--   Ele contem TODAS as funcoes necessarias para a integracao
--   NicoChat ↔ Dashboard Financeiro.
--
--   Para executar:
--   1. Abra o Supabase Dashboard → SQL Editor
--   2. Cole TODO o conteudo deste arquivo
--   3. Clique em "Run"
--   4. Pronto! Todas as funcoes estarao atualizadas.
--
-- NAO execute os outros scripts fix-rpc-*.sql
-- Eles sao versoes antigas e podem QUEBRAR o sistema.
-- ============================================================


-- ============================================================
-- PASSO 1: Limpar versoes antigas (evita conflito de assinaturas)
-- ============================================================
DROP FUNCTION IF EXISTS public.sieg_fin_registrar_disparo(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, UUID);
DROP FUNCTION IF EXISTS public.sieg_fin_registrar_disparo(TEXT, TEXT, TEXT, UUID, TEXT, TEXT, TEXT);
DROP FUNCTION IF EXISTS public.sieg_fin_registrar_disparo(TEXT, TEXT, NUMERIC, TEXT, TEXT, DATE, UUID);
DROP FUNCTION IF EXISTS public.sieg_fin_atualizar_status(TEXT, TEXT, TEXT, TEXT, TEXT, NUMERIC, TEXT, TEXT, TEXT, TEXT, UUID);
DROP FUNCTION IF EXISTS public.sieg_fin_atualizar_status(TEXT, TEXT, TEXT, TEXT, TEXT, NUMERIC, TEXT, TEXT, DATE, TEXT, UUID);
DROP FUNCTION IF EXISTS public.sieg_fin_atualizar_status(TEXT, UUID, TEXT, TEXT, TEXT, TEXT, NUMERIC, TEXT, TEXT, TEXT, TEXT);


-- ============================================================
-- PASSO 2: Indices de performance
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_sieg_fin_financeiro_empresa_tel_criado
  ON public.sieg_fin_financeiro(empresa_id, telefone, criado_em DESC);

CREATE INDEX IF NOT EXISTS idx_sieg_fin_disparos_empresa_tel_criado
  ON public.sieg_fin_disparos(empresa_id, telefone, criado_em DESC);


-- ============================================================
-- PASSO 3: Funcao auxiliar — Normalizar telefone
-- Remove +, espacos, hifens, parenteses — deixa so numeros
-- Exemplo: "+55 (11) 99999-9999" → "5511999999999"
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
-- PASSO 4: Funcao auxiliar — Converter data formato BR
-- Aceita qualquer formato "sujo":
--   "23/03/2026"                    → 2026-03-23
--   "23/03/2026 23:59"              → 2026-03-23
--   "segunda-feira, 23/03/2026"     → 2026-03-23
--   "23/03/2026,"                   → 2026-03-23
--   "2026-03-23"                    → 2026-03-23
-- ============================================================
CREATE OR REPLACE FUNCTION public.sieg_fin_converter_data_br(p_data TEXT)
RETURNS DATE
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  v_match TEXT;
  v_partes TEXT[];
BEGIN
  IF p_data IS NULL OR trim(p_data) = '' THEN
    RETURN NULL;
  END IF;

  -- Extrair padrao DD/MM/AAAA de qualquer texto usando regex
  v_match := substring(p_data FROM '(\d{2}/\d{2}/\d{4})');

  IF v_match IS NOT NULL THEN
    -- Formato BR: DD/MM/AAAA → AAAA-MM-DD
    v_partes := string_to_array(v_match, '/');
    RETURN (v_partes[3] || '-' || v_partes[2] || '-' || v_partes[1])::DATE;
  END IF;

  -- Tentar formato ISO: AAAA-MM-DD
  v_match := substring(p_data FROM '(\d{4}-\d{2}-\d{2})');
  IF v_match IS NOT NULL THEN
    RETURN v_match::DATE;
  END IF;

  -- Ultimo recurso: limpar virgulas e tentar converter
  RETURN trim(both ',' from trim(p_data))::DATE;
END;
$$;


-- ============================================================
-- PASSO 5: RPC PRINCIPAL 1 — sieg_fin_registrar_disparo
-- ============================================================
-- Chamada pelo NicoChat quando o template de cobranca e enviado (Ponto 1)
-- Cria: 1 registro financeiro + 1 disparo + 1 historico de tag
--
-- Parametros obrigatorios: p_telefone, p_nome_empresa, p_valor_em_aberto
-- Parametros opcionais: p_cnpj, p_nome, p_data_vencimento, p_empresa_id
--
-- Aceita valores BR: "1.297,90" → 1297.90
-- Aceita datas BR: "23/03/2026" → 2026-03-23
-- ============================================================
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
  v_tag TEXT := 'T1 - SEM RESPOSTA';
  v_agora TIMESTAMPTZ := now();
  v_telefone_normalizado TEXT;
  v_total_disparos BIGINT;
  v_valor NUMERIC;
  v_data_vencimento DATE;
BEGIN
  -- Normalizar telefone (remove +, espacos, hifens)
  v_telefone_normalizado := public.sieg_fin_normalizar_telefone(p_telefone);

  -- Converter valor BR ("1.297,90" → 1297.90)
  v_valor := COALESCE(
    NULLIF(
      replace(replace(COALESCE(p_valor_em_aberto, '0'), '.', ''), ',', '.'),
      ''
    )::NUMERIC,
    0
  );

  -- Converter data BR (aceita formato sujo)
  v_data_vencimento := public.sieg_fin_converter_data_br(p_data_vencimento);

  -- Verificar se ja tem 9+ disparos (candidato a T5)
  SELECT COUNT(*)
  INTO v_total_disparos
  FROM public.sieg_fin_disparos
  WHERE telefone = v_telefone_normalizado
    AND empresa_id = p_empresa_id
    AND status = 'enviado';

  IF v_total_disparos >= 9 THEN
    -- So marca T5 se nunca pagou nada
    IF NOT EXISTS (
      SELECT 1 FROM public.sieg_fin_financeiro
      WHERE telefone = v_telefone_normalizado
        AND empresa_id = p_empresa_id
        AND (COALESCE(valor_recuperado_ia, 0) > 0 OR COALESCE(valor_recuperado_humano, 0) > 0)
    ) THEN
      v_tag := 'T5 - PASSIVEL DE SUSPENSAO';
    END IF;
  END IF;

  -- INSERT 1: Registro financeiro principal
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

  -- INSERT 2: Registro do disparo
  INSERT INTO public.sieg_fin_disparos (
    empresa_id, telefone, nome, empresa, status,
    tipo_disparo, canal, enviado_em, criado_em
  ) VALUES (
    p_empresa_id, v_telefone_normalizado,
    COALESCE(p_nome, p_nome_empresa), p_nome_empresa,
    'enviado', 'cobranca', 'whatsapp', v_agora, v_agora
  )
  RETURNING id INTO v_disparo_id;

  -- INSERT 3: Historico de tags
  INSERT INTO public.sieg_fin_historico_tags_financeiros (
    financeiro_id, empresa_id, telefone, cnpj,
    tag_anterior, tag_nova, data_registro
  ) VALUES (
    v_financeiro_id, p_empresa_id, v_telefone_normalizado,
    p_cnpj, NULL, v_tag, v_agora
  );

  -- Retorno com dados uteis
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


-- ============================================================
-- PASSO 6: RPC PRINCIPAL 2 — sieg_fin_atualizar_status
-- ============================================================
-- Chamada pelo NicoChat nos Pontos 2, 3, 4, 5:
--   Ponto 2: Cliente respondeu        → p_nova_tag = "T2 - RESPONDIDO"
--   Ponto 3: IA validou comprovante   → p_nova_tag = "T3 - PAGO IA", p_valor_recuperado, p_tipo_recuperacao = "ia"
--   Ponto 4: Transferiu pra humano    → p_nova_tag = "T4 - TRANSFERIDO", p_atendente
--   Ponto 5: Humano coletou pagamento → p_valor_recuperado, p_tipo_recuperacao = "humano", p_nota_csat, etc
--
-- COMPORTAMENTO (v2 — UPSERT):
--   - Se o registro EXISTE  → UPDATE (comportamento identico ao v1)
--   - Se o registro NAO EXISTE → INSERT com dados minimos + tag informada
--     Resolve o gap dos leads que nao foram registrados pelo disparo
--     (connection error) mas que responderam e mudaram de tag.
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
  -- UPSERT: Se nao encontrou registro, CRIA um novo
  -- Resolve o gap dos leads que nao foram registrados pelo
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
-- PASSO 7: Permissoes — liberar acesso para chamadas via API
-- ============================================================
GRANT EXECUTE ON FUNCTION public.sieg_fin_normalizar_telefone TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.sieg_fin_converter_data_br TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.sieg_fin_registrar_disparo TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.sieg_fin_atualizar_status TO anon, authenticated, service_role;


-- ============================================================
-- PASSO 8: Recarregar cache do PostgREST
-- (necessario para que as funcoes fiquem visiveis na API REST)
-- ============================================================
NOTIFY pgrst, 'reload schema';


-- ============================================================
-- PRONTO! Todas as funcoes estao atualizadas.
-- Teste com:
--   POST /rest/v1/rpc/sieg_fin_registrar_disparo
--   POST /rest/v1/rpc/sieg_fin_atualizar_status
-- ============================================================
