import { Header } from "@/components/ui/Header";
import { useSupabaseDiagnostics } from "@/hooks/useSupabaseDiagnostics";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { NoWorkspaceAccess } from "@/components/workspace/NoWorkspaceAccess";
import { supabase } from "@/integrations/supabase/client";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { type DateRange } from "react-day-picker";
import { useToast } from "@/hooks/use-toast";
import { useExecutiveDashboard } from "@/hooks/useExecutiveDashboard";
import { useLeadsFromConversations } from "@/hooks/useLeadsFromConversations";
import { StrategicInsightsCard } from "@/components/dashboard/executive/StrategicInsightsCard";
import { TopCampaignsTable } from "@/components/dashboard/executive/TopCampaignsTable";
import { HeroSection } from "@/components/dashboard/HeroSection";
import { EnhancedKpiCard } from "@/components/dashboard/EnhancedKpiCard";
import { pdf } from "@react-pdf/renderer";
import { DashboardPDF } from "@/components/reports/DashboardPDF";
import { format } from "date-fns";
import { useTenant } from "@/contexts/TenantContext";
import { ExportDropdown } from "@/components/export/ExportDropdown";
import { ValoresPendentesCard } from "@/components/dashboard/ValoresPendentesCard";
import { useValoresFinanceiros } from "@/hooks/useValoresFinanceiros";
import { DisparosDiariosChart } from "@/components/dashboard/DisparosDiariosChart";
import logoZionIcon from "@/assets/logo-zion-icon.png";
import { useTagCountsHistorico, type ContatoFinanceiro } from "@/hooks/useTagCountsHistorico";
import { parseValorBR } from "@/lib/parseValorBR";
import { APP_VERSION } from "@/lib/version";
import { WhatsNewModal } from "@/components/updates/WhatsNewModal";

