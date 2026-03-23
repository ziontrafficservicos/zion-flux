import { useState, useEffect } from 'react';
import { supabase as centralSupabase } from '@/integrations/supabase/client';
import { useCurrentTenant } from '@/contexts/TenantContext';
import { startOfDay, endOfDay } from 'date-fns';

export interface TagCountsHistorico {
  'T1 - SEM RESPOSTA': number;
  'T2 - RESPONDIDO': number;
  'T3 - PAGO IA': number;
  'T4 - TRANSFERIDO': number;
  'T5 - PASSÍVEL DE SUSPENSÃO': number;
}

const DATA_MINIMA = new Date('2025-12-04T00:00:00');

export function useTagCountsHistorico(startDate?: Date, endDate?: Date) {
  const { tenant, isLoading: tenantLoading } = useCurrentTenant();
  const [counts, setCounts] = useState<TagCountsHistorico>({
    'T1 - SEM RESPOSTA': 0,
    'T2 - RESPONDIDO': 0,
    'T3 - PAGO IA': 0,
    'T4 - TRANSFERIDO': 0,
    'T5 - PASSÍVEL DE SUSPENSÃO': 0,
  });
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

        // PASSO 1: Buscar telefones DISTINTOS que receberam DISPARO no período
        let disparosQuery = (centralSupabase as any)
          .from('sieg_fin_disparos')
          .select('telefone')
          .eq('empresa_id', tenant.id)
          .gte('criado_em', startISO);
        
        if (endISO) {
          disparosQuery = disparosQuery.lt('criado_em', endISO);
        }
        
        const { data: disparosData, error: disparosError } = await disparosQuery;

        if (disparosError) {
          console.error('Erro ao buscar disparos:', disparosError);
          setIsLoading(false);
          return;
        }

        // Extrair telefones únicos
        const telefonesUnicos = [...new Set((disparosData || []).map((d: any) => d.telefone).filter(Boolean))];
        
        console.log(`📤 [useTagCountsHistorico] Filtro: startISO=${startISO}, endISO=${endISO}, telefones=${telefonesUnicos.length}, startDate=${startDate?.toISOString()}, endDate=${endDate?.toISOString()}`);

        if (telefonesUnicos.length === 0) {
          setCounts({
            'T1 - SEM RESPOSTA': 0,
            'T2 - RESPONDIDO': 0,
            'T3 - PAGO IA': 0,
            'T4 - TRANSFERIDO': 0,
            'T5 - PASSÍVEL DE SUSPENSÃO': 0,
          });
          setIsLoading(false);
          return;
        }

        // PASSO 2: Buscar a TAG ATUAL de cada telefone na tabela financeiro_sieg
        // Dividir em batches para não estourar limite
        const batchSize = 200;
        const allFinanceiroData: any[] = [];
        
        for (let i = 0; i < telefonesUnicos.length; i += batchSize) {
          const batch = telefonesUnicos.slice(i, i + batchSize);
          
          let finQuery = (centralSupabase as any)
            .from('sieg_fin_financeiro')
            .select('id, telefone, tag, atendente, valor_recuperado_ia')
            .eq('empresa_id', tenant.id)
            .in('telefone', batch)
            .gte('criado_em', startISO);

          if (endISO) {
            finQuery = finQuery.lt('criado_em', endISO);
          }

          const { data: financeiroData, error: financeiroError } = await finQuery;

          if (financeiroError) {
            console.error('Erro ao buscar financeiro_sieg:', financeiroError);
          } else {
            allFinanceiroData.push(...(financeiroData || []));
          }
        }

        // PASSO 3: Contar por tag ATUAL (simplificado - usar a tag diretamente)
        const leadsPerEstagio: Record<string, Set<string>> = {
          'T1': new Set(),
          'T2': new Set(),
          'T3': new Set(),
          'T4': new Set(),
          'T5': new Set(),
        };

        allFinanceiroData.forEach((item: any) => {
          const tag = item.tag || '';
          const tagUpper = String(tag).toUpperCase();
          const valorRecuperadoIA = parseFloat(item.valor_recuperado_ia) || 0;
          
          // Classificar baseado na tag ATUAL do lead E valor recuperado
          // REGRA: Se valor_recuperado_ia > 0, é T3 (PAGO IA)
          if (tagUpper.includes('T5') || tagUpper.includes('SUSPENS')) {
            leadsPerEstagio['T5'].add(item.telefone);
          } else if (valorRecuperadoIA > 0) {
            // Prioridade: Se pagou via IA, é T3 independente da tag textual
            leadsPerEstagio['T3'].add(item.telefone);
          } else if (tagUpper.includes('T4') || tagUpper.includes('TRANSFERIDO')) {
            leadsPerEstagio['T4'].add(item.telefone);
          } else if (tagUpper.includes('T3') || tagUpper.includes('PAGO')) {
            leadsPerEstagio['T3'].add(item.telefone);
          } else if (tagUpper.includes('T2') || tagUpper.includes('RESPONDIDO') || tagUpper.includes('QUALIFICANDO')) {
            leadsPerEstagio['T2'].add(item.telefone);
          } else {
            // T1 ou qualquer outra tag (Novo Lead, etc)
            leadsPerEstagio['T1'].add(item.telefone);
          }
        });

        setCounts({
          'T1 - SEM RESPOSTA': leadsPerEstagio['T1'].size,
          'T2 - RESPONDIDO': leadsPerEstagio['T2'].size,
          'T3 - PAGO IA': leadsPerEstagio['T3'].size,
          'T4 - TRANSFERIDO': leadsPerEstagio['T4'].size,
          'T5 - PASSÍVEL DE SUSPENSÃO': leadsPerEstagio['T5'].size,
        });

        console.log('📊 [useTagCountsHistorico] Contagens por TAG ATUAL dos leads disparados:', {
          totalDisparados: telefonesUnicos.length,
          T1: leadsPerEstagio['T1'].size,
          T2: leadsPerEstagio['T2'].size,
          T3: leadsPerEstagio['T3'].size,
          T4: leadsPerEstagio['T4'].size,
          T5: leadsPerEstagio['T5'].size,
        });

      } catch (err) {
        console.error('Erro ao buscar contagens:', err);
      } finally {
        setIsLoading(false);
      }
    }

    fetchCounts();
  }, [tenant?.id, tenant?.slug, tenantLoading, startDate, endDate]);

  return { counts, isLoading };
}
