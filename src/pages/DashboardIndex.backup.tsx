import { Header } from "@/components/ui/Header";
import { useSupabaseDiagnostics } from "@/hooks/useSupabaseDiagnostics";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useDatabase } from "@/contexts/DatabaseContext";
import { NoWorkspaceAccess } from "@/components/workspace/NoWorkspaceAccess";
import { supabase } from "@/integrations/supabase/client";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { type DateRange } from "react-day-picker";
import { useToast } from "@/hooks/use-toast";
import { useExecutiveDashboard } from "@/hooks/useExecutiveDashboard";
import { PeriodSummaryCard } from "@/components/dashboard/executive/PeriodSummaryCard";
import { MoneyKpiCard } from "@/components/dashboard/executive/MoneyKpiCard";
import { StrategicInsightsCard } from "@/components/dashboard/executive/StrategicInsightsCard";
import { CompleteFunnelChart } from "@/components/dashboard/executive/CompleteFunnelChart";
import { TopCampaignsTable } from "@/components/dashboard/executive/TopCampaignsTable";
import { ActionCard } from "@/components/dashboard/executive/ActionCard";
import { pdf } from "@react-pdf/renderer";
import { DashboardPDF } from "@/components/reports/DashboardPDF";
import { format } from "date-fns";
import { PermissionGuard, AccessDenied } from "@/components/permissions/PermissionGuard";
import { PERMISSIONS } from "@/types/permissions";