const DashboardIndex = () => {
  const { currentTenant } = useTenant();
  const [userEmail, setUserEmail] = useState<string>();
  const [userName, setUserName] = useState<string>();
  const [lastUpdate, setLastUpdate] = useState(new Date());
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const diagnostics = useSupabaseDiagnostics();
  const { toast } = useToast();

  // Date range state - padrão últimos 30 dias
  const [dateRange, setDateRange] = useState<DateRange | undefined>(() => {
    const to = new Date();
    const from = new Date();
    from.setDate(from.getDate() - 30);
    return { from, to };
  });

  // Hook para valores financeiros (com filtro de data) - usado nos cards
  const valoresFinanceiros = useValoresFinanceiros(dateRange?.from, dateRange?.to);
  
  // Hook para valores financeiros GERAIS (sem filtro) - usado no header
  const valoresFinanceirosGerais = useValoresFinanceiros();
  
  // Hook para contagens históricas de tags (T1-T5) - SIEG Financeiro (com filtro de data)
  const { counts: tagCountsHistorico, contatos: contatosFinanceiros } = useTagCountsHistorico(dateRange?.from, dateRange?.to);

  // Tag selecionada para filtrar lista de contatos
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  
  // Debug: Log workspace info
  useEffect(() => {
    if (currentTenant) {
      console.log('🏢 DEBUG Dashboard - Tenant atual:', {
        id: currentTenant.id,
        slug: currentTenant.slug,
        name: currentTenant.name,
        isSiegFinanceiro: currentTenant.slug === 'sieg' || currentTenant.slug === 'sieg-financeiro' || currentTenant.slug?.includes('financeiro'),
      });
    }
  }, [currentTenant]);

  // Hook para dados de leads por stage (T1-T4)
  const leadsData = useLeadsFromConversations(
    currentTenant?.id || '',
    dateRange?.from,
    dateRange?.to
  );

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
    currentTenant?.id || '',
    dateRange?.from,
    dateRange?.to
  );

  // Slugs padronizados: sieg-financeiro, sieg-pré-vendas (com acento), asf-finance
  const isSiegWorkspace = currentTenant?.slug === 'sieg-financeiro' || currentTenant?.slug === 'sieg-pre-vendas' || currentTenant?.slug === 'sieg-pré-vendas' || currentTenant?.slug?.includes('sieg');
  const isSiegFinanceiro = currentTenant?.slug === 'sieg-financeiro' || currentTenant?.slug?.includes('financeiro');

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        setUserEmail(user.email);
        // Usar nome do user_metadata ou primeira parte do email
        const fullName = user.user_metadata?.full_name;
        // Verificar se o full_name não é o próprio email (bug de cadastro antigo)
        if (fullName && !fullName.includes('@')) {
          setUserName(fullName);
        } else {
          setUserName(user.email?.split('@')[0] || 'Usuário');
        }
      }
    });
  }, []);

  // 🔍 DEBUG roiHistory
  useEffect(() => {
    if (roiHistory && roiHistory.length > 0 && advancedMetrics) {
      console.log('📊 DEBUG DashboardIndex:', {
        roiHistoryLength: roiHistory.length,
        roiHistoryFirst: roiHistory[0],
        roiHistoryLast: roiHistory[roiHistory.length - 1],
        advancedMetrics,
      });
    }
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

  const handleClearFilter = () => {
    const to = new Date();
    const from = new Date();
    from.setDate(from.getDate() - 30);
    setDateRange({ from, to });
    toast({
      title: "Filtro resetado",
      description: "Exibindo últimos 30 dias",
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
          workspaceName={currentTenant?.name || 'Empresa'}
          workspaceSlug={currentTenant?.slug || 'tenant'}
          leads={leads}
          conversations={conversations}
          leadsDataByStage={leadsData.charts?.funnelData}
        />
      ).toBlob();

      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const fromDate = dateRange?.from || new Date();
      const toDate = dateRange?.to || new Date();
      link.download = `dashboard-${currentTenant?.slug || 'tenant'}-${format(fromDate, 'yyyy-MM-dd')}-${format(toDate, 'yyyy-MM-dd')}.pdf`;
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
  if (!currentTenant && diagnostics.status !== "checking") {
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

  const componentKey = `${currentTenant?.id || 'no-tenant'}`;

  return (
    <div className="min-h-screen" key={componentKey}>
      {/* Modal de Novidades */}
      <WhatsNewModal />

      <Header
        onRefresh={() => window.location.reload()}
        isRefreshing={isLoading}
        lastUpdate={new Date()}
        onExportPdf={handleExportPdf}
        isExporting={isExporting}
        dateRange={dateRange}
      />

      <main className="container mx-auto px-3 sm:px-4 md:px-6 py-4 sm:py-6 md:py-8 space-y-4 sm:space-y-6 md:space-y-8">
        {/* Hero Section */}
        {!isLoading && (() => {
          const shouldHideStats = currentTenant?.slug === 'sieg-pre-vendas' || currentTenant?.slug === 'sieg-pré-vendas';
          console.log('🔍 DashboardIndex - currentTenant:', currentTenant?.name, 'slug:', currentTenant?.slug, 'hideStats:', shouldHideStats);
          return (
            <HeroSection
              userName={userName || userEmail}
              workspaceName={currentTenant?.name || 'Carregando...'}
              totalLeads={leadsData.kpis?.totalLeads || leads?.totalLeads || 0}
              totalInvested={advancedMetrics?.totalInvested || 0}
              conversionRate={leadsData.kpis?.qualificationRate || leads?.qualificationRate || 0}
              trend="up"
              hideStats={shouldHideStats}
              isSiegFinanceiro={isSiegFinanceiro}
              valorEmAberto={valoresFinanceirosGerais.data.valorPendente}
              valorRecuperado={valoresFinanceirosGerais.data.valorRecuperado}
              totalEmpresas={valoresFinanceirosGerais.data.totalEmpresas}
            />
          );
        })()}

        {/* Date Range Filter */}
        <div className="flex items-center justify-between gap-4">
          <DateRangePicker
            dateRange={dateRange}
            onDateRangeChange={setDateRange}
            onClearFilter={handleClearFilter}
            minDays={1}
            maxDays={90}
          />
        </div>

        {/* KPIs com cores iguais à tela de Atendimento — clicáveis */}
        {(() => {
          const tagCards = isSiegFinanceiro ? [
            { key: 'T1 - SEM RESPOSTA', label: 'T1 - SEM RESPOSTA', value: tagCountsHistorico['T1 - SEM RESPOSTA'], colors: 'from-red-50 to-red-100 border-red-200', text: 'text-red-700', ring: 'ring-red-400' },
            { key: 'T2 - RESPONDIDO', label: 'T2 - RESPONDIDO', value: tagCountsHistorico['T2 - RESPONDIDO'], colors: 'from-blue-50 to-blue-100 border-blue-200', text: 'text-blue-700', ring: 'ring-blue-400' },
            { key: 'T3 - PAGO IA', label: 'T3 - PAGO IA', value: tagCountsHistorico['T3 - PAGO IA'], colors: 'from-emerald-50 to-emerald-100 border-emerald-200', text: 'text-emerald-700', ring: 'ring-emerald-400' },
            { key: 'T3H - PAGO HUMANO', label: 'T3H - PAGO HUMANO', value: tagCountsHistorico['T3H - PAGO HUMANO'], colors: 'from-teal-50 to-teal-100 border-teal-200', text: 'text-teal-700', ring: 'ring-teal-400' },
            { key: 'T4 - TRANSFERIDO', label: 'T4 - TRANSFERIDO', value: tagCountsHistorico['T4 - TRANSFERIDO'], colors: 'from-amber-50 to-amber-100 border-amber-200', text: 'text-amber-700', ring: 'ring-amber-400' },
            { key: 'T5 - PASSÍVEL DE SUSPENSÃO', label: 'T5 - PASSÍVEL DE SUSPENSÃO', value: tagCountsHistorico['T5 - PASSÍVEL DE SUSPENSÃO'], colors: 'from-purple-50 to-purple-100 border-purple-200', text: 'text-purple-700', ring: 'ring-purple-400' },
          ] : [
            { key: 'T1', label: currentTenant?.slug === 'asf' ? 'T1 - NOVO LEAD' : 'T1 - SEM RESPOSTA', value: (leadsData.charts?.funnelData?.find(f => f.id === 'novo_lead')?.value || 0), colors: 'from-red-50 to-red-100 border-red-200', text: 'text-red-700', ring: 'ring-red-400' },
            { key: 'T2', label: currentTenant?.slug === 'asf' ? 'T2 - QUALIFICANDO' : 'T2 - RESPONDIDO', value: (leadsData.charts?.funnelData?.find(f => f.id === 'qualificacao')?.value || 0), colors: 'from-blue-50 to-blue-100 border-blue-200', text: 'text-blue-700', ring: 'ring-blue-400' },
            { key: 'T3', label: currentTenant?.slug === 'asf' ? 'T3 - QUALIFICADO' : 'T3 - PAGO IA', value: (leadsData.charts?.funnelData?.find(f => f.id === 'qualificados')?.value || 0), colors: 'from-emerald-50 to-emerald-100 border-emerald-200', text: 'text-emerald-700', ring: 'ring-emerald-400' },
            { key: 'T4', label: currentTenant?.slug === 'asf' ? 'T5 - DESQUALIFICADO' : 'T4 - TRANSFERIDO', value: currentTenant?.slug === 'asf' ? (leadsData.charts?.funnelData?.find(f => f.id === 'descartados')?.value || 0) : (leadsData.charts?.funnelData?.find(f => f.id === 'followup')?.value || 0), colors: 'from-amber-50 to-amber-100 border-amber-200', text: 'text-amber-700', ring: 'ring-amber-400' },
          ];

          return (
            <div className={`grid grid-cols-2 sm:grid-cols-3 ${isSiegFinanceiro ? 'lg:grid-cols-6' : 'md:grid-cols-4'} gap-3 sm:gap-4`}>
              {tagCards.map((card) => (
                <div
                  key={card.key}
                  onClick={() => isSiegFinanceiro && setSelectedTag(prev => prev === card.key ? null : card.key)}
                  className={`bg-gradient-to-br ${card.colors} rounded-2xl p-4 sm:p-5 border shadow-sm hover:shadow-md transition-all ${
                    isSiegFinanceiro ? 'cursor-pointer' : ''
                  } ${selectedTag === card.key ? `ring-2 ring-offset-2 ${card.ring} scale-[1.03]` : ''}`}
                >
                  <p className={`text-[10px] sm:text-xs font-semibold ${card.text} mb-1 uppercase tracking-wide`}>
                    {card.label}
                  </p>
                  <p className={`text-xl sm:text-2xl md:text-3xl font-bold ${card.text}`}>
                    {card.value.toLocaleString('pt-BR')}
                  </p>
                </div>
              ))}
            </div>
          );
        })()}

        {/* Lista de contatos filtrada por tag selecionada */}
        {isSiegFinanceiro && selectedTag && (() => {
          const classificarContato = (item: ContatoFinanceiro): string => {
            const tagUpper = String(item.tag || '').toUpperCase();
            const valorIA = parseValorBR(item.valor_recuperado_ia);
            const valorHumano = parseValorBR(item.valor_recuperado_humano);
            if (tagUpper.includes('T5') || tagUpper.includes('SUSPENS')) return 'T5 - PASSÍVEL DE SUSPENSÃO';
            if (valorHumano > 0) return 'T3H - PAGO HUMANO';
            if (valorIA > 0) return 'T3 - PAGO IA';
            if (tagUpper.includes('T4') || tagUpper.includes('TRANSFERIDO')) return 'T4 - TRANSFERIDO';
            if (tagUpper.includes('T3') || tagUpper.includes('PAGO')) return 'T3 - PAGO IA';
            if (tagUpper.includes('T2') || tagUpper.includes('RESPONDIDO') || tagUpper.includes('QUALIFICANDO')) return 'T2 - RESPONDIDO';
            return 'T1 - SEM RESPOSTA';
          };

          const filtrados = contatosFinanceiros.filter(c => classificarContato(c) === selectedTag);

          return (
            <div className="glass rounded-2xl p-6 border border-border/50 shadow-premium">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-foreground">
                  Contatos — {selectedTag} ({filtrados.length})
                </h3>
                <button
                  onClick={() => setSelectedTag(null)}
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  Fechar
                </button>
              </div>
              {filtrados.length === 0 ? (
                <p className="text-muted-foreground text-sm">Nenhum contato encontrado para essa tag.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border/50">
                        <th className="text-left py-3 px-2 font-semibold text-muted-foreground">Empresa</th>
                        <th className="text-left py-3 px-2 font-semibold text-muted-foreground">Telefone</th>
                        <th className="text-left py-3 px-2 font-semibold text-muted-foreground">CNPJ</th>
                        <th className="text-right py-3 px-2 font-semibold text-muted-foreground">Valor em Aberto</th>
                        <th className="text-right py-3 px-2 font-semibold text-muted-foreground">Recuperado IA</th>
                        <th className="text-right py-3 px-2 font-semibold text-muted-foreground">Recuperado Humano</th>
                        <th className="text-left py-3 px-2 font-semibold text-muted-foreground">Data Disparo</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filtrados.map((contato) => (
                        <tr key={contato.id} className="border-b border-border/30 hover:bg-muted/30 transition-colors">
                          <td className="py-3 px-2 font-medium">{contato.nome_empresa || contato.nome || '—'}</td>
                          <td className="py-3 px-2">{contato.telefone}</td>
                          <td className="py-3 px-2">{contato.cnpj || '—'}</td>
                          <td className="py-3 px-2 text-right">R$ {parseValorBR(contato.valor_em_aberto).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                          <td className="py-3 px-2 text-right text-emerald-600">R$ {parseValorBR(contato.valor_recuperado_ia).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                          <td className="py-3 px-2 text-right text-teal-600">R$ {parseValorBR(contato.valor_recuperado_humano).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                          <td className="py-3 px-2">{contato.data_disparo || (contato.criado_em ? new Date(contato.criado_em).toLocaleDateString('pt-BR') : '—')}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          );
        })()}

        {/* Valores Pendentes e Recuperações - APENAS PARA SIEG FINANCEIRO */}
        {isSiegFinanceiro && (
          <ValoresPendentesCard
            valorPendente={valoresFinanceiros.data.valorPendente}
            valorRecuperado={valoresFinanceiros.data.valorRecuperado}
            valorEmNegociacao={valoresFinanceiros.data.valorEmNegociacao}
            metaMensal={valoresFinanceiros.data.metaMensal}
            isLoading={valoresFinanceiros.isLoading}
            valorRecuperadoHumano={valoresFinanceiros.data.valorRecuperadoHumano}
            valorRecuperadoIA={valoresFinanceiros.data.valorRecuperadoIA}
          />
        )}

        {/* Gráfico de Disparos Diários - APENAS PARA SIEG FINANCEIRO */}
        {isSiegFinanceiro && (
          <DisparosDiariosChart
            tenantId={currentTenant?.id || ''}
            dateFrom={dateRange?.from}
            dateTo={dateRange?.to}
          />
        )}

        {/* 3. Insights Estratégicos */}
        {!isSiegWorkspace && <StrategicInsightsCard alerts={alerts} />}

        {/* 5. Gráficos Consolidados - Linha 1 - OCULTO PARA SIEG */}
        {!isSiegWorkspace && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Gráfico 1: Resumo de Performance */}
          <div className="glass rounded-2xl p-6 border border-border/50 shadow-premium">
            <div className="flex items-center gap-2 mb-6">
              <span className="text-2xl">📊</span>
              <h3 className="text-lg font-bold text-foreground">Resumo de Performance</h3>
            </div>
            <div className="space-y-6">
              {/* Métricas principais em cards 3D */}
              <div className="grid grid-cols-2 gap-4">
                <div className="glass rounded-xl p-4 border border-border/50 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 cursor-pointer"
                     style={{ background: 'var(--gradient-blue)' }}>
                  <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                    Impressões
                  </div>
                  <div className="text-2xl font-bold text-foreground">
                    {metaAds?.impressions?.toLocaleString('pt-BR') || '0'}
                  </div>
                </div>
                <div className="glass rounded-xl p-4 border border-border/50 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 cursor-pointer"
                     style={{ background: 'var(--gradient-purple)' }}>
                  <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                    Total Leads
                  </div>
                  <div className="text-2xl font-bold text-foreground">
                    {leads?.totalLeads || 0}
                  </div>
                </div>
              </div>

              {/* Barras de progresso 3D */}
              <div className="space-y-4">
                <div className="glass rounded-xl p-4 border border-border/50 shadow-md">
                  <div className="flex justify-between text-xs font-semibold mb-3">
                    <span className="text-muted-foreground uppercase tracking-wide">Taxa de Conversão</span>
                    <span className="text-foreground font-bold">{((leads?.totalLeads || 0) / (metaAds?.impressions || 1) * 100).toFixed(2)}%</span>
                  </div>
                  <div className="h-4 bg-muted/30 rounded-full overflow-hidden shadow-inner">
                    <div 
                      className="h-full rounded-full transition-all duration-500 shadow-lg"
                      style={{ 
                        width: `${Math.min(((leads?.totalLeads || 0) / (metaAds?.impressions || 1) * 100) * 100, 100)}%`,
                        background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
                        boxShadow: '0 2px 8px rgba(59, 130, 246, 0.4)'
                      }}
                    />
                  </div>
                </div>

                <div className="glass rounded-xl p-4 border border-border/50 shadow-md">
                  <div className="flex justify-between text-xs font-semibold mb-3">
                    <span className="text-muted-foreground uppercase tracking-wide">Conversas Iniciadas</span>
                    <span className="text-foreground font-bold">{metaAds?.conversas_iniciadas || 0}</span>
                  </div>
                  <div className="h-4 bg-muted/30 rounded-full overflow-hidden shadow-inner">
                    <div 
                      className="h-full rounded-full transition-all duration-500 shadow-lg"
                      style={{ 
                        width: `${Math.min(((metaAds?.conversas_iniciadas || 0) / (leads?.totalLeads || 1)) * 100, 100)}%`,
                        background: 'linear-gradient(135deg, #10b981, #059669)',
                        boxShadow: '0 2px 8px rgba(16, 185, 129, 0.4)'
                      }}
                    />
                  </div>
                </div>

                <div className="glass rounded-xl p-4 border border-border/50 shadow-md">
                  <div className="flex justify-between text-xs font-semibold mb-3">
                    <span className="text-muted-foreground uppercase tracking-wide">Leads Qualificados</span>
                    <span className="text-foreground font-bold">{leads?.qualifiedLeads || 0}</span>
                  </div>
                  <div className="h-4 bg-muted/30 rounded-full overflow-hidden shadow-inner">
                    <div 
                      className="h-full rounded-full transition-all duration-500 shadow-lg"
                      style={{ 
                        width: `${Math.min(((leads?.qualifiedLeads || 0) / (leads?.totalLeads || 1)) * 100, 100)}%`,
                        background: 'linear-gradient(135deg, #8b5cf6, #7c3aed)',
                        boxShadow: '0 2px 8px rgba(139, 92, 246, 0.4)'
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Gráfico 2: Distribuição por Fonte */}
          <div className="glass rounded-2xl p-6 border border-border/50 shadow-premium">
            <div className="flex items-center gap-2 mb-6">
              <span className="text-2xl">📈</span>
              <h3 className="text-lg font-bold text-foreground">Leads por Fonte de Campanha</h3>
            </div>
            <div className="h-[400px] flex flex-col justify-center overflow-y-auto">
              {leadsSourceDistribution && leadsSourceDistribution.length > 0 ? (
                <div className="space-y-6 py-2">
                  {leadsSourceDistribution.slice(0, 5).map((item, idx) => {
                    const total = leadsSourceDistribution.reduce((sum, d) => sum + d.value, 0);
                    const percentage = total > 0 ? (item.value / total * 100) : 0;
                    const gradients = [
                      'linear-gradient(135deg, #3b82f6, #2563eb)',
                      'linear-gradient(135deg, #ec4899, #db2777)',
                      'linear-gradient(135deg, #f59e0b, #d97706)',
                      'linear-gradient(135deg, #8b5cf6, #7c3aed)',
                      'linear-gradient(135deg, #10b981, #059669)'
                    ];
                    const shadows = [
                      '0 2px 8px rgba(59, 130, 246, 0.4)',
                      '0 2px 8px rgba(236, 72, 153, 0.4)',
                      '0 2px 8px rgba(245, 158, 11, 0.4)',
                      '0 2px 8px rgba(139, 92, 246, 0.4)',
                      '0 2px 8px rgba(16, 185, 129, 0.4)'
                    ];
                    
                    return (
                      <div key={idx} className="glass rounded-xl p-6 border-2 border-border/50 shadow-lg hover:shadow-2xl transition-all duration-300 bg-background/50 hover:scale-[1.02]">
                        {/* Nome da campanha */}
                        <div className="mb-4 pb-3 border-b-2 border-border/40">
                          <span className="text-sm font-extrabold text-foreground uppercase tracking-wider block leading-relaxed">
                            {item.name}
                          </span>
                        </div>
                        
                        {/* Valor e percentual */}
                        <div className="flex items-center justify-between mb-5">
                          <span className="text-2xl font-bold text-foreground">{item.value} <span className="text-base text-muted-foreground">leads</span></span>
                          <span className="text-3xl font-extrabold text-primary">{percentage.toFixed(1)}%</span>
                        </div>
                        
                        {/* Barra de progresso */}
                        <div className="w-full h-7 bg-muted/30 rounded-full overflow-hidden shadow-inner">
                          <div 
                            className="h-full rounded-full transition-all duration-500 shadow-lg flex items-center justify-end pr-3"
                            style={{ 
                              width: `${percentage}%`,
                              background: gradients[idx % gradients.length],
                              boxShadow: shadows[idx % shadows.length]
                            }}
                          >
                            <span className="text-xs font-bold text-white drop-shadow-lg">{percentage.toFixed(1)}%</span>
                          </div>
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
        )}

        {/* 7. Tabela de Campanhas - OCULTO PARA SIEG */}
        {!isSiegWorkspace && (
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
        )}

        {/* 8. Top Campaigns - OCULTO PARA SIEG */}
        {!isSiegWorkspace && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-3">
            <TopCampaignsTable 
              campaigns={topCampaigns}
              worstCampaign={worstCampaign}
            />
          </div>
        </div>
        )}

      </main>

      {/* Footer */}
      <footer className="container mx-auto px-6 py-6 mt-12">
        <div className="glass rounded-2xl p-6 border border-border/50">
          <div className="flex items-center justify-center gap-3">
            <img src={logoZionIcon} alt="Zion Traffic" className="h-8 w-auto" />
            <p className="text-sm text-muted-foreground">
              © Copyright 2025 Zion Traffic v{APP_VERSION}
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default DashboardIndex;
