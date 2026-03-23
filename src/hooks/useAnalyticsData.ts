import { useEffect, useState } from 'react';
import { useDatabase } from '@/contexts/DatabaseContext';
import { logger } from '@/utils/logger';
import { MIN_DATA_DATE_OBJ } from '@/lib/constants';

export interface TotalsData {
  leads_recebidos: number;
  leads_qualificados: number;
  leads_followup: number;
  leads_descartados: number;
  investimento: number;
  cpl: number;
}

export interface DailyData {
  day: string;
  leads_recebidos: number;
  leads_qualificados: number;
  leads_followup: number;
  leads_descartados: number;
  investimento: number;
  cpl: number;
}

const normalizeMetricValue = (value: number | string | null | undefined): number => {
  if (typeof value === 'number' && !Number.isNaN(value)) {
    return value;
  }
  if (typeof value === 'string') {
    const parsed = parseFloat(value);
    return Number.isNaN(parsed) ? 0 : parsed;
  }
  return 0;
};

export function useAnalyticsData(workspaceId: string) {
  const { supabase } = useDatabase();
  const [totals, setTotals] = useState<TotalsData | null>(null);
  const [daily, setDaily] = useState<DailyData[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  async function fetchData() {
    try {
      setLoading(true);

      // Calcular datas (últimos 30 dias, mas nunca antes de MIN_DATA_DATE)
      const endDate = new Date();
      const calculatedStartDate = new Date();
      calculatedStartDate.setDate(calculatedStartDate.getDate() - 30);
      
      // Aplicar data mínima
      const startDate = calculatedStartDate < MIN_DATA_DATE_OBJ ? MIN_DATA_DATE_OBJ : calculatedStartDate;

      const startDateStr = startDate.toISOString().split('T')[0];
      const endDateStr = endDate.toISOString().split('T')[0];

      // Buscar dados diários
      let dailyData: any[] = [];
      try {
        const { data: data, error: dailyError } = await supabase
          .from('sieg_fin_kpi_overview_daily')
          .select('day, leads_recebidos, leads_qualificados, leads_followup, leads_descartados, investimento, cpl')
          .eq('workspace_id', workspaceId)
          .gte('day', startDate.toISOString())
          .limit(5000)
          .order('day', { ascending: true });

        if (dailyError) {
          console.warn('Tabela kpi_overview_daily não acessível no AnalyticsData:', dailyError.message);
          dailyData = [];
        } else {
          dailyData = data || [];
        }
      } catch (err) {
        console.warn('Erro ao buscar dados KPI no AnalyticsData:', err);
        dailyData = [];
      }

      const aggregates = (dailyData || []).reduce(
        (acc, day) => {
          acc.leads_recebidos += normalizeMetricValue(day.leads_recebidos);
          acc.leads_qualificados += normalizeMetricValue(day.leads_qualificados);
          acc.leads_followup += normalizeMetricValue(day.leads_followup);
          acc.leads_descartados += normalizeMetricValue(day.leads_descartados);
          acc.investimento += normalizeMetricValue(day.investimento);
          return acc;
        },
        {
          leads_recebidos: 0,
          leads_qualificados: 0,
          leads_followup: 0,
          leads_descartados: 0,
          investimento: 0,
        }
      );

      const totalQualified = aggregates.leads_qualificados;
      const totalInvest = aggregates.investimento;
      const computedCpl = totalQualified > 0 ? totalInvest / totalQualified : 0;

      setTotals({
        leads_recebidos: aggregates.leads_recebidos,
        leads_qualificados: totalQualified,
        leads_followup: aggregates.leads_followup,
        leads_descartados: aggregates.leads_descartados,
        investimento: Number(totalInvest.toFixed(2)),
        cpl: Number(computedCpl.toFixed(2)),
      });
      setDaily(dailyData || []);
      setLastUpdate(new Date());
    } catch (error: any) {
      logger.error('Erro ao carregar dados:', error.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchData();
    
    // Auto-refresh a cada 30 segundos
    const interval = setInterval(() => {
      fetchData();
    }, 30000);

    return () => clearInterval(interval);
  }, [workspaceId, supabase]);

  return { totals, daily, loading, lastUpdate, refetch: fetchData };
}
