import { useState, useEffect } from 'react';
import { supabase as centralSupabase } from '@/integrations/supabase/client';
import { useCurrentTenant } from '@/contexts/TenantContext';

// Interface com notas 1-5
export interface CSATData {
  analista: string;
  csatMedio: number;
  totalAtendimentos: number;
  nota1: number;
  nota2: number;
  nota3: number;
  nota4: number;
  nota5: number;
  // Compatibilidade com código antigo
  satisfeito?: number;
  poucoSatisfeito?: number;
  insatisfeito?: number;
}

// Feedback individual de CSAT
export interface CSATFeedback {
  nota: number;
  feedback: string;
  analista: string;
  nome?: string;
  telefone?: string;
  data: string;
  origem?: 'ia' | 'humano';
}

// Totais gerais para exibição
export interface CSATTotals {
  csatMedioGeral: number;
  totalAvaliacoes: number;
  distribuicao: {
    nota1: number;
    nota2: number;
    nota3: number;
    nota4: number;
    nota5: number;
  };
}

// Mapeamento de palavras para notas numéricas 1-5
const CSAT_WORD_TO_NUMBER: Record<string, number> = {
  // Nota 5
  'muito satisfeito': 5,
  'muito satisfeita': 5,
  'excelente': 5,
  'otimo': 5,
  'ótimo': 5,
  'perfeito': 5,
  // Nota 4
  'satisfeito': 4,
  'satisfeita': 4,
  'bom': 4,
  // Nota 3
  'pouco satisfeito': 3,
  'pouco satisfeita': 3,
  'regular': 3,
  'neutro': 3,
  'ok': 3,
  // Nota 2
  'insatisfeito': 2,
  'insatisfeita': 2,
  'ruim': 2,
  // Nota 1
  'muito insatisfeito': 1,
  'muito insatisfeita': 1,
  'pessimo': 1,
  'péssimo': 1,
};

