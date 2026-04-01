import { createClient } from '@supabase/supabase-js';

// Configuração do Supabase SIEG (onde estão os dados de CSAT)
const supabaseUrl = 'https://vrbgptrmmvsaoozrplng.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkCSAT() {
  console.log('🔍 Verificando registros na tabela conversas_sieg_financeiro...\n');

  try {
    // Contar total de registros com CSAT preenchido
    const { count: totalPreenchidos, error: errorTotal } = await supabase
      .from('conversas_sieg_financeiro')
      .select('*', { count: 'exact', head: true })
      .not('csat', 'is', null)
      .neq('csat', '-')
      .neq('csat', '');

    if (errorTotal) {
      console.error('❌ Erro ao contar registros preenchidos:', errorTotal);
      return;
    }

    console.log(`✅ Total de registros com CSAT preenchido: ${totalPreenchidos}\n`);

    // Buscar alguns exemplos de registros preenchidos
    const { data: exemplos, error: errorExemplos } = await supabase
      .from('conversas_sieg_financeiro')
      .select('analista, csat, data_resposta_csat')
      .not('csat', 'is', null)
      .neq('csat', '-')
      .neq('csat', '')
      .limit(10);

    if (errorExemplos) {
      console.error('❌ Erro ao buscar exemplos:', errorExemplos);
      return;
    }

    console.log('📋 Exemplos de registros preenchidos:');
    console.table(exemplos);

    // Contar por categoria de CSAT
    const { data: todosCSAT, error: errorCategorias } = await supabase
      .from('conversas_sieg_financeiro')
      .select('csat')
      .not('csat', 'is', null)
      .neq('csat', '-')
      .neq('csat', '');

    if (errorCategorias) {
      console.error('❌ Erro ao buscar categorias:', errorCategorias);
      return;
    }

    // Agrupar por valor de CSAT
    const categorias = todosCSAT.reduce((acc, item) => {
      const csat = item.csat.trim();
      acc[csat] = (acc[csat] || 0) + 1;
      return acc;
    }, {});

    console.log('\n📊 Distribuição por categoria de CSAT:');
    console.table(categorias);

  } catch (error) {
    console.error('❌ Erro geral:', error);
  }
}

checkCSAT();