const DashboardIndex = () => {
  const { currentWorkspaceId, setCurrentWorkspaceId } = useWorkspace();
  const { currentDatabase } = useDatabase();
  const [workspaceDb, setWorkspaceDb] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string>();
  const [lastUpdate, setLastUpdate] = useState(new Date());
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const diagnostics = useSupabaseDiagnostics();
  const { toast } = useToast();

  // Date range state - default to last 90 days
  const [dateRange, setDateRange] = useState<DateRange | undefined>(() => {
    const to = new Date();
    const from = new Date();
    from.setDate(from.getDate() - 90);
    return { from, to };
  });

  const {
    businessHealth,
    qualificationMetrics,
    alerts,
    funnelData,
    topCampaigns,
    worstCampaign,
    isLoading,
    advancedMetrics,
    trafficLeadsChart,
    leadsSourceDistribution,
    roiHistory,
    metaAds,
    leads,
    conversations,
  } = useExecutiveDashboard(
    currentWorkspaceId || '',
    dateRange?.from,
    dateRange?.to
  );

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) setUserEmail(user.email);
    });
  }, []);

  // Fetch workspace database to avoid showing Meta Ads for non-ASF workspaces
  useEffect(() => {
    if (!currentWorkspaceId) return;
    supabase
      .from('sieg_fin_workspaces')
      .select('database_key')
      .eq('id', currentWorkspaceId)
      .maybeSingle()
      .then(({ data }) => setWorkspaceDb(data?.database_key || null));
  }, [currentWorkspaceId]);

  // 🔍 DEBUG roiHistory
  useEffect(() => {
    console.log('📊 DEBUG DashboardIndex:', {
      roiHistoryLength: roiHistory?.length || 0,
      roiHistoryFirst: roiHistory?.[0],
      roiHistoryLast: roiHistory?.[roiHistory?.length - 1],
      advancedMetrics,
    });
  }, [roiHistory, advancedMetrics]);

  // Auto-refresh a cada 30 segundos
  useEffect(() => {
    const interval = setInterval(() => {
      setIsRefreshing(true);
      setLastUpdate(new Date());
      setTimeout(() => setIsRefreshing(false), 1000);
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  const handleWorkspaceChange = async (workspaceId: string) => {
    await setCurrentWorkspaceId(workspaceId);
  };

  const handleClearFilter = () => {
    const to = new Date();
    const from = new Date();
    from.setDate(from.getDate() - 90);
    setDateRange({ from, to });
    toast({
      title: "Filtro limpo",
      description: "Exibindo dados dos últimos 90 dias",
    });
  };

  const handleExportPdf = async () => {
    setIsExporting(true);
    try {
      const blob = await pdf(
        <DashboardPDF
          businessHealth={businessHealth}
          qualificationMetrics={qualificationMetrics}
          alerts={alerts}
          funnelData={funnelData}
          topCampaigns={topCampaigns}
          advancedMetrics={advancedMetrics}
          trafficLeadsChart={trafficLeadsChart}
          leadsSourceDistribution={leadsSourceDistribution}
          metaAds={metaAds}
          dateRange={dateRange || { from: undefined, to: undefined }}
          workspaceName={currentWorkspaceId}
          leads={leads}
          conversations={conversations}
        />
      ).toBlob();

      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const fromDate = dateRange?.from || new Date();
      const toDate = dateRange?.to || new Date();
      link.download = `dashboard-${currentWorkspaceId}-${format(fromDate, 'yyyy-MM-dd')}-${format(toDate, 'yyyy-MM-dd')}.pdf`;
      link.click();
      URL.revokeObjectURL(url);

      toast({
        title: "✅ PDF gerado com sucesso!",
        description: "O arquivo foi baixado automaticamente.",
      });
    } catch (error) {
      console.error('Erro ao gerar PDF:', error);
      toast({
        title: "❌ Erro ao gerar PDF",
        description: "Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  // Show no workspace screen if user has no workspace access
  if (!currentWorkspaceId && diagnostics.status !== "checking") {
    return <NoWorkspaceAccess userEmail={userEmail} />;
  }

  // Diagnóstico em andamento
  if (diagnostics.status === "checking") {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="glass rounded-2xl p-8 border border-border/50 max-w-md w-full text-center">
          <div className="animate-pulse text-center">
            <div className="text-4xl mb-4">🔍</div>
            <p className="text-muted-foreground">{diagnostics.details}</p>
          </div>
        </div>
      </div>
    );
  }

  // Diagnóstico falhou
  if (diagnostics.status === "error") {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="glass rounded-2xl p-8 border border-destructive/50 bg-destructive/5 max-w-md w-full">
          <div className="text-center space-y-4">
            <div className="text-4xl mb-4">⚠️</div>
            <h2 className="text-xl font-semibold text-destructive">Erro de Conexão</h2>
            <p className="text-sm text-muted-foreground">{diagnostics.details}</p>
            <Button onClick={() => window.location.reload()} variant="default" className="mt-4">
              🔁 Tentar Novamente
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Carregando dados do dashboard
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-center">
          <div className="text-4xl mb-4">⚡</div>
          <p className="text-muted-foreground">Carregando dashboard executivo...</p>
        </div>
      </div>
    );
  }

  const componentKey = `${currentWorkspaceId}-${currentDatabase}`;

  return (
    <div className="min-h-screen" key={componentKey}>
      <Header
        onRefresh={() => window.location.reload()}
        isRefreshing={isLoading}
        lastUpdate={new Date()}
        onExportPdf={handleExportPdf}
        isExporting={isExporting}
      />

      <PermissionGuard 
        permission={PERMISSIONS.DASHBOARD_VIEW}
        fallback={
          <AccessDenied 
            title="Acesso ao Dashboard Negado"
            message="Você não tem permissão para visualizar o dashboard."
          />
        }
      >

      <main className="container mx-auto px-6 py-8 space-y-8">
        {/* 1. Última Atualização */}
        <div className="glass rounded-2xl p-4 border border-border/50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className={`text-sm ${isRefreshing ? 'animate-pulse' : ''}`}>
              {isRefreshing ? '🔄' : '✅'}
            </span>
            <span className="text-sm text-muted-foreground">
              Última atualização: {lastUpdate.toLocaleTimeString('pt-BR')}
            </span>
          </div>
          <span className="text-xs text-muted-foreground">
            Auto-refresh a cada 30s
          </span>
        </div>

        {/* Date Range Filter */}
        <div className="mb-6">
          <DateRangePicker
            dateRange={dateRange}
            onDateRangeChange={setDateRange}
            onClearFilter={handleClearFilter}
            minDays={1}
            maxDays={90}
          />
        </div>

        {/* 2. KPIs Principais - 4 Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Card 1: Leads Gerados */}
          <MoneyKpiCard
            label="Leads Gerados"
            value={(leads?.totalLeads || 0).toLocaleString('pt-BR')}
            icon="🎯"
            variant="emerald"
            delay={0}
          />

          {/* Card 2: Mensagens Iniciadas */}
          <MoneyKpiCard
            label="Mensagens Iniciadas"
            value={(metaAds?.conversas_iniciadas || 0).toLocaleString('pt-BR')}
            icon="💬"
            variant="blue"
            delay={0.05}
          />

          {/* Card 3: Leads Qualificados */}
          <MoneyKpiCard
            label="Leads Qualificados"
            value={(leads?.qualifiedLeads || 0).toLocaleString('pt-BR')}
            icon="💎"
            variant="purple"
            delay={0.1}
          />

          {/* Card 4: Total Investido (com borda magenta) */}
          <MoneyKpiCard
            label="Total Investido"
            value={`R$ ${(advancedMetrics?.totalInvested || 0).toLocaleString('pt-BR', { 
              minimumFractionDigits: 2 
            })}`}
            icon="💰"
            variant="emerald"
            delay={0.15}
            highlight={true}
          />
        </div>

        {/* 3. Resumo do Período */}
        <PeriodSummaryCard metrics={qualificationMetrics} />

        {/* 4. Insights Estratégicos */}
        <StrategicInsightsCard alerts={alerts} />

        {/* 5. Gráficos Consolidados - Linha 1 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Gráfico 1: Tráfego vs Leads */}
          <div className="glass rounded-2xl p-6 border border-border/50">
            <h3 className="text-lg font-semibold mb-4 text-foreground">Tráfego vs Leads por Dia</h3>
            <div className="h-[300px]">
              {trafficLeadsChart && trafficLeadsChart.length > 0 ? (
                <div className="space-y-2">
                  {trafficLeadsChart.slice(-7).map((item, idx) => (
                    <div key={idx} className="flex items-center gap-4">
                  <span className="text-xs text-muted-foreground w-16">
                    {new Date(item.date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
                  </span>
                      <div className="flex-1 flex gap-2">
                        <div 
                          className="h-8 rounded-lg flex items-center justify-center text-xs font-semibold"
                          style={{ 
                            width: `${(item.traffic / Math.max(...trafficLeadsChart.map(d => d.traffic))) * 100}%`,
                            background: 'linear-gradient(135deg, #00d4ff, #0099cc)',
                            minWidth: '60px'
                          }}
                        >
                          {item.traffic}
                        </div>
                        <div 
                          className="h-8 rounded-lg flex items-center justify-center text-xs font-semibold"
                          style={{ 
                            width: `${(item.leads / Math.max(...trafficLeadsChart.map(d => d.leads))) * 100}%`,
                            background: 'linear-gradient(135deg, #ff1493, #cc1075)',
                            minWidth: '60px'
                          }}
                        >
                          {item.leads}
                        </div>
                      </div>
                    </div>
                  ))}
                  <div className="flex gap-4 mt-4 justify-center">
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 rounded" style={{ background: '#00d4ff' }}></div>
                      <span className="text-xs">Tráfego</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 rounded" style={{ background: '#ff1493' }}></div>
                      <span className="text-xs">Leads</span>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-muted-foreground text-center">Sem dados disponíveis</p>
              )}
            </div>
          </div>

          {/* Gráfico 2: Distribuição por Fonte */}
          <div className="glass rounded-2xl p-6 border border-border/50">
            <h3 className="text-lg font-semibold mb-4 text-foreground">Leads por Fonte de Campanha</h3>
            <div className="h-[300px] flex flex-col justify-center">
              {leadsSourceDistribution && leadsSourceDistribution.length > 0 ? (
                <div className="space-y-3">
                  {leadsSourceDistribution.slice(0, 5).map((item, idx) => {
                    const total = leadsSourceDistribution.reduce((sum, d) => sum + d.value, 0);
                    const percentage = total > 0 ? (item.value / total * 100) : 0;
                    const colors = ['#00d4ff', '#ff1493', '#ffa500', '#a855f7', '#10b981'];
                    
                    return (
                      <div key={idx} className="space-y-1">
                        <div className="flex justify-between text-sm">
                          <span className="truncate max-w-[200px]">{item.name}</span>
                          <span className="font-semibold">{item.value} ({percentage.toFixed(1)}%)</span>
                        </div>
                        <div className="w-full h-3 bg-secondary rounded-full overflow-hidden">
                          <div 
                            className="h-full rounded-full transition-all duration-500"
                            style={{ 
                              width: `${percentage}%`,
                              background: colors[idx % colors.length]
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-muted-foreground text-center">Sem dados disponíveis</p>
              )}
            </div>
          </div>
        </div>


        {/* 7. Tabela de Campanhas */}
        <div className="glass rounded-2xl p-6 border border-border/50">
          <h3 className="text-lg font-semibold mb-4 text-foreground">Resumo por Campanha</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 px-3">Campanha</th>
                  <th className="text-right py-3 px-3">Impressões</th>
                  <th className="text-right py-3 px-3">Mensagens Iniciadas</th>
                  <th className="text-right py-3 px-3">CTR (%)</th>
                  <th className="text-right py-3 px-3">Custo por Conversa Iniciada</th>
                  <th className="text-right py-3 px-3">Investimento</th>
                </tr>
              </thead>
              <tbody>
                {metaAds.campaigns && metaAds.campaigns.length > 0 ? (
                  metaAds.campaigns.slice(0, 10).map((campaign: any, idx: number) => {
                    const totalClicks = metaAds.clicks || 1;
                    const totalConversas = metaAds.conversas_iniciadas || 1;
                    const estimatedConversas = Math.round((campaign.clicks / totalClicks) * totalConversas);
                    const ctr = campaign.impressions > 0 ? (campaign.clicks / campaign.impressions * 100) : 0;
                    const custoConversa = estimatedConversas > 0 ? (campaign.spend / estimatedConversas) : 0;
                    
                    return (
                      <tr key={idx} className="border-b border-border/50 hover:bg-secondary/30 transition">
                        <td className="py-3 px-3 max-w-[200px] truncate">{campaign.campaign_name || campaign.name}</td>
                        <td className="text-right py-3 px-3">{(campaign.impressions || 0).toLocaleString('pt-BR')}</td>
                        <td className="text-right py-3 px-3 font-semibold" style={{ color: '#00d4ff' }}>
                          {estimatedConversas}
                        </td>
                        <td className="text-right py-3 px-3 font-semibold" style={{ color: '#10b981' }}>
                          {ctr.toFixed(2)}%
                        </td>
                        <td className="text-right py-3 px-3">
                          R$ {custoConversa.toFixed(2)}
                        </td>
                        <td className="text-right py-3 px-3 font-semibold">
                          R$ {(campaign.spend || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={6} className="text-center py-8 text-muted-foreground">
                      Nenhuma campanha disponível
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* 8. Top Campaigns */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-3">
            <TopCampaignsTable 
              campaigns={topCampaigns}
              worstCampaign={worstCampaign}
            />
          </div>
        </div>

        {/* 5. Action Cards - Quick Navigation */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <ActionCard
            title="Tráfego"
            icon="📊"
            metrics={[
              { label: 'Investimento', value: `R$ ${(metaAds?.spend || 0).toLocaleString('pt-BR')}` },
              { label: 'Conversas', value: (metaAds?.conversas_iniciadas || 0).toLocaleString('pt-BR') },
              { label: 'CPC', value: `R$ ${(metaAds?.cpc || 0).toFixed(2)}` },
            ]}
            alert={metaAds && metaAds.cpc > 5 ? 'CPC Alto' : undefined}
            linkTo="/trafego"
            variant="trafego"
            delay={0}
          />
          <ActionCard
            title="Qualificação"
            icon="🎯"
            metrics={[
              { label: 'Total de Leads', value: (leads?.totalLeads || 0).toLocaleString('pt-BR') },
              { label: 'Qualificados', value: (leads?.qualifiedLeads || 0).toLocaleString('pt-BR') },
              { label: 'Taxa', value: `${(leads?.qualificationRate || 0).toFixed(1)}%` },
            ]}
            alert={leads && leads.qualificationRate < 25 ? 'Taxa Baixa' : undefined}
            linkTo="/qualificacao"
            variant="qualificacao"
            delay={0.05}
          />
          <ActionCard
            title="Conversas"
            icon="💬"
            metrics={[
              { label: 'Total', value: (conversations?.totalConversations || 0).toLocaleString('pt-BR') },
              { label: 'Taxa Conversão', value: `${(conversations?.conversionRate || 0).toFixed(1)}%` },
              { label: 'Tempo Médio', value: `${Math.round((conversations?.averageDuration || 0) / 60)}min` },
            ]}
            alert={conversations && conversations.conversionRate < 20 ? 'Conv. Baixa' : undefined}
            linkTo="/analise"
            variant="analise"
            delay={0.1}
          />
        </div>
      </main>

      {/* Footer */}
      <footer className="container mx-auto px-6 py-6 mt-12">
        <div className="glass rounded-2xl p-6 text-center border border-border/50">
          <p className="text-sm text-muted-foreground">
            Zion App &copy; 2025 - Dashboard Executivo
          </p>
        </div>
      </footer>
      </PermissionGuard>
    </div>
  );
};

export default DashboardIndex;
