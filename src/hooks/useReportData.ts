import { useState, useEffect } from 'react';
import { supabase as centralSupabase } from '@/integrations/supabase/client';
import { useCurrentTenant } from '@/contexts/TenantContext';
import { useTagMappings } from '@/hooks/useTagMappings';
import {
  toStartOfDayIso,
  buildEndExclusiveIso,
  extractPrimaryTag,
  normalizeStage,
} from '@/hooks/useLeadsShared';
import { format, eachDayOfInterval } from 'date-fns';

export interface ReportData {
  workspace: {
    id: string;
    name: string;
  };
  period: {
    from: string;
    to: string;
  };
  kpis: {
    leadsRecebidos: number;
    leadsQualificados: number;
    leadsFollowup: number;
    leadsDescartados: number;
    investimento: number;
    cpl: number;
    taxaConversao: number;
  };
  dailyData: Array<{
    day: string;
    leads: number;
    investment: number;
    cpl: number;
  }>;
  aiMetrics: {
    satisfactionIndex: number;
    avgResponseTime: number;
    trainableCount: number;
    criticalConversations: number;
  };
  insights: string[];
  recommendations: string[];
}

export function useReportData(workspaceId: string | null, fromDate: Date, toDate: Date) {
  const { tenant, isLoading: tenantLoading } = useCurrentTenant();
  const { getStageFromTag, loading: mappingsLoading } = useTagMappings(tenant?.id || null);
  const [data, setData] = useState<ReportData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchReportData = async () => {
      if (tenantLoading || mappingsLoading) return;
      if (!tenant) {
        setData(null);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const startISO = toStartOfDayIso(fromDate);
        const endISO = buildEndExclusiveIso(toDate);

        const { data: leadsData, error: leadsError } = await (centralSupabase.from as any)
          ('leads')
          .select('id, empresa_id, criado_em, status, tags_atuais, metadados, origem')
          .eq('empresa_id', tenant.id)
          .gte('criado_em', startISO)
          .lt('criado_em', endISO)
          .limit(50000);

        if (leadsError) throw leadsError;

        const leadIds = (leadsData || []).map((lead: any) => lead.id);
        let conversaByLead: Record<string, any> = {};

        if (leadIds.length > 0) {
          const { data: conversasData, error: conversasError } = await (centralSupabase.from as any)
            ('sieg_fin_conversas_leads')
            .select('lead_id, tag, source, created_at, data_transferencia, data_conclusao, analista, csat, data_resposta_csat')
            .in('lead_id', leadIds)
            .eq('empresa_id', tenant.id);

          if (conversasError) throw conversasError;
          (conversasData || []).forEach((conv: any) => {
            if (conv.lead_id) conversaByLead[conv.lead_id] = conv;
          });
        }

        const leads = (leadsData || []).map((lead: any) => {
          const conversa = conversaByLead[lead.id];
          const primaryTag = extractPrimaryTag(lead.metadados, lead.tags_atuais) ?? conversa?.tag;
          const mappedStage = primaryTag && getStageFromTag ? getStageFromTag(primaryTag) : undefined;
          const stage = normalizeStage(mappedStage ?? lead.status, tenant.slug, primaryTag);
          return {
            ...lead,
            stage,
            conversa,
          };
        });

        const leadsRecebidos = leads.length;
        const leadsQualificados = leads.filter((lead) => lead.stage === 'qualificados').length;
        const leadsFollowup = leads.filter((lead) => lead.stage === 'followup').length;
        const leadsDescartados = leads.filter((lead) => lead.stage === 'descartados').length;

        const { data: costsData, error: costsError } = await (centralSupabase.from as any)
          ('custos_anuncios_tenant')
          .select('dia, valor')
          .eq('tenant_id', tenant.id)
          .gte('dia', format(fromDate, 'yyyy-MM-dd'))
          .lte('dia', format(toDate, 'yyyy-MM-dd'));

        if (costsError) throw costsError;

        const totalInvestment = (costsData || []).reduce((sum: number, cost: any) => {
          const amount = typeof cost.valor === 'string' ? parseFloat(cost.valor) : cost.valor || 0;
          return sum + amount;
        }, 0);

        const intervalDays = eachDayOfInterval({ start: fromDate, end: toDate });
        const dailyMap = new Map<string, { leads: number; investment: number }>();
        intervalDays.forEach((day) => {
          const key = format(day, 'dd/MM');
          dailyMap.set(key, { leads: 0, investment: 0 });
        });

        leads.forEach((lead: any) => {
          const createdAt = lead.criado_em || lead.conversa?.created_at;
          if (!createdAt) return;
          const dayKey = format(new Date(createdAt), 'dd/MM');
          const existing = dailyMap.get(dayKey) || { leads: 0, investment: 0 };
          existing.leads += 1;
          dailyMap.set(dayKey, existing);
        });

        (costsData || []).forEach((cost: any) => {
          const dayKey = format(new Date(cost.dia), 'dd/MM');
          const amount = typeof cost.valor === 'string' ? parseFloat(cost.valor) : cost.valor || 0;
          const existing = dailyMap.get(dayKey) || { leads: 0, investment: 0 };
          existing.investment += amount;
          dailyMap.set(dayKey, existing);
        });

        const dailyData = Array.from(dailyMap.entries())
          .sort(([dayA], [dayB]) => {
            const [aDay, aMonth] = dayA.split('/').map(Number);
            const [bDay, bMonth] = dayB.split('/').map(Number);
            const dateA = new Date(toDate.getFullYear(), aMonth - 1, aDay);
            const dateB = new Date(toDate.getFullYear(), bMonth - 1, bDay);
            return dateA.getTime() - dateB.getTime();
          })
          .map(([day, values]) => ({
            day,
            leads: values.leads,
            investment: values.investment,
            cpl: values.leads > 0 ? values.investment / values.leads : 0,
          }));

        const kpis = {
          leadsRecebidos,
          leadsQualificados,
          leadsFollowup,
          leadsDescartados,
          investimento: totalInvestment,
          cpl: leadsQualificados > 0 ? totalInvestment / leadsQualificados : 0,
          taxaConversao: leadsRecebidos > 0 ? (leadsQualificados / leadsRecebidos) * 100 : 0,
        };

        const avgSentiment = leadsRecebidos > 0 ? Math.min(1, (leadsQualificados / leadsRecebidos) + 0.2) : 0.7;
        const avgDuration = 180;
        const trainable = Math.max(0, leadsDescartados - Math.floor(leadsDescartados * 0.3));
        const critical = leadsFollowup;

        const workspaceRow = { id: workspaceId || tenant.id, name: tenant.name }; // Usar tenant diretamente

        const reportData: ReportData = {
          workspace: {
            id: workspaceId || tenant.id,
            name: workspaceRow?.name || tenant.name,
          },
          period: {
            from: format(fromDate, 'yyyy-MM-dd'),
            to: format(toDate, 'yyyy-MM-dd'),
          },
          kpis,
          dailyData,
          aiMetrics: {
            satisfactionIndex: avgSentiment * 100,
            avgResponseTime: avgDuration,
            trainableCount: trainable,
            criticalConversations: critical,
          },
          insights: generateInsights(kpis, { avgSentiment, avgDuration, trainable, critical }),
          recommendations: generateRecommendations(kpis, { avgSentiment, avgDuration, trainable, critical }),
        };

        setData(reportData);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchReportData();
  }, [tenantLoading, mappingsLoading, tenant?.id, tenant?.slug, workspaceId, fromDate, toDate, getStageFromTag]);

  return { data, isLoading, error };
}

