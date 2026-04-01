// supabase/functions/webhook-sieg-financeiro/index.ts
// Webhook para receber dados do NicoChat e salvar/atualizar no banco financeiro_sieg
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// ID fixo do workspace SIEG Financeiro (tabela empresas/tenants_new)
const SIEG_EMPRESA_ID = '98ce360f-baf2-46ff-8d98-f7af80d225fa'

// Parseia valores monetários em formato brasileiro (vírgula) ou decimal (ponto)
function parseValorBR(valor: any): number {
  if (!valor && valor !== 0) return 0;
  if (typeof valor === 'number') return isNaN(valor) ? 0 : valor;
  const str = String(valor).trim().replace(/^R\$\s*/i, '').trim();
  if (!str) return 0;
  let result: number;
  if (str.includes('.') && !str.includes(',')) {
    const partes = str.split('.');
    if (partes.length === 2 && partes[1].length === 3) {
      result = parseFloat(str.replace('.', ''));
      return isNaN(result) ? 0 : result;
    }
  }
  if (str.includes(',')) {
    result = parseFloat(str.replace(/\./g, '').replace(',', '.'));
    return isNaN(result) ? 0 : result;
  }
  result = parseFloat(str);
  return isNaN(result) ? 0 : result;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Criar cliente Supabase
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    // Pegar dados do body - tenta JSON, se falhar trata como texto
    let body
    const rawText = await req.text()
    try {
      body = JSON.parse(rawText)
    } catch (e) {
      // Se o JSON for invalido, tenta extrair os campos manualmente
      console.log('JSON invalido, tentando extrair campos...')
      const telefoneMatch = rawText.match(/"telefone":\s*"([^"]+)"/)
      const nomeMatch = rawText.match(/"nome":\s*"([^"]+)"/)
      const tagMatch = rawText.match(/"tag":\s*"([^"]+)"/)
      const notaCsatMatch = rawText.match(/"nota_csat":\s*"?(\d+)"?/)
      const opiniaoCsatMatch = rawText.match(/"opiniao_csat":\s*"([^"]+)"/)
      const atendenteMatch = rawText.match(/"atendente":\s*"([^"]+)"/)
      
      // Pega tudo depois de historico_conversa como texto
      const historicoMatch = rawText.match(/"historico_conversa":\s*(.+)/s)
      
      body = {
        telefone: telefoneMatch ? telefoneMatch[1].replace(/[{}]/g, '') : null,
        nome: nomeMatch ? nomeMatch[1].replace(/[{}]/g, '') : null,
        tag: tagMatch ? tagMatch[1] : null,
        nota_csat: notaCsatMatch ? notaCsatMatch[1] : null,
        opiniao_csat: opiniaoCsatMatch ? opiniaoCsatMatch[1] : null,
        atendente: atendenteMatch ? atendenteMatch[1] : null,
        historico_conversa: historicoMatch ? historicoMatch[1].trim() : null
      }
    }
    console.log('Dados recebidos:', body)

    // Validar campo obrigatório
    if (!body.telefone) {
      return new Response(
        JSON.stringify({ sucesso: false, erro: 'Campo obrigatorio: telefone' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Gerar data de hoje no fuso de Brasília (formato DD/MM/YYYY para compatibilidade com NicoChat)
    const agora = new Date().toLocaleString('sv-SE', { timeZone: 'America/Sao_Paulo' }).replace(' ', 'T') + '-03:00'
    const hojeObj = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }))
    const dataDisparoHoje = `${String(hojeObj.getDate()).padStart(2, '0')}/${String(hojeObj.getMonth() + 1).padStart(2, '0')}/${hojeObj.getFullYear()}`

    // Data do disparo: usa a enviada no body ou a data de hoje
    const dataDisparo = body.data_disparo || dataDisparoHoje

    // Buscar registro existente pelo telefone + data_disparo (chave única por disparo)
    const { data: existente } = await supabase
      .from('financeiro_sieg')
      .select('id')
      .eq('telefone', body.telefone)
      .eq('empresa_id', SIEG_EMPRESA_ID)
      .eq('data_disparo', dataDisparo)
      .limit(1)
      .single()

    // Preparar dados base
    const dados: any = {
      empresa_id: SIEG_EMPRESA_ID,
      atualizado_em: agora,
      data_disparo: dataDisparo,
    }

    // Telefone só é adicionado em novos registros
    if (!existente) {
      dados.telefone = body.telefone
    }

    // Adicionar campos se enviados
    if (body.nome_empresa) dados.nome_empresa = body.nome_empresa
    if (body.nome) dados.nome = body.nome
    if (body.cnpj) dados.cnpj = body.cnpj
    if (body.valor_em_aberto !== undefined) dados.valor_em_aberto = parseValorBR(body.valor_em_aberto)
    if (body.valor_recuperado_ia !== undefined) dados.valor_recuperado_ia = parseValorBR(body.valor_recuperado_ia)
    if (body.valor_recuperado_humano !== undefined) dados.valor_recuperado_humano = parseValorBR(body.valor_recuperado_humano)
    if (body.em_negociacao !== undefined) dados.em_negociacao = parseValorBR(body.em_negociacao)
    if (body.situacao) dados.situacao = body.situacao
    if (body.tag) dados.tag = body.tag
    if (body.data_pagamento) dados.data_pagamento = body.data_pagamento
    if (body.data_vencimento) dados.data_vencimento = body.data_vencimento
    if (body.observacoes) dados.observacoes = body.observacoes
    // Campos de pesquisa de satisfacao - sempre usar fuso de Brasília
    if (body.data_pesquisa_enviada || body.enviar_pesquisa) {
      dados.data_pesquisa_enviada = agora // Sempre usa data/hora no fuso de Brasília
    }
    if (body.resposta_satisfacao) dados.resposta_satisfacao = body.resposta_satisfacao
    // Aceitar tanto "atendente" quanto "agente" como nome do atendente
    if (body.atendente) dados.atendente = body.atendente
    if (body.agente) dados.atendente = body.agente
    // Campos CSAT
    if (body.nota_csat !== undefined) dados.nota_csat = parseInt(body.nota_csat) || 0
    if (body.opiniao_csat) dados.opiniao_csat = body.opiniao_csat
    // Historico pode vir como array ou string
    if (body.historico_conversa) {
      if (Array.isArray(body.historico_conversa)) {
        dados.historico_conversa = JSON.stringify(body.historico_conversa)
      } else {
        dados.historico_conversa = body.historico_conversa
      }
    }

    let result
    let acao

    if (existente) {
      // ATUALIZAR registro existente
      const { data, error } = await supabase
        .from('financeiro_sieg')
        .update(dados)
        .eq('id', existente.id)
        .select()
        .single()

      if (error) {
        console.error('Erro ao atualizar:', error)
        return new Response(
          JSON.stringify({ sucesso: false, erro: error.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
      result = data
      acao = 'atualizado'
    } else {
      // INSERIR novo registro
      if (!body.nome && !body.nome_empresa) {
        return new Response(
          JSON.stringify({ sucesso: false, erro: 'Para novo registro: nome ou nome_empresa obrigatorio' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Adicionar criado_em com fuso horário de Brasília
      dados.criado_em = agora

      const { data, error } = await supabase
        .from('financeiro_sieg')
        .insert(dados)
        .select()
        .single()

      if (error) {
        console.error('Erro ao inserir:', error)
        return new Response(
          JSON.stringify({ sucesso: false, erro: error.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
      result = data
      acao = 'criado'
    }

    console.log(`Registro ${acao}:`, result)

    return new Response(
      JSON.stringify({ sucesso: true, mensagem: `Dados ${acao} com sucesso!`, acao, id: result.id }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Erro geral:', error)
    return new Response(
      JSON.stringify({ sucesso: false, erro: 'Erro interno do servidor' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
