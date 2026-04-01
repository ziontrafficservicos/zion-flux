import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.74.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Validar autenticação
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    // Cliente admin com service role
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Cliente normal para autenticação
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    // Pegar dados do usuário autenticado
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      console.error('❌ Authentication failed:', userError);
      throw new Error('User not authenticated');
    }

    console.log(`✅ User authenticated: ${user.id}`);

    // Receber dados da requisição
    const requestData = await req.json();
    
    // Verificar se é uma requisição de migração ou criação de workspace
    if (requestData.action === 'migrate') {
      console.log(`🚀 Executando migração multi-tenancy - Etapa: ${requestData.step}`);
      return await executeMigration(supabaseAdmin, requestData.step);
    }

    // Lógica original de criação de workspace
    const { name, slug, database } = requestData;

    console.log(`📝 Creating workspace: ${name} (${slug}) in database: ${database}`);

    // Buscar configuração do banco alvo
    const { data: dbConfig, error: dbConfigError } = await supabaseClient
      .from('sieg_fin_configuracoes_banco')
      .select('url, service_role_secret_name')
      .eq('database_key', database)
      .single();

    if (dbConfigError || !dbConfig) {
      console.error('❌ Database config not found:', dbConfigError);
      throw new Error(`Database config not found for: ${database}`);
    }

    console.log(`🔑 Using service role key: ${dbConfig.service_role_secret_name}`);

    // Buscar Service Role Key do secret correto
    const serviceRoleKey = Deno.env.get(dbConfig.service_role_secret_name);
    if (!serviceRoleKey) {
      console.error(`❌ Service role key not found: ${dbConfig.service_role_secret_name}`);
      throw new Error(`Service role key not found: ${dbConfig.service_role_secret_name}`);
    }

    console.log(`🌐 Connecting to target database: ${dbConfig.url}`);

    // Criar cliente admin para o banco alvo
    const targetClient = createClient(dbConfig.url, serviceRoleKey);

    // Criar workspace no banco alvo
    const { data: workspace, error: workspaceError } = await targetClient
      .from('sieg_fin_workspaces')
      .insert([{
        name,
        slug,
        database
      }])
      .select()
      .single();

    if (workspaceError) {
      console.error('❌ Error creating workspace:', workspaceError);
      throw workspaceError;
    }

    console.log(`✅ Workspace created: ${workspace.id}`);

    // ID do usuário master George
    const MASTER_USER_ID = 'd71b327c-bb1e-4e0c-bfcc-aae29917b391';
    
    // Preparar lista de owners (usuário atual + George se for diferente)
    const ownersToAdd = [
      {
        workspace_id: workspace.id,
        user_id: user.id,
        role: 'owner',
      }
    ];
    
    // Adicionar George como owner se não for o usuário atual
    if (user.id !== MASTER_USER_ID) {
      ownersToAdd.push({
        workspace_id: workspace.id,
        user_id: MASTER_USER_ID,
        role: 'owner',
      });
      console.log(`📌 Adding master user George as owner to workspace ${workspace.id}`);
    }

    // Adicionar owners
    const { error: memberError } = await targetClient
      .from('sieg_fin_membros_workspace')
      .insert(ownersToAdd);

    if (memberError) {
      console.error('❌ Error adding members:', memberError);
      throw memberError;
    }

    console.log(`✅ ${ownersToAdd.length} owner(s) added to workspace ${workspace.id}`);

    return new Response(
      JSON.stringify({ data: workspace }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error('❌ Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400 
      }
    );
  }
});

