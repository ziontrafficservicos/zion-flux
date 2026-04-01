import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://wrebkgazdlyjenbpexnc.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function listTables() {
  console.log('🔍 Listando tabelas do banco de dados principal (ASF)...\n');
  
  const { data, error } = await supabase
    .from('information_schema.tables')
    .select('table_name')
    .eq('table_schema', 'public')
    .order('table_name');

  if (error) {
    console.error('❌ Erro:', error.message);
    
    // Tentar via RPC
    console.log('\n🔄 Tentando via query SQL...\n');
    const { data: tables, error: rpcError } = await supabase.rpc('exec_sql', {
      query: `
        SELECT tablename 
        FROM pg_tables 
        WHERE schemaname = 'public' 
        ORDER BY tablename;
      `
    });
    
    if (rpcError) {
      console.error('❌ Erro RPC:', rpcError.message);
      
      // Lista manual baseada nas memórias
      console.log('\n📋 Tabelas conhecidas do sistema:\n');
      const knownTables = [
        'workspaces',
        'membros_workspace',
        'user_permissions',
        'leads',
        'historico_conversas',
        'conversas_asf',
        'conversas_sieg_financeiro',
        'custo_anuncios',
        'campanhas',
        'databases'
      ];
      
      knownTables.forEach((table, i) => {
        console.log(`${i + 1}. ${table}`);
      });
      return;
    }
    
    console.log('✅ Tabelas encontradas:\n');
    tables.forEach((row, i) => {
      console.log(`${i + 1}. ${row.tablename}`);
    });
    return;
  }

  console.log('✅ Tabelas encontradas:\n');
  data.forEach((row, i) => {
    console.log(`${i + 1}. ${row.table_name}`);
  });
}

listTables().catch(console.error);
