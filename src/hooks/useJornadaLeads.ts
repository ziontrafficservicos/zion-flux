import { useState, useEffect, useCallback } from 'react';
import { supabase as centralSupabase } from '@/integrations/supabase/client';
import { useCurrentTenant } from '@/contexts/TenantContext';

export interface HistoricoTag {
  id: string;
  lead_id: string;
  telefone: string;
  nome?: string;
  nome_empresa?: string;
  tag_anterior: string | null;
  tag_nova: string;
  estagio_anterior: string | null;
  estagio_novo: string | null;
  tempo_no_estagio_anterior: number | null;
  criado_em: string;
  criado_por: string;
  motivo?: string;
}

export interface JornadaLead {
  lead_id: string;
  telefone: string;
  nome: string;
  nome_empresa: string;
  estagio_atual: string;
  historico: HistoricoTag[];
  tempo_total_jornada: number; // em segundos
}

export interface MetricasEstagio {
  estagio: string;
  total_entradas: number;
  tempo_medio_segundos: number;
  tempo_medio_formatado: string;
}

export function useJornadaLeads(telefone?: string) {
  const { tenant, isLoading: tenantLoading } = useCurrentTenant();
  const [jornadas, setJornadas] = useState<JornadaLead[]>([]);
  const [metricas, setMetricas] = useState<MetricasEstagio[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchJornadas = useCallback(async () => {
    if (tenantLoading || !tenant) return;

    const isSiegFinanceiro = tenant.slug === 'sieg-financeiro' || tenant.slug?.includes('financeiro');
    if (!isSiegFinanceiro) {
      setJornadas([]);
      setMetricas([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Buscar histórico de tags
      let query = (centralSupabase as any)
        .from('sieg_fin_historico_tags_lead')
        .select(`
          id,
          lead_id,
          telefone,
          tag_anterior,
          tag_nova,
          estagio_anterior,
          estagio_novo,
          tempo_no_estagio_anterior,
          criado_em,
          criado_por,
          motivo
        `)
        .eq('empresa_id', tenant.id)
        .order('criado_em', { ascending: false });

      // Filtrar por telefone se fornecido
      if (telefone) {
        query = query.ilike('telefone', `%${telefone}%`);
      }

      const { data: historico, error: histError } = await query.limit(500);

      if (histError) throw histError;

      // Buscar dados dos leads para enriquecer
      const leadIds = [...new Set((historico || []).map((h: any) => h.lead_id))];
      
      let leadsData: any[] = [];
      if (leadIds.length > 0) {
        const { data: leads } = await (centralSupabase as any)
          .from('sieg_fin_financeiro')
          .select('id, nome, nome_empresa, telefone, tag')
          .in('id', leadIds.slice(0, 100)); // Limitar a 100 leads
        leadsData = leads || [];
      }

      // Agrupar histórico por lead
      const jornadasMap = new Map<string, JornadaLead>();
      
      (historico || []).forEach((h: any) => {
        const lead = leadsData.find((l: any) => l.id === h.lead_id);
        
        if (!jornadasMap.has(h.lead_id)) {
          jornadasMap.set(h.lead_id, {
            lead_id: h.lead_id,
            telefone: h.telefone,
            nome: lead?.nome || 'Sem nome',
            nome_empresa: lead?.nome_empresa || '',
            estagio_atual: lead?.tag || h.tag_nova,
            historico: [],
            tempo_total_jornada: 0,
          });
        }
        
        const jornada = jornadasMap.get(h.lead_id)!;
        jornada.historico.push({
          ...h,
          nome: lead?.nome,
          nome_empresa: lead?.nome_empresa,
        });
        jornada.tempo_total_jornada += h.tempo_no_estagio_anterior || 0;
      });

      // Ordenar histórico de cada lead por data (mais antigo primeiro)
      jornadasMap.forEach((jornada) => {
        jornada.historico.sort((a, b) => 
          new Date(a.criado_em).getTime() - new Date(b.criado_em).getTime()
        );
      });

      setJornadas(Array.from(jornadasMap.values()));

      // Buscar métricas por estágio
      const { data: metricasData } = await (centralSupabase as any)
        .from('sieg_fin_historico_tags_lead')
        .select('estagio_novo, tempo_no_estagio_anterior')
        .eq('empresa_id', tenant.id)
        .not('estagio_novo', 'is', null);

      // Calcular métricas
      const metricasMap = new Map<string, { total: number; tempoTotal: number }>();
      
      (metricasData || []).forEach((m: any) => {
        const estagio = m.estagio_novo;
        if (!metricasMap.has(estagio)) {
          metricasMap.set(estagio, { total: 0, tempoTotal: 0 });
        }
        const stats = metricasMap.get(estagio)!;
        stats.total++;
        stats.tempoTotal += m.tempo_no_estagio_anterior || 0;
      });

      const metricasArray: MetricasEstagio[] = [];
      metricasMap.forEach((stats, estagio) => {
        const tempoMedio = stats.total > 0 ? stats.tempoTotal / stats.total : 0;
        metricasArray.push({
          estagio,
          total_entradas: stats.total,
          tempo_medio_segundos: tempoMedio,
          tempo_medio_formatado: formatarTempo(tempoMedio),
        });
      });

      // Ordenar por estágio
      metricasArray.sort((a, b) => a.estagio.localeCompare(b.estagio));
      setMetricas(metricasArray);

    } catch (err: any) {
      console.error('[useJornadaLeads] Erro:', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [tenant?.id, tenant?.slug, tenantLoading, telefone]);

  useEffect(() => {
    fetchJornadas();
  }, [fetchJornadas]);

  return { jornadas, metricas, isLoading, error, refetch: fetchJornadas };
}

// Função auxiliar para formatar tempo
function formatarTempo(segundos: number): string {
  if (segundos < 60) return `${Math.round(segundos)}s`;
  if (segundos < 3600) return `${Math.round(segundos / 60)}min`;
  if (segundos < 86400) return `${(segundos / 3600).toFixed(1)}h`;
  return `${(segundos / 86400).toFixed(1)}d`;
}
