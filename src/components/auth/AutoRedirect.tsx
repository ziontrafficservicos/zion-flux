import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { usePermissions } from '@/hooks/usePermissions';
import { useUserRole } from '@/hooks/useUserRole';
import { supabase } from '@/integrations/supabase/client';

/**
 * Componente que redireciona automaticamente o usuário para a primeira página
 * que ele tem permissão de acessar, caso tente acessar uma página sem permissão
 */
export function AutoRedirect() {
  const navigate = useNavigate();
  const location = useLocation();
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const { isOwner, loading: roleLoading } = useUserRole();
  const {
    canViewDashboard,
    canViewTraffic,
    canViewQualification,
    canViewAnalysis,
    loading: permissionsLoading
  } = usePermissions();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUserEmail(session?.user?.email || null);
    });
  }, []);

  useEffect(() => {
    // Não fazer nada enquanto está carregando o email do usuário
    if (userEmail === null) return;

    // MASTER ACCESS: Usuários master nunca são redirecionados
    const masterEmails = ['george@ziontraffic.com.br', 'leonardobasiliozion@gmail.com', 'eliasded51@gmail.com'];
    if (masterEmails.includes(userEmail)) {
      return;
    }

    // Ignorar rotas públicas que não precisam de verificação de permissão
    const publicRoutes = ['/reset-password', '/no-access', '/auth', '/accept-invite', '/complete-signup'];
    if (publicRoutes.some(route => location.pathname.startsWith(route))) {
      return;
    }

    // Não fazer nada enquanto está carregando permissões
    if (roleLoading || permissionsLoading) {
      console.log('⏳ [AutoRedirect] Aguardando permissões carregarem...');
      return;
    }

    // Owners têm acesso a tudo, não precisam de redirecionamento
    if (isOwner) return;

    // Verificar se tem pelo menos a permissão de dashboard (mínimo para qualquer usuário)
    const hasDashboard = canViewDashboard();
    
    // Debug
    console.log('🔐 [AutoRedirect] Verificando permissões:', {
      hasDashboard,
      pathname: location.pathname,
      isOwner,
      roleLoading,
      permissionsLoading
    });

    // Se o usuário tem permissão de dashboard, permitir acesso
    if (hasDashboard) {
      console.log('✅ [AutoRedirect] Usuário tem acesso ao dashboard');
      // Se está tentando acessar uma página que não tem permissão, redirecionar para home
      if (location.pathname !== '/' && location.pathname !== '/trafego' && location.pathname !== '/qualificacao' && location.pathname !== '/analise') {
        return; // Deixar outras rotas serem tratadas normalmente
      }
      if (location.pathname === '/') {
        return; // Tem acesso ao dashboard, não redirecionar
      }
    }

    // Lista de páginas em ordem de prioridade
    const routes = [
      { path: '/', canAccess: canViewDashboard },
      { path: '/trafego', canAccess: canViewTraffic },
      { path: '/qualificacao', canAccess: canViewQualification },
      { path: '/analise', canAccess: canViewAnalysis },
    ];

    // Verificar se o usuário pode acessar a página atual
    const currentRoute = routes.find(r => r.path === location.pathname);
    
    if (currentRoute && !currentRoute.canAccess()) {
      // Usuário não tem permissão para a página atual
      // Redirecionar para a primeira página que ele tem acesso
      const firstAccessibleRoute = routes.find(r => r.canAccess());
      
      if (firstAccessibleRoute) {
        console.log(`[REDIRECT] Redirecting to ${firstAccessibleRoute.path} - no permission for ${location.pathname}`);
        navigate(firstAccessibleRoute.path, { replace: true });
      } else if (!hasDashboard) {
        // Só redirecionar para no-access se realmente não tem nenhuma permissão
        console.log('❌ User has no access to any page - redirecting to /no-access');
        navigate('/no-access', { replace: true });
      }
    }
  }, [location.pathname, roleLoading, permissionsLoading, isOwner, canViewDashboard, canViewTraffic, canViewQualification, canViewAnalysis, navigate, userEmail]);

  return null; // Este componente não renderiza nada
}
