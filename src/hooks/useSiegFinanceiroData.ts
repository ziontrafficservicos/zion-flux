import { useState, useEffect, useCallback } from 'react';
import { supabase as centralSupabase } from '@/integrations/supabase/client';
import { useCurrentTenant } from '@/contexts/TenantContext';
import type { ConversationData, ConversationsStats } from './useConversationsData';
import type { LeadStage } from './useLeadsShared';

// ID fixo do workspace SIEG Financeiro
const SIEG_EMPRESA_ID = '98ce360f-baf2-46ff-8d98-f7af80d225fa';

interface SiegFinanceiroRecord {
  id: string;
  nome: string | null;
  nome_empresa: string | null;
  telefone: string | null;
  tag: string | null;
  situacao: string | null;
  atendente: string | null;
  nota_csat: number | null;
  opiniao_csat: string | null;
  valor_em_aberto: number;
  valor_recuperado_ia: number;
  valor_recuperado_humano: number;
  em_negociacao: number;
  historico_conversa: string | null;
  criado_em: string;
  atualizado_em: string;
  data_pesquisa_enviada: string | null;
}

function mapTagToStatus(tag: string | null): "qualified" | "follow-up" | "discarded" {
  if (!tag) return "follow-up";
  const tagUpper = tag.toUpperCase();
  if (tagUpper.includes('PAGO') || tagUpper.includes('T3')) return "qualified";
  if (tagUpper.includes('TRANSFERIDO') || tagUpper.includes('T4')) return "qualified";
  if (tagUpper.includes('SUSPENSÃO') || tagUpper.includes('T5')) return "discarded";
  return "follow-up";
}

function mapTagToStage(tag: string | null): LeadStage | null {
  if (!tag) return null;
  const tagUpper = tag.toUpperCase();
  if (tagUpper.includes('T1') || tagUpper.includes('NOVO')) return 'novo_lead';
  if (tagUpper.includes('T2') || tagUpper.includes('QUALIFICANDO')) return 'qualificacao';
  if (tagUpper.includes('T3') || tagUpper.includes('PAGO')) return 'qualificados';
  if (tagUpper.includes('T4') || tagUpper.includes('TRANSFERIDO')) return 'followup';
  if (tagUpper.includes('T5') || tagUpper.includes('SUSPENSÃO')) return 'descartados';
  return null;
}

function mapCsatToString(nota: number | null): string {
  if (nota === null || nota === undefined) return '-';
  if (nota >= 4) return 'Satisfeito';
  if (nota >= 3) return 'Pouco Satisfeito';
  return 'Insatisfeito';
}

// Função para parsear valor que pode estar em formato brasileiro (1.601) ou decimal (1601.00)
function parseValorBR(valor: any): number {
  if (!valor) return 0;
  const str = String(valor);
  // Se tem ponto mas não tem vírgula, e o ponto não está nas últimas 3 posições como decimal
  // Ex: "1.601" = 1601, "1601.00" = 1601, "1.601,00" = 1601
  if (str.includes('.') && !str.includes(',')) {
    const partes = str.split('.');
    // Se a parte depois do ponto tem 3 dígitos, é separador de milhar
    if (partes.length === 2 && partes[1].length === 3) {
      return parseFloat(str.replace('.', ''));
    }
  }
  // Formato brasileiro com vírgula decimal
  if (str.includes(',')) {
    return parseFloat(str.replace(/\./g, '').replace(',', '.'));
  }
  return parseFloat(str) || 0;
}

