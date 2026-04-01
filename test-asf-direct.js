/**
 * Script para configurar contas Meta Ads no Supabase
 * e vincular ao workspace ASF Finance
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://wrebkgazdlyjenbpexnc.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ACCESS_TOKEN = 'EAAP5iBZBDclMBP2GZArb4WgHSQ3uEJBfEijvPtfXL7pgpLszVY84406rBZA8dpAQd15knKSo8tkY2NntboUKkZCBEhRs2faAyDk5l4WHbDYMKanXZBGWZB7Kg0pweHuDFvdQDyZAY69EiqjqEDsvmFHxAZB1EbytsmeXRC4lFN8SOOZBY8Xrrc3ibfh8jSh3ZAa39LCzF90SMJeP41rOmG';
const ASF_WORKSPACE_ID = '01d0cff7-2de1-4731-af0d-ee62f5ba974b';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function setupMetaAdsAccounts() {
  console.log('🚀 Configurando contas Meta Ads para ASF Finance...\n');

  try {
    // Etapa 1: Criar tabela meta_ads_accounts se não existir
    console.log('📊 Etapa 1: Criando tabela meta_ads_accounts...');
    
    const { error: createTableError } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS meta_ads_accounts (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
          account_id TEXT NOT NULL,
          account_name TEXT,
          currency TEXT DEFAULT 'BRL',
          timezone_name TEXT,
          is_active BOOLEAN DEFAULT true,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW(),
          UNIQUE(workspace_id, account_id)
        );

        -- Criar índices
        CREATE INDEX IF NOT EXISTS idx_meta_ads_accounts_workspace 
          ON meta_ads_accounts(workspace_id);
        CREATE INDEX IF NOT EXISTS idx_meta_ads_accounts_account_id 
          ON meta_ads_accounts(account_id);

        -- RLS
        ALTER TABLE meta_ads_accounts ENABLE ROW LEVEL SECURITY;

        -- Política: Usuários podem ver contas dos seus workspaces
        DROP POLICY IF EXISTS "Users can view their workspace meta ads accounts" 
          ON meta_ads_accounts;
        CREATE POLICY "Users can view their workspace meta ads accounts" 
          ON meta_ads_accounts FOR SELECT 
          USING (
            workspace_id IN (
              SELECT workspace_id 
              FROM membros_workspace 
              WHERE user_id = auth.uid()
            )
          );
      `
    });

    if (createTableError) {
      console.log('⚠️  Tabela já existe ou erro ao criar:', createTableError.message);
    } else {
      console.log('✅ Tabela meta_ads_accounts criada com sucesso!');
    }

    // Etapa 2: Buscar informações das contas na API do Meta
    console.log('\n📊 Etapa 2: Buscando informações das contas na API do Meta...');
    
    const accountIds = ['1162106082007438', '704043095364449'];
    const accountsData = [];

    for (const accountId of accountIds) {
      const response = await fetch(
        `https://graph.facebook.com/v21.0/act_${accountId}?fields=id,name,account_id,currency,timezone_name&access_token=${ACCESS_TOKEN}`
      );
      const data = await response.json();
      
      if (data.error) {
        console.error(`❌ Erro ao buscar conta ${accountId}:`, data.error.message);
        continue;
      }

      accountsData.push({
        account_id: data.account_id,
        account_name: data.name,
        currency: data.currency,
        timezone_name: data.timezone_name
      });

      console.log(`✅ Conta encontrada: ${data.name} (${data.account_id})`);
    }

    // Etapa 3: Inserir contas no Supabase
    console.log('\n📊 Etapa 3: Vinculando contas ao workspace ASF Finance...');
    
    for (const account of accountsData) {
      const { data, error } = await supabase
        .from('meta_ads_accounts')
        .upsert({
          workspace_id: ASF_WORKSPACE_ID,
          account_id: account.account_id,
          account_name: account.account_name,
          currency: account.currency,
          timezone_name: account.timezone_name,
          is_active: true,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'workspace_id,account_id'
        })
        .select();

      if (error) {
        console.error(`❌ Erro ao inserir conta ${account.account_id}:`, error.message);
      } else {
        console.log(`✅ Conta ${account.account_name} vinculada com sucesso!`);
      }
    }

    // Etapa 4: Verificar contas vinculadas
    console.log('\n📊 Etapa 4: Verificando contas vinculadas...');
    
    const { data: linkedAccounts, error: fetchError } = await supabase
      .from('meta_ads_accounts')
      .select('*')
      .eq('workspace_id', ASF_WORKSPACE_ID)
      .eq('is_active', true);

    if (fetchError) {
      console.error('❌ Erro ao buscar contas:', fetchError.message);
    } else {
      console.log(`\n✅ ${linkedAccounts.length} conta(s) vinculada(s) ao workspace ASF Finance:\n`);
      linkedAccounts.forEach((account, index) => {
        console.log(`${index + 1}. ${account.account_name}`);
        console.log(`   Account ID: ${account.account_id}`);
        console.log(`   Moeda: ${account.currency}`);
        console.log(`   Timezone: ${account.timezone_name}`);
        console.log(`   Status: ${account.is_active ? '✅ Ativa' : '❌ Inativa'}\n`);
      });
    }

    console.log('\n🎉 Configuração concluída com sucesso!');
    console.log('\n📝 Próximos passos:');
    console.log('1. As contas estão vinculadas ao workspace ASF Finance');
    console.log('2. Os dados aparecerão automaticamente na página de Tráfego');
    console.log('3. O sistema buscará métricas dessas contas via API');

  } catch (error) {
    console.error('❌ Erro durante a configuração:', error.message);
    console.error(error);
  }
}

async function testMetaAdsAPI() {
  console.log('🚀 Testando conexão com Meta Ads API...\n');

  try {
    // 1. Verificar o token e obter informações do usuário
    console.log('👤 Verificando token e usuário...');
    const userResponse = await fetch(
      `https://graph.facebook.com/v21.0/me?access_token=${ACCESS_TOKEN}`
    );
    const userData = await userResponse.json();
    
    if (userData.error) {
      console.error('❌ Erro ao verificar token:', userData.error);
      return;
    }
    
    console.log('✅ Token válido!');
    console.log(`   Usuário: ${userData.name} (ID: ${userData.id})\n`);

    // 2. Listar contas de anúncios
    console.log('📊 Buscando contas de anúncios...');
    const adAccountsResponse = await fetch(
      `https://graph.facebook.com/v21.0/me/adaccounts?fields=id,name,account_id,account_status,currency,timezone_name,business_name&access_token=${ACCESS_TOKEN}`
    );
    const adAccountsData = await adAccountsResponse.json();
    
    if (adAccountsData.error) {
      console.error('❌ Erro ao buscar contas:', adAccountsData.error);
      return;
    }

    if (!adAccountsData.data || adAccountsData.data.length === 0) {
      console.log('⚠️  Nenhuma conta de anúncios encontrada.');
      return;
    }

    console.log(`✅ ${adAccountsData.data.length} conta(s) de anúncios encontrada(s):\n`);
    
    adAccountsData.data.forEach((account, index) => {
      console.log(`\n📌 Conta ${index + 1}:`);
      console.log(`   ID: ${account.id}`);
      console.log(`   Account ID: ${account.account_id}`);
      console.log(`   Nome: ${account.name}`);
      console.log(`   Status: ${account.account_status === 1 ? '✅ Ativa' : '❌ Inativa'}`);
      console.log(`   Moeda: ${account.currency}`);
      console.log(`   Timezone: ${account.timezone_name}`);
      if (account.business_name) {
        console.log(`   Negócio: ${account.business_name}`);
      }
    });

    // 3. Para cada conta, buscar campanhas ativas
    console.log('\n\n🎯 Buscando campanhas ativas...\n');
    
    for (const account of adAccountsData.data) {
      console.log(`\n📊 Campanhas da conta: ${account.name}`);
      
      const campaignsResponse = await fetch(
        `https://graph.facebook.com/v21.0/${account.id}/campaigns?fields=id,name,status,objective,daily_budget,lifetime_budget&limit=10&access_token=${ACCESS_TOKEN}`
      );
      const campaignsData = await campaignsResponse.json();
      
      if (campaignsData.error) {
        console.error(`   ❌ Erro ao buscar campanhas: ${campaignsData.error.message}`);
        continue;
      }

      if (!campaignsData.data || campaignsData.data.length === 0) {
        console.log('   ⚠️  Nenhuma campanha encontrada.');
        continue;
      }

      console.log(`   ✅ ${campaignsData.data.length} campanha(s) encontrada(s):`);
      
      campaignsData.data.forEach((campaign, idx) => {
        console.log(`\n   ${idx + 1}. ${campaign.name}`);
        console.log(`      ID: ${campaign.id}`);
        console.log(`      Status: ${campaign.status}`);
        console.log(`      Objetivo: ${campaign.objective || 'N/A'}`);
        if (campaign.daily_budget) {
          console.log(`      Orçamento Diário: ${(campaign.daily_budget / 100).toFixed(2)} ${account.currency}`);
        }
        if (campaign.lifetime_budget) {
          console.log(`      Orçamento Total: ${(campaign.lifetime_budget / 100).toFixed(2)} ${account.currency}`);
        }
      });
    }

    console.log('\n\n✅ Teste concluído com sucesso!');
    console.log('\n📝 Resumo:');
    console.log(`   - ${adAccountsData.data.length} conta(s) de anúncios`);
    console.log(`   - Token válido e funcionando`);
    console.log(`   - API Graph respondendo corretamente`);

  } catch (error) {
    console.error('❌ Erro durante o teste:', error.message);
    console.error(error);
  }
}

// Executar configuração
setupMetaAdsAccounts();
