import { useState, useEffect } from 'react';
import { useCurrentTenant } from '@/contexts/TenantContext';
import { supabase as centralSupabase } from '@/integrations/supabase/client';
import { startOfDay, endOfDay } from 'date-fns';
import { parseValorBR } from '@/lib/parseValorBR';

const META_MENSAL_DEFAULT = 50000.00;

export interface ValoresFinanceiros {
  valorPendente: number;
  valorRecuperado: number;
  valorRecuperadoIA: number;
  valorRecuperadoHumano: number;
  valorEmNegociacao: number;
  metaMensal: number;
  totalEmpresas: number;
}

export function useValoresFinanceiros(startDate?: Date, endDate?: Date) {
  const [data, setData] = useState<ValoresFinanceiros>({
    valorPendente: 0,
    valorRecuperado: 0,
    valorRecuperadoIA: 0,
    valorRecuperadoHumano: 0,
    valorEmNegociacao: 0,
    metaMensal: 0,
    totalEmpresas: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { tenant, isLoading: tenantLoading } = useCurrentTenant();

  useEffect(() => {
    async function fetchValores() {
      if (tenantLoading) return;
      if (!tenant) {
        setData({ valorPendente: 0, valorRecuperado: 0, valorRecuperadoIA: 0, valorRecuperadoHumano: 0, valorEmNegociacao: 0, metaMensal: 0, totalEmpresas: 0 });
        setIsLoading(false);
        return;
      }

      // Apenas para SIEG Financeiro
      const isSiegFinanceiro = tenant.slug === 'sieg-financeiro' || tenant.slug?.includes('financeiro');
      if (!isSiegFinanceiro) {
        setData({ valorPendente: 0, valorRecuperado: 0, valorRecuperadoIA: 0, valorRecuperadoHumano: 0, valorEmNegociacao: 0, metaMensal: 0, totalEmpresas: 0 });
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        // Usa parseValorBR importado — trata formato brasileiro (vírgula) e decimal (ponto)

        // ========== MODO SEM FILTRO (GERAL) ==========
        // Quando não tem startDate nem endDate, buscar total geral direto da tabela sieg_fin_financeiro
        if (!startDate && !endDate) {
          console.log(`💰 [useValoresFinanceiros] Modo GERAL - buscando totais sem filtro de data`);
          
          // Buscar todos os registros da tabela sieg_fin_financeiro para este tenant
          // Incluindo valor_recuperado_ia e valor_recuperado_humano
          const { data: financeiroData, error: financeiroError } = await (centralSupabase as any)
            .from('sieg_fin_financeiro')
            .select('valor_em_aberto, valor_recuperado_ia, valor_recuperado_humano, cnpj, telefone, situacao, tag, data_disparo, criado_em')
            .eq('empresa_id', tenant.id);

          if (financeiroError) {
            console.error('💰 [useValoresFinanceiros] Erro ao buscar financeiro:', financeiroError);
            setIsLoading(false);
            return;
          }

          // Agrupar por telefone — manter apenas o registro mais recente de cada contato
          // Isso evita contar o mesmo valor_em_aberto várias vezes quando há múltiplos disparos
          const registroMaisRecente = new Map<string, any>();
          (financeiroData || []).forEach((item: any) => {
            const tel = item.telefone || '';
            if (!tel) return;
            const existing = registroMaisRecente.get(tel);
            if (!existing || (item.criado_em && (!existing.criado_em || item.criado_em > existing.criado_em))) {
              registroMaisRecente.set(tel, item);
            }
          });

          const empresasUnicas = new Set<string>();
          let totalPendente = 0;
          let valorRecuperadoIA = 0;
          let valorRecuperadoHumano = 0;

          registroMaisRecente.forEach((item: any) => {
            const chave = item.cnpj && String(item.cnpj).trim().length > 0
              ? String(item.cnpj).trim()
              : item.telefone;
            if (chave) empresasUnicas.add(chave);

            const valorEmAberto = parseValorBR(item.valor_em_aberto);
            const valorRecIA = parseValorBR(item.valor_recuperado_ia);
            const valorRecHumano = parseValorBR(item.valor_recuperado_humano);

            valorRecuperadoIA += valorRecIA;
            valorRecuperadoHumano += valorRecHumano;

            // Pendente = valor_em_aberto dos registros que NÃO foram pagos
            const tagUpper = String(item.tag || '').toUpperCase();
            const isPago = (item.situacao === 'concluido') ||
              tagUpper.includes('T3') || tagUpper.includes('PAGO');

            if (!isPago) {
              totalPendente += valorEmAberto;
            }
          });

          const valorRecuperadoTotal = valorRecuperadoIA + valorRecuperadoHumano;

          const totalRegistros = (financeiroData || []).length;

          console.log('💰 [useValoresFinanceiros] Valores GERAIS:', {
            totalPendente,
            valorRecuperadoTotal,
            valorRecuperadoIA,
            valorRecuperadoHumano,
            totalEmpresas: totalRegistros
          });

          setData({
            valorPendente: totalPendente,
            valorRecuperado: valorRecuperadoTotal,
            valorRecuperadoIA,
            valorRecuperadoHumano,
            valorEmNegociacao: 0,
            metaMensal: META_MENSAL_DEFAULT,
            totalEmpresas: totalRegistros,
          });
          
          setIsLoading(false);
          return;
        }

        // ========== MODO COM FILTRO DE DATA ==========
        // Data mínima: 04/12/2025 (desconsiderar dados anteriores)
        const DATA_MINIMA = new Date('2025-12-04T00:00:00');
        
        // Normalizar datas para início e fim do dia
        let startRange = startDate ? startOfDay(startDate) : DATA_MINIMA;
        if (startRange < DATA_MINIMA) {
          startRange = DATA_MINIMA;
        }
        const startISO = startRange.toISOString();
        
        // Se tem endDate, usar endOfDay + 1 dia para incluir todo o dia
        let endISO: string | null = null;
        if (endDate) {
          const endRange = endOfDay(endDate);
          endISO = new Date(endRange.getTime() + 1).toISOString();
        }

        console.log(`💰 [useValoresFinanceiros] Período: ${startISO} até ${endISO || 'sem fim'}`);

        // ========== BUSCAR REGISTROS FINANCEIROS DO PERÍODO ==========
        let finQuery = (centralSupabase as any)
          .from('sieg_fin_financeiro')
          .select('valor_em_aberto, valor_recuperado_ia, valor_recuperado_humano, cnpj, telefone, situacao, tag, data_disparo, criado_em')
          .eq('empresa_id', tenant.id)
          .gte('criado_em', startISO);

        if (endISO) {
          finQuery = finQuery.lt('criado_em', endISO);
        }

        const { data: financeiroData, error: financeiroError } = await finQuery;

        if (financeiroError) {
          console.error('💰 [useValoresFinanceiros] Erro ao buscar financeiro:', financeiroError);
          setIsLoading(false);
          return;
        }

        const allValores = financeiroData || [];
        console.log(`💰 [useValoresFinanceiros] Registros no período: ${allValores.length}`);

        // Agrupar por telefone — manter apenas o registro mais recente de cada contato
        const registroMaisRecente = new Map<string, any>();
        allValores.forEach((item: any) => {
          const tel = item.telefone || '';
          if (!tel) return;
          const existing = registroMaisRecente.get(tel);
          if (!existing || (item.criado_em && (!existing.criado_em || item.criado_em > existing.criado_em))) {
            registroMaisRecente.set(tel, item);
          }
        });

        const empresasUnicas = new Set<string>();
        let totalPendente = 0;
        let valorRecuperadoIA = 0;
        let valorRecuperadoHumano = 0;

        registroMaisRecente.forEach((item: any) => {
          const chave = item.cnpj && String(item.cnpj).trim().length > 0
            ? String(item.cnpj).trim()
            : item.telefone;
          if (chave) empresasUnicas.add(chave);

          const valorEmAberto = parseValorBR(item.valor_em_aberto);
          const valorRecIA = parseValorBR(item.valor_recuperado_ia);
          const valorRecHumano = parseValorBR(item.valor_recuperado_humano);

          valorRecuperadoIA += valorRecIA;
          valorRecuperadoHumano += valorRecHumano;

          // Pendente = valor_em_aberto dos registros que NÃO foram pagos
          const tagUpper = String(item.tag || '').toUpperCase();
          const isPago = (item.situacao === 'concluido') ||
            tagUpper.includes('T3') || tagUpper.includes('PAGO');

          if (!isPago) {
            totalPendente += valorEmAberto;
          }
        });

        const valorRecuperadoTotal = valorRecuperadoIA + valorRecuperadoHumano;
        const metaMensal = META_MENSAL_DEFAULT;
        const totalEmpresas = allValores.length;

        console.log(`💰 [useValoresFinanceiros] Pendente=${totalPendente}, RecIA=${valorRecuperadoIA}, RecHumano=${valorRecuperadoHumano}, Empresas=${totalEmpresas}`);

        setData({
          valorPendente: totalPendente,
          valorRecuperado: valorRecuperadoTotal,
          valorRecuperadoIA,
          valorRecuperadoHumano,
          valorEmNegociacao: 0,
          metaMensal,
          totalEmpresas,
        });

        console.log('💰 [useValoresFinanceiros] Valores finais:', {
          totalPendente,
          valorRecuperado: valorRecuperadoTotal,
          valorRecuperadoIA,
          valorRecuperadoHumano,
          totalEmpresas
        });

      } catch (err: any) {
        console.error('Erro ao buscar valores financeiros:', err);
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    }

    fetchValores();
  }, [tenantLoading, tenant?.id, tenant?.slug, startDate, endDate]);

  return { data, isLoading, error };
}
