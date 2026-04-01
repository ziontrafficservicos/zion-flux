import { useState } from 'react';
import { supabase as centralSupabase } from '@/integrations/supabase/client';
import { 
  exportToCSV, 
  exportToExcel, 
  ExportColumn,
  formatDateForExport,
  formatCurrencyForExport
} from '@/lib/exportUtils';
import { MIN_DATA_DATE } from '@/lib/constants';
import { useToast } from '@/hooks/use-toast';
import { useTenant } from '@/contexts/TenantContext';

export function useExportData() {
  const [isExporting, setIsExporting] = useState(false);
  const { toast } = useToast();
  const { currentTenant } = useTenant();

  /**
   * Exporta dados de conversas do SIEG
   */
  const exportConversations = async (
    tenantId: string,
    startDate?: Date,
    endDate?: Date,
    format: 'csv' | 'excel' = 'excel'
  ) => {
    setIsExporting(true);
    
    try {
      const startISO = startDate ? toStartOfDay(startDate) : `${MIN_DATA_DATE}T00:00:00`;
      const endISO = endDate ? buildEndExclusive(endDate) : buildEndExclusive(new Date());

      // Verificar se é SIEG Financeiro - usar tabela sieg_fin_financeiro
      const isSiegFinanceiro = currentTenant?.slug === 'sieg-financeiro' || currentTenant?.slug?.includes('financeiro');

      if (isSiegFinanceiro) {
        // Exportar da tabela sieg_fin_financeiro
        return await exportSiegFinanceiro(tenantId, startISO, endISO, format, toast, setIsExporting);
      }

      const { data: rawConversations, error } = await (centralSupabase.from as any)('sieg_fin_conversas_leads')
        .select('id, lead_id, empresa_id, nome, telefone, tag, source, data_transferencia, data_conclusao, analista, csat, csat_feedback, origem_atendimento, data_resposta_csat, conversas')
        .eq('empresa_id', tenantId)
        .gte('data_resposta_csat', startISO)
        .lt('data_resposta_csat', endISO)
        .order('data_resposta_csat', { ascending: false });

      if (error) throw error;
      if (!rawConversations || rawConversations.length === 0) {
        toast({
          title: "⚠️ Sem dados",
          description: "Não há dados para exportar no período selecionado",
          variant: "destructive",
        });
        return;
      }

      const leadIds = rawConversations.map((conv: any) => conv.lead_id).filter(Boolean);
      let leadsById: Record<string, any> = {};

      if (leadIds.length > 0) {
        const { data: leadsData, error: leadsError } = await (centralSupabase.from as any)('leads')
          .select('id, nome, telefone, email, tags_atuais, metadados')
          .in('id', leadIds)
          .eq('empresa_id', tenantId);

        if (leadsError) throw leadsError;
        (leadsData || []).forEach((lead: any) => {
          leadsById[lead.id] = lead;
        });
      }

      // Definir colunas para exportação
      const columns: ExportColumn[] = [
        { key: 'id', label: 'ID' },
        { key: 'nome', label: 'Nome' },
        { 
          key: 'phone', 
          label: 'Telefone',
          format: formatPhoneLocal
        },
        { key: 'cnpj', label: 'CNPJ' },
        { key: 'tag', label: 'Tag/Estágio' },
        { key: 'status_conversa', label: 'Status Conversa' },
        { key: 'analista', label: 'Analista' },
        { key: 'origem_atendimento', label: 'Origem Atendimento' },
        { key: 'csat', label: 'CSAT (1-5)' },
        { key: 'csat_feedback', label: 'Justificativa CSAT' },
        { 
          key: 'data_resposta_csat', 
          label: 'Data Resposta CSAT',
          format: formatDateForExport
        },
        { 
          key: 'valor_em_aberto', 
          label: 'Valor em Aberto',
          format: formatCurrencyForExport
        },
        { 
          key: 'valor_recuperado_ia', 
          label: 'Valor Recuperado IA',
          format: formatCurrencyForExport
        },
        { 
          key: 'valor_recuperado_humano', 
          label: 'Valor Recuperado Humano',
          format: formatCurrencyForExport
        },
        { key: 'source', label: 'Origem Lead' },
        { 
          key: 'started', 
          label: 'Data Início',
          format: formatDateForExport
        },
        { 
          key: 'data_transferencia', 
          label: 'Data Transferência',
          format: formatDateForExport
        },
        { 
          key: 'data_conclusao', 
          label: 'Data Conclusão',
          format: formatDateForExport
        },
        { key: 'tempo_primeira_resposta', label: 'Tempo 1ª Resposta' },
        { key: 'tempo_medio_resposta', label: 'Tempo Médio Resposta' },
        { key: 'followup_count', label: 'Qtd Follow-ups' },
        { key: 'status_followup', label: 'Status Follow-up' },
        { key: 'validation_status', label: 'Status Validação' },
        { key: 'payment_type', label: 'Tipo Pagamento' },
        { 
          key: 'criado_em', 
          label: 'Data Criação',
          format: formatDateForExport
        },
      ];

      // Gerar nome do arquivo
      const dateStr = startDate && endDate
        ? `${startDate.toISOString().split('T')[0]}_${endDate.toISOString().split('T')[0]}`
        : new Date().toISOString().split('T')[0];
      
      const filename = `sieg_conversas_${dateStr}`;

      // Exportar
      const rows = (rawConversations as any[]).map((conv) => {
        const lead = conv.lead_id ? leadsById[conv.lead_id] : null;
        const financeMeta = lead?.metadados?.financeiro ?? lead?.metadados;
        
        // Determinar status da conversa
        let statusConversa = 'Em andamento';
        if (conv.data_conclusao) statusConversa = 'Concluído';
        else if (conv.data_transferencia) statusConversa = 'Transferido';
        
        return {
          id: conv.id,
          nome: lead?.nome || conv.nome || '',
          phone: formatPhoneLocal(lead?.telefone || conv.telefone || ''),
          cnpj: lead?.metadados?.cnpj || financeMeta?.cnpj || '',
          tag: conv.tag || (lead?.tags_atuais ? lead.tags_atuais[0] : ''),
          status_conversa: statusConversa,
          analista: conv.analista || '',
          origem_atendimento: conv.origem_atendimento || '',
          csat: conv.csat || '',
          csat_feedback: conv.csat_feedback || '',
          data_resposta_csat: formatDateForExport(conv.data_resposta_csat || ''),
          valor_em_aberto: formatCurrencyForExport(financeMeta?.valor_em_aberto || 0),
          valor_recuperado_ia: formatCurrencyForExport(financeMeta?.valor_recuperado_ia || 0),
          valor_recuperado_humano: formatCurrencyForExport(financeMeta?.valor_recuperado_humano || 0),
          source: conv.source || lead?.metadados?.origem || '',
          started: formatDateForExport(conv.data_resposta_csat),
          data_transferencia: formatDateForExport(conv.data_transferencia || ''),
          data_conclusao: formatDateForExport(conv.data_conclusao || ''),
          tempo_primeira_resposta: lead?.metadados?.tempo_primeira_resposta || '',
          tempo_medio_resposta: lead?.metadados?.tempo_medio_resposta || '',
          followup_count: lead?.metadados?.followup_count || '',
          status_followup: lead?.metadados?.status_followup || '',
          validation_status: lead?.metadados?.validation_status || '',
          payment_type: lead?.metadados?.payment_type || '',
          criado_em: formatDateForExport(conv.data_resposta_csat),
        };
      });

      if (format === 'csv') {
        exportToCSV(rows, columns, filename);
      } else {
        exportToExcel(rows, columns, filename, 'Conversas SIEG');
      }

      toast({
        title: "✅ Exportação concluída!",
        description: `Arquivo ${format.toUpperCase()} gerado com sucesso`,
      });

    } catch (error) {
      console.error('Erro ao exportar:', error);
      toast({
        title: "❌ Erro na exportação",
        description: "Não foi possível exportar os dados",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  /**
   * Exporta resumo de KPIs
   */
  const exportKPIs = async (
    kpis: any,
    tenantName: string,
    startDate?: Date,
    endDate?: Date,
    format: 'csv' | 'excel' = 'excel'
  ) => {
    setIsExporting(true);
    
    try {
      const data = [
        {
          metrica: 'Total de Leads',
          valor: kpis.totalLeads || 0
        },
        {
          metrica: 'Leads Qualificados',
          valor: kpis.qualifiedLeads || 0
        },
        {
          metrica: 'Taxa de Qualificação (%)',
          valor: (kpis.qualificationRate || 0).toFixed(2)
        },
        {
          metrica: 'Valores Pendentes',
          valor: formatCurrencyForExport(kpis.valorTotalPendente || 0)
        },
        {
          metrica: 'Recuperado pela IA',
          valor: formatCurrencyForExport(kpis.valorRecuperadoIA || 0)
        },
        {
          metrica: 'Recuperado pelo Agente',
          valor: formatCurrencyForExport(kpis.valorRecuperadoHumano || 0)
        },
        {
          metrica: 'Total Recuperado',
          valor: formatCurrencyForExport(kpis.valorTotalRecuperado || 0)
        }
      ];

      const columns: ExportColumn[] = [
        { key: 'metrica', label: 'Métrica' },
        { key: 'valor', label: 'Valor' }
      ];

      const dateStr = startDate && endDate
        ? `${startDate.toISOString().split('T')[0]}_${endDate.toISOString().split('T')[0]}`
        : new Date().toISOString().split('T')[0];
      
      const filename = `sieg_kpis_${dateStr}`;

      if (format === 'csv') {
        exportToCSV(data, columns, filename);
      } else {
        exportToExcel(data, columns, filename, 'KPIs SIEG');
      }

      toast({
        title: "✅ Exportação concluída!",
        description: `KPIs exportados em ${format.toUpperCase()}`,
      });

    } catch (error) {
      console.error('Erro ao exportar KPIs:', error);
      toast({
        title: "❌ Erro na exportação",
        description: "Não foi possível exportar os KPIs",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  return {
    exportConversations,
    exportKPIs,
    isExporting
  };
}

function formatPhoneLocal(value: any) {
  if (!value) return '';
  return String(value).replace(/[^0-9]+/g, '');
}

function toStartOfDay(date: Date) {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy.toISOString();
}

function buildEndExclusive(date: Date) {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + 1);
  copy.setHours(0, 0, 0, 0);
  return copy.toISOString();
}

/**
 * Exporta dados específicos da tabela sieg_fin_financeiro
 */
async function exportSiegFinanceiro(
  tenantId: string,
  startISO: string,
  endISO: string,
  format: 'csv' | 'excel',
  toast: any,
  setIsExporting: (v: boolean) => void
) {
  try {
    // Buscar dados da tabela sieg_fin_financeiro
    const { data: rawData, error } = await (centralSupabase.from as any)('sieg_fin_financeiro')
      .select('id, nome, nome_empresa, cnpj, telefone, valor_em_aberto, valor_recuperado_ia, valor_recuperado_humano, em_negociacao, situacao, tag, data_vencimento, data_pagamento, observacoes, criado_em, atualizado_em, atendente, nota_csat, opiniao_csat, historico_conversa')
      .eq('empresa_id', tenantId)
      .gte('criado_em', startISO)
      .lt('criado_em', endISO)
      .order('criado_em', { ascending: false });

    if (error) throw error;
    if (!rawData || rawData.length === 0) {
      toast({
        title: "⚠️ Sem dados",
        description: "Não há dados para exportar no período selecionado",
        variant: "destructive",
      });
      setIsExporting(false);
      return;
    }

    // Definir colunas para exportação
    const columns: ExportColumn[] = [
      { key: 'nome', label: 'Nome' },
      { key: 'nome_empresa', label: 'Empresa' },
      { key: 'cnpj', label: 'CNPJ' },
      { key: 'telefone', label: 'Telefone' },
      { key: 'tag', label: 'Tag/Estágio' },
      { key: 'situacao', label: 'Situação' },
      { key: 'atendente', label: 'Atendente' },
      { 
        key: 'valor_em_aberto', 
        label: 'Valor em Aberto',
        format: formatCurrencyForExport
      },
      { 
        key: 'valor_recuperado_ia', 
        label: 'Valor Recuperado IA',
        format: formatCurrencyForExport
      },
      { 
        key: 'valor_recuperado_humano', 
        label: 'Valor Recuperado Humano',
        format: formatCurrencyForExport
      },
      { 
        key: 'em_negociacao', 
        label: 'Em Negociação',
        format: formatCurrencyForExport
      },
      { key: 'nota_csat', label: 'Nota CSAT (1-5)' },
      { key: 'opiniao_csat', label: 'Opinião CSAT' },
      { 
        key: 'data_vencimento', 
        label: 'Data Vencimento',
        format: formatDateForExport
      },
      { 
        key: 'data_pagamento', 
        label: 'Data Pagamento',
        format: formatDateForExport
      },
      { key: 'observacoes', label: 'Observações' },
      { 
        key: 'criado_em', 
        label: 'Data Criação',
        format: formatDateForExport
      },
      { 
        key: 'atualizado_em', 
        label: 'Última Atualização',
        format: formatDateForExport
      },
    ];

    // Gerar nome do arquivo
    const dateStr = `${startISO.split('T')[0]}_${endISO.split('T')[0]}`;
    const filename = `sieg_financeiro_${dateStr}`;

    // Preparar dados para exportação
    const rows = rawData.map((row: any) => ({
      nome: row.nome || '',
      nome_empresa: row.nome_empresa || '',
      cnpj: row.cnpj || '',
      telefone: formatPhoneLocal(row.telefone || ''),
      tag: row.tag || '',
      situacao: row.situacao || '',
      atendente: row.atendente || '',
      valor_em_aberto: formatCurrencyForExport(row.valor_em_aberto || 0),
      valor_recuperado_ia: formatCurrencyForExport(row.valor_recuperado_ia || 0),
      valor_recuperado_humano: formatCurrencyForExport(row.valor_recuperado_humano || 0),
      em_negociacao: formatCurrencyForExport(row.em_negociacao || 0),
      nota_csat: row.nota_csat || '',
      opiniao_csat: row.opiniao_csat || '',
      data_vencimento: formatDateForExport(row.data_vencimento || ''),
      data_pagamento: formatDateForExport(row.data_pagamento || ''),
      observacoes: row.observacoes || '',
      criado_em: formatDateForExport(row.criado_em || ''),
      atualizado_em: formatDateForExport(row.atualizado_em || ''),
    }));

    if (format === 'csv') {
      exportToCSV(rows, columns, filename);
    } else {
      exportToExcel(rows, columns, filename, 'SIEG Financeiro');
    }

    toast({
      title: "✅ Exportação concluída!",
      description: `${rawData.length} registros exportados em ${format.toUpperCase()}`,
    });

  } catch (error) {
    console.error('Erro ao exportar SIEG Financeiro:', error);
    toast({
      title: "❌ Erro na exportação",
      description: "Não foi possível exportar os dados",
      variant: "destructive",
    });
  } finally {
    setIsExporting(false);
  }
}
