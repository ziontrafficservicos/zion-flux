import { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Session } from '@supabase/supabase-js';
import { Loader2, Ban } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isRecovery, setIsRecovery] = useState(false);
  const [isBlocked, setIsBlocked] = useState(false);
  const location = useLocation();

  useEffect(() => {
    // Verificar se é um link de recovery (reset password) via hash
    const hashParams = new URLSearchParams(window.location.hash.substring(1));
    const hashType = hashParams.get('type');
    
    console.log('[ProtectedRoute] Checking URL:', { 
      hash: window.location.hash, 
      hashType,
      pathname: window.location.pathname 
    });
    
    if (hashType === 'recovery') {
      console.log('[AUTH] Recovery token detected in hash, redirecting to reset-password');
      setIsRecovery(true);
      setLoading(false);
      return;
    }

    // Check current session
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session);
      
      // ACESSO IRRESTRITO PARA USUÁRIOS MASTER DO SISTEMA
      const masterEmails = ['george@ziontraffic.com.br', 'leonardobasiliozion@gmail.com', 'eliasded51@gmail.com'];
      if (masterEmails.includes(session?.user?.email || '')) {
        console.log('[AUTH] MASTER ACCESS GRANTED:', session?.user?.email, '- ACESSO TOTAL');
        setLoading(false);
        return;
      }

      // Verificar se usuário está bloqueado em algum tenant
      if (session?.user?.id) {
        try {
          const { data: tenantData } = await supabase
            .from('sieg_fin_tenant_users')
            .select('bloqueado')
            .eq('user_id', session.user.id)
            .eq('bloqueado', true)
            .limit(1);

          if (tenantData && tenantData.length > 0) {
            console.log('[AUTH] Usuário BLOQUEADO detectado');
            setIsBlocked(true);
          }
        } catch (err) {
          console.error('[AUTH] Erro ao verificar bloqueio:', err);
        }
      }
      
      setLoading(false);
    });

    // Listen for auth changes - detectar evento PASSWORD_RECOVERY
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('[AUTH] Auth state changed:', event);
      
      // Se é um evento de recovery, redirecionar para reset-password
      if (event === 'PASSWORD_RECOVERY') {
        console.log('[AUTH] PASSWORD_RECOVERY event detected, redirecting...');
        setIsRecovery(true);
        return;
      }
      
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Se é um link de recovery, redirecionar para reset-password mantendo o hash
  if (isRecovery) {
    const newUrl = `/reset-password${window.location.hash}`;
    return <Navigate to={newUrl} replace />;
  }

  if (!session) {
    return <Navigate to="/auth" replace />;
  }

  // Se usuário está bloqueado, mostrar tela de bloqueio
  if (isBlocked) {
    const handleLogout = async () => {
      await supabase.auth.signOut();
      window.location.href = '/auth';
    };

    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-orange-50 dark:from-gray-900 dark:to-gray-800 p-4">
        <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 text-center">
          <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
            <Ban className="h-10 w-10 text-red-600 dark:text-red-400" />
          </div>
          
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
            Acesso Bloqueado
          </h1>
          
          <p className="text-gray-600 dark:text-gray-300 mb-6">
            Seu acesso ao sistema foi temporariamente bloqueado pelo administrador.
          </p>
          
          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4 mb-6">
            <p className="text-sm text-amber-800 dark:text-amber-200">
              <strong>O que fazer?</strong><br />
              Entre em contato com o administrador do sistema para mais informações sobre o bloqueio.
            </p>
          </div>
          
          <Button 
            onClick={handleLogout}
            variant="outline"
            className="w-full"
          >
            Sair do Sistema
          </Button>
        </div>
      </div>
    );
  }

  // ACESSO IRRESTRITO PARA USUÁRIOS MASTER - BYPASS TOTAL
  const masterEmailsList = ['george@ziontraffic.com.br', 'leonardobasiliozion@gmail.com', 'eliasded51@gmail.com'];
  if (masterEmailsList.includes(session.user.email || '')) {
    console.log('✅ MASTER ACCESS - Bypassing all restrictions:', session.user.email);
    return <>{children}</>;
  }

  return <>{children}</>;
}
