import { useState, useEffect } from 'react';
import { useDatabase } from '@/contexts/DatabaseContext';
import { format, subDays, addDays } from 'date-fns';

export interface WorkspacePerformanceMetrics {
  workspaceId: string;
  workspaceName: string;
  conversion: {
    current: number;
    trend: 'up' | 'down' | 'stable';
    change: number;
  };
  cpl: {
    current: number;
    trend: 'up' | 'down' | 'stable';
    change: number;
  };
  aiSpeed: {
    current: number;
    trend: 'up' | 'down' | 'stable';
    change: number;
  };
  retention: {
    current: number;
    trend: 'up' | 'down' | 'stable';
    change: number;
  };
  status: 'excellent' | 'good' | 'warning' | 'critical';
}

export interface PredictiveData {
  day: string;
  actual?: number;
  predicted?: number;
  confidenceMin?: number;
  confidenceMax?: number;
}

export function usePerformanceData(workspaceId?: string) {
  const { supabase } = useDatabase();
  const [metrics, setMetrics] = useState<WorkspacePerformanceMetrics[]>([]);
  const [predictiveData, setPredictiveData] = useState<PredictiveData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPerformanceData = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const thirtyDaysAgo = subDays(new Date(), 30);
      const sevenDaysAgo = subDays(new Date(), 7);
      const from = format(thirtyDaysAgo, 'yyyy-MM-dd');
      const to = format(new Date(), 'yyyy-MM-dd');

      // Fetch workspaces
      let query = supabase.from('sieg_fin_workspaces').select('*').order('name');
      
      if (workspaceId) {
        query = query.eq('id', workspaceId);
      }

      const { data: workspacesData, error: workspacesError } = await query;

      if (workspacesError) throw workspacesError;

      if (!workspacesData || workspacesData.length === 0) {
        setMetrics([]);
        setPredictiveData([]);
        setIsLoading(false);
        return;
      }

      // Fetch metrics for each workspace
      const metricsPromises = workspacesData.map(async (workspace) => {
        // Current period
        let currentKpi: any[] = [];
        try {
          const { data: data, error: rpcError } = await supabase.rpc('sieg_fin_kpi_totais_periodo', {
            p_workspace_id: workspace.id,
            p_from: format(sevenDaysAgo, 'yyyy-MM-dd'),
            p_to: to,
          });
          
          if (rpcError) {
            console.warn(`RPC kpi_totais_periodo não acessível para workspace ${workspace.id}:`, rpcError.message);
            currentKpi = [];
          } else {
            currentKpi = data || [];
          }
        } catch (err) {
          console.warn(`Erro ao chamar RPC kpi_totais_periodo para workspace ${workspace.id}:`, err);
          currentKpi = [];
        }

        // Previous period for comparison
        let previousKpi: any[] = [];
        try {
          const { data: data, error: rpcError } = await supabase.rpc('sieg_fin_kpi_totais_periodo', {
            p_workspace_id: workspace.id,
            p_from: format(subDays(sevenDaysAgo, 7), 'yyyy-MM-dd'),
            p_to: format(subDays(new Date(), 1), 'yyyy-MM-dd'),
          });
          
          if (rpcError) {
            console.warn(`RPC kpi_totais_periodo não acessível (período anterior) para workspace ${workspace.id}:`, rpcError.message);
            previousKpi = [];
          } else {
            previousKpi = data || [];
          }
        } catch (err) {
          console.warn(`Erro ao chamar RPC kpi_totais_periodo (período anterior) para workspace ${workspace.id}:`, err);
          previousKpi = [];
        }

        const current = currentKpi?.[0] || { recebidos: 0, qualificados: 0, investimento: 0, cpl: 0 };
        const previous = previousKpi?.[0] || { recebidos: 0, qualificados: 0, investimento: 0, cpl: 0 };

        const currentConversion = current.recebidos > 0 ? (current.qualificados / current.recebidos) * 100 : 0;
        const previousConversion = previous.recebidos > 0 ? (previous.qualificados / previous.recebidos) * 100 : 0;

        const currentCpl = typeof current.cpl === 'string' ? parseFloat(current.cpl) : current.cpl || 0;
        const previousCpl = typeof previous.cpl === 'string' ? parseFloat(previous.cpl) : previous.cpl || 0;

        const conversionChange = previousConversion > 0 ? ((currentConversion - previousConversion) / previousConversion) * 100 : 0;
        const cplChange = previousCpl > 0 ? ((currentCpl - previousCpl) / previousCpl) * 100 : 0;

        // Calculate AI Speed (average analysis time in seconds)
        const { data: currentAiData } = await supabase
          .from('sieg_fin_analise_ia')
          .select('started_at, ended_at')
          .eq('workspace_id', workspace.id)
          .gte('ended_at', format(sevenDaysAgo, 'yyyy-MM-dd'))
          .lte('ended_at', to)
          .not('ended_at', 'is', null);

        const { data: previousAiData } = await supabase
          .from('sieg_fin_analise_ia')
          .select('started_at, ended_at')
          .eq('workspace_id', workspace.id)
          .gte('ended_at', format(subDays(sevenDaysAgo, 7), 'yyyy-MM-dd'))
          .lte('ended_at', format(subDays(new Date(), 1), 'yyyy-MM-dd'))
          .not('ended_at', 'is', null);

        const calculateAvgDuration = (data: any[]) => {
          if (!data || data.length === 0) return 180; // default 3 minutes
          const durations = data.map(d => {
            const start = new Date(d.started_at).getTime();
            const end = new Date(d.ended_at).getTime();
            return (end - start) / 1000; // convert to seconds
          });
          return durations.reduce((sum, d) => sum + d, 0) / durations.length;
        };

        const aiSpeed = calculateAvgDuration(currentAiData || []);
        const previousAiSpeed = calculateAvgDuration(previousAiData || []);
        const aiSpeedChange = previousAiSpeed > 0 ? ((aiSpeed - previousAiSpeed) / previousAiSpeed) * 100 : 0;

        // Calculate Retention (leads with multiple conversations)
        // Conversas por cliente (ASF/Sieg) via slug
        const { data: wsInfo } = await supabase
          .from('sieg_fin_workspaces')
          .select('slug')
          .eq('id', workspace.id)
          .maybeSingle();
        const tableName = wsInfo?.slug === 'asf' ? 'sieg_fin_conversas_asf' : wsInfo?.slug === 'sieg' ? 'sieg_fin_conversas_sieg_financeiro' : 'sieg_fin_conversas_asf';
        const dateField = 'created_at';
        const workspaceField = 'id_workspace';

        const { data: currentConversations } = await (supabase.from as any)(tableName)
          .select('phone')
          .eq(workspaceField, workspace.id)
          .gte(dateField, format(sevenDaysAgo, 'yyyy-MM-dd'))
          .lte(dateField, to);

        const { data: previousConversations } = await (supabase.from as any)(tableName)
          .select('phone')
          .eq(workspaceField, workspace.id)
          .gte(dateField, format(subDays(sevenDaysAgo, 7), 'yyyy-MM-dd'))
          .lte(dateField, format(subDays(new Date(), 1), 'yyyy-MM-dd'));

        const calculateRetention = (conversations: any[]) => {
          if (!conversations || conversations.length === 0) return 0;
          const phoneCount = conversations.reduce((acc, conv) => {
            acc[conv.phone] = (acc[conv.phone] || 0) + 1;
            return acc;
          }, {} as Record<string, number>);
          const returning = Object.values(phoneCount).filter((count: number) => count > 1).length;
          const total = Object.keys(phoneCount).length;
          return total > 0 ? (returning / total) * 100 : 0;
        };

        const retention = calculateRetention(currentConversations || []);
        const previousRetention = calculateRetention(previousConversations || []);
        const retentionChange = previousRetention > 0 ? ((retention - previousRetention) / previousRetention) * 100 : 0;

        // Determine status
        let status: 'excellent' | 'good' | 'warning' | 'critical' = 'good';
        if (conversionChange < -10 || cplChange > 20) status = 'critical';
        else if (conversionChange < -5 || cplChange > 10) status = 'warning';
        else if (conversionChange > 10 && cplChange < -10) status = 'excellent';

        return {
          workspaceId: workspace.id,
          workspaceName: workspace.name,
          conversion: {
            current: currentConversion,
            trend: (conversionChange > 2 ? 'up' : conversionChange < -2 ? 'down' : 'stable') as 'up' | 'down' | 'stable',
            change: conversionChange,
          },
          cpl: {
            current: currentCpl,
            trend: (cplChange < -2 ? 'up' : cplChange > 2 ? 'down' : 'stable') as 'up' | 'down' | 'stable',
            change: cplChange,
          },
          aiSpeed: {
            current: aiSpeed,
            trend: (aiSpeedChange < -2 ? 'up' : aiSpeedChange > 2 ? 'down' : 'stable') as 'up' | 'down' | 'stable',
            change: aiSpeedChange,
          },
          retention: {
            current: retention,
            trend: (retentionChange > 2 ? 'up' : retentionChange < -2 ? 'down' : 'stable') as 'up' | 'down' | 'stable',
            change: retentionChange,
          },
          status,
        } as WorkspacePerformanceMetrics;
      });

      const metricsResults = await Promise.all(metricsPromises);
      setMetrics(metricsResults);

      // Generate predictive data (mock implementation)
      if (workspaceId) {
        let dailyData: any[] = [];
        
        try {
          const { data: kpiData, error: kpiError } = await supabase
            .from('sieg_fin_kpi_overview_daily')
            .select('day, leads_recebidos')
            .eq('workspace_id', workspaceId)
            .gte('day', from)
            .lte('day', to)
            .order('day', { ascending: true });
            
          if (kpiError) {
            console.warn('Tabela kpi_overview_daily não acessível, usando dados mock:', kpiError.message);
            // Usar dados mock se a tabela não estiver acessível
            dailyData = [];
          } else {
            dailyData = kpiData || [];
          }
        } catch (err) {
          console.warn('Erro ao buscar dados KPI, usando dados mock:', err);
          dailyData = [];
        }

        const historical = dailyData?.map(d => ({
          day: format(new Date(d.day), 'dd/MM'),
          actual: d.leads_recebidos || 0,
        })) || [];

        // Simple moving average for prediction
        const avgLeads = historical.reduce((sum, d) => sum + (d.actual || 0), 0) / Math.max(historical.length, 1);
        const variance = 15; // confidence interval

        const predictions: PredictiveData[] = [];
        for (let i = 1; i <= 7; i++) {
          const futureDate = addDays(new Date(), i);
          const predicted = avgLeads * (0.95 + Math.random() * 0.1); // slight variation
          predictions.push({
            day: format(futureDate, 'dd/MM'),
            predicted: Math.round(predicted),
            confidenceMin: Math.round(predicted - variance),
            confidenceMax: Math.round(predicted + variance),
          });
        }

        setPredictiveData([...historical, ...predictions]);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPerformanceData();

    // Auto-refresh every 2 minutes
    const interval = setInterval(fetchPerformanceData, 120000);
    return () => clearInterval(interval);
  }, [workspaceId]);

  return { metrics, predictiveData, isLoading, error, refetch: fetchPerformanceData };
}
