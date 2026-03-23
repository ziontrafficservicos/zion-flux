import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useTenant } from '@/contexts/TenantContext';

export interface AuditLogEntry {
  id: string;
  tenant_id: string | null;
  user_id: string | null;
  user_email: string | null;
  tabela: string;
  registro_id: string | null;
  acao: 'INSERT' | 'UPDATE' | 'DELETE';
  dados_anteriores: Record<string, any> | null;
  dados_novos: Record<string, any> | null;
  campos_alterados: string[] | null;
  descricao: string | null;
  criado_em: string;
}

export interface AuditLogFilters {
  tabela?: string;
  acao?: 'INSERT' | 'UPDATE' | 'DELETE';
  userId?: string;
  dataInicio?: Date;
  dataFim?: Date;
}

const PAGE_SIZE = 50;

export function useAuditLog(filters?: AuditLogFilters) {
  const { currentTenant } = useTenant();
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(0);

  const fetchLogs = useCallback(async () => {
    if (!currentTenant?.id) {
      setLogs([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      console.log('📋 [AuditLog] Buscando logs para tenant:', currentTenant.id);

      // Buscar logs via RPC
      const { data, error: rpcError } = await (supabase as any).rpc('sieg_fin_get_audit_logs', {
        p_tenant_id: currentTenant.id,
        p_tabela: filters?.tabela || null,
        p_acao: filters?.acao || null,
        p_user_id: filters?.userId || null,
        p_data_inicio: filters?.dataInicio?.toISOString() || null,
        p_data_fim: filters?.dataFim?.toISOString() || null,
        p_limite: PAGE_SIZE,
        p_offset: page * PAGE_SIZE,
      });

      if (rpcError) {
        console.error('❌ [AuditLog] Erro ao buscar logs:', rpcError);
        
        // Se a função não existe, tentar busca direta
        if (rpcError.message?.includes('does not exist')) {
          console.log('⚠️ [AuditLog] Função RPC não existe, tentando busca direta...');
          
          let query = (supabase as any)
            .from('sieg_fin_audit_log')
            .select('*', { count: 'exact' })
            .eq('tenant_id', currentTenant.id)
            .order('criado_em', { ascending: false })
            .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

          if (filters?.tabela) {
            query = query.eq('tabela', filters.tabela);
          }
          if (filters?.acao) {
            query = query.eq('acao', filters.acao);
          }
          if (filters?.dataInicio) {
            query = query.gte('criado_em', filters.dataInicio.toISOString());
          }
          if (filters?.dataFim) {
            query = query.lte('criado_em', filters.dataFim.toISOString());
          }

          const { data: directData, error: directError, count } = await query;

          if (directError) {
            // Tabela provavelmente não existe ainda
            if (directError.message?.includes('does not exist') || directError.code === '42P01') {
              console.log('⚠️ [AuditLog] Tabela audit_log não existe ainda');
              setLogs([]);
              setTotalCount(0);
              setError('Tabela de audit log não configurada. Execute o script SQL no Supabase.');
              return;
            }
            throw directError;
          }

          setLogs(directData || []);
          setTotalCount(count || 0);
          return;
        }

        setError('Erro ao carregar histórico de alterações');
        return;
      }

      setLogs(data || []);

      // Buscar contagem total
      const { data: countData, error: countError } = await (supabase as any).rpc('sieg_fin_count_audit_logs', {
        p_tenant_id: currentTenant.id,
        p_tabela: filters?.tabela || null,
        p_acao: filters?.acao || null,
        p_data_inicio: filters?.dataInicio?.toISOString() || null,
        p_data_fim: filters?.dataFim?.toISOString() || null,
      });

      if (!countError) {
        setTotalCount(countData || 0);
      }

      console.log('✅ [AuditLog] Logs carregados:', data?.length || 0);
    } catch (err: any) {
      console.error('❌ [AuditLog] Erro inesperado:', err);
      setError(err.message || 'Erro inesperado ao carregar logs');
    } finally {
      setIsLoading(false);
    }
  }, [currentTenant?.id, filters?.tabela, filters?.acao, filters?.userId, filters?.dataInicio, filters?.dataFim, page]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  // Reset page when filters change
  useEffect(() => {
    setPage(0);
  }, [filters?.tabela, filters?.acao, filters?.dataInicio, filters?.dataFim]);

  const nextPage = () => {
    if ((page + 1) * PAGE_SIZE < totalCount) {
      setPage(p => p + 1);
    }
  };

  const prevPage = () => {
    if (page > 0) {
      setPage(p => p - 1);
    }
  };

  const goToPage = (pageNum: number) => {
    setPage(pageNum);
  };

  return {
    logs,
    totalCount,
    isLoading,
    error,
    refetch: fetchLogs,
    page,
    pageSize: PAGE_SIZE,
    totalPages: Math.ceil(totalCount / PAGE_SIZE),
    nextPage,
    prevPage,
    goToPage,
  };
}

/**
 * Traduz nomes de tabelas para português
 */
export function traduzirTabela(tabela: string): string {
  const traducoes: Record<string, string> = {
    sieg_fin_leads: 'Leads',
    sieg_fin_conversas_leads: 'Conversas',
    sieg_fin_financeiro: 'Financeiro SIEG',
    sieg_fin_campanhas: 'Campanhas',
    sieg_fin_tenant_users: 'Usuários',
    sieg_fin_mapeamentos_tags_tenant: 'Mapeamento de Tags',
    sieg_fin_custos_anuncios_tenant: 'Custos de Anúncios',
    sieg_fin_empresas: 'Empresas',
    sieg_fin_disparos: 'Disparos',
    sieg_fin_eventos_lead: 'Eventos de Lead',
    sieg_fin_pending_invites: 'Convites Pendentes',
  };
  return traducoes[tabela] || tabela;
}

/**
 * Traduz ações para português com cores
 */
export function traduzirAcao(acao: string): { texto: string; cor: string; emoji: string } {
  const traducoes: Record<string, { texto: string; cor: string; emoji: string }> = {
    INSERT: { 
      texto: 'Criação', 
      cor: 'bg-green-500/10 text-green-500 border-green-500/30',
      emoji: '➕'
    },
    UPDATE: { 
      texto: 'Alteração', 
      cor: 'bg-blue-500/10 text-blue-500 border-blue-500/30',
      emoji: '✏️'
    },
    DELETE: { 
      texto: 'Exclusão', 
      cor: 'bg-red-500/10 text-red-500 border-red-500/30',
      emoji: '🗑️'
    },
  };
  return traducoes[acao] || { texto: acao, cor: 'bg-gray-500/10 text-gray-500', emoji: '📝' };
}

/**
 * Formata campos sensíveis para não exibir dados confidenciais
 */
export function sanitizarDados(dados: Record<string, any> | null): Record<string, any> | null {
  if (!dados) return null;

  const camposSensiveis = ['password', 'senha', 'token', 'access_token', 'secret', 'api_key'];
  const resultado = { ...dados };

  for (const campo of camposSensiveis) {
    if (resultado[campo]) {
      resultado[campo] = '********';
    }
  }

  return resultado;
}
