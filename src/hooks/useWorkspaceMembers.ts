import { useState, useEffect } from 'react';
import { useDatabase } from '@/contexts/DatabaseContext';
import { useCurrentTenant } from '@/contexts/TenantContext';
import { toast } from '@/hooks/use-toast';
import { logger } from '@/utils/logger';

export interface WorkspaceMember {
  user_id: string;
  role: string;
  user_email: string;
  user_name: string;
  bloqueado?: boolean;
  bloqueado_em?: string;
  ultimo_acesso?: string;
  is_online?: boolean;
}

export function useWorkspaceMembers() {
  const { supabase } = useDatabase();
  const [members, setMembers] = useState<WorkspaceMember[]>([]);
  const [loading, setLoading] = useState(true);
  const { tenant, isLoading: tenantLoading } = useCurrentTenant();

  const fetchMembers = async () => {
    if (tenantLoading) return;
    if (!tenant?.id) {
      setMembers([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      
      // Buscar membros do tenant (incluindo bloqueados para exibir na lista)
      const { data: tenantUsers, error: tenantError } = await (supabase as any)
        .from('sieg_fin_tenant_users')
        .select('user_id, role, custom_permissions, bloqueado, bloqueado_em, ultimo_acesso')
        .eq('tenant_id', tenant.id)
        .eq('active', true);

      if (tenantError) throw tenantError;

      if (!tenantUsers || tenantUsers.length === 0) {
        setMembers([]);
        setLoading(false);
        return;
      }

      // Buscar dados dos usuários via view perfis_usuarios
      const userIds = tenantUsers.map((m: any) => m.user_id);
      
      let userProfiles: any[] = [];
      try {
        const { data: profiles } = await (supabase as any)
          .from('sieg_fin_perfis_usuarios')
          .select('id, email, nome_completo')
          .in('id', userIds);
        userProfiles = profiles || [];
      } catch (e) {
        console.log('Erro ao buscar perfis:', e);
      }

      // Função para verificar se usuário está online (ativo nos últimos 5 minutos)
      const isUserOnline = (ultimoAcesso: string | null): boolean => {
        if (!ultimoAcesso) return false;
        const lastAccess = new Date(ultimoAcesso);
        const now = new Date();
        const diffMinutes = (now.getTime() - lastAccess.getTime()) / (1000 * 60);
        return diffMinutes <= 5; // Online se acessou nos últimos 5 minutos
      };

      // Mapear membros com dados disponíveis
      const mappedMembers = tenantUsers.map((member: any) => {
        const profile = userProfiles.find((p: any) => p.id === member.user_id);
        return {
          user_id: member.user_id,
          role: member.role,
          user_email: profile?.email ?? `user-${member.user_id.slice(0, 8)}@workspace`,
          user_name: profile?.nome_completo ?? profile?.email ?? 'Usuário',
          bloqueado: member.bloqueado || false,
          bloqueado_em: member.bloqueado_em,
          ultimo_acesso: member.ultimo_acesso,
          is_online: isUserOnline(member.ultimo_acesso)
        };
      });

      setMembers(mappedMembers);
    } catch (error) {
      logger.error('Error fetching workspace members', error);
      toast({
        title: 'Erro ao carregar membros',
        description: 'Não foi possível carregar a lista de membros.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMembers();
  }, [tenant?.id, tenantLoading]);

  const updateMemberRole = async (userId: string, newRole: string) => {
    if (!tenant?.id) return;

    try {
      const { error } = await (supabase as any)
        .from('sieg_fin_tenant_users')
        .update({ role: newRole })
        .eq('tenant_id', tenant.id)
        .eq('user_id', userId);

      if (error) throw error;

      toast({
        title: 'Role atualizado',
        description: 'O role do usuário foi atualizado com sucesso.',
      });

      await fetchMembers();
    } catch (error) {
      logger.error('Error updating member role', error);
      const errorMessage = error instanceof Error ? error.message : 'Não foi possível atualizar o role do usuário.';
      toast({
        title: 'Erro ao atualizar role',
        description: errorMessage,
        variant: 'destructive',
      });
    }
  };

  const addMember = async (email: string, role: string, tenantId: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('add-workspace-member', {
        body: {
          email: email.toLowerCase().trim(),
          tenant_id: tenantId,
          role
        }
      });

      if (error) throw error;

      if (data?.error) {
        throw new Error(data.error);
      }

      toast({
        title: 'Membro adicionado',
        description: 'O membro foi adicionado ao workspace com sucesso.',
      });

      await fetchMembers();
    } catch (error) {
      logger.error('Error adding member', error);
      const errorMessage = error instanceof Error ? error.message : 'Não foi possível adicionar o membro.';
      toast({
        title: 'Erro ao adicionar membro',
        description: errorMessage,
        variant: 'destructive',
      });
      throw error;
    }
  };

  const removeMember = async (userId: string, deleteCompletely: boolean = true) => {
    if (!tenant?.id) return;

    try {
      if (deleteCompletely) {
        // Deletar de tenant_users (todos os workspaces)
        const { error: tenantError } = await (supabase as any)
          .from('sieg_fin_tenant_users')
          .delete()
          .eq('user_id', userId);

        if (tenantError) {
          console.error('Erro ao deletar de tenant_users:', tenantError);
        }

        // Deletar convites pendentes
        const { error: inviteError } = await (supabase as any)
          .from('sieg_fin_pending_invites')
          .delete()
          .eq('invited_by', userId);

        if (inviteError) {
          console.error('Erro ao deletar convites:', inviteError);
        }

        // Deletar do auth.users via RPC (precisa de função no banco)
        const { error: authError } = await (supabase as any)
          .rpc('sieg_fin_deletar_usuario_completo', { usuario_id: userId });

        if (authError) {
          console.error('Erro ao deletar do auth:', authError);
          // Se falhar, tentar apenas desativar
          await (supabase as any)
            .from('sieg_fin_tenant_users')
            .update({ active: false })
            .eq('user_id', userId);
        }

        toast({
          title: 'Usuário excluído',
          description: 'O usuário foi removido completamente do sistema.',
        });
      } else {
        // Apenas desativar no workspace atual
        const { error } = await (supabase as any)
          .from('sieg_fin_tenant_users')
          .update({ active: false })
          .eq('tenant_id', tenant.id)
          .eq('user_id', userId);

        if (error) throw error;

        toast({
          title: 'Membro removido',
          description: 'O membro foi removido do workspace.',
        });
      }

      await fetchMembers();
    } catch (error) {
      logger.error('Error removing member', error);
      const errorMessage = error instanceof Error ? error.message : 'Não foi possível remover o membro.';
      toast({
        title: 'Erro ao remover membro',
        description: errorMessage,
        variant: 'destructive',
      });
    }
  };

  const toggleBlockMember = async (userId: string, block: boolean) => {
    if (!tenant?.id) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const updateData: any = {
        bloqueado: block,
      };
      
      if (block) {
        updateData.bloqueado_em = new Date().toISOString();
        updateData.bloqueado_por = user?.id;
      } else {
        updateData.bloqueado_em = null;
        updateData.bloqueado_por = null;
      }

      const { error } = await (supabase as any)
        .from('sieg_fin_tenant_users')
        .update(updateData)
        .eq('tenant_id', tenant.id)
        .eq('user_id', userId);

      if (error) throw error;

      toast({
        title: block ? 'Usuário bloqueado' : 'Usuário desbloqueado',
        description: block 
          ? 'O usuário não poderá mais acessar o sistema.' 
          : 'O usuário pode acessar o sistema novamente.',
      });

      await fetchMembers();
    } catch (error) {
      logger.error('Error toggling member block', error);
      const errorMessage = error instanceof Error ? error.message : 'Não foi possível alterar o status do usuário.';
      toast({
        title: 'Erro ao alterar status',
        description: errorMessage,
        variant: 'destructive',
      });
    }
  };

  return {
    members,
    loading,
    refetch: fetchMembers,
    updateMemberRole,
    addMember,
    removeMember,
    toggleBlockMember,
  };
}
