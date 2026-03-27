import { useState, useEffect } from 'react';
import { useCurrentTenant } from '@/contexts/TenantContext';
import { supabase as centralSupabase } from '@/integrations/supabase/client';
import { startOfDay, endOfDay } from 'date-fns';

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
        // Função para parsear valor - valores já vêm no formato numérico do banco (ex: "1.003" = 1.003)
        const parseValorBR = (valor: any): number => {
          if (!valor) return 0;
          const num = parseFloat(String(valor));
          return isNaN(num) ? 0 : num;
        };

        // ========== MODO SEM FILTRO (GERAL) ==========
        // Quando não tem startDate nem endDate, buscar total geral direto da tabela financeiro_sieg
        if (!startDate && !endDate) {
          console.log(`💰 [useValoresFinanceiros] Modo GERAL - buscando totais sem filtro de data`);
          
          // Buscar todos os registros da tabela financeiro_sieg para este tenant
          // Incluindo valor_recuperado_ia e valor_recuperado_humano
          const { data: financeiroData, error: financeiroError } = await (centralSupabase as any)
            .from('sieg_fin_financeiro')
            .select('valor_em_aberto, valor_recuperado_ia, valor_recuperado_humano, cnpj, telefone, situacao, tag')
            .eq('empresa_id', tenant.id);

          if (financeiroError) {
            console.error('💰 [useValoresFinanceiros] Erro ao buscar financeiro:', financeiroError);
            setIsLoading(false);
            return;
          }

          const empresasUnicas = new Set<string>();
          let totalPendente = 0;
          let valorRecuperadoIA = 0;
          let valorRecuperadoHumano = 0;

          (financeiroData || []).forEach((item: any) => {
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

          console.log('💰 [useValoresFinanceiros] Valores GERAIS:', {
            totalPendente,
            valorRecuperadoTotal,
            valorRecuperadoIA,
            valorRecuperadoHumano,
            totalEmpresas: empresasUnicas.size
          });

          setData({
            valorPendente: totalPendente,
            valorRecuperado: valorRecuperadoTotal,
            valorRecuperadoIA,
            valorRecuperadoHumano,
            valorEmNegociacao: 0,
            metaMensal: 50000.00,
            totalEmpresas: empresasUnicas.size,
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
          .select('valor_em_aberto, valor_recuperado_ia, valor_recuperado_humano, cnpj, telefone, situacao, tag')
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

        const empresasUnicas = new Set<string>();
        let totalPendente = 0;
        let valorRecuperadoIA = 0;
        let valorRecuperadoHumano = 0;

        allValores.forEach((item: any) => {
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
        const metaMensal = 50000.00;
        const totalEmpresas = empresasUnicas.size;

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
