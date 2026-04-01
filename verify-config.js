import { createClient } from '@supabase/supabase-js';

const url = 'https://wrebkgazdlyjenbpexnc.supabase.co';
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(url, key);

async function verify() {
  // Verificar se a tabela conversas_sieg_financeiro existe no banco Zion App
  const { data, error } = await supabase
    .from('conversas_sieg_financeiro')
    .select('id, lead_name, phone, tag, created_at, id_workspace')
    .limit(5);

  if (error) {
    console.error('❌ Erro ao acessar conversas_sieg_financeiro:', error);
  } else {
    console.log('✅ Tabela conversas_sieg_financeiro encontrada!');
    console.log(`📊 Total de registros retornados: ${data.length}`);
    if (data.length > 0) {
      console.table(data);
    }
  }

  // Contar total
  const { count, error: countError } = await supabase
    .from('conversas_sieg_financeiro')
    .select('*', { count: 'exact', head: true });

  if (countError) {
    console.error('❌ Erro ao contar:', countError);
  } else {
    console.log(`\n📈 Total de registros na tabela: ${count}`);
  }
}

verify();
