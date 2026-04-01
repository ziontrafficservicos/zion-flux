import { useState, useEffect } from 'react';
import { supabase as centralSupabase } from '@/integrations/supabase/client';
import { useCurrentTenant } from '@/contexts/TenantContext';
import { startOfDay, endOfDay } from 'date-fns';
import { parseValorBR } from '@/lib/parseValorBR';

export interface TagCountsHistorico {
  'T1 - SEM RESPOSTA': number;
  'T2 - RESPONDIDO': number;
  'T3 - PAGO IA': number;
  'T3H - PAGO HUMANO': number;
  'T4 - TRANSFERIDO': number;
  'T5 - PASSÍVEL DE SUSPENSÃO': number;
}

export interface ContatoFinanceiro {
  id: string;
  telefone: string;
  nome: string;
  nome_empresa: string;
  cnpj: string;
  tag: string;
  valor_em_aberto: string;
  valor_recuperado_ia: string;
  valor_recuperado_humano: string;
  criado_em: string;
  atendente: string;
  data_disparo: string;
}

const DATA_MINIMA = new Date('2025-12-04T00:00:00');

export function useTagCountsHistorico(startDate?: Date, endDate?: Date) {
  const { tenant, isLoading: tenantLoading } = useCurrentTenant();
  const [counts, setCounts] = useState<TagCountsHistorico>({
    'T1 - SEM RESPOSTA': 0,
    'T2 - RESPONDIDO': 0,
    'T3 - PAGO IA': 0,
    'T3H - PAGO HUMANO': 0,
    'T4 - TRANSFERIDO': 0,
    'T5 - PASSÍVEL DE SUSPENSÃO': 0,
  });
  const [contatos, setContatos] = useState<ContatoFinanceiro[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchCounts() {
      if (tenantLoading || !tenant) return;

      const isSiegFinanceiro = tenant.slug === 'sieg-financeiro' || tenant.slug?.includes('financeiro');
      if (!isSiegFinanceiro) {
        setIsLoading(false);
        return;
      }

      setIsLoading(true);

      try {
        // Normalizar datas para início e fim do dia (mesma lógica do useDisparosDiarios)
        let startRange = startDate ? startOfDay(startDate) : DATA_MINIMA;
        if (startRange < DATA_MINIMA) {
          startRange = DATA_MINIMA;
        }
        const startISO = startRange.toISOString();
        
        // Se tem endDate, usar endOfDay + 1ms para incluir todo o dia
        let endISO: string | null = null;
        if (endDate) {
          const endRange = endOfDay(endDate);
          endISO = new Date(endRange.getTime() + 1).toISOString();
        }

        // Buscar todos os registros financeiros do período direto da tabela principal
        let finQuery = (centralSupabase as any)
          .from('sieg_fin_financeiro')
          .select('id, telefone, nome, nome_empresa, cnpj, tag, valor_em_aberto, valor_recuperado_ia, valor_recuperado_humano, criado_em, atendente, data_disparo')
          .eq('empresa_id', tenant.id)
          .gte('criado_em', startISO);

        if (endISO) {
          finQuery = finQuery.lt('criado_em', endISO);
        }

        const { data: allFinanceiroData, error: financeiroError } = await finQuery;

        if (financeiroError) {
          console.error('Erro ao buscar financeiro:', financeiroError);
          setIsLoading(false);
          return;
        }

        const telefonesUnicos = [...new Set((allFinanceiroData || []).map((d: any) => d.telefone).filter(Boolean))];

        console.log(`📤 [useTagCountsHistorico] Filtro: startISO=${startISO}, endISO=${endISO}, registros=${(allFinanceiroData || []).length}, telefones=${telefonesUnicos.length}`);

        if ((allFinanceiroData || []).length === 0) {
          setCounts({
            'T1 - SEM RESPOSTA': 0,
            'T2 - RESPONDIDO': 0,
            'T3 - PAGO IA': 0,
            'T3H - PAGO HUMANO': 0,
            'T4 - TRANSFERIDO': 0,
            'T5 - PASSÍVEL DE SUSPENSÃO': 0,
          });
          setContatos([]);
          setIsLoading(false);
          return;
        }

        // Salvar TODOS os registros — cada disparo é independente (mesmo telefone em datas diferentes = linhas separadas)
        setContatos((allFinanceiroData || []).map((item: any) => ({
          id: item.id,
          telefone: item.telefone || '',
          nome: item.nome || '',
          nome_empresa: item.nome_empresa || '',
          cnpj: item.cnpj || '',
          tag: item.tag || '',
          valor_em_aberto: item.valor_em_aberto || '',
          valor_recuperado_ia: item.valor_recuperado_ia || '',
          valor_recuperado_humano: item.valor_recuperado_humano || '',
          criado_em: item.criado_em || '',
          atendente: item.atendente || '',
          data_disparo: item.data_disparo || '',
        })));

        // Contar por tag ATUAL — cada registro/disparo conta individualmente
        const leadsPerEstagio: Record<string, number> = {
          'T1': 0,
          'T2': 0,
          'T3': 0,
          'T3H': 0,
          'T4': 0,
          'T5': 0,
        };

        (allFinanceiroData || []).forEach((item: any) => {
          const tag = item.tag || '';
          const tagUpper = String(tag).toUpperCase();
          const valorRecuperadoIA = parseValorBR(item.valor_recuperado_ia);
          const valorRecuperadoHumano = parseValorBR(item.valor_recuperado_humano);

          if (tagUpper.includes('T5') || tagUpper.includes('SUSPENS')) {
            leadsPerEstagio['T5']++;
          } else if (valorRecuperadoHumano > 0) {
            leadsPerEstagio['T3H']++;
          } else if (valorRecuperadoIA > 0) {
            leadsPerEstagio['T3']++;
          } else if (tagUpper.includes('T4') || tagUpper.includes('TRANSFERIDO')) {
            leadsPerEstagio['T4']++;
          } else if (tagUpper.includes('T3') || tagUpper.includes('PAGO')) {
            leadsPerEstagio['T3']++;
          } else if (tagUpper.includes('T2') || tagUpper.includes('RESPONDIDO') || tagUpper.includes('QUALIFICANDO')) {
            leadsPerEstagio['T2']++;
          } else {
            leadsPerEstagio['T1']++;
          }
        });

        setCounts({
          'T1 - SEM RESPOSTA': leadsPerEstagio['T1'],
          'T2 - RESPONDIDO': leadsPerEstagio['T2'],
          'T3 - PAGO IA': leadsPerEstagio['T3'],
          'T3H - PAGO HUMANO': leadsPerEstagio['T3H'],
          'T4 - TRANSFERIDO': leadsPerEstagio['T4'],
          'T5 - PASSÍVEL DE SUSPENSÃO': leadsPerEstagio['T5'],
        });

        console.log('📊 [useTagCountsHistorico] Contagens por TAG ATUAL:', {
          total: (allFinanceiroData || []).length,
          T1: leadsPerEstagio['T1'],
          T2: leadsPerEstagio['T2'],
          T3: leadsPerEstagio['T3'],
          T3H: leadsPerEstagio['T3H'],
          T4: leadsPerEstagio['T4'],
          T5: leadsPerEstagio['T5'],
        });

      } catch (err) {
        console.error('Erro ao buscar contagens:', err);
      } finally {
        setIsLoading(false);
      }
    }

    fetchCounts();
  }, [tenant?.id, tenant?.slug, tenantLoading, startDate, endDate]);

  return { counts, contatos, isLoading };
}
