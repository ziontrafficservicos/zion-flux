import { useState, useEffect } from 'react';
import { useDatabase } from '@/contexts/DatabaseContext';
import { useAnalyzeConversation } from './useAnalyzeConversation';
import { logger } from '@/utils/logger';

interface AnalysisData {
  id: number;
  summary: string | null;
  issues: string[] | null;
  suggestions: string[] | null;
  score_coerencia: number | null;
  score_fluxo: number | null;
  score_humanizacao: number | null;
  created_at: string;
}

export function useAnalysisData(conversationId: number, workspaceId: string, messages: any[]) {
  const { supabase } = useDatabase();
  const [analysis, setAnalysis] = useState<AnalysisData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { analyzeConversation, isAnalyzing } = useAnalyzeConversation();

  const fetchAnalysis = async () => {
    try {
      setIsLoading(true);
      setError(null);

      logger.info('Buscando análise existente');

      const { data, error: fetchError } = await supabase
        .from('sieg_fin_analise_fluxos')
        .select('*')
        .eq('conversa_id', conversationId)
        .eq('workspace_id', workspaceId)
        .order('created_at', { ascending: false })
        .limit(1);

      if (fetchError) {
        logger.error('Erro ao buscar análise', fetchError);
        throw fetchError;
      }

      if (data && data.length > 0) {
        setAnalysis(data[0]);
        setIsLoading(false);
        return;
      }

      // Se não existe análise, criar uma nova automaticamente
      logger.info('Criando nova análise');
      
      await analyzeConversation(conversationId, messages, workspaceId);

      // Buscar a análise recém-criada
      const { data: newData, error: newFetchError } = await supabase
        .from('sieg_fin_analise_fluxos')
        .select('*')
        .eq('conversa_id', conversationId)
        .eq('workspace_id', workspaceId)
        .order('created_at', { ascending: false })
        .limit(1);

      if (newFetchError) {
        logger.error('Erro ao buscar nova análise', newFetchError);
        throw newFetchError;
      }

      if (newData && newData.length > 0) {
        setAnalysis(newData[0]);
      }

      setIsLoading(false);
    } catch (err) {
      logger.error('Erro ao carregar análise', err);
      setError(err instanceof Error ? err.message : 'Erro ao carregar análise');
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (conversationId && workspaceId) {
      fetchAnalysis();
    }
  }, [conversationId, workspaceId]);

  return {
    analysis,
    isLoading: isLoading || isAnalyzing,
    error,
    refetch: fetchAnalysis
  };
}
