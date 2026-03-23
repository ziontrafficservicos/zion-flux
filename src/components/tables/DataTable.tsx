import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface CampaignData {
  day: string;
  source?: string;
  leads_recebidos: number;
  leads_qualificados: number;
  investimento: number;
  cpl: number;
}

interface DataTableProps {
  workspaceId: string;
}

export const DataTable = ({ workspaceId }: DataTableProps) => {
  const [data, setData] = useState<CampaignData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchCampaignData() {
      try {
        setLoading(true);
        
        // Fetch campaign data with source from custo_anuncios
        let kpiData: any[] = [];
        try {
          const { data: data, error: kpiError } = await supabase
            .from('sieg_fin_kpi_overview_daily')
            .select('day, leads_recebidos, leads_qualificados, investimento, cpl')
            .eq('workspace_id', workspaceId)
            .order('day', { ascending: false })
            .limit(10);

          if (kpiError) {
            console.warn('Tabela kpi_overview_daily não acessível no DataTable:', kpiError.message);
            kpiData = [];
          } else {
            kpiData = data || [];
          }
        } catch (err) {
          console.warn('Erro ao buscar dados KPI no DataTable:', err);
          kpiData = [];
        }

        // Fetch sources from custo_anuncios
        const { data: sourcesData } = await supabase
          .from('sieg_fin_custos_anuncios_tenant')
          .select('day, source')
          .eq('workspace_id', workspaceId)
          .in('day', (kpiData || []).map(d => d.day));

        // Merge source data
        const enrichedData = (kpiData || []).map(row => {
          const sourceRow = sourcesData?.find(s => s.day === row.day);
          return {
            ...row,
            source: sourceRow?.source || 'Meta',
          };
        });

        setData(enrichedData);
      } catch (error: any) {
        console.error('Erro ao carregar dados da tabela:', error.message);
      } finally {
        setLoading(false);
      }
    }

    fetchCampaignData();
  }, [workspaceId]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}`;
  };
  const getCplColor = (cpl: number) => {
    if (cpl < 36.20) return 'text-accent';
    if (cpl > 36.30) return 'text-destructive';
    return 'text-foreground';
  };

  return (
    <div className="glass rounded-2xl border border-border/50 overflow-hidden animate-slide-up" style={{ animationDelay: '0.4s' }}>
      <div className="p-6 border-b border-border/50">
        <h2 className="text-xl font-bold mb-1">Detalhamento por Fonte</h2>
        <p className="text-sm text-muted-foreground">Performance detalhada das campanhas</p>
      </div>

      <div className="overflow-x-auto">
        {loading ? (
          <div className="p-12 text-center">
            <div className="animate-pulse text-muted-foreground">Carregando dados...</div>
          </div>
        ) : data.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-muted-foreground">Nenhum dado encontrado</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent border-border/50">
                <TableHead className="text-muted-foreground font-semibold">Data</TableHead>
                <TableHead className="text-muted-foreground font-semibold">Fonte</TableHead>
                <TableHead className="text-muted-foreground font-semibold text-right">Leads</TableHead>
                <TableHead className="text-muted-foreground font-semibold text-right">Qualificados</TableHead>
                <TableHead className="text-muted-foreground font-semibold text-right">Investimento</TableHead>
                <TableHead className="text-muted-foreground font-semibold text-right">CPL</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((row, index) => (
                <TableRow 
                  key={`${row.day}-${index}`}
                  className="border-border/50 hover:bg-glass-light transition-colors"
                >
                  <TableCell className="font-medium">{formatDate(row.day)}</TableCell>
                  <TableCell>
                    <span className="px-3 py-1 rounded-lg bg-glass-medium text-xs font-medium">
                      {row.source || 'N/A'}
                    </span>
                  </TableCell>
                  <TableCell className="text-right font-semibold">{row.leads_recebidos}</TableCell>
                  <TableCell className="text-right font-semibold text-primary">{row.leads_qualificados}</TableCell>
                  <TableCell className="text-right font-semibold">
                    R$ {row.investimento.toFixed(2)}
                  </TableCell>
                  <TableCell className={`text-right font-bold ${getCplColor(row.cpl)}`}>
                    R$ {row.cpl?.toFixed(2) ?? '0.00'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      <div className="p-4 border-t border-border/50 flex items-center justify-between text-xs text-muted-foreground">
        <span>Mostrando {data.length} registros mais recentes</span>
      </div>
    </div>
  );
};
