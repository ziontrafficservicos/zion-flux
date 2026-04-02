import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from 'react';
import { supabase as centralSupabase } from '@/integrations/supabase/client';
import { useDatabase } from '@/contexts/DatabaseContext';

interface Tenant {
  id: string;
  name: string;
  slug: string;
  database_key: string;
  domain?: string | null;
  settings: Record<string, any>;
  branding: Record<string, any>;
  active: boolean;
  max_users: number;
  max_leads: number;
  plan_type: 'basic' | 'pro' | 'enterprise';
  billing_email?: string | null;
  created_at: string;
}

interface TenantMembership {
  id: string;
  tenant_id: string;
  user_id: string;
  role: 'owner' | 'admin' | 'member' | 'viewer';
  active: boolean;
  custom_permissions: Record<string, any>;
  tenant?: Tenant;
}

interface TenantContextType {
  currentTenant: Tenant | null;
  currentMembership: TenantMembership | null;
  availableTenants: Tenant[];
  memberships: TenantMembership[];
  isLoading: boolean;
  error: string | null;
  switchTenant: (tenantId: string) => Promise<void>;
  refreshTenants: () => Promise<void>;
}

const TenantContext = createContext<TenantContextType | undefined>(undefined);

interface TenantProviderProps {
  children: ReactNode;
}

const normalizeTenant = (tenantData: any): Tenant | null => {
  if (!tenantData) return null;
  return {
    id: tenantData.id,
    name: tenantData.name,
    slug: tenantData.slug,
    database_key: tenantData.database_key,
    domain: tenantData.domain ?? null,
    settings: tenantData.settings ?? {},
    branding: tenantData.branding ?? {},
    active: tenantData.active ?? true,
    max_users: tenantData.max_users ?? 50,
    max_leads: tenantData.max_leads ?? 10000,
    plan_type: tenantData.plan_type ?? 'basic',
    billing_email: tenantData.billing_email ?? null,
    created_at: tenantData.created_at ?? new Date().toISOString(),
  };
};

const normalizeMembership = (membershipData: any): TenantMembership | null => {
  if (!membershipData) return null;
  const tenant = normalizeTenant(membershipData.tenant);
  return {
    id: membershipData.id,
    tenant_id: membershipData.tenant_id,
    user_id: membershipData.user_id,
    role: membershipData.role ?? 'viewer',
    active: membershipData.active ?? true,
    custom_permissions: membershipData.custom_permissions ?? {},
    tenant: tenant ?? undefined,
  };
};

