import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { SupabaseClient } from '@supabase/supabase-js';
import { createSupabaseClient } from '@/integrations/supabase/client';
import { supabase as defaultSupabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';

export type DatabaseType = string;

interface TenantConfig {
  id: string;
  slug: string;
  name: string;
}

interface DatabaseConfig {
  id: string;
  name: string;
  database_key: string;
  url: string;
  anon_key: string;
  active: boolean;
  tenant_id: string | null;
}

interface DatabaseContextType {
  tenants: TenantConfig[];
  currentTenantId: string | null;
  setTenant: (tenantId: string) => void;
  currentDatabase: string;
  databaseName: string;
  supabase: SupabaseClient<Database>;
  setDatabase: (databaseKey: string) => void;
  availableDatabases: Array<{ id: string; name: string; tenantId: string | null }>;
  isLoading: boolean;
  refetchConfigs: () => Promise<void>;
}

const DatabaseContext = createContext<DatabaseContextType | undefined>(undefined);

const DATABASE_STORAGE_KEY = 'zion-selected-database';
const TENANT_STORAGE_KEY = 'zion-selected-tenant';

export function DatabaseProvider({ children }: { children: ReactNode }) {
  const [tenants, setTenants] = useState<TenantConfig[]>([]);
  const [configs, setConfigs] = useState<DatabaseConfig[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentTenantId, setCurrentTenantId] = useState<string | null>(null);
  const [currentDatabase, setCurrentDatabase] = useState<string>('asf');
  const [supabaseClient, setSupabaseClient] = useState<SupabaseClient<Database>>(defaultSupabase);
  const [pendingDatabaseKey, setPendingDatabaseKey] = useState<string | null>(null);

  const fetchDatabaseConfigs = async () => {
    try {
      const [{ data: tenantData, error: tenantError }, { data, error }] = await Promise.all([
        (defaultSupabase.from as any)('sieg_fin_tenants_new')
          .select('id, slug, name')
          .order('created_at', { ascending: true }),
        defaultSupabase
          .from('sieg_fin_database_configs')
          .select('*')
          .eq('active', true)
          .order('created_at', { ascending: true })
      ]);

      if (error) throw error;
      if (tenantError) throw tenantError;

      if (tenantData) {
        const tenantRows = tenantData as Array<{ id: string; slug: string; name: string }>;
        const mappedTenants = tenantRows.map((tenant) => ({
          id: tenant.id,
          slug: tenant.slug,
          name: tenant.name
        }));
        setTenants(mappedTenants);

        if (!currentTenantId) {
          const storedTenant = localStorage.getItem(TENANT_STORAGE_KEY);
          const fallbackTenant = storedTenant || mappedTenants[0]?.id || null;
          if (fallbackTenant) {
            setCurrentTenantId(fallbackTenant);
            localStorage.setItem(TENANT_STORAGE_KEY, fallbackTenant);
          }
        }
      }

      if (data && data.length > 0) {
        const configRows = data as Array<any>;
        const mappedConfigs = configRows.map((cfg) => ({
          id: cfg.id,
          name: cfg.name,
          database_key: cfg.database_key,
          url: cfg.url,
          anon_key: cfg.anon_key,
          active: cfg.active ?? true,
          tenant_id: cfg.tenant_id ?? null
        }));

        setConfigs(mappedConfigs);

        const stored = localStorage.getItem(DATABASE_STORAGE_KEY);
        const desiredKey = pendingDatabaseKey || stored || mappedConfigs[0].database_key;
        const found = mappedConfigs.find(c => c.database_key === desiredKey);

        // Fallback explícito para ASF via env quando 'asf' não estiver na tabela central
        if (!found && desiredKey === 'asf') {
          const asfUrl = (import.meta as any).env?.VITE_SUPABASE_ASF_URL as string | undefined;
          const asfKey = (import.meta as any).env?.VITE_SUPABASE_ASF_ANON_KEY as string | undefined;
          if (asfUrl && asfKey) {
            setCurrentDatabase('asf');
            localStorage.setItem(DATABASE_STORAGE_KEY, 'asf');
            const storageKey = `sb-${asfUrl.split('//')[1]?.split('.')[0] || 'asf'}`;
            const client = createSupabaseClient(asfUrl, asfKey, storageKey);
            setSupabaseClient(client);
            setPendingDatabaseKey(null);
            return;
          }
        }

        const config = found || mappedConfigs[0];

        setCurrentDatabase(config.database_key);
        localStorage.setItem(DATABASE_STORAGE_KEY, config.database_key);
        if (config.tenant_id) {
          setCurrentTenantId(config.tenant_id);
          localStorage.setItem(TENANT_STORAGE_KEY, config.tenant_id);
        }

        // Usar storageKey baseado na URL, não no database_key
        // Isso evita múltiplas instâncias do GoTrueClient quando URLs são iguais
        const storageKey = `sb-${config.url.split('//')[1]?.split('.')[0] || 'default'}`;
        const client = createSupabaseClient(config.url, config.anon_key, storageKey);
        setSupabaseClient(client);
        setPendingDatabaseKey(null);
      }
    } catch (error) {
      console.error('Erro ao carregar configurações de banco:', error);
      // Não setar database padrão se houver erro - deixa undefined
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDatabaseConfigs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setDatabase = (databaseKey: string) => {
    const config = configs.find(c => c.database_key === databaseKey);
    
    if (!config) {
      // Fallback direto para ASF via env quando solicitado e não presente nas configs
      if (databaseKey === 'asf') {
        const asfUrl = (import.meta as any).env?.VITE_SUPABASE_ASF_URL as string | undefined;
        const asfKey = (import.meta as any).env?.VITE_SUPABASE_ASF_ANON_KEY as string | undefined;
        if (asfUrl && asfKey) {
          setCurrentDatabase('asf');
          localStorage.setItem(DATABASE_STORAGE_KEY, 'asf');
          const storageKey = `sb-${asfUrl.split('//')[1]?.split('.')[0] || 'asf'}`;
          const client = createSupabaseClient(asfUrl, asfKey, storageKey);
          setSupabaseClient(client);
          return;
        }
      }
      console.log("⏳ Aguardando banco", databaseKey, "carregar...");
      setPendingDatabaseKey(databaseKey);
      return;
    }

    setCurrentDatabase(databaseKey);
    localStorage.setItem(DATABASE_STORAGE_KEY, databaseKey);
    
    // Usar storageKey baseado na URL, não no database_key
    // Isso evita múltiplas instâncias do GoTrueClient quando URLs são iguais
    const storageKey = `sb-${config.url.split('//')[1]?.split('.')[0] || 'default'}`;
    const newClient = createSupabaseClient(config.url, config.anon_key, storageKey);
    setSupabaseClient(newClient);
  };

  const availableDatabases = configs.map(config => ({
    id: config.database_key,
    name: config.name,
    tenantId: config.tenant_id
  }));

  const currentConfig = configs.find(c => c.database_key === currentDatabase);

  const setTenant = (tenantId: string) => {
    setCurrentTenantId(tenantId);
    localStorage.setItem(TENANT_STORAGE_KEY, tenantId);
  };

  useEffect(() => {
    if (!currentTenantId || configs.length === 0) return;

    const targetConfig = configs.find(cfg => cfg.tenant_id === currentTenantId);
    if (targetConfig && targetConfig.database_key !== currentDatabase) {
      setDatabase(targetConfig.database_key);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentTenantId, configs.length]);

  const value: DatabaseContextType = {
    tenants,
    currentTenantId,
    setTenant,
    currentDatabase,
    databaseName: currentConfig?.name || 'ASF Finance',
    supabase: supabaseClient,
    setDatabase,
    availableDatabases,
    isLoading,
    refetchConfigs: fetchDatabaseConfigs
  };

  return (
    <DatabaseContext.Provider value={value}>
      {children}
    </DatabaseContext.Provider>
  );
}

export function useDatabase() {
  const context = useContext(DatabaseContext);
  if (context === undefined) {
    throw new Error('useDatabase must be used within a DatabaseProvider');
  }
  return context;
}
