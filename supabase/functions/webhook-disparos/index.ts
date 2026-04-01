// supabase/functions/webhook-disparos/index.ts
// Webhook para registrar cada disparo feito pelo NicohChat
// VERSÃO 5 - Com proteção contra duplicatas (upsert inteligente)
// Se já existe disparo para o telefone no mesmo dia, atualiza o status
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// ID fixo da SIEG Financeiro (padrão)
// DUPLICADO de src/lib/constants.ts — manter sincronizado
const SIEG_EMPRESA_ID = '98ce360f-baf2-46ff-8d98-f7af80d225fa'

// Prioridade dos status (maior número = maior prioridade)
const STATUS_PRIORIDADE: Record<string, number> = {
  'numero_invalido': 1,
  'enviado': 2,
  'suspensao': 3,
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

    // Pegar dados do body
    let body: any = {}
    const rawText = await req.text()
    
    console.log('📥 [Disparo] Raw body:', rawText)
    
    try {
      body = JSON.parse(rawText)
    } catch (e) {
      console.log('⚠️ [Disparo] JSON inválido, extraindo campos...')
      const nomeMatch = rawText.match(/"nome"\s*:\s*"([^"]*)"/)
      const empresaMatch = rawText.match(/"empresa"\s*:\s*"([^"]*)"/)
      const telefoneMatch = rawText.match(/"telefone"\s*:\s*"([^"]*)"/)
      
      body = {
        nome: nomeMatch ? nomeMatch[1] : null,
        empresa: empresaMatch ? empresaMatch[1] : null,
        telefone: telefoneMatch ? telefoneMatch[1] : null,
      }
    }
    
    console.log('📤 [Disparo] Dados parseados:', JSON.stringify(body))

    // Usar SIEG como padrão se não vier empresa
    const empresa = body.empresa || 'SIEG Financeiro'
    const empresaId = SIEG_EMPRESA_ID

    // Status vem do NicohChat - não usar valor padrão
    const statusRecebido = typeof body.status === 'string' && body.status.trim().length > 0
      ? body.status.trim()
      : null

    const telefone = body.telefone || null

    // Se temos telefone, verificar se já existe disparo para esse telefone HOJE
    if (telefone) {
      const hoje = new Date()
      const inicioHoje = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate(), 0, 0, 0).toISOString()
      const fimHoje = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate(), 23, 59, 59).toISOString()

      // Buscar disparo existente para esse telefone hoje
      const { data: disparoExistente, error: erroConsulta } = await supabase
        .from('sieg_fin_disparos')
        .select('id, status')
        .eq('empresa_id', empresaId)
        .eq('telefone', telefone)
        .gte('criado_em', inicioHoje)
        .lte('criado_em', fimHoje)
        .limit(1)
        .single()

      if (!erroConsulta && disparoExistente) {
        // Já existe disparo para esse telefone hoje
        const statusAtual = disparoExistente.status || ''
        const prioridadeAtual = STATUS_PRIORIDADE[statusAtual] || 0
        const prioridadeNovo = STATUS_PRIORIDADE[statusRecebido || ''] || 0

        console.log(`🔄 [Disparo] Telefone ${telefone} já tem disparo hoje. Status atual: ${statusAtual} (${prioridadeAtual}), Novo: ${statusRecebido} (${prioridadeNovo})`)

        // Só atualiza se o novo status tem prioridade maior
        if (prioridadeNovo > prioridadeAtual) {
          const { error: erroUpdate } = await supabase
            .from('sieg_fin_disparos')
            .update({ status: statusRecebido })
            .eq('id', disparoExistente.id)

          if (erroUpdate) {
            console.error('❌ [Disparo] Erro ao atualizar status:', JSON.stringify(erroUpdate))
          } else {
            console.log(`✅ [Disparo] Status atualizado de '${statusAtual}' para '${statusRecebido}'`)
          }

          return new Response(
            JSON.stringify({ 
              sucesso: true, 
              mensagem: 'Status atualizado!',
              id: disparoExistente.id,
              status_anterior: statusAtual,
              status_novo: statusRecebido,
              empresa: empresa
            }),
            { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        } else {
          // Ignora - status atual tem prioridade igual ou maior
          console.log(`⏭️ [Disparo] Ignorado - status '${statusAtual}' tem prioridade >= '${statusRecebido}'`)
          return new Response(
            JSON.stringify({ 
              sucesso: true, 
              mensagem: 'Disparo já registrado com status igual ou superior',
              id: disparoExistente.id,
              status_mantido: statusAtual,
              empresa: empresa
            }),
            { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }
      }
    }

    // Não existe disparo para esse telefone hoje - inserir novo
    const agora = new Date().toISOString()
    const dadosDisparo: any = {
      empresa: empresa,
      empresa_id: empresaId,
      enviado_em: agora,
      status: statusRecebido,
    }

    // Adicionar campos opcionais se existirem
    if (body.nome) dadosDisparo.nome = body.nome
    if (telefone) dadosDisparo.telefone = telefone
    if (body.tipo_disparo) dadosDisparo.tipo_disparo = body.tipo_disparo
    if (body.canal) dadosDisparo.canal = body.canal
    if (body.metadados) dadosDisparo.metadados = body.metadados

    console.log('💾 [Disparo] Inserindo novo:', JSON.stringify(dadosDisparo))

    const { data, error } = await supabase
      .from('sieg_fin_disparos')
      .insert(dadosDisparo)
      .select()
      .single()

    if (error) {
      console.error('❌ [Disparo] Erro insert:', JSON.stringify(error))
      return new Response(
        JSON.stringify({ sucesso: false, erro: error.message, detalhes: error }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('✅ [Disparo] Sucesso! ID:', data.id)

    // RESET DIÁRIO: Se disparo foi 'enviado', resetar tag para T1 na tabela sieg_fin_financeiro
    // Isso permite acompanhar a jornada diária do lead
    if (statusRecebido === 'enviado' && telefone) {
      // Buscar dados financeiros do telefone para registrar valor pendente
      const { data: dadosFinanceiro, error: erroFinanceiro } = await supabase
        .from('sieg_fin_financeiro')
        .select('id, valor_em_aberto, cnpj')
        .eq('empresa_id', empresaId)
        .eq('telefone', telefone)
        .limit(1)
        .single()

      if (!erroFinanceiro && dadosFinanceiro) {
        const valorEmAberto = parseFloat(dadosFinanceiro.valor_em_aberto) || 0

        // Resetar tag para T1
        const { error: erroResetTag } = await supabase
          .from('sieg_fin_financeiro')
          .update({ tag: 'T1 - SEM RESPOSTA' })
          .eq('id', dadosFinanceiro.id)

        if (erroResetTag) {
          console.warn('⚠️ [Disparo] Erro ao resetar tag:', JSON.stringify(erroResetTag))
        } else {
          console.log(`🏷️ [Disparo] Tag resetada para T1 - telefone: ${telefone}`)
        }

        // Registrar valor pendente no histórico (se > 0)
        if (valorEmAberto > 0) {
          const { error: erroHistorico } = await supabase
            .from('sieg_fin_historico_valores_financeiros')
            .insert({
              empresa_id: empresaId,
              financeiro_id: dadosFinanceiro.id,
              telefone: telefone,
              cnpj: dadosFinanceiro.cnpj || null,
              tipo_valor: 'pendente',
              valor_anterior: 0,
              valor_novo: valorEmAberto,
              diferenca: valorEmAberto,
              data_registro: new Date().toISOString()
            })

          if (erroHistorico) {
            console.warn('⚠️ [Disparo] Erro ao registrar histórico pendente:', JSON.stringify(erroHistorico))
          } else {
            console.log(`💰 [Disparo] Valor pendente registrado no histórico: R$ ${valorEmAberto} - telefone: ${telefone}`)
          }
        }
      } else {
        console.log(`⚠️ [Disparo] Telefone ${telefone} não encontrado em sieg_fin_financeiro`)
      }
    }

    return new Response(
      JSON.stringify({ 
        sucesso: true, 
        mensagem: 'Disparo registrado!',
        id: data.id,
        empresa: empresa,
        tag_resetada: statusRecebido === 'enviado'
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error: any) {
    console.error('❌ [Disparo] Erro geral:', error?.message || error)
    return new Response(
      JSON.stringify({ sucesso: false, erro: error?.message || 'Erro interno' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
