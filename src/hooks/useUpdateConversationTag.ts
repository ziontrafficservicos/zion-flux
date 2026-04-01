import { useState } from 'react';
import { toast } from '@/hooks/use-toast';
import { logger } from '@/utils/logger';
import { useCurrentTenant } from '@/contexts/TenantContext';
import { supabase as centralSupabase } from '@/integrations/supabase/client';
import { STAGES } from '@/hooks/useLeadsShared';

const STAGE_MAP: Record<string, string> = {
  'T1 - NOVO LEAD': 'novo_lead',
  'T2 - QUALIFICANDO': 'qualificacao',
  'T3 - QUALIFICADO': 'qualificados',
  'T4 - FOLLOW-UP': 'followup',
  'T5 - DESQUALIFICADO': 'descartados',
};

export const useUpdateConversationTag = () => {
  const { tenant: currentTenant } = useCurrentTenant();
  const [isUpdating, setIsUpdating] = useState(false);

  // workspaceId é opcional para manter compatibilidade
  const updateTag = async (conversationId: string, newTag: string) => {
    const stage = STAGE_MAP[newTag];

    if (!stage || !STAGES.includes(stage as any)) {
      toast({
        title: "Erro",
        description: "Tag/estágio inválido selecionado",
        variant: "destructive",
      });
      return { success: false };
    }

    setIsUpdating(true);
    
    try {
      const tenantId = currentTenant?.id;
      if (!tenantId) {
        throw new Error('Tenant não encontrado.');
      }

      const { data: existingRecord, error: checkError } = await (centralSupabase.from as any)('sieg_fin_conversas_leads')
        .select('id, lead_id, tag, empresa_id')
        .eq('id', conversationId)
        .eq('empresa_id', tenantId)
        .maybeSingle();

      if (checkError) {
        logger.error('Error checking conversation record', { checkError, conversationId, tenantId });
        throw new Error('Erro ao verificar conversa');
      }

      if (!existingRecord) {
        logger.error('Conversation not found', { conversationId, tenantId });
        throw new Error(`Conversa ${conversationId} não encontrada`);
      }

      logger.info('Updating conversation stage', { conversationId, newTag, stage });

      // Atualizar lead com novo estágio
      if (existingRecord.lead_id) {
        const { error: leadError } = await (centralSupabase.from as any)('leads')
          .update({ status: stage })
          .eq('id', existingRecord.lead_id)
          .eq('empresa_id', tenantId);

        if (leadError) {
          logger.error('Error updating lead stage', { leadError, conversationId, stage });
          throw new Error('Erro ao atualizar estágio do lead');
        }
      }

      const { error } = await (centralSupabase.from as any)('sieg_fin_conversas_leads')
        .update({ tag: newTag })
        .eq('id', conversationId)
        .eq('empresa_id', tenantId);

      if (error) {
        logger.error('Error updating tag in database', { 
          error, 
          errorMessage: error.message,
          errorDetails: error.details,
          errorHint: error.hint,
          tableName: 'sieg_fin_conversas_leads', 
          conversationId, 
          newTag 
        });
        
        throw error;
      }

      logger.info('Tag updated successfully');

      toast({
        title: "Sucesso",
        description: "Tag atualizada com sucesso!",
      });

      return { success: true };
    } catch (error) {
      logger.error('Error updating tag', error);
      toast({
        title: "Erro",
        description: "Erro ao atualizar tag",
        variant: "destructive",
      });
      return { success: false };
    } finally {
      setIsUpdating(false);
    }
  };

  return { updateTag, isUpdating };
};
