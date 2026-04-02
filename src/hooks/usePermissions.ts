import { useState, useEffect } from 'react';
import { useDatabase } from '@/contexts/DatabaseContext';
import { useTenant } from '@/contexts/TenantContext';
import { useUserRole } from '@/hooks/useUserRole';
import { PERMISSIONS, PermissionKey, DEFAULT_PERMISSIONS_BY_ROLE } from '@/types/permissions';
import { logger } from '@/utils/logger';
import { supabase as centralSupabase } from '@/integrations/supabase/client';

export interface UserPermission {
  permission_key: string;
  granted: boolean;
}

export function usePermissions() {
  const { supabase, currentDatabase } = useDatabase();
  const { currentTenant } = useTenant();
  const { role, isOwner } = useUserRole();
  const [permissions, setPermissions] = useState<Set<PermissionKey>>(
    // Inicializar com permissões de owner se for owner
    isOwner ? new Set(DEFAULT_PERMISSIONS_BY_ROLE.owner) : new Set()
  );
  const [loading, setLoading] = useState(true);
  
  const tenantId = currentTenant?.id ?? null;
  const workspaceSlug = currentTenant?.slug ?? currentDatabase;

  const fetchPermissions = async () => {
    // Verificar se é master user (usar centralSupabase que sempre tem a sessão)
    const { data: { session } } = await centralSupabase.auth.getSession();
    const user = session?.user;
    const masterEmails = ['george@ziontraffic.com.br', 'leonardobasiliozion@gmail.com', 'eliasded51@gmail.com'];
    const isMasterUser = masterEmails.includes(user?.email || '');
    
    // Master user tem TODAS as permissões sempre
    if (isMasterUser) {
      console.log('🔓 MASTER USER detectado - concedendo todas as permissões');
      setPermissions(new Set(DEFAULT_PERMISSIONS_BY_ROLE.owner));
      setLoading(false);
      return;
    }
    
    // Se for owner, dar todas as permissões imediatamente e não fazer consultas
    if (isOwner || role === 'owner') {
      setPermissions(new Set(DEFAULT_PERMISSIONS_BY_ROLE.owner));
      setLoading(false);
      return;
    }

    if (!tenantId) {
      // Se não tem workspace mas tem role, usar permissões padrão
      if (role && DEFAULT_PERMISSIONS_BY_ROLE[role]) {
        setPermissions(new Set(DEFAULT_PERMISSIONS_BY_ROLE[role]));
      } else {
        // Fallback: dar pelo menos permissão de visualizar dashboard
        console.log('⚠️ Sem tenant e sem role, dando permissões mínimas de viewer');
        setPermissions(new Set(DEFAULT_PERMISSIONS_BY_ROLE.viewer));
      }
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      
      // Usar centralSupabase para auth (sempre tem sessão válida)
      const { data: { session: currentSession } } = await centralSupabase.auth.getSession();
      if (!currentSession?.user) {
        console.log('⚠️ Sem sessão para buscar permissões, usando fallback');
        if (role && DEFAULT_PERMISSIONS_BY_ROLE[role]) {
          setPermissions(new Set(DEFAULT_PERMISSIONS_BY_ROLE[role]));
        } else {
          setPermissions(new Set(DEFAULT_PERMISSIONS_BY_ROLE.viewer));
        }
        setLoading(false);
        return;
      }

      // Usar query SQL direta para evitar problemas de TypeScript
      const { data: customPermissions, error } = await centralSupabase
        .rpc('sieg_fin_get_user_permissions', {
          p_workspace_id: tenantId,
          p_user_id: currentSession.user.id
        });

      if (error) {
        console.warn('Error fetching user permissions, using default for role:', role, error);
        // Fallback para permissões padrão do role
        if (role && DEFAULT_PERMISSIONS_BY_ROLE[role]) {
          setPermissions(new Set(DEFAULT_PERMISSIONS_BY_ROLE[role]));
        } else {
          // Fallback mínimo: viewer
          console.log('⚠️ RPC falhou e sem role, dando permissões de viewer');
          setPermissions(new Set(DEFAULT_PERMISSIONS_BY_ROLE.viewer));
        }
        setLoading(false);
        return;
      }

      // Type assertion para o resultado
      const result = customPermissions as any;
      
      if (!result?.success) {
        // Se não conseguiu buscar ou não tem permissões customizadas, usar padrões do role
        if (role && DEFAULT_PERMISSIONS_BY_ROLE[role]) {
          setPermissions(new Set(DEFAULT_PERMISSIONS_BY_ROLE[role]));
        } else {
          // Fallback mínimo: viewer
          console.log('⚠️ Result não success e sem role, dando permissões de viewer');
          setPermissions(new Set(DEFAULT_PERMISSIONS_BY_ROLE.viewer));
        }
        return;
      }

      // Debug log
      console.log('🔐 Permissions Debug:', {
        role,
        result,
        tenantId,
        userId: userData.user.id
      });

      // Se há permissões customizadas definidas, usar apenas elas
      if (result.has_custom_permissions) {
        const grantedPermissions = result.permissions || [];
        console.log('✅ Using custom permissions:', grantedPermissions);
        setPermissions(new Set(grantedPermissions));
      } else {
        // Se não há permissões customizadas, usar padrões do role
        const defaultPerms = role && DEFAULT_PERMISSIONS_BY_ROLE[role] ? DEFAULT_PERMISSIONS_BY_ROLE[role] : [];
        console.log('📋 Using default permissions for role:', role, defaultPerms);
        setPermissions(new Set(defaultPerms));
      }
    } catch (error) {
      logger.error('Error in fetchPermissions', error);
      // Fallback para permissões padrão do role
      if (role && DEFAULT_PERMISSIONS_BY_ROLE[role]) {
        setPermissions(new Set(DEFAULT_PERMISSIONS_BY_ROLE[role]));
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPermissions();
  }, [tenantId, role]);

  const hasPermission = (permission: PermissionKey): boolean => {
    return permissions.has(permission);
  };

  const hasAnyPermission = (permissionList: PermissionKey[]): boolean => {
    return permissionList.some(permission => permissions.has(permission));
  };

  const hasAllPermissions = (permissionList: PermissionKey[]): boolean => {
    return permissionList.every(permission => permissions.has(permission));
  };

  // Funções de conveniência para verificações comuns
  const canViewDashboard = () => hasPermission(PERMISSIONS.DASHBOARD_VIEW);
  const canViewTraffic = () => {
    // Ocultar tráfego APENAS para workspace Sieg Financeiro
    console.log('🔍 canViewTraffic - workspaceSlug:', workspaceSlug, 'currentDatabase:', currentDatabase);
    if (workspaceSlug === 'sieg' || currentDatabase === 'sieg') {
      console.log('❌ Ocultando Tráfego para workspace Sieg');
      return false;
    }
    // Para ASF Finance e outros workspaces, sempre mostrar Tráfego
    // (Owner sempre tem acesso, outros roles verificam permissão)
    const hasTrafficPermission = isOwner || hasPermission(PERMISSIONS.TRAFFIC_VIEW);
    console.log('✅ Mostrando Tráfego para ASF - hasPermission:', hasTrafficPermission, 'isOwner:', isOwner);
    return hasTrafficPermission;
  };
  const canViewQualification = () => hasPermission(PERMISSIONS.QUALIFICATION_VIEW);
  const canManageQualification = () => hasPermission(PERMISSIONS.QUALIFICATION_MANAGE);
  const canViewAnalysis = () => hasPermission(PERMISSIONS.ANALYSIS_VIEW);
  const canViewSettings = () => hasPermission(PERMISSIONS.SETTINGS_VIEW);
  const canManageUsers = () => hasPermission(PERMISSIONS.SETTINGS_USERS);
  const canExportReports = () => hasAnyPermission([
    PERMISSIONS.TRAFFIC_EXPORT,
    PERMISSIONS.ANALYSIS_EXPORT,
    PERMISSIONS.REPORTS_EXPORT,
  ]);

  const hasCustomPermissions = () => {
    if (role === 'owner' || role === 'admin') return false;

    const defaultPerms = role && DEFAULT_PERMISSIONS_BY_ROLE[role] ? DEFAULT_PERMISSIONS_BY_ROLE[role] : [];
    const currentPerms = Array.from(permissions);

    if (currentPerms.length !== defaultPerms.length) return true;

    return !defaultPerms.every((perm) => currentPerms.includes(perm));
  };

  return {
    permissions: Array.from(permissions),
    loading,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    hasCustomPermissions,
    refetch: fetchPermissions,
    
    // Funções de conveniência
    canViewDashboard,
    canViewTraffic,
    canViewQualification,
    canManageQualification,
    canViewAnalysis,
    canViewSettings,
    canManageUsers,
    canExportReports,
  };
}
