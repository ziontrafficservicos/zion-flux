import { createClient } from '@supabase/supabase-js';

const url = 'https://wrebkgazdlyjenbpexnc.supabase.co';
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(url, key);

async function fixConfig() {
  console.log('🔧 Corrigindo configuração do banco SIEG...\n');

  // Atualizar o registro do SIEG para usar o mesmo banco (Zion App)
  const { data, error } = await supabase
    .from('database_configs')
    .update({
      url: 'https://wrebkgazdlyjenbpexnc.supabase.co',
      anon_key: process.env.SUPABASE_SERVICE_ROLE_KEY
    })
    .eq('database_key', 'sieg')
    .select();

  if (error) {
    console.error('❌ Erro ao atualizar:', error);
  } else {
    console.log('✅ Configuração atualizada com sucesso!');
    console.table(data);
  }

  // Verificar configurações atuais
  const { data: configs } = await supabase
    .from('database_configs')
    .select('*')
    .eq('active', true);

  console.log('\n📊 Configurações atuais:');
  console.table(configs);
}

fixConfig();