// Função para extrair nota CSAT do histórico de conversa
function extractCsatFromHistorico(historico: string | null): { nota: number | null; feedback: string | null } {
  if (!historico) return { nota: null, feedback: null };
  
  try {
    const historicoLower = historico.toLowerCase();
    
    // Procurar por respostas numéricas diretas (1-5)
    const numericMatch = historicoLower.match(/you:\s*([1-5])\s*["\\]/i);
    if (numericMatch) {
      const nota = parseInt(numericMatch[1], 10);
      return { nota, feedback: String(nota) };
    }
    
    // Procurar por palavras-chave (priorizar frases mais específicas primeiro)
    // Nota 5
    if (historicoLower.includes('muito satisfeito') || historicoLower.includes('muito satisfeita') || historicoLower.includes('excelente')) {
      return { nota: 5, feedback: '5' };
    }
    // Nota 1 (antes de "insatisfeito" sozinho)
    if (historicoLower.includes('muito insatisfeito') || historicoLower.includes('muito insatisfeita') || historicoLower.includes('pessimo') || historicoLower.includes('péssimo')) {
      return { nota: 1, feedback: '1' };
    }
    // Nota 3 (antes de "satisfeito" sozinho)
    if (historicoLower.includes('pouco satisfeito') || historicoLower.includes('pouco satisfeita')) {
      return { nota: 3, feedback: '3' };
    }
    // Nota 4
    if (historicoLower.match(/you:\s*satisfeit[oa]/i) || historicoLower.includes('"you: satisfeito"') || historicoLower.includes('"you: satisfeita"')) {
      return { nota: 4, feedback: '4' };
    }
    // Nota 2
    if (historicoLower.match(/you:\s*insatisfeit[oa]/i) || historicoLower.includes('"you: insatisfeito"')) {
      return { nota: 2, feedback: '2' };
    }
    // Nota 3 (neutro/regular)
    if (historicoLower.match(/you:\s*(regular|neutro|ok)/i)) {
      return { nota: 3, feedback: '3' };
    }
  } catch (e) {
    console.warn('Erro ao extrair CSAT do histórico:', e);
  }
  
  return { nota: null, feedback: null };
}

export function useCSATData(_workspaceId: string, startDate?: Date, endDate?: Date) {
  const [data, setData] = useState<CSATData[]>([]);
  const [feedbacks, setFeedbacks] = useState<CSATFeedback[]>([]);
  const [totals, setTotals] = useState<CSATTotals>({
    csatMedioGeral: 0,
    totalAvaliacoes: 0,
    distribuicao: { nota1: 0, nota2: 0, nota3: 0, nota4: 0, nota5: 0 }
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { tenant, isLoading: tenantLoading } = useCurrentTenant();

  useEffect(() => {
    async function fetchCSATData() {
      if (tenantLoading) return;
      if (!tenant) {
        setData([]);
        setIsLoading(false);
        return;
      }

      // CSAT disponível apenas para Sieg Financeiro
      const isSiegFinanceiro = tenant.slug === 'sieg-financeiro' || tenant.slug?.includes('financeiro');
      console.log('📊 CSAT - Verificando tenant:', { slug: tenant.slug, isSiegFinanceiro });
      if (!isSiegFinanceiro) {
        setData([]);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        // Converter texto para nota numérica 1-5
        const mapCsatToNumber = (value: string): number | null => {
          const cleaned = value
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/[()]/g, '')
            .trim()
            .toLowerCase()
            .replace(/\s+/g, ' ');

          // Se já for número 1-5, usar diretamente
          const numValue = parseInt(cleaned, 10);
          if (!isNaN(numValue) && numValue >= 1 && numValue <= 5) {
            return numValue;
          }

          // Usar o mapeamento de palavras para números
          if (CSAT_WORD_TO_NUMBER[cleaned]) {
            return CSAT_WORD_TO_NUMBER[cleaned];
          }

          return null;
        };

        // Filtros de data
        // Data mínima: 04/12/2025 (desconsiderar dados anteriores)
        const DATA_MINIMA = '2025-12-04T00:00:00';
        
        let filterStartDate: string;
        let filterEndDate: string | undefined;

        if (startDate) {
          filterStartDate = startDate.toISOString().split('T')[0] + 'T00:00:00';
        } else {
          filterStartDate = DATA_MINIMA;
        }
        
        // Garantir que nunca seja antes de 04/12/2025
        if (filterStartDate < DATA_MINIMA) {
          filterStartDate = DATA_MINIMA;
        }

        if (endDate) {
          filterEndDate = endDate.toISOString().split('T')[0] + 'T23:59:59';
        }

        console.log('📅 DEBUG CSAT - Filtro:', { tenantId: tenant.id, startDate: filterStartDate, endDate: filterEndDate });

        // Para SIEG Financeiro, buscar da tabela sieg_fin_financeiro COM PAGINAÇÃO
        const PAGE_SIZE = 1000;
        let allRegistros: any[] = [];
        let fetchError: any = null;
        
        // Buscar todos os registros com paginação
        for (let page = 0; page < 10; page++) { // Máximo 10 páginas = 10.000 registros
          const from = page * PAGE_SIZE;
          const to = from + PAGE_SIZE - 1;
          
          let query = (centralSupabase as any)
            .from('sieg_fin_financeiro')
            .select('id, nome, nome_empresa, telefone, atendente, nota_csat, opiniao_csat, historico_conversa, tag, criado_em')
            .eq('empresa_id', tenant.id)
            .gte('criado_em', filterStartDate)
            .order('criado_em', { ascending: false })
            .range(from, to);

          if (filterEndDate) {
            query = query.lte('criado_em', filterEndDate);
          }

          const { data: pageData, error: pageError } = await query;
          
          if (pageError) {
            fetchError = pageError;
            break;
          }
          
          if (!pageData || pageData.length === 0) {
            break; // Sem mais dados
          }
          
          allRegistros = [...allRegistros, ...pageData];
          
          if (pageData.length < PAGE_SIZE) {
            break; // Última página
          }
        }
        
        const registros = allRegistros;

        console.log('🔍 DEBUG CSAT - Dados brutos sieg_fin_financeiro:', { totalRegistros: registros?.length || 0 });
        
        // DEBUG: Mostrar exemplos de registros com seus campos
        console.log('🔬 DEBUG CSAT - Exemplos de registros:', registros?.slice(0, 5).map(r => ({
          nome: r.nome,
          nota_csat: r.nota_csat,
          opiniao_csat: r.opiniao_csat,
          opiniao_csat_type: typeof r.opiniao_csat,
          opiniao_csat_length: r.opiniao_csat?.length,
          historico_conversa_preview: r.historico_conversa?.substring(0, 100)
        })));
        
        // DEBUG: Mostrar histórico completo de um registro com nota
        const registroComNota = registros?.find(r => r.nota_csat && r.nota_csat > 0);
        if (registroComNota) {
          console.log('📝 DEBUG CSAT - Registro COM NOTA completo:', {
            nome: registroComNota.nome,
            nota_csat: registroComNota.nota_csat,
            opiniao_csat: registroComNota.opiniao_csat,
            historico_conversa: registroComNota.historico_conversa
          });
        }

        if (fetchError) throw fetchError;

        if (!registros || registros.length === 0) {
          setData([]);
          setFeedbacks([]);
          setTotals({ csatMedioGeral: 0, totalAvaliacoes: 0, distribuicao: { nota1: 0, nota2: 0, nota3: 0, nota4: 0, nota5: 0 } });
          setIsLoading(false);
          return;
        }

        // Coletar feedbacks (justificativas)
        const feedbacksList: CSATFeedback[] = [];

        // Agrupar por analista/atendente com notas 1-5
        const grouped = (registros || []).reduce((acc: any, registro: any) => {
          // Tentar obter atendente do campo ou usar "IA Maria" como padrão
          let analista = registro.atendente;
          
          // Se não tem atendente, verificar se foi transferido (T4) = humano, senão = IA
          if (!analista || analista.trim() === '') {
            const tag = registro.tag || '';
            if (tag.includes('T4') || tag.includes('TRANSFERIDO')) {
              analista = 'Atendente Humano';
            } else {
              analista = 'IA Maria';
            }
          } else if (analista.toUpperCase() === 'IA') {
            // Se o atendente é "IA", mostrar como "IA Maria"
            analista = 'IA Maria';
          }

          // Verificar se tem opinião primeiro
          const temOpiniao = registro.opiniao_csat && registro.opiniao_csat.trim() !== '';
          
          // DEBUG: Log de cada registro processado
          if (registro.telefone === '5511949107938') {
            console.log('🔍 DEBUG - Processando registro específico:', {
              telefone: registro.telefone,
              nota_csat: registro.nota_csat,
              opiniao_csat: registro.opiniao_csat,
              temOpiniao,
              criado_em: registro.criado_em
            });
          }
          
          // Obter nota do campo nota_csat (APENAS notas válidas 1-5)
          let nota: number | null = null;
          
          // APENAS usar nota_csat se for válida (1-5) — converter para número pois o campo é TEXT no banco
          const notaCsatNum = typeof registro.nota_csat === 'string' ? parseInt(registro.nota_csat, 10) : Number(registro.nota_csat);
          if (!isNaN(notaCsatNum) && notaCsatNum >= 1 && notaCsatNum <= 5) {
            nota = notaCsatNum;
          }

          // Se não tem nota válida, pular este registro
          if (!nota) return acc;

          // Coletar feedback do campo opiniao_csat (prioridade)
          let feedbackTexto = registro.opiniao_csat?.trim();
          
          // IMPORTANTE: NÃO usar histórico como fallback, apenas opiniao_csat
          // Se não tem opiniao_csat, não adicionar à lista de feedbacks
          
          if (feedbackTexto && feedbackTexto !== '') {
            // Determinar origem baseado no atendente
            let origem: 'ia' | 'humano' = 'humano';
            if (analista === 'IA Maria' || analista === 'IA' || registro.atendente === 'IA') {
              origem = 'ia';
            }
            
            console.log('✅ DEBUG CSAT - Feedback encontrado:', {
              nome: registro.nome,
              nota,
              feedback: feedbackTexto.substring(0, 50),
              analista,
              origem,
              atendente_original: registro.atendente
            });
            
            feedbacksList.push({
              nota,
              feedback: feedbackTexto,
              analista,
              nome: registro.nome || registro.nome_empresa || undefined,
              telefone: registro.telefone || undefined,
              data: registro.criado_em,
              origem,
            });
          } else {
            console.log('⚠️ DEBUG CSAT - Registro SEM feedback:', {
              nome: registro.nome,
              nota,
              temOpiniao: !!registro.opiniao_csat,
              temHistorico: !!registro.historico_conversa
            });
          }

          if (!acc[analista]) {
            acc[analista] = { analista, totalAtendimentos: 0, nota1: 0, nota2: 0, nota3: 0, nota4: 0, nota5: 0, somaNotas: 0 };
          }

          acc[analista].totalAtendimentos++;
          acc[analista].somaNotas += nota;
          const notaKey = `nota${nota}` as keyof typeof acc[typeof analista];
          if (acc[analista][notaKey] !== undefined) {
            acc[analista][notaKey]++;
          }

          return acc;
        }, {} as Record<string, any>);

        console.log('📊 DEBUG CSAT - Agrupado por analista:', Object.keys(grouped));

        // Ordenar feedbacks por data (mais recentes primeiro)
        feedbacksList.sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime());
        console.log('🎯 DEBUG CSAT - Feedbacks antes de setar:', {
          total: feedbacksList.length,
          primeiros3: feedbacksList.slice(0, 3).map(f => ({
            nome: f.nome,
            nota: f.nota,
            feedback: f.feedback?.substring(0, 30) + '...'
          }))
        });
        setFeedbacks(feedbacksList);

        // Calcular médias e ordenar
        const result: CSATData[] = Object.values(grouped)
          .map((item: any) => ({
            analista: item.analista,
            totalAtendimentos: item.totalAtendimentos,
            csatMedio: item.totalAtendimentos > 0 ? item.somaNotas / item.totalAtendimentos : 0,
            nota1: item.nota1,
            nota2: item.nota2,
            nota3: item.nota3,
            nota4: item.nota4,
            nota5: item.nota5,
            // Compatibilidade: mapear para categorias antigas
            satisfeito: item.nota4 + item.nota5,
            poucoSatisfeito: item.nota3,
            insatisfeito: item.nota1 + item.nota2,
          }))
          .sort((a: CSATData, b: CSATData) => b.csatMedio - a.csatMedio);

        // Calcular totais gerais
        const totalNotas = result.reduce((acc, item) => ({
          nota1: acc.nota1 + item.nota1,
          nota2: acc.nota2 + item.nota2,
          nota3: acc.nota3 + item.nota3,
          nota4: acc.nota4 + item.nota4,
          nota5: acc.nota5 + item.nota5,
        }), { nota1: 0, nota2: 0, nota3: 0, nota4: 0, nota5: 0 });

        const totalAvaliacoes = totalNotas.nota1 + totalNotas.nota2 + totalNotas.nota3 + totalNotas.nota4 + totalNotas.nota5;
        const somaTotal = (totalNotas.nota1 * 1) + (totalNotas.nota2 * 2) + (totalNotas.nota3 * 3) + (totalNotas.nota4 * 4) + (totalNotas.nota5 * 5);
        const csatMedioGeral = totalAvaliacoes > 0 ? somaTotal / totalAvaliacoes : 0;

        setTotals({
          csatMedioGeral,
          totalAvaliacoes,
          distribuicao: totalNotas
        });

        console.log('✅ DEBUG CSAT - Resultado:', { totalAnalistas: result.length, csatMedioGeral: csatMedioGeral.toFixed(2), totalAvaliacoes, distribuicao: totalNotas });
        console.log('🎯 DEBUG CSAT - Total de feedbacks FINAL:', feedbacksList.length);

        setData(result);
      } catch (err: any) {
        console.error('Erro ao buscar dados de CSAT:', err);
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    }

    fetchCSATData();
  }, [tenantLoading, tenant?.id, tenant?.slug, startDate, endDate]);

  return { data, totals, feedbacks, isLoading, error };
}
