import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Configuração do Supabase
const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://wrebkgazdlyjenbpexnc.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function applyMigration() {
  try {
    console.log('🚀 Aplicando migration...');
    
    // Ler o arquivo SQL
    const migrationPath = join(__dirname, '..', 'supabase', 'migrations', '20251118185519_create_tenant_tables.sql');
    const sql = readFileSync(migrationPath, 'utf8');
    
    console.log('📄 Migration carregada:', migrationPath);
    console.log('📝 Tamanho:', sql.length, 'caracteres');
    
    // Executar a migration usando RPC
    // Nota: Isso requer que você tenha uma função RPC no banco ou use a API REST diretamente
    const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql });
    
    if (error) {
      console.error('❌ Erro ao aplicar migration:', error);
      
      // Tentar método alternativo: executar via fetch direto
      console.log('🔄 Tentando método alternativo...');
      
      const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`
        },
        body: JSON.stringify({ sql_query: sql })
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Erro na requisição:', response.status, errorText);
        
        // Método final: executar statement por statement
        console.log('🔄 Executando statements individualmente...');
        await executeStatementsIndividually(sql);
      } else {
        const result = await response.json();
        console.log('✅ Migration aplicada com sucesso!', result);
      }
    } else {
      console.log('✅ Migration aplicada com sucesso!', data);
    }
    
  } catch (err) {
    console.error('❌ Erro fatal:', err);
    process.exit(1);
  }
}

async function executeStatementsIndividually(sql) {
  // Dividir o SQL em statements individuais
  const statements = sql
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--'));
  
  console.log(`📊 Total de ${statements.length} statements para executar`);
  
  for (let i = 0; i < statements.length; i++) {
    const statement = statements[i];
    if (statement.length === 0) continue;
    
    console.log(`\n[${i + 1}/${statements.length}] Executando statement...`);
    console.log(statement.substring(0, 100) + '...');
    
    try {
      // Usar o cliente Supabase para executar SQL bruto não é suportado diretamente
      // Precisamos usar a API REST ou ter uma função RPC
      console.log('⚠️ Não é possível executar SQL bruto via API do Supabase');
      console.log('💡 Por favor, execute a migration manualmente no Supabase Dashboard:');
      console.log('   https://supabase.com/dashboard/project/wrebkgazdlyjenbpexnc/editor');
      console.log('\n📋 Ou copie o conteúdo do arquivo:');
      console.log('   supabase/migrations/20251118185519_create_tenant_tables.sql');
      break;
    } catch (err) {
      console.error(`❌ Erro no statement ${i + 1}:`, err);
    }
  }
}

// Executar
applyMigration();
