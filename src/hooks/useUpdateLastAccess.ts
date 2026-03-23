import { useEffect, useRef } from 'react';
import { useDatabase } from '@/contexts/DatabaseContext';
import { useCurrentTenant } from '@/contexts/TenantContext';

/**
 * Hook que atualiza o último acesso do usuário no banco de dados
 * Atualiza a cada 2 minutos enquanto o usuário está ativo
 */
export function useUpdateLastAccess() {
  const { supabase } = useDatabase();
  const { tenant } = useCurrentTenant();
  const lastUpdateRef = useRef<number>(0);

  useEffect(() => {
    const updateLastAccess = async () => {
      if (!tenant?.id) return;

      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user?.id) return;

        // Evitar atualizações muito frequentes (mínimo 1 minuto entre atualizações)
        const now = Date.now();
        if (now - lastUpdateRef.current < 60000) return;
        lastUpdateRef.current = now;

        // Atualizar último acesso
        await (supabase as any)
          .from('sieg_fin_tenant_users')
          .update({ ultimo_acesso: new Date().toISOString() })
          .eq('tenant_id', tenant.id)
          .eq('user_id', user.id);

        console.log('✅ Último acesso atualizado');
      } catch (error) {
        console.error('Erro ao atualizar último acesso:', error);
      }
    };

    // Atualizar imediatamente ao montar
    updateLastAccess();

    // Atualizar a cada 2 minutos
    const interval = setInterval(updateLastAccess, 2 * 60 * 1000);

    // Atualizar quando o usuário interage com a página
    const handleActivity = () => {
      updateLastAccess();
    };

    // Eventos de atividade do usuário
    window.addEventListener('focus', handleActivity);
    window.addEventListener('click', handleActivity);
    window.addEventListener('keydown', handleActivity);

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', handleActivity);
      window.removeEventListener('click', handleActivity);
      window.removeEventListener('keydown', handleActivity);
    };
  }, [tenant?.id, supabase]);
}