function gerarResumoAtendimento(record: SiegFinanceiroRecord): string {
  const partes: string[] = [];
  
  const valorRecuperadoIA = parseValorBR(record.valor_recuperado_ia);
  const valorRecuperadoHumano = parseValorBR(record.valor_recuperado_humano);
  const valorEmAberto = parseValorBR(record.valor_em_aberto);
  const valorRecuperadoTotal = valorRecuperadoIA + valorRecuperadoHumano;
  
  // Situação do atendimento
  if (valorRecuperadoIA > 0) {
    partes.push(`✅ Pagamento confirmado via IA: R$ ${valorRecuperadoIA.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);
  } else if (valorRecuperadoHumano > 0) {
    partes.push(`✅ Pagamento confirmado via Humano: R$ ${valorRecuperadoHumano.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);
  } else if (record.situacao === 'concluido') {
    partes.push('✅ Atendimento concluído');
  } else if (record.situacao === 'pendente') {
    partes.push('⏳ Aguardando pagamento');
  }
  
  // Valor em aberto (só mostra se não pagou nada)
  if (valorEmAberto > 0 && valorRecuperadoTotal === 0) {
    partes.push(`Valor pendente: R$ ${valorEmAberto.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);
  }
  
  // Tag/Estágio
  if (record.tag) {
    const tagSimples = record.tag.replace(/^T\d\s*-?\s*/i, '').trim();
    if (tagSimples && !tagSimples.toLowerCase().includes('pesquisa')) {
      partes.push(`Estágio: ${tagSimples}`);
    }
  }
  
  // Atendente
  if (record.atendente) {
    partes.push(`Atendido por: ${record.atendente === 'IA' ? 'IA Maria' : record.atendente}`);
  }
  
  return partes.length > 0 ? partes.join(' • ') : 'Atendimento em andamento';
}

function parseHistoricoConversa(historico: string | null): any[] {
  if (!historico) return [];
  try {
    // Limpar o JSON - remover caracteres extras como ",\n}" no final
    let cleanedHistorico = historico.trim();
    
    // Remover ",\n}" ou similar no final
    cleanedHistorico = cleanedHistorico.replace(/,?\s*\n?\s*\}?\s*$/, '');
    
    // Se não termina com ], adicionar
    if (!cleanedHistorico.endsWith(']')) {
      // Encontrar o último ] e cortar ali
      const lastBracket = cleanedHistorico.lastIndexOf(']');
      if (lastBracket > 0) {
        cleanedHistorico = cleanedHistorico.substring(0, lastBracket + 1);
      }
    }
    
    // Tenta parsear como JSON
    const parsed = JSON.parse(cleanedHistorico);
    if (Array.isArray(parsed)) {
      // Converter formato "Bot: mensagem" e "You: mensagem" para {role, content}
      const messages = parsed
        .map((msg: string | any) => {
          if (typeof msg === 'string') {
            const trimmedMsg = msg.trim();
            // Ignorar mensagens de template ou muito curtas
            if (trimmedMsg.includes('PT_BR firstmessage') || 
                trimmedMsg.includes('PT_BR followup') ||
                trimmedMsg.length < 3) {
              return null;
            }
            
            if (trimmedMsg.startsWith('Bot:')) {
              const content = trimmedMsg.replace(/^Bot:\s*/, '').trim();
              if (content.length > 0) {
                return { role: 'assistant', content };
              }
            } else if (trimmedMsg.startsWith('You:')) {
              const content = trimmedMsg.replace(/^You:\s*/, '').trim();
              if (content.length > 0) {
                return { role: 'user', content };
              }
            }
            return null;
          }
          return msg;
        })
        .filter(Boolean); // Remover nulls
      
      // Inverter a ordem para mostrar da primeira para a última mensagem (ordem cronológica)
      return messages.reverse();
    }
    return [];
  } catch (e) {
    console.warn('[parseHistoricoConversa] Erro ao parsear:', e);
    // Se não for JSON, retorna como mensagem única
    return [{ role: 'assistant', content: historico }];
  }
}

export function useSiegFinanceiroData(startDate?: Date, endDate?: Date) {
  const { tenant, isLoading: tenantLoading } = useCurrentTenant();
  const [conversations, setConversations] = useState<ConversationData[]>([]);
  const [stats, setStats] = useState<ConversationsStats>({
    totalConversations: 0,
    conversionRate: 0,
    averageDuration: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    // Verificar se é workspace SIEG Financeiro
    const isSiegFinanceiro = tenant?.slug === 'sieg-financeiro' || 
                             tenant?.slug?.includes('financeiro') ||
                             tenant?.id === SIEG_EMPRESA_ID;

    if (!isSiegFinanceiro) {
      console.log('[useSiegFinanceiroData] Não é workspace SIEG Financeiro, ignorando');
      setConversations([]);
      setStats({ totalConversations: 0, conversionRate: 0, averageDuration: 0 });
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      // Construir query base
      let query = (centralSupabase as any)
        .from('sieg_fin_financeiro')
        .select('*')
        .order('atualizado_em', { ascending: false });

      // Data mínima: 04/12/2025 (desconsiderar dados anteriores)
      const DATA_MINIMA = '2025-12-04T00:00:00';
      
      // Aplicar filtro de data se fornecido (mas nunca antes de 04/12/2025)
      let startISO = startDate ? startDate.toISOString() : DATA_MINIMA;
      if (startISO < DATA_MINIMA) {
        startISO = DATA_MINIMA;
      }
      let endISO = null;
      if (endDate) {
        const endDatePlusOne = new Date(endDate);
        endDatePlusOne.setDate(endDatePlusOne.getDate() + 1);
        endISO = endDatePlusOne.toISOString();
      }

      console.log('[useSiegFinanceiroData] Filtros de data:', { startISO, endISO });

      if (startISO) {
        query = query.gte('criado_em', startISO);
      }
      if (endISO) {
        query = query.lt('criado_em', endISO);
      }

      // Buscar TODOS os registros com paginação (sem limite de 500)
      const PAGE_SIZE = 1000;
      let allData: any[] = [];
      let fetchError: any = null;
      
      for (let page = 0; page < 20; page++) { // Máximo 20 páginas = 20.000 registros
        const from = page * PAGE_SIZE;
        const to = from + PAGE_SIZE - 1;
        
        const { data: pageData, error: pageError } = await query
          .range(from, to)
          .order('criado_em', { ascending: false });
        
        if (pageError) {
          fetchError = pageError;
          break;
        }
        
        if (!pageData || pageData.length === 0) {
          break;
        }
        
        allData = [...allData, ...pageData];
        
        if (pageData.length < PAGE_SIZE) {
          break; // Última página
        }
      }
      
      const data = allData;

      if (fetchError) {
        console.error('[useSiegFinanceiroData] Erro ao buscar dados:', fetchError);
        setError(fetchError.message);
        return;
      }

      if (!data || data.length === 0) {
        console.log('[useSiegFinanceiroData] Nenhum dado encontrado');
        setConversations([]);
        setStats({ totalConversations: 0, conversionRate: 0, averageDuration: 0 });
        return;
      }

      // Mapear dados para formato ConversationData
      const mappedConversations: ConversationData[] = (data as SiegFinanceiroRecord[]).map((record, index) => {
        const messages = parseHistoricoConversa(record.historico_conversa);
        const criadoEm = new Date(record.criado_em);
        
        // Término: usar data_pesquisa_enviada (quando recebeu tag de pesquisa de satisfação)
        // Se não tiver, usar atualizado_em como fallback
        const dataPesquisa = record.data_pesquisa_enviada 
          ? new Date(record.data_pesquisa_enviada) 
          : null;
        const atualizadoEm = new Date(record.atualizado_em);
        const endDate = dataPesquisa || atualizadoEm;
        
        // Calcular duração: diferença entre criado e término
        let durationSeconds = Math.floor((endDate.getTime() - criadoEm.getTime()) / 1000);
        
        // Se duração for 0 ou negativa, estimar baseado no número de mensagens (média de 30s por mensagem)
        if (durationSeconds <= 0 && messages.length > 0) {
          durationSeconds = messages.length * 30;
        }

        return {
          id: index + 1, // ID numérico para compatibilidade
          leadId: record.id,
          leadName: record.nome || record.nome_empresa || 'Sem nome',
          phone: record.telefone || '',
          product: record.nome_empresa || undefined,
          status: mapTagToStatus(record.tag),
          tag: record.tag || undefined,
          sentiment: "neutral" as const,
          summary: gerarResumoAtendimento(record),
          startedAt: atualizadoEm, // Usar data da última interação, não data de criação do lead
          endedAt: dataPesquisa || undefined, // Só mostra se tiver data de pesquisa
          duration: Math.max(durationSeconds, 0),
          positives: record.valor_recuperado_ia > 0 ? ['Valor recuperado pela IA'] : [],
          negatives: record.valor_em_aberto > 0 ? ['Valor pendente'] : [],
          suggestions: [],
          adSuggestions: [],
          stageAfter: mapTagToStage(record.tag),
          qualified: record.tag?.includes('PAGO') || record.tag?.includes('T3') || record.valor_recuperado_ia > 0,
          messages: messages,
          csat: record.nota_csat ? mapCsatToString(record.nota_csat) : '-',
          nota_csat: record.nota_csat || undefined,
          opiniao_csat: record.opiniao_csat || undefined,
          analista: record.atendente || undefined,
          valorEmAberto: record.valor_em_aberto || 0,
          valorRecuperadoIA: record.valor_recuperado_ia || 0,
          situacao: record.situacao || undefined,
        };
      });

      setConversations(mappedConversations);

      // Calcular estatísticas
      const totalConversations = mappedConversations.length;
      const qualifiedCount = mappedConversations.filter(c => c.qualified).length;
      const conversionRate = totalConversations > 0 ? (qualifiedCount / totalConversations) * 100 : 0;
      const totalDuration = mappedConversations.reduce((sum, c) => sum + c.duration, 0);
      const averageDuration = totalConversations > 0 ? Math.floor(totalDuration / totalConversations) : 0;

      setStats({
        totalConversations,
        conversionRate,
        averageDuration,
      });

      console.log(`[useSiegFinanceiroData] Carregados ${totalConversations} registros do SIEG Financeiro`);

    } catch (err) {
      console.error('[useSiegFinanceiroData] Erro:', err);
      setError(err instanceof Error ? err.message : 'Erro ao carregar dados');
    } finally {
      setIsLoading(false);
    }
  }, [tenant?.id, tenant?.slug, startDate?.getTime(), endDate?.getTime()]);

  useEffect(() => {
    if (!tenantLoading) {
      console.log('[useSiegFinanceiroData] useEffect triggered - fetching data', {
        startDate: startDate?.toISOString(),
        endDate: endDate?.toISOString(),
      });
      fetchData();
    }
  }, [tenantLoading, fetchData]);

  return {
    conversations,
    stats,
    isLoading,
    error,
    refetch: fetchData,
  };
}
