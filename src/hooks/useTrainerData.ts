import { useState, useEffect } from "react";
import { useDatabase } from '@/contexts/DatabaseContext';
import { logger } from "@/utils/logger";

export interface TrainerConversation {
  id: number;
  conversation_id: string;
  workspace_id: string;
  agent_name: string;
  summary_text: string;
  sentiment: number;
  duration: number;
  lead_status: string;
  created_at: string;
  total_messages: number;
  ai_suggestions?: string[];
  positives?: string[];
  negatives?: string[];
}

export interface TrainerStats {
  satisfactionIndex: number;
  avgResponseTime: number;
  trainableCount: number;
  totalConversations: number;
  sentimentTrend: { day: string; sentiment: number; volume: number }[];
}

export function useTrainerData(workspaceId: string) {
  const { supabase } = useDatabase();
  const [conversations, setConversations] = useState<TrainerConversation[]>([]);
  const [stats, setStats] = useState<TrainerStats>({
    satisfactionIndex: 0,
    avgResponseTime: 0,
    trainableCount: 0,
    totalConversations: 0,
    sentimentTrend: [],
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      
      try {
        // Buscar análises de IA com dados de conversas
        const { data: analysisData, error } = await supabase
          .from('sieg_fin_analise_ia')
          .select(`
            id,
            summary,
            qualified,
            positives,
            negatives,
            ai_suggestions,
            started_at,
            ended_at,
            phone,
            lead_id,
            workspace_id
          `)
          .eq('workspace_id', workspaceId)
          .not('ended_at', 'is', null)
          .order('started_at', { ascending: false });

        if (error) throw error;

        // Transformar dados para formato TrainerConversation
        const transformed: TrainerConversation[] = (analysisData || []).map((analysis, idx) => {
          const positives = analysis.positives || [];
          const negatives = analysis.negatives || [];
          const totalPoints = positives.length + negatives.length;
          
          // Calcular sentiment: (positivos - negativos) / total
          const sentiment = totalPoints > 0 
            ? (positives.length - negatives.length) / totalPoints 
            : 0.5;

          // Normalizar para 0-1
          const normalizedSentiment = (sentiment + 1) / 2;

          const duration = analysis.ended_at && analysis.started_at
            ? Math.floor(
                (new Date(analysis.ended_at).getTime() - 
                 new Date(analysis.started_at).getTime()) / 1000
              )
            : 0;

          return {
            id: analysis.id,
            conversation_id: `conv_${analysis.id}`,
            workspace_id: analysis.workspace_id,
            agent_name: "Agente IA",
            summary_text: analysis.summary || "Sem resumo disponível",
            sentiment: normalizedSentiment,
            duration,
            lead_status: analysis.qualified ? "qualificado" : "descartado",
            created_at: analysis.started_at || new Date().toISOString(),
            total_messages: (positives.length + negatives.length) * 2,
            ai_suggestions: analysis.ai_suggestions,
            positives: analysis.positives,
            negatives: analysis.negatives,
          };
        });

        setConversations(transformed);

        // Calcular estatísticas
        const totalSentiment = transformed.reduce((sum, c) => sum + c.sentiment, 0);
        const avgSentiment = transformed.length > 0 ? totalSentiment / transformed.length : 0;

        const totalDuration = transformed.reduce((sum, c) => sum + c.duration, 0);
        const avgDuration = transformed.length > 0 ? totalDuration / transformed.length : 0;

        // Treináveis: conversas com sentiment neutro (entre 0.3 e 0.7)
        const trainable = transformed.filter(c => c.sentiment >= 0.3 && c.sentiment < 0.7);

        // Tendência de sentimento por dia
        const trendMap = new Map<string, { sentiment: number; count: number }>();
        transformed.forEach(conv => {
          const day = new Date(conv.created_at).toISOString().split('T')[0];
          const existing = trendMap.get(day) || { sentiment: 0, count: 0 };
          trendMap.set(day, {
            sentiment: existing.sentiment + conv.sentiment,
            count: existing.count + 1
          });
        });

        const sentimentTrend = Array.from(trendMap.entries())
          .map(([day, data]) => ({
            day: new Date(day).toLocaleDateString('pt-BR', { month: 'short', day: 'numeric' }),
            sentiment: data.sentiment / data.count,
            volume: data.count
          }))
          .sort((a, b) => new Date(a.day).getTime() - new Date(b.day).getTime())
          .slice(-7); // Últimos 7 dias

        setStats({
          satisfactionIndex: avgSentiment,
          avgResponseTime: avgDuration,
          trainableCount: trainable.length,
          totalConversations: transformed.length,
          sentimentTrend,
        });

      } catch (error) {
        logger.error('Error loading trainer data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [workspaceId]);

  return { conversations, stats, isLoading };
}
