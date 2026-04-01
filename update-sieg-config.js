import { createClient } from '@supabase/supabase-js';

const url = 'https://wrebkgazdlyjenbpexnc.supabase.co';
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(url, key);

async function updateConfig() {
  console.log('🔧 Atualizando configuração SIEG para usar o banco Zion App...\n');

  // Primeiro, verificar o registro atual
  const { data: current, error: fetchError } = await supabase
    .from('database_configs')
    .select('*')
    .eq('database_key', 'sieg')
    .single();

  if (fetchError) {
    console.error('❌ Erro ao buscar config atual:', fetchError);
    return;
  }

  console.log('📋 Configuração atual do SIEG:');
  console.table(current);

  // Atualizar para usar o mesmo banco
  const { data: updated, error: updateError } = await supabase
    .from('database_configs')
    .update({
      url: 'https://wrebkgazdlyjenbpexnc.supabase.co',
      anon_key: process.env.SUPABASE_SERVICE_ROLE_KEY
    })
    .eq('id', current.id)
    .select();

  if (updateError) {
    console.error('❌ Erro ao atualizar:', updateError);
  } else {
    console.log('\n✅ Atualização concluída!');
    console.table(updated);
  }
}

updateConfig();
