import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface TagMapping {
  external_tag: string;
  internal_stage: string;
  display_label: string;
  description: string | null;
  display_order: number;
}

export function useTagMappings(tenantId: string | null) {
  const [mappings, setMappings] = useState<TagMapping[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!tenantId) {
      setLoading(false);
      return;
    }

    const fetchMappings = async () => {
      try {
        setLoading(true);
        
        // Usar query direta sem tipagem (tabela não está nos tipos gerados)
        const { data, error: fetchError } = await (supabase as any)
          .from('sieg_fin_mapeamentos_tags_tenant')
          .select('tag_externa, estagio_interno, rotulo_exibicao, descricao, ordem_exibicao')
          .eq('tenant_id', tenantId)
          .eq('ativo', true)
          .order('ordem_exibicao');

        if (fetchError) throw fetchError;

        // Mapear nomes em português para interface em inglês
        const mappedData = (data || []).map((item: any) => ({
          external_tag: item.tag_externa,
          internal_stage: item.estagio_interno,
          display_label: item.rotulo_exibicao,
          description: item.descricao,
          display_order: item.ordem_exibicao,
        }));

        setMappings(mappedData as TagMapping[]);
        setError(null);
      } catch (err) {
        console.error('Erro ao buscar mapeamentos de tags:', err);
        setError(err as Error);
      } finally {
        setLoading(false);
      }
    };

    fetchMappings();
  }, [tenantId]);

  /**
   * Converte tag externa (do webhook) para stage interno
   */
  const getStageFromTag = useCallback((externalTag: string): string => {
    if (!externalTag) return 'novo_lead';
    
    const mapping = mappings.find(
      m => m.external_tag.toLowerCase() === externalTag.toLowerCase()
    );
    
    return mapping?.internal_stage || 'novo_lead';
  }, [mappings]);

  /**
   * Retorna o label de exibição para uma tag externa
   */
  const getDisplayLabel = useCallback((externalTag: string): string => {
    if (!externalTag) return 'Novo Lead';
    
    const mapping = mappings.find(
      m => m.external_tag.toLowerCase() === externalTag.toLowerCase()
    );
    
    return mapping?.display_label || externalTag;
  }, [mappings]);

  /**
   * Retorna a descrição de uma tag
   */
  const getDescription = useCallback((externalTag: string): string | null => {
    const mapping = mappings.find(
      m => m.external_tag.toLowerCase() === externalTag.toLowerCase()
    );
    
    return mapping?.description || null;
  }, [mappings]);

  /**
   * Retorna todas as tags agrupadas por stage
   */
  const getTagsByStage = useCallback((stage: string): TagMapping[] => {
    return mappings.filter(m => m.internal_stage === stage);
  }, [mappings]);

  /**
   * Retorna lista de stages únicos configurados
   */
  const getUniqueStages = useCallback((): string[] => {
    const stages = [...new Set(mappings.map(m => m.internal_stage))];
    return stages.sort((a, b) => {
      const orderA = mappings.find(m => m.internal_stage === a)?.display_order || 0;
      const orderB = mappings.find(m => m.internal_stage === b)?.display_order || 0;
      return orderA - orderB;
    });
  }, [mappings]);

  return {
    mappings,
    loading,
    error,
    getStageFromTag,
    getDisplayLabel,
    getDescription,
    getTagsByStage,
    getUniqueStages,
  };
}