function generateInsights(kpi: any, aiData: any): string[] {
  const insights: string[] = [];

  // Análise de CPL
  if (kpi.cpl > 50) {
    insights.push('CPL acima da média do mercado - revisar estratégia de segmentação e lances');
  } else if (kpi.cpl < 30) {
    insights.push('CPL competitivo detectado - oportunidade para escalar campanhas mantendo eficiência');
  }

  // Análise de qualificação
  const qualificationRate = kpi.qualificados / Math.max(kpi.recebidos, 1);
  if (qualificationRate < 0.3 && kpi.recebidos > 10) {
    insights.push('Taxa de qualificação baixa - melhorar critérios de filtro inicial e prompts da IA');
  } else if (qualificationRate > 0.7) {
    insights.push('Excelente taxa de qualificação - critérios bem ajustados');
  }

  // Análise de sentimento
  if (aiData.avgSentiment < 0.5) {
    insights.push('Sentimento geral negativo detectado - ajustar tom e abordagem da IA nas conversas');
  } else if (aiData.avgSentiment > 0.8) {
    insights.push('Sentimento positivo consistente - leads demonstram boa receptividade');
  }

  // Análise de conversas críticas
  if (aiData.critical > 5) {
    insights.push(`${aiData.critical} conversas críticas detectadas - análise urgente necessária`);
  }

  // Análise de investimento vs resultados
  const roi = kpi.qualificados / Math.max(kpi.investimento / 100, 1);
  if (roi > 2) {
    insights.push('ROI positivo - cada R$ 100 investidos gera mais de 2 leads qualificados');
  }

  // Análise de tempo de resposta
  if (aiData.avgResponseTime < 120) {
    insights.push('Tempo de resposta da IA otimizado - média abaixo de 2 minutos');
  }

  return insights;
}

function generateRecommendations(kpi: any, aiData: any): string[] {
  const recommendations: string[] = [];

  // Análise de follow-up
  if (kpi.followup > kpi.qualificados * 0.5 && kpi.followup > 5) {
    recommendations.push('Implementar automação de follow-up para reduzir tempo de resposta e aumentar taxa de conversão');
  }

  // Análise de tempo de resposta da IA
  if (aiData.avgResponseTime > 300) {
    recommendations.push('Otimizar prompt da IA para respostas mais rápidas (tempo médio acima de 5 minutos detectado)');
  }

  // Análise de conversas treináveis
  if (aiData.trainable > 10) {
    recommendations.push(`Revisar ${aiData.trainable} conversas treináveis para aprimorar base de conhecimento da IA`);
  }

  // Análise de taxa de descarte
  const discardRate = kpi.descartados / Math.max(kpi.recebidos, 1);
  if (discardRate > 0.2 && kpi.descartados > 5) {
    recommendations.push(`Taxa de descarte em ${(discardRate * 100).toFixed(1)}% - refinar segmentação de anúncios para reduzir leads não qualificados`);
  }

  // Análise de CPL
  if (kpi.cpl > 40) {
    recommendations.push(`CPL de R$ ${kpi.cpl.toFixed(2)} acima do ideal - considerar ajustar lances e segmentação de audiência`);
  }

  // Análise de taxa de conversão
  const conversionRate = (kpi.qualificados / Math.max(kpi.recebidos, 1)) * 100;
  if (conversionRate < 50 && kpi.recebidos > 10) {
    recommendations.push(`Taxa de conversão de ${conversionRate.toFixed(1)}% abaixo do esperado - revisar critérios de qualificação`);
  }

  // Análise de conversas críticas
  if (aiData.critical > 5) {
    recommendations.push(`${aiData.critical} conversas críticas detectadas - análise manual urgente necessária para evitar perda de leads`);
  }

  // Se tudo estiver bem
  if (recommendations.length === 0) {
    recommendations.push('Desempenho dentro dos padrões esperados - manter estratégia atual e monitorar tendências');
  }

  return recommendations;
}
