import { useState, useEffect } from 'react';
import { useTenant } from '@/contexts/TenantContext';
import { supabase as centralSupabase } from '@/integrations/supabase/client';

/**
 * SECURITY NOTE: Client-side role checks are for UX purposes only.
 * All security enforcement happens server-side through RLS policies.
 * These checks determine UI visibility but cannot be relied upon for authorization.
 */
export type UserRole = 'owner' | 'admin' | 'member' | 'viewer';

interface UseUserRoleReturn {
  role: UserRole | null;
  isOwner: boolean;
  isAdmin: boolean;
  isMember: boolean;
  isViewer: boolean;
  canAccessSettings: boolean;
  canAccessAnalysis: boolean;
  loading: boolean;
}

export function useUserRole(): UseUserRoleReturn {
  const { currentTenant, currentMembership, isLoading: tenantsLoading } = useTenant();
  const [isMasterUser, setIsMasterUser] = useState(false);
  const [checkingMaster, setCheckingMaster] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const verifyMasterUser = async () => {
      try {
        const { data: { session } } = await centralSupabase.auth.getSession();
        const email = session?.user?.email ?? null;
        if (!isMounted) return;
        const masterEmails = [
          'george@ziontraffic.com.br',
          'leonardobasiliozion@gmail.com',
          'eliasded51@gmail.com'
        ];
        setIsMasterUser(masterEmails.includes(email || ''));
      } finally {
        if (isMounted) {
          setCheckingMaster(false);
        }
      }
    };

    verifyMasterUser();

    return () => {
      isMounted = false;
    };
  }, []);

  const derivedRole: UserRole | null = isMasterUser
    ? 'owner'
    : (currentMembership?.role as UserRole | undefined) ?? null;

  const isOwner = derivedRole === 'owner';
  const isAdmin = derivedRole === 'admin';
  const isMember = derivedRole === 'member';
  const isViewer = derivedRole === 'viewer';
  const canAccessSettings = isOwner || isAdmin;
  const canAccessAnalysis = isOwner || isAdmin;

  return {
    role: derivedRole,
    isOwner,
    isAdmin,
    isMember,
    isViewer,
    canAccessSettings,
    canAccessAnalysis,
    loading: tenantsLoading || checkingMaster,
  };
}
