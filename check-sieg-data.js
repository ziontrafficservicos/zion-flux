import { createClient } from '@supabase/supabase-js';

// Banco SIEG
const siegUrl = 'https://vrbgptrmmvsaoozrplng.supabase.co';
const siegKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const sieg = createClient(siegUrl, siegKey);

async function checkData() {
  console.log('🔍 Verificando dados em conversas_sieg_financeiro...\n');

  // 1. Contar total de registros
  const { count: total, error: countError } = await sieg
    .from('conversas_sieg_financeiro')
    .select('*', { count: 'exact', head: true });

  if (countError) {
    console.error('❌ Erro ao contar registros:', countError);
    return;
  }

  console.log(`📊 Total de registros: ${total}\n`);

  // 2. Verificar registros por workspace
  const { data: byWorkspace, error: wsError } = await sieg
    .from('conversas_sieg_financeiro')
    .select('id_workspace')
    .limit(1000);

  if (wsError) {
    console.error('❌ Erro ao buscar por workspace:', wsError);
  } else {
    const workspaceCount = {};
    byWorkspace.forEach(row => {
      const ws = row.id_workspace || 'null';
      workspaceCount[ws] = (workspaceCount[ws] || 0) + 1;
    });
    console.log('📊 Registros por workspace (primeiros 1000):');
    console.table(workspaceCount);
  }

  // 3. Buscar alguns exemplos
  const { data: samples, error: sampleError } = await sieg
    .from('conversas_sieg_financeiro')
    .select('id, lead_name, phone, tag, created_at, id_workspace')
    .limit(5);

  if (sampleError) {
    console.error('❌ Erro ao buscar exemplos:', sampleError);
  } else {
    console.log('\n📋 Exemplos de registros:');
    console.table(samples);
  }

  // 4. Verificar se há registros com o workspace correto
  const { count: correctWs, error: correctError } = await sieg
    .from('conversas_sieg_financeiro')
    .select('*', { count: 'exact', head: true })
    .eq('id_workspace', 'b939a331-44d9-4122-ab23-dcd60413bd46');

  if (correctError) {
    console.error('❌ Erro ao contar workspace correto:', correctError);
  } else {
    console.log(`\n✅ Registros com workspace SIEG correto: ${correctWs}`);
  }
}

checkData();
