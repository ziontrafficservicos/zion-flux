import { DashboardLayout } from "@/components/dashboard/layout/DashboardLayout";
import { useTenant } from "@/contexts/TenantContext";
import { MessageSquare, Users, Bot, Tag, Route } from "lucide-react";
import { useState, useMemo } from "react";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { type DateRange } from "react-day-picker";
import { useToast } from "@/hooks/use-toast";
import { AtendimentosKpiCards } from "@/components/dashboard/AtendimentosKpiCards";
import { CSATAnalystTable } from "@/components/dashboard/CSATAnalystTablePremium";
import { useAtendimentosMetrics } from "@/hooks/useAtendimentosMetrics";
import { useCSATData } from "@/hooks/useCSATData";
import { ConversationHistorySection } from "@/components/dashboard/ConversationHistorySection";
import { useConversationsData } from "@/hooks/useConversationsData";
import { useSiegFinanceiroData } from "@/hooks/useSiegFinanceiroData";
import { JornadaLeadSection } from "@/components/dashboard/JornadaLeadSection";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useTagCountsHistorico } from "@/hooks/useTagCountsHistorico";

const Atendimento = () => {
  const { currentTenant } = useTenant();
  const { toast } = useToast();

  // Date range state - default to last 90 days
  const [dateRange, setDateRange] = useState<DateRange | undefined>(() => {
    const to = new Date();
    const from = new Date();
    from.setDate(from.getDate() - 90);
    return { from, to };
  });

  // Hook para métricas de atendimento (com filtro de data)
  const atendimentosMetrics = useAtendimentosMetrics(null, dateRange?.from, dateRange?.to);
  
  // Hook para dados de CSAT (com filtro de data)
  const csatData = useCSATData('', dateRange?.from, dateRange?.to);

  // Verificar se é workspace SIEG Financeiro
  const isSiegFinanceiro = currentTenant?.slug === 'sieg-financeiro' || currentTenant?.slug?.includes('financeiro');

  // Hook para conversas genéricas
  const {
    conversations: genericConversations,
    stats: genericStats,
    isLoading: genericLoading,
    refetch: refetchGeneric,
  } = useConversationsData(currentTenant?.id || '', dateRange?.from, dateRange?.to);

  // Hook específico para SIEG Financeiro (busca da tabela financeiro_sieg)
  const {
    conversations: siegConversations,
    stats: siegStats,
    isLoading: siegLoading,
    refetch: refetchSieg,
  } = useSiegFinanceiroData(dateRange?.from, dateRange?.to);

  // Usar dados do SIEG se for workspace financeiro, senão usar genérico
  const conversationHistory = isSiegFinanceiro ? siegConversations : genericConversations;
  const conversationStats = isSiegFinanceiro ? siegStats : genericStats;
  const conversationsLoading = isSiegFinanceiro ? siegLoading : genericLoading;

  // Hook para contagens históricas de tags (T1-T5)
  const { counts: tagCountsHistorico } = useTagCountsHistorico();
  const refetchConversations = isSiegFinanceiro ? refetchSieg : refetchGeneric;

  // Estado de refresh
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  
  // Estado de filtro por tag
  const [selectedTag, setSelectedTag] = useState<string | null>(null);

  // Função de refresh
  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refetchConversations();
      setLastUpdate(new Date());
      toast({
        title: "Dados atualizados",
        description: "Os dados foram recarregados com sucesso.",
      });
    } catch (error) {
      toast({
        title: "Erro ao atualizar",
        description: "Não foi possível atualizar os dados.",
        variant: "destructive",
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  // Contar conversas por tag (considera valor_recuperado_ia como T3 - PAGO IA)
  const tagCounts = useMemo(() => {
    const counts: Record<string, number> = {
      'T1 - SEM RESPOSTA': 0,
      'T2 - RESPONDIDO': 0,
      'T3 - PAGO IA': 0,
      'T4 - TRANSFERIDO': 0,
      'T5 - PASSÍVEL DE SUSPENSÃO': 0,
    };
    
    conversationHistory?.forEach((conv: any) => {
      const tag = conv.tag?.toUpperCase() || '';
      // Se tem valor recuperado IA > 0, conta como T3 - PAGO IA independente da tag
      if (conv.qualified === true) {
        counts['T3 - PAGO IA']++;
      } else if (tag.includes('T1') || tag.includes('SEM RESPOSTA')) {
        counts['T1 - SEM RESPOSTA']++;
      } else if (tag.includes('T2') || tag.includes('RESPONDIDO') || tag.includes('QUALIFICANDO')) {
        counts['T2 - RESPONDIDO']++;
      } else if (tag.includes('T4') || tag.includes('TRANSFERIDO')) {
        counts['T4 - TRANSFERIDO']++;
      } else if (tag.includes('T5') || tag.includes('SUSPENS')) {
        counts['T5 - PASSÍVEL DE SUSPENSÃO']++;
      }
    });
    
    return counts;
  }, [conversationHistory]);

  const tagConfig = [
    { label: 'T1 - SEM RESPOSTA', color: 'from-red-50 to-red-100 border-red-200', textColor: 'text-red-700' },
    { label: 'T2 - RESPONDIDO', color: 'from-blue-50 to-blue-100 border-blue-200', textColor: 'text-blue-700' },
    { label: 'T3 - PAGO IA', color: 'from-emerald-50 to-emerald-100 border-emerald-200', textColor: 'text-emerald-700' },
    { label: 'T4 - TRANSFERIDO', color: 'from-amber-50 to-amber-100 border-amber-200', textColor: 'text-amber-700' },
    { label: 'T5 - PASSÍVEL DE SUSPENSÃO', color: 'from-purple-50 to-purple-100 border-purple-200', textColor: 'text-purple-700' },
  ];

  // Filtrar conversas pela tag selecionada (considera qualified para T3 - PAGO IA)
  const filteredConversations = useMemo(() => {
    if (!selectedTag) return conversationHistory;
    
    return conversationHistory?.filter((conv: any) => {
      const tag = conv.tag?.toUpperCase() || '';
      if (selectedTag === 'T1 - SEM RESPOSTA') {
        return !conv.qualified && (tag.includes('T1') || tag.includes('SEM RESPOSTA'));
      } else if (selectedTag === 'T2 - RESPONDIDO') {
        return !conv.qualified && (tag.includes('T2') || tag.includes('RESPONDIDO') || tag.includes('QUALIFICANDO'));
      } else if (selectedTag === 'T3 - PAGO IA') {
        // Inclui registros com valor_recuperado_ia > 0 (qualified = true)
        return conv.qualified === true;
      } else if (selectedTag === 'T4 - TRANSFERIDO') {
        return !conv.qualified && (tag.includes('T4') || tag.includes('TRANSFERIDO'));
      } else if (selectedTag === 'T5 - PASSÍVEL DE SUSPENSÃO') {
        return !conv.qualified && (tag.includes('T5') || tag.includes('SUSPENS'));
      }
      return true;
    });
  }, [conversationHistory, selectedTag]);

  // Função para toggle do filtro
  const handleTagClick = (tagLabel: string) => {
    setSelectedTag(prev => prev === tagLabel ? null : tagLabel);
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

  // Se não for SIEG Financeiro, mostrar mensagem de acesso negado
  if (!isSiegFinanceiro) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
          <div className="w-20 h-20 rounded-full bg-muted/30 flex items-center justify-center mb-6">
            <Users className="w-10 h-10 text-muted-foreground" />
          </div>
          <h2 className="text-2xl font-bold text-foreground mb-2">Página não disponível</h2>
          <p className="text-muted-foreground max-w-md">
            A tela de Atendimento está disponível apenas para o workspace SIEG Financeiro.
          </p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout
      onRefresh={handleRefresh}
      isRefreshing={isRefreshing}
      lastUpdate={lastUpdate}
    >
      <div className="space-y-6">
        {/* Header Section */}
        <div className="space-y-2">
          <h1 className="text-4xl font-bold">Atendimento</h1>
          <p className="text-muted-foreground">
            Central de métricas de atendimento, CSAT e performance de IA
          </p>
        </div>

        {/* Menu de Tags - Clicável para filtrar */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {tagConfig.map((tag) => (
            <div
              key={tag.label}
              onClick={() => handleTagClick(tag.label)}
              className={`bg-gradient-to-br ${tag.color} rounded-2xl p-4 border shadow-sm cursor-pointer hover:shadow-md transition-all ${
                selectedTag === tag.label ? 'ring-2 ring-offset-2 ring-blue-500 scale-105' : ''
              }`}
            >
              <p className={`text-xs font-semibold ${tag.textColor} mb-1`}>{tag.label}</p>
              <p className={`text-2xl font-bold ${tag.textColor}`}>
                {tagCountsHistorico[tag.label as keyof typeof tagCountsHistorico]?.toLocaleString('pt-BR') || 0}
              </p>
            </div>
          ))}
        </div>

        {/* Indicador de filtro ativo */}
        {selectedTag && (
          <div className="flex items-center gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <span className="text-sm text-blue-700">
              Filtrando por: <strong>{selectedTag}</strong> ({filteredConversations?.length || 0} conversas)
            </span>
            <button 
              onClick={() => setSelectedTag(null)}
              className="text-blue-500 hover:text-blue-700 text-sm underline ml-auto"
            >
              Limpar filtro
            </button>
          </div>
        )}

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

        {/* CSAT por Analista */}
        <CSATAnalystTable
          data={csatData.data}
          totals={csatData.totals}
          feedbacks={csatData.feedbacks}
          isLoading={csatData.isLoading}
          dateRange={dateRange}
          onDateRangeChange={(range) => setDateRange(range)}
        />

        {/* Tabs: Conversas e Jornada */}
        <Tabs defaultValue="conversas" className="w-full">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="conversas" className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              Conversas
            </TabsTrigger>
            <TabsTrigger value="jornada" className="flex items-center gap-2">
              <Route className="h-4 w-4" />
              Jornada do Cliente
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="conversas" className="mt-6">
            {/* Histórico de Conversas */}
            <ConversationHistorySection
              conversations={filteredConversations}
              stats={conversationStats}
              isLoading={conversationsLoading}
              workspaceSlug={currentTenant?.slug}
            />
          </TabsContent>
          
          <TabsContent value="jornada" className="mt-6">
            {/* Jornada dos Leads */}
            <JornadaLeadSection />
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default Atendimento;