export const TenantProvider: React.FC<TenantProviderProps> = ({ children }) => {
  const { setDatabase, setTenant } = useDatabase();
  const [memberships, setMemberships] = useState<TenantMembership[]>([]);
  const [availableTenants, setAvailableTenants] = useState<Tenant[]>([]);
  const [currentTenant, setCurrentTenant] = useState<Tenant | null>(null);
  const [currentMembership, setCurrentMembership] = useState<TenantMembership | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const applyTenantSelection = async (tenant: Tenant) => {
    try {
      setTenant(tenant.id);
      setDatabase(tenant.database_key);
      localStorage.setItem('selectedTenantId', tenant.id);
    } catch (err) {
      console.warn('Não foi possível aplicar contexto do tenant:', err);
    }
  };

  const loadUserTenants = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Usar getSession em vez de getUser para evitar erro "Invalid value" com tokens corrompidos
      const { data: { session }, error: sessionError } = await centralSupabase.auth.getSession();
      if (sessionError) throw sessionError;

      const authUser = session?.user;
      if (!authUser) {
        setMemberships([]);
        setAvailableTenants([]);
        setCurrentTenant(null);
        setCurrentMembership(null);
        return;
      }

      // MASTER ACCESS: Usuários master têm acesso a TODOS os tenants
      const masterEmails = ['george@ziontraffic.com.br', 'leonardobasiliozion@gmail.com', 'eliasded51@gmail.com'];
      const isMasterUser = masterEmails.includes(authUser.email || '');

      let tenantsList: Tenant[] = [];
      let normalizedMemberships: TenantMembership[] = [];

      if (isMasterUser) {
        // Master user: carregar TODOS os tenants
        console.log('🔓 MASTER USER - Carregando todos os tenants');
        const { data: allTenants, error: tenantsError } = await (centralSupabase.from as any)('sieg_fin_tenants_new')
          .select('*')
          .eq('active', true);

        if (tenantsError) throw tenantsError;

        tenantsList = (allTenants || [])
          .map((item: any) => normalizeTenant(item))
          .filter((item): item is Tenant => Boolean(item));

        // Criar memberships virtuais como owner para master users
        normalizedMemberships = tenantsList.map((tenant) => ({
          id: `master-${tenant.id}`,
          tenant_id: tenant.id,
          user_id: authUser.id,
          role: 'owner' as const,
          active: true,
          custom_permissions: {},
          tenant: tenant,
        }));
      } else {
        // Usuário normal: carregar apenas tenants com membership
        const { data: rawMemberships, error: membershipError } = await (centralSupabase.from as any)('sieg_fin_tenant_users')
          .select(`
            id,
            tenant_id,
            user_id,
            role,
            active,
            custom_permissions,
            tenant:sieg_fin_tenants_new (
              id,
              name,
              slug,
              database_key,
              domain,
              settings,
              branding,
              active,
              max_users,
              max_leads,
              plan_type,
              billing_email,
              created_at
            )
          `)
          .eq('user_id', authUser.id)
          .eq('active', true);

        if (membershipError) throw membershipError;

        normalizedMemberships = (rawMemberships || [])
          .map((item: any) => normalizeMembership(item))
          .filter((item): item is TenantMembership => Boolean(item));

        // AUTO-ASSIGN: Se não tem nenhum tenant, associar ao SIEG automaticamente
        if (normalizedMemberships.length === 0) {
          const SIEG_TENANT_ID = 'a0000000-0000-0000-0000-000000000001';
          console.log('🔄 Nenhum tenant encontrado — auto-associando ao SIEG...');

          const { data: assigned, error: autoAssignError } = await centralSupabase
            .rpc('sieg_fin_auto_assign_user', {
              _user_id: authUser.id,
              _tenant_id: SIEG_TENANT_ID,
            });

          if (!autoAssignError && assigned) {
            console.log('✅ Auto-assign concluído! Recarregando memberships...');
            // Recarregar memberships após auto-assign
            const { data: newMemberships } = await (centralSupabase.from as any)('sieg_fin_tenant_users')
              .select(`
                id, tenant_id, user_id, role, active, custom_permissions,
                tenant:sieg_fin_tenants_new (
                  id, name, slug, database_key, domain, settings, branding,
                  active, max_users, max_leads, plan_type, billing_email, created_at
                )
              `)
              .eq('user_id', authUser.id)
              .eq('active', true);

            if (newMemberships && newMemberships.length > 0) {
              normalizedMemberships = newMemberships
                .map((item: any) => normalizeMembership(item))
                .filter((item): item is TenantMembership => Boolean(item));
            }
          } else {
            console.error('❌ Erro no auto-assign:', autoAssignError);
          }
        }

        tenantsList = normalizedMemberships
          .map((membership) => membership.tenant)
          .filter((tenant): tenant is Tenant => Boolean(tenant));
      }

      setMemberships(normalizedMemberships);
      setAvailableTenants(tenantsList);

      if (tenantsList.length === 0) {
        setCurrentTenant(null);
        setCurrentMembership(null);
        return;
      }

      const savedTenantId = localStorage.getItem('selectedTenantId');
      const preferredTenant = tenantsList.find((tenant) => tenant.id === savedTenantId) || tenantsList[0];
      const preferredMembership = normalizedMemberships.find((membership) => membership.tenant_id === preferredTenant.id) || null;

      setCurrentTenant(preferredTenant);
      setCurrentMembership(preferredMembership);
      await applyTenantSelection(preferredTenant);
    } catch (err) {
      console.error('Erro ao carregar tenants:', err);
      setError(err instanceof Error ? err.message : 'Não foi possível carregar empresas');
    } finally {
      setIsLoading(false);
    }
  };

  const switchTenant = async (tenantId: string) => {
    try {
      setIsLoading(true);
      setError(null);

      const tenant = availableTenants.find((item) => item.id === tenantId);
      if (!tenant) {
        throw new Error('Empresa não encontrada');
      }

      const membership = memberships.find((item) => item.tenant_id === tenant.id) || null;

      setCurrentTenant(tenant);
      setCurrentMembership(membership);
      await applyTenantSelection(tenant);
    } catch (err) {
      console.error('Erro ao trocar de tenant:', err);
      setError(err instanceof Error ? err.message : 'Falha ao trocar de empresa');
    } finally {
      setIsLoading(false);
    }
  };

  const refreshTenants = async () => {
    await loadUserTenants();
  };

  useEffect(() => {
    loadUserTenants();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!currentTenant && availableTenants.length > 0 && !isLoading) {
      const savedTenantId = localStorage.getItem('selectedTenantId');
      if (savedTenantId && availableTenants.find((tenant) => tenant.id === savedTenantId)) {
        switchTenant(savedTenantId);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading, availableTenants.length]);

  const value: TenantContextType = {
    currentTenant,
    currentMembership,
    availableTenants,
    memberships,
    isLoading,
    error,
    switchTenant,
    refreshTenants,
  };

  return <TenantContext.Provider value={value}>{children}</TenantContext.Provider>;
};

export const useTenant = (): TenantContextType => {
  const context = useContext(TenantContext);
  if (context === undefined) {
    throw new Error('useTenant deve ser usado dentro de um TenantProvider');
  }
  return context;
};

export const useCurrentTenant = () => {
  const { currentTenant, currentMembership, isLoading, refreshTenants } = useTenant();

  return {
    tenant: currentTenant,
    membership: currentMembership,
    isLoading,
    tenantId: currentTenant?.id ?? null,
    tenantSlug: currentTenant?.slug ?? null,
    databaseKey: currentTenant?.database_key ?? null,
    userRole: currentMembership?.role ?? 'viewer',
    isOwner: currentMembership?.role === 'owner',
    isAdmin:
      currentMembership?.role === 'owner' ||
      currentMembership?.role === 'admin',
    refreshTenants,
  };
};
