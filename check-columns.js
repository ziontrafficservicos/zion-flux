import { createClient } from '@supabase/supabase-js';

const url = 'https://wrebkgazdlyjenbpexnc.supabase.co';
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(url, key);

async function checkColumns() {
  // Buscar 1 registro para ver as colunas
  const { data, error } = await supabase
    .from('conversas_sieg_financeiro')
    .select('*')
    .limit(1);

  if (error) {
    console.error('❌ Erro:', error);
  } else {
    console.log('✅ Estrutura da tabela conversas_sieg_financeiro:');
    console.log('\n📋 Colunas disponíveis:');
    if (data && data.length > 0) {
      console.log(Object.keys(data[0]).join(', '));
      console.log('\n📊 Exemplo de registro:');
      console.table(data[0]);
    }
  }
}

checkColumns();
