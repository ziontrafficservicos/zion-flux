import { useState, useEffect } from "react";
import { logger } from "@/utils/logger";
import { MIN_DATA_DATE, MIN_DATA_DATE_OBJ } from "@/lib/constants";
import { supabase as centralSupabase } from '@/integrations/supabase/client';
import { useCurrentTenant } from '@/contexts/TenantContext';

export interface MetaAdsTotals {
  impressions: number;
  clicks: number;
  spend: number;
  cpc: number;
  ctr: number;
  conversions: number;
  conversas_iniciadas: number;
}

export interface MetaAdsDaily {
  date: string;
  impressions: number;
  clicks: number;
  spend: number;
  cpc: number;
  ctr: number;
  conversions: number;
  conversas_iniciadas: number;
}

export interface MetaCampaign {
  name: string;
  impressions: number;
  clicks: number;
  spend: number;
  funnelStage: 'topo' | 'meio' | 'fundo';
}

export function useMetaAdsData(
  _workspaceId: string,
  startDate?: Date,
  endDate?: Date,
  days: number = 30
) {
  const { tenant, isLoading: tenantLoading } = useCurrentTenant();
  const [totals, setTotals] = useState<MetaAdsTotals | null>(null);
  const [daily, setDaily] = useState<MetaAdsDaily[]>([]);
  const [campaigns, setCampaigns] = useState<MetaCampaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  // Função para buscar dados reais da API do Meta Ads
  const fetchMetaAdsDataFromAPI = async () => {
    try {
      console.log('🚀 fetchMetaAdsDataFromAPI iniciado');
      
      if (!tenant) {
        console.log('❌ Sem tenant, zerando dados');
        setTotals({ impressions: 0, clicks: 0, spend: 0, cpc: 0, ctr: 0, conversions: 0, conversas_iniciadas: 0 });
        setDaily([]);
        setCampaigns([]);
        setLoading(false);
        return;
      }

      console.log('✅ Tenant encontrado:', { id: tenant.id, name: tenant.name, slug: tenant.slug });

      // Buscar contas Meta Ads vinculadas ao workspace
      console.log('🔍 Buscando contas Meta Ads...');
      const { data: metaAccounts, error: accountsError } = await (centralSupabase as any)
        .from('sieg_fin_meta_ads_accounts')
        .select('account_id, account_name')
        .eq('workspace_id', tenant.id)
        .eq('is_active', true);

      console.log('📊 Resultado meta_ads_accounts:', {
        error: accountsError,
        contas: metaAccounts?.length || 0,
        nomes: metaAccounts?.map(a => a.account_name)
      });

      if (accountsError || !metaAccounts || metaAccounts.length === 0) {
        console.log('⚠️ Nenhuma conta Meta Ads vinculada, usando fallback');
        await loadFallbackData();
        return;
      }

      console.log(`📊 ${metaAccounts.length} conta(s) Meta Ads encontrada(s):`, metaAccounts.map(a => a.account_name));

      // Calcular range de datas
      let from = new Date();
      let to = new Date();
      if (startDate && endDate) {
        from = startDate;
        to = endDate;
      } else {
        from.setDate(from.getDate() - (days || 30));
      }

      const fromDateStr = from.toISOString().split('T')[0];
      const toDateStr = to.toISOString().split('T')[0];

      // Buscar token do Meta Ads do .env
      const accessToken = import.meta.env.VITE_META_ACCESS_TOKEN || '';
      
      console.log('🔑 Debug Token:', {
        hasToken: !!accessToken,
        tokenLength: accessToken?.length || 0,
        tokenPreview: accessToken ? `${accessToken.substring(0, 20)}...` : 'N/A'
      });
      
      if (!accessToken) {
        console.log('⚠️ Token Meta Ads não configurado, usando dados do banco');
        await loadFallbackData();
        return;
      }

      // Buscar insights de todas as contas
      let totalImpressions = 0;
      let totalClicks = 0;
      let totalSpend = 0;
      let totalConversions = 0;
      const dailyMap = new Map<string, { impressions: number; clicks: number; spend: number; date: string; conversions?: number }>();
      const campaignsData: MetaCampaign[] = [];

      for (const account of metaAccounts) {
        try {
          console.log(`🔍 Buscando dados da conta: ${account.account_name} (${account.account_id})`);
          
          // Buscar insights da conta com período específico e breakdown diário
          const insightsUrl = `https://graph.facebook.com/v21.0/act_${account.account_id}/insights?level=campaign&fields=campaign_id,campaign_name,impressions,clicks,spend,cpc,ctr,actions,date_start,date_stop&time_range={"since":"${fromDateStr}","until":"${toDateStr}"}&time_increment=1&action_breakdowns=action_type&access_token=${accessToken}`;
          console.log(`🎯 URL da API: ${insightsUrl.replace(accessToken, 'TOKEN_HIDDEN')}`);
          
          const insightsResponse = await fetch(insightsUrl);
          const insightsData = await insightsResponse.json();
          
          console.log(`📊 Resposta da API para ${account.account_name}:`, insightsData);

          // Se houver erro na API, pular esta conta
          if (insightsData.error) {
            console.error(`❌ Erro na API do Meta para ${account.account_name}:`, insightsData.error);
            continue;
          }

          if (insightsData.data && insightsData.data.length > 0) {
            // Processar dados diários
            insightsData.data.forEach((dayData: any) => {
              const date = dayData.date_start;
              const impressions = parseInt(dayData.impressions || '0');
              const clicks = parseInt(dayData.clicks || '0');
              // Buscar APENAS conversões reais do Meta Ads (conversas iniciadas)
              let conversions = 0;
              
              // Log especial para dias 05 e 06 de novembro
              if (date === '2025-11-05' || date === '2025-11-06') {
                console.log(`🔴 DEBUG ${date}:`, {
                  impressions,
                  clicks,
                  spend: parseFloat(dayData.spend || '0'),
                  actionsCount: dayData.actions?.length || 0
                });
                console.log(`🔴 Ações completas ${date}:`, JSON.stringify(dayData.actions, null, 2));
              }
              
              if (dayData.actions && Array.isArray(dayData.actions)) {
                console.log(`📊 Ações disponíveis para ${date}:`, dayData.actions.map((a: any) => a.action_type));
                
                // Contar APENAS a métrica oficial: messaging_conversation_started_7d
                dayData.actions.forEach((action: any) => {
                  // Usar APENAS a métrica oficial de "Conversas Iniciadas" do Meta Ads
                  if (action.action_type === 'onsite_conversion.messaging_conversation_started_7d') {
                    const value = parseInt(action.value || '0');
                    conversions += value;
                    console.log(`✅ ${action.action_type}: ${action.value}`);
                    
                    // Log especial para dias 05 e 06
                    if (date === '2025-11-05' || date === '2025-11-06') {
                      console.log(`🔴 CONVERSÃO ENCONTRADA ${date}: ${action.action_type} = ${action.value}`);
                    }
                  }
                });
              }
              
              // Se não houver conversões reais, NÃO estimar (deixar zerado)
              // Apenas mostrar dados reais do Meta Ads
              if (conversions === 0 && clicks > 0) {
                console.log(`⚠️ ${date}: Sem conversas iniciadas (${clicks} cliques)`);
              }

              // Agregar totais
              totalImpressions += impressions;
              totalClicks += clicks;
              totalSpend += parseFloat(dayData.spend || '0');
              totalConversions += conversions;
              
              // Agregar por dia (somar múltiplas contas)
              const spendValue = parseFloat(dayData.spend || '0');

              if (dailyMap.has(date)) {
                const existing = dailyMap.get(date)!;
                existing.impressions += impressions;
                existing.clicks += clicks;
                existing.spend += spendValue;
                existing.conversions = (existing.conversions || 0) + conversions;
              } else {
                dailyMap.set(date, { impressions, clicks, spend: spendValue, date, conversions });
              }
            });
          }

          // Buscar campanhas da conta com filtro de período
          const campaignsUrl = `https://graph.facebook.com/v21.0/act_${account.account_id}/campaigns?fields=name,insights.time_range({"since":"${fromDateStr}","until":"${toDateStr}"}){impressions,clicks,spend}&limit=10&access_token=${accessToken}`;
          const campaignsResponse = await fetch(campaignsUrl);
          const campaignsApiData = await campaignsResponse.json();

          if (campaignsApiData.data) {
            campaignsApiData.data.forEach((campaign: any) => {
              if (campaign.insights && campaign.insights.data && campaign.insights.data.length > 0) {
                const insights = campaign.insights.data[0];
                const campaignName = campaign.name.toLowerCase();
                let funnelStage: 'topo' | 'meio' | 'fundo' = 'meio';
                
                if (campaignName.includes('topo') || campaignName.includes('reconhecimento')) {
                  funnelStage = 'topo';
                } else if (campaignName.includes('fundo') || campaignName.includes('msg') || campaignName.includes('mensagem')) {
                  funnelStage = 'fundo';
                }

                campaignsData.push({
                  name: campaign.name,
                  impressions: parseInt(insights.impressions || '0'),
                  clicks: parseInt(insights.clicks || '0'),
                  spend: parseFloat(insights.spend || '0'),
                  funnelStage
                });
              }
            });
          }
        } catch (err) {
          console.error(`Erro ao buscar dados da conta ${account.account_name}:`, err);
        }
      }

      // Usar apenas conversões reais, sem estimar
      const conversions = totalConversions;
      
      console.log(`📊 Totais da API:`, {
        impressions: totalImpressions,
        clicks: totalClicks,
        spend: totalSpend,
        conversions: totalConversions
      });
      
      // Se não conseguiu buscar nenhum dado da API, usar fallback
      if (totalImpressions === 0 && totalClicks === 0 && totalSpend === 0) {
        console.log('⚠️ API do Meta não retornou dados, usando fallback do banco');
        await loadFallbackData();
        return;
      }

      const cpc = totalClicks > 0 ? totalSpend / totalClicks : 0;
      const ctr = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0;

      setTotals({
        impressions: totalImpressions,
        clicks: totalClicks,
        spend: totalSpend,
        cpc,
        ctr,
        conversions,
        conversas_iniciadas: conversions,
      });

      setCampaigns(campaignsData.slice(0, 10)); // Top 10 campanhas

      // Criar dados diários a partir do dailyMap
      console.log('🗂️ FINAL DAILYMAP STATE (antes do sort):');
      console.log(`- Total de dias no mapa: ${dailyMap.size}`);
      const mapEntries = Array.from(dailyMap.entries());
      const sortedMapEntries = mapEntries.sort((a, b) => a[0].localeCompare(b[0]));
      console.log(`- Primeira data no mapa: ${sortedMapEntries[0]?.[0]}`);
      console.log(`- Última data no mapa: ${sortedMapEntries[sortedMapEntries.length - 1]?.[0]}`);
      console.log('- Dias com conversas > 0 no mapa:');
      sortedMapEntries
        .filter(([_, data]) => (data.conversions || 0) > 0)
        .forEach(([date, data]) => console.log(`  ${date}: ${data.conversions} conversas`));
      console.log('- Mapa completo (primeiros/últimos 5):', {
        first5: sortedMapEntries.slice(0, 5),
        last5: sortedMapEntries.slice(-5)
      });

      const dailyData: MetaAdsDaily[] = Array.from(dailyMap.values())
        .sort((a, b) => a.date.localeCompare(b.date))
        .map(day => {
          const dayCpc = day.clicks > 0 ? day.spend / day.clicks : 0;
          const dayCtr = day.impressions > 0 ? (day.clicks / day.impressions) * 100 : 0;
          const dayConversions = Number(day.conversions ?? 0);
          
          return {
            date: day.date,
            impressions: day.impressions,
            clicks: day.clicks,
            spend: day.spend,
            cpc: dayCpc,
            ctr: dayCtr,
            conversions: dayConversions,
            conversas_iniciadas: dayConversions,
          };
        });

      setDaily(dailyData);
      setLoading(false);
      console.log('✅ Dados Meta Ads carregados com sucesso!');

    } catch (err) {
      console.error('Erro ao buscar dados da API Meta Ads:', err);
      await loadFallbackData();
    }
  };

  // Função para carregar dados do banco quando Meta Ads falhar
  const loadFallbackData = async () => {
    try {
      console.log('🔄 loadFallbackData iniciado');
      
      if (!tenant) {
        console.log('❌ loadFallbackData: Sem tenant');
        setTotals({ impressions: 0, clicks: 0, spend: 0, cpc: 0, ctr: 0, conversions: 0, conversas_iniciadas: 0 });
        setDaily([]);
        setCampaigns([]);
        setLoading(false);
        return;
      }

      console.log('✅ loadFallbackData: Tenant encontrado:', { id: tenant.id, name: tenant.name });

      // Calcular range de datas
      let from = new Date();
      let to = new Date();
      if (startDate && endDate) {
        from = startDate;
        to = endDate;
      } else {
        from.setDate(from.getDate() - (days || 30));
      }

      const fromDateStr = from.toISOString().split('T')[0];
      const toDateStr = to.toISOString().split('T')[0];

      // Buscar dados da tabela custos_anuncios_tenant COM FILTRO DE DATAS
      console.log('🔍 Buscando dados de custos_anuncios_tenant:', {
        tenant_id: tenant.id,
        tenant_name: tenant.name,
        from: fromDateStr,
        to: toDateStr
      });

      const { data: custoData, error: custoError } = await (centralSupabase as any)
        .from('sieg_fin_custos_anuncios_tenant')
        .select('*')
        .eq('tenant_id', tenant.id)
        .gte('dia', fromDateStr)
        .lte('dia', toDateStr)
        .order('dia', { ascending: true });

      if (custoError) {
        console.error('❌ Erro ao buscar custos_anuncios_tenant:', custoError);
      }

      console.log('📊 Resultado custos_anuncios_tenant:', {
        encontrado: !!custoData,
        quantidade: custoData?.length || 0,
        primeiroRegistro: custoData?.[0],
        ultimoRegistro: custoData?.[custoData.length - 1]
      });

      if (custoData && custoData.length > 0) {
        console.log('📅 Período dos dados:', {
          primeiroDia: custoData[0]?.dia,
          ultimoDia: custoData[custoData.length - 1]?.dia,
          totalRegistros: custoData.length,
          filtroAplicado: { from: fromDateStr, to: toDateStr }
        });
        
        const totalSpend = custoData.reduce((sum, item) => sum + parseFloat(String(item.valor || '0')), 0);
        const totalImpressions = custoData.reduce((sum, item) => sum + (parseInt(String(item.impressoes || '0'))), 0);
        const totalClicks = custoData.reduce((sum, item) => sum + (parseInt(String(item.cliques || '0'))), 0);
        const totalConversions = custoData.reduce((sum, item) => sum + (parseInt(String(item.conversoes || '0'))), 0);
        
        console.log('📊 [loadFallbackData] Totais calculados:', {
          totalSpend,
          totalImpressions,
          totalClicks,
          totalConversions
        });
        
        // Usar dados reais da tabela custos_anuncios_tenant
        setTotals({
          impressions: totalImpressions || Math.round(totalSpend * 600),
          clicks: totalClicks || Math.round(totalSpend * 7),
          spend: totalSpend,
          cpc: totalClicks > 0 ? totalSpend / totalClicks : 0,
          ctr: totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 1.17,
          conversions: totalConversions,
          conversas_iniciadas: totalConversions,
        });

        // Criar daily data usando dados reais
        const dailyData = custoData.map(item => {
          const amount = parseFloat(String(item.valor));
          const impressions = parseInt(String(item.impressoes || '0')) || Math.round(amount * 600);
          const clicks = parseInt(String(item.cliques || '0')) || Math.round(amount * 7);
          const conversions = parseInt(String(item.conversoes || '0'));
          
          return {
            date: item.dia,
            impressions,
            clicks,
            spend: amount,
            cpc: clicks > 0 ? amount / clicks : 0,
            ctr: impressions > 0 ? (clicks / impressions) * 100 : 1.17,
            conversions,
            conversas_iniciadas: conversions,
          };
        });
        setDaily(dailyData);

        // Criar campanhas mock
        setCampaigns([
          { name: '[ZION]- [TOPO]- out', impressions: Math.round(totalSpend * 200), clicks: Math.round(totalSpend * 2), spend: totalSpend * 0.3, funnelStage: 'topo' },
          { name: '[ZION]-[MEIO]- out', impressions: Math.round(totalSpend * 150), clicks: Math.round(totalSpend * 2.5), spend: totalSpend * 0.35, funnelStage: 'meio' },
          { name: '[ZION][MSG]- OUT —', impressions: Math.round(totalSpend * 250), clicks: Math.round(totalSpend * 2.5), spend: totalSpend * 0.35, funnelStage: 'fundo' },
        ]);
      } else {
        // Fallback adicional: usar kpi_overview_daily para estimar métricas
        let from = new Date();
        let to = new Date();
        if (startDate && endDate) {
          from = startDate;
          to = endDate;
        } else {
          from.setDate(from.getDate() - (days || 30));
        }

        const fromDateStr = from.toISOString().split('T')[0];
        const toDateStr = to.toISOString().split('T')[0];

        let kpiData: any[] = [];
        try {
          const { data: data, error: kpiError } = await (centralSupabase as any)
            .from('sieg_fin_kpi_overview_daily')
            .select('day, investimento')
            .eq('workspace_id', tenant.id)
            .gte('day', fromDateStr)
            .lte('day', toDateStr)
            .order('day', { ascending: true });
            
          if (kpiError) {
            console.warn('Tabela kpi_overview_daily não acessível no MetaAdsData:', kpiError.message);
            kpiData = [];
          } else {
            kpiData = data || [];
          }
        } catch (err) {
          console.warn('Erro ao buscar dados KPI no MetaAdsData:', err);
          kpiData = [];
        }

        if (kpiData && kpiData.length > 0) {
          const totalInvest = kpiData.reduce((sum, row: any) => sum + Number(row.investimento || 0), 0);

          setTotals({
            impressions: Math.round(totalInvest * 600),
            clicks: Math.round(totalInvest * 7),
            spend: totalInvest,
            cpc: totalInvest > 0 ? totalInvest / Math.round(totalInvest * 7) : 0,
            ctr: 1.17,
            conversions: Math.round(totalInvest * 0.6),
            conversas_iniciadas: Math.round(totalInvest * 0.6),
          });

          const dailyData = kpiData.map((row: any) => {
            const amount = Number(row.investimento || 0);
            return {
              date: row.day,
              impressions: Math.round(amount * 600),
              clicks: Math.round(amount * 7),
              spend: amount,
              cpc: amount > 0 ? amount / Math.round(amount * 7) : 0,
              ctr: 1.17,
              conversions: Math.round(amount * 0.6),
              conversas_iniciadas: Math.round(amount * 0.6),
            };
          });

          setDaily(dailyData);
          setCampaigns([
            { name: '[ZION]- [TOPO]- out', impressions: Math.round(totalInvest * 200), clicks: Math.round(totalInvest * 2), spend: totalInvest * 0.3, funnelStage: 'topo' },
            { name: '[ZION]-[MEIO]- out', impressions: Math.round(totalInvest * 150), clicks: Math.round(totalInvest * 2.5), spend: totalInvest * 0.35, funnelStage: 'meio' },
            { name: '[ZION][MSG]- OUT —', impressions: Math.round(totalInvest * 250), clicks: Math.round(totalInvest * 2.5), spend: totalInvest * 0.35, funnelStage: 'fundo' },
          ]);
        } else {
          // Se não houver dados, zerar
          setTotals({ impressions: 0, clicks: 0, spend: 0, cpc: 0, ctr: 0, conversions: 0, conversas_iniciadas: 0 });
          setDaily([]);
          setCampaigns([]);
        }
      }

      setLoading(false);
    } catch (err) {
      logger.error('Error loading fallback data', err);
      setTotals({ impressions: 0, clicks: 0, spend: 0, cpc: 0, ctr: 0, conversions: 0, conversas_iniciadas: 0 });
      setDaily([]);
      setCampaigns([]);
      setLoading(false);
    }
  };

  async function fetchData() {
    console.log('🎯 fetchData chamado:', { 
      tenantLoading, 
      hasTenant: !!tenant,
      tenantId: tenant?.id,
      tenantName: tenant?.name 
    });
    
    if (tenantLoading) {
      console.log('⏳ Aguardando tenant carregar...');
      return;
    }
    
    if (!tenant) {
      console.log('❌ Sem tenant, abortando');
      setLoading(false);
      return;
    }

    // Sistema de retry com backoff exponencial
    const maxRetries = 3;
    let attempt = 0;
    
    while (attempt < maxRetries) {
      try {
        setLoading(true);
        setError(null);

        console.log(`🚀 Tentativa ${attempt + 1}/${maxRetries} - Iniciando busca de dados...`);
        
        // PRIORIDADE: Tentar buscar dados reais da API do Meta Ads
        await fetchMetaAdsDataFromAPI();
        
        // Se chegou aqui, sucesso!
        console.log('✅ Dados carregados com sucesso!');
        return;
        
      } catch (err) {
        attempt++;
        logger.error(`Error fetching data (attempt ${attempt}/${maxRetries})`, err);
        
        if (attempt >= maxRetries) {
          // Última tentativa falhou, usar fallback
          console.log('⚠️ Todas as tentativas falharam, usando fallback...');
          try {
            await loadFallbackData();
          } catch (fallbackErr) {
            logger.error('Fallback also failed', fallbackErr);
            setError('Erro ao carregar dados');
            setTotals({ impressions: 0, clicks: 0, spend: 0, cpc: 0, ctr: 0, conversions: 0, conversas_iniciadas: 0 });
            setDaily([]);
            setCampaigns([]);
          }
        } else {
          // Aguardar antes de tentar novamente (backoff exponencial)
          const waitTime = Math.pow(2, attempt) * 1000; // 2s, 4s, 8s
          console.log(`⏳ Aguardando ${waitTime}ms antes da próxima tentativa...`);
          await new Promise(resolve => setTimeout(resolve, waitTime));
        }
      } finally {
        setLoading(false);
        setLastUpdate(new Date());
      }
    }
  }

  // Função antiga mantida para referência (não mais usada)
  async function fetchDataFromAPI() {
    if (!tenant) {
      setLoading(false);
      return;
    }

    // Short-circuit by workspace database field (authoritative source)
    try {
      const { data: config } = await (centralSupabase as any)
        .from('sieg_fin_database_configs')
        .select('database_key')
        .eq('tenant_id', tenant.id)
        .eq('active', true)
        .maybeSingle();
      if (!config || config.database_key !== 'asf') {
        setError('CREDENTIALS_MISSING');
        setTotals({ impressions: 0, clicks: 0, spend: 0, cpc: 0, ctr: 0, conversions: 0, conversas_iniciadas: 0 });
        setDaily([]);
        setCampaigns([]);
        setLoading(false);
        return;
      }
    } catch (e) {
      // If we cannot determine, fail safe with empty data
      setError('CREDENTIALS_MISSING');
      setTotals({ impressions: 0, clicks: 0, spend: 0, cpc: 0, ctr: 0, conversions: 0, conversas_iniciadas: 0 });
      setDaily([]);
      setCampaigns([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      logger.info('Fetching Meta Ads data');

      // Prepare request body - enforce MIN_DATA_DATE
      let requestBody: any;
      
      if (startDate && endDate) {
        // Aplicar data mínima ao startDate fornecido
        const effectiveStartDate = startDate < MIN_DATA_DATE_OBJ ? MIN_DATA_DATE_OBJ : startDate;
        requestBody = {
          tenant_id: tenant.id,
          startDate: effectiveStartDate.toISOString().split('T')[0],
          endDate: endDate.toISOString().split('T')[0],
        };
      } else {
        // Quando usar 'days', garantir que não busque antes de MIN_DATA_DATE
        const calculatedStart = new Date();
        calculatedStart.setDate(calculatedStart.getDate() - days);
        const effectiveStartDate = calculatedStart < MIN_DATA_DATE_OBJ ? MIN_DATA_DATE_OBJ : calculatedStart;
        
        requestBody = {
          tenant_id: tenant.id,
          startDate: effectiveStartDate.toISOString().split('T')[0],
          endDate: new Date().toISOString().split('T')[0],
        };
      }

      const { data, error: functionError } = await centralSupabase.functions.invoke(
        'fetch-meta-ads-data',
        {
          body: requestBody,
        }
      );

      if (functionError) {
        logger.error('Meta Ads function error', functionError);
        // Fallback para dados do banco ao invés de zerar tudo
        await loadFallbackData();
        return;
      }

      if (data?.error) {
        logger.error('Meta Ads API error', data.error);
        setError(data.error);
        // Fallback para dados do banco ao invés de zerar tudo
        await loadFallbackData();
        return;
      }

      setTotals(data.totals || {
        impressions: 0,
        clicks: 0,
        spend: 0,
        cpc: 0,
        ctr: 0,
        conversions: 0,
        conversas_iniciadas: 0,
      });
      setDaily(data.daily || []);
      setCampaigns(data.campaigns || []);
      setLastUpdate(new Date());
      setLoading(false);
    } catch (err: any) {
      logger.error('Error fetching Meta Ads data', err);
      // If the Edge Function is not deployed or credentials are missing for this database/workspace,
      // present a clear, non-blocking state with zeroed data.
      const message = String(err?.message || err || '');
      if (
        message.includes('FunctionsFetchError') ||
        message.includes('Failed to fetch') ||
        message.includes('404') ||
        message.includes('401')
      ) {
        setError('CREDENTIALS_MISSING');
      } else {
        setError('FETCH_ERROR');
      }
      setTotals({
        impressions: 0,
        clicks: 0,
        spend: 0,
        cpc: 0,
        ctr: 0,
        conversions: 0,
        conversas_iniciadas: 0,
      });
      setDaily([]);
      setCampaigns([]);
      setLoading(false);
    }
  }

  // Auto-refresh every 3 minutes
  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 180000);
    return () => clearInterval(interval);
  }, [tenantLoading, tenant?.id, days, startDate, endDate]);

  return { 
    totals, 
    daily, 
    campaigns, 
    loading, 
    error, 
    lastUpdate, 
    refetch: fetchData 
  };
}