// Função para executar migrações
async function executeMigration(supabase: any, step: string) {
  let result;

  switch (step) {
    case 'create_tenants':
      result = await createTenantsTable(supabase);
      break;
    case 'create_tenant_users':
      result = await createTenantUsersTable(supabase);
      break;
    case 'create_helper_functions':
      result = await createHelperFunctions(supabase);
      break;
    case 'create_data_tables':
      result = await createDataTables(supabase);
      break;
    case 'migrate_data':
      result = await migrateExistingData(supabase);
      break;
    case 'create_rls_policies':
      result = await createRLSPolicies(supabase);
      break;
    case 'validate_migration':
      result = await validateMigration(supabase);
      break;
    default:
      throw new Error(`Etapa desconhecida: ${step}`);
  }

  return new Response(
    JSON.stringify({ success: true, result, step }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

// Etapa 1: Criar tabela empresas
async function createTenantsTable(supabase: any) {
  console.log('📊 Criando tabela empresas...');
  
  const { error } = await supabase.rpc('exec_sql', {
    sql: `
      CREATE TABLE IF NOT EXISTS public.empresas (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name TEXT NOT NULL,
        slug TEXT UNIQUE NOT NULL,
        domain TEXT,
        database_key TEXT NOT NULL,
        settings JSONB DEFAULT '{}',
        branding JSONB DEFAULT '{}',
        active BOOLEAN DEFAULT true,
        max_users INTEGER DEFAULT 50,
        max_leads INTEGER DEFAULT 10000,
        plan_type TEXT DEFAULT 'basic' CHECK (plan_type IN ('basic', 'pro', 'enterprise')),
        billing_email TEXT,
        created_at TIMESTAMPTZ DEFAULT now(),
        updated_at TIMESTAMPTZ DEFAULT now(),
        created_by UUID REFERENCES auth.users(id)
      );

      CREATE INDEX IF NOT EXISTS idx_empresas_slug ON empresas(slug);
      CREATE INDEX IF NOT EXISTS idx_empresas_database_key ON empresas(database_key);
      CREATE INDEX IF NOT EXISTS idx_empresas_active ON empresas(active) WHERE active = true;

      CREATE OR REPLACE FUNCTION update_updated_at_column()
      RETURNS TRIGGER AS $$
      BEGIN
          NEW.updated_at = now();
          RETURN NEW;
      END;
      $$ language 'plpgsql';

      CREATE TRIGGER update_empresas_updated_at 
          BEFORE UPDATE ON empresas 
          FOR EACH ROW 
          EXECUTE FUNCTION update_updated_at_column();
    `
  });

  if (error) throw error;
  return 'Tabela empresas criada com sucesso';
}

// Etapa 2: Criar tabela usuarios_empresas
async function createTenantUsersTable(supabase: any) {
  console.log('👥 Criando tabela usuarios_empresas...');
  
  const { error } = await supabase.rpc('exec_sql', {
    sql: `
      CREATE TABLE IF NOT EXISTS public.usuarios_empresas (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
        user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
        role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member', 'viewer')),
        active BOOLEAN DEFAULT true,
        invited_by UUID REFERENCES auth.users(id),
        invited_at TIMESTAMPTZ,
        joined_at TIMESTAMPTZ DEFAULT now(),
        custom_permissions JSONB DEFAULT '{}',
        created_at TIMESTAMPTZ DEFAULT now(),
        updated_at TIMESTAMPTZ DEFAULT now(),
        UNIQUE(tenant_id, user_id)
      );

      CREATE INDEX IF NOT EXISTS idx_usuarios_empresas_tenant ON usuarios_empresas(tenant_id);
      CREATE INDEX IF NOT EXISTS idx_usuarios_empresas_user ON usuarios_empresas(user_id);
      CREATE INDEX IF NOT EXISTS idx_usuarios_empresas_role ON usuarios_empresas(tenant_id, role);
      CREATE INDEX IF NOT EXISTS idx_usuarios_empresas_active ON usuarios_empresas(tenant_id, active) WHERE active = true;

      CREATE TRIGGER update_usuarios_empresas_updated_at 
          BEFORE UPDATE ON usuarios_empresas 
          FOR EACH ROW 
          EXECUTE FUNCTION update_updated_at_column();
    `
  });

  if (error) throw error;
  return 'Tabela usuarios_empresas criada com sucesso';
}

// Etapa 3: Criar funções helper
async function createHelperFunctions(supabase: any) {
  console.log('🔧 Criando funções helper...');
  
  const { error } = await supabase.rpc('exec_sql', {
    sql: `
      CREATE OR REPLACE FUNCTION get_current_tenant_id()
      RETURNS UUID
      LANGUAGE plpgsql
      SECURITY DEFINER
      SET search_path = public
      AS $$
      DECLARE
        tenant_uuid UUID;
      BEGIN
        SELECT e.id INTO tenant_uuid
        FROM empresas e
        JOIN usuarios_empresas ue ON ue.tenant_id = e.id
        WHERE ue.user_id = auth.uid()
          AND ue.active = true
          AND e.database_key = COALESCE(
            current_setting('app.current_tenant', true),
            'asf'
          );
        
        RETURN tenant_uuid;
      END;
      $$;

      CREATE OR REPLACE FUNCTION user_belongs_to_tenant(user_uuid UUID, tenant_uuid UUID)
      RETURNS BOOLEAN
      LANGUAGE plpgsql
      SECURITY DEFINER
      SET search_path = public
      AS $$
      BEGIN
        RETURN EXISTS (
          SELECT 1 
          FROM usuarios_empresas 
          WHERE user_id = user_uuid 
            AND tenant_id = tenant_uuid 
            AND active = true
        );
      END;
      $$;
    `
  });

  if (error) throw error;
  return 'Funções helper criadas com sucesso';
}

// Etapa 4: Criar tabelas de dados
async function createDataTables(supabase: any) {
  console.log('📊 Criando tabelas de dados multi-tenant...');
  
  const { error } = await supabase.rpc('exec_sql', {
    sql: `
      CREATE TABLE IF NOT EXISTS public.leads (
        id BIGSERIAL PRIMARY KEY,
        tenant_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
        nome TEXT,
        telefone TEXT,
        email TEXT,
        cnpj TEXT,
        url_origem TEXT,
        canal_origem TEXT,
        produto TEXT,
        localidade TEXT,
        stage TEXT NOT NULL DEFAULT 'novo_lead' 
          CHECK (stage IN ('novo_lead', 'qualificacao', 'qualificados', 'descartados', 'followup')),
        follow_up TEXT,
        motivo TEXT,
        meta JSONB DEFAULT '{}',
        entered_at TIMESTAMPTZ DEFAULT now(),
        created_at TIMESTAMPTZ DEFAULT now(),
        updated_at TIMESTAMPTZ DEFAULT now(),
        CONSTRAINT leads_created_at_check CHECK (created_at >= '2025-10-01 00:00:00'::timestamp)
      );

      CREATE TABLE IF NOT EXISTS public.conversas_leads (
        id BIGSERIAL PRIMARY KEY,
        tenant_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
        lead_id BIGINT REFERENCES leads(id) ON DELETE SET NULL,
        nome TEXT,
        phone TEXT,
        tag TEXT,
        analista TEXT,
        csat TEXT,
        messages JSONB,
        message_automatic TEXT,
        started TIMESTAMPTZ DEFAULT (CURRENT_TIMESTAMP AT TIME ZONE 'America/Sao_Paulo'),
        data_transferencia TIMESTAMPTZ,
        data_conclusao TIMESTAMPTZ,
        data_resposta_csat TIMESTAMPTZ,
        tempo_medio_resposta TEXT,
        tempo_primeira_resposta TEXT,
        valor_em_aberto TEXT,
        source TEXT,
        data_entrada TEXT,
        created_at TIMESTAMPTZ DEFAULT now(),
        updated_at TIMESTAMPTZ DEFAULT now()
      );

      CREATE TABLE IF NOT EXISTS public.tenant_ad_costs (
        id BIGSERIAL PRIMARY KEY,
        tenant_id UUID NOT NULL REFERENCES tenants_new(id) ON DELETE CASCADE,
        day DATE NOT NULL,
        source TEXT DEFAULT 'meta',
        ad_account_id TEXT NOT NULL DEFAULT '',
        amount NUMERIC DEFAULT 0,
        campaign_name TEXT,
        campaign_id TEXT,
        impressions INTEGER,
        clicks INTEGER,
        created_at TIMESTAMPTZ DEFAULT now(),
        UNIQUE(tenant_id, day, ad_account_id),
        CONSTRAINT tenant_ad_costs_day_check CHECK (day >= '2025-10-01'::date)
      );

      CREATE INDEX IF NOT EXISTS idx_leads_tenant_stage ON leads(tenant_id, stage);
      CREATE INDEX IF NOT EXISTS idx_conversas_leads_tenant ON conversas_leads(tenant_id);
      CREATE INDEX IF NOT EXISTS idx_tenant_ad_costs_tenant_day ON tenant_ad_costs(tenant_id, day);
    `
  });

  if (error) throw error;
  return 'Tabelas de dados multi-tenant criadas com sucesso';
}

// Etapa 5: Migrar dados existentes
async function migrateExistingData(supabase: any) {
  console.log('🔄 Migrando dados existentes...');
  
  const { error } = await supabase.rpc('exec_sql', {
    sql: `
      INSERT INTO empresas (id, name, slug, database_key, created_at)
      SELECT id, name, slug, database, created_at
      FROM workspaces
      ON CONFLICT (slug) DO NOTHING;

      INSERT INTO usuarios_empresas (tenant_id, user_id, role, created_at)
      SELECT w.id as tenant_id, mw.user_id, mw.role, now()
      FROM workspaces w
      JOIN membros_workspace mw ON mw.workspace_id = w.id
      ON CONFLICT (empresa_id, user_id) DO NOTHING;

      INSERT INTO leads (
        tenant_id, nome, telefone, email, cnpj, url_origem, canal_origem,
        produto, stage, follow_up, localidade, motivo, meta,
        entered_at, created_at
      )
      SELECT 
        workspace_id as tenant_id, nome, telefone, email, cnpj, url_origem, canal_origem,
        produto, stage, follow_up, localidade, motivo, meta,
        entered_at, created_at
      FROM leads
      WHERE workspace_id IN (SELECT id FROM empresas);

      INSERT INTO conversas_leads (
        tenant_id, nome, phone, tag, messages, source, data_entrada, created_at
      )
      SELECT 
        id_workspace as tenant_id, lead_name as nome, phone, tag,
        messages::jsonb, source, data_entrada, created_at
      FROM conversas_asf
      WHERE id_workspace IN (SELECT id FROM empresas);

      INSERT INTO conversas_leads (
        tenant_id, nome, phone, tag, analista, messages, csat,
        started, data_transferencia, data_conclusao, data_resposta_csat,
        tempo_medio_resposta, tempo_primeira_resposta, valor_em_aberto,
        created_at, updated_at
      )
      SELECT 
        id_workspace as empresa_id, nome, phone, tag, analista, messages, csat,
        started, data_transferencia, data_conclusao, data_resposta_csat,
        tempo_medio_resposta, tempo_primeira_resposta, valor_em_aberto,
        created_at, updated_at
      FROM conversas_sieg_financeiro
      WHERE id_workspace IN (SELECT id FROM empresas);

      INSERT INTO tenant_ad_costs (tenant_id, day, source, ad_account_id, amount, created_at)
      SELECT workspace_id as tenant_id, day, source, ad_account_id, amount, created_at
      FROM custo_anuncios
      WHERE workspace_id IN (SELECT id FROM tenants_new)
      ON CONFLICT (tenant_id, day, ad_account_id) DO NOTHING;
    `
  });

  if (error) throw error;
  return 'Dados migrados para tabelas multi-tenant com sucesso';
}

// Etapa 6: Criar políticas RLS
async function createRLSPolicies(supabase: any) {
  console.log('🔒 Criando políticas RLS...');
  
  const { error } = await supabase.rpc('exec_sql', {
    sql: `
      ALTER TABLE empresas ENABLE ROW LEVEL SECURITY;
      ALTER TABLE usuarios_empresas ENABLE ROW LEVEL SECURITY;
      ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
      ALTER TABLE conversas_leads ENABLE ROW LEVEL SECURITY;
      ALTER TABLE tenant_ad_costs ENABLE ROW LEVEL SECURITY;

      CREATE POLICY "Users see their empresas" ON empresas
      FOR SELECT USING (
        id IN (
          SELECT tenant_id 
          FROM usuarios_empresas 
          WHERE user_id = (SELECT auth.uid())
        )
      );

      CREATE POLICY "Users see their empresa memberships" ON usuarios_empresas
      FOR SELECT USING (user_id = (SELECT auth.uid()));

      CREATE POLICY "Tenant isolation for leads" ON leads
      FOR ALL USING (tenant_id = get_current_tenant_id());

      CREATE POLICY "Tenant isolation for conversations" ON conversas_leads
      FOR ALL USING (tenant_id = get_current_tenant_id());

      CREATE POLICY "Tenant isolation for ad costs" ON tenant_ad_costs
      FOR ALL USING (tenant_id = get_current_tenant_id());
    `
  });

  if (error) throw error;
  return 'Políticas RLS criadas com sucesso';
}

// Etapa 7: Validar migração
async function validateMigration(supabase: any) {
  console.log('✅ Validando migração...');
  
  const { data, error } = await supabase.rpc('exec_sql', {
    sql: `
      SELECT 
        'empresas' as tabela, COUNT(*) as registros FROM empresas
      UNION ALL
      SELECT 
        'usuarios_empresas' as tabela, COUNT(*) as registros FROM usuarios_empresas
      UNION ALL
      SELECT 
        'leads' as tabela, COUNT(*) as registros FROM leads
      UNION ALL
      SELECT 
        'conversas_leads' as tabela, COUNT(*) as registros FROM conversas_leads
      UNION ALL
      SELECT 
        'tenant_ad_costs' as tabela, COUNT(*) as registros FROM tenant_ad_costs;
    `
  });

  if (error) throw error;
  return { message: 'Validação concluída', data };
}
