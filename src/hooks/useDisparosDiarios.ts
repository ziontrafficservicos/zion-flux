import { useState, useEffect, useCallback } from 'react';
import { endOfDay, format, startOfDay, subDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';
import { useTenant } from '@/contexts/TenantContext';

interface DisparoDiario {
  data: string;
  quantidade: number;
  dataFormatada: string;
  enviados: number;
  numeroInvalido: number;
  suspensao: number;
}

interface TotaisPorStatus {
  enviados: number;
  numeroInvalido: number;
  suspensao: number;
}

interface UseDisparosDiariosReturn {
  disparos: DisparoDiario[];
  total: number;
  totaisPorStatus: TotaisPorStatus;
  media: number;
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

export const useDisparosDiarios = (
  _tenantId?: string,
  dateFrom?: Date,
  dateTo?: Date
): UseDisparosDiariosReturn => {
  const { currentTenant } = useTenant();
  const [disparos, setDisparos] = useState<DisparoDiario[]>([]);
  const [total, setTotal] = useState(0);
  const [totaisPorStatus, setTotaisPorStatus] = useState<TotaisPorStatus>({ enviados: 0, numeroInvalido: 0, suspensao: 0 });
  const [media, setMedia] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const tenantId = _tenantId || currentTenant?.id;

  const fetchDisparos = useCallback(async () => {
    if (!tenantId) {
      setDisparos([]);
      setTotal(0);
      setTotaisPorStatus({ enviados: 0, numeroInvalido: 0, suspensao: 0 });
      setMedia(0);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      // Definir período
      const endDate = dateTo || new Date();
      const startDate = dateFrom || subDays(endDate, 30);

      const startRange = startOfDay(startDate);
      const endRange = endOfDay(endDate);

      console.log('📊 [Disparos] Buscando de', format(startDate, 'dd/MM'), 'até', format(endDate, 'dd/MM'));

      // Buscar registros direto da tabela sieg_fin_financeiro
      let query = (supabase as any)
        .from('sieg_fin_financeiro')
        .select('criado_em, tag')
        .eq('empresa_id', tenantId)
        .gte('criado_em', startRange.toISOString())
        .lte('criado_em', endRange.toISOString());

      const { data, error: queryError } = await query;

      if (queryError) {
        console.error('❌ [Disparos] Erro:', queryError);
        setError('Erro ao carregar disparos');
        return;
      }

      // Agrupar por dia no frontend
      const porDia = new Map<string, { total: number; enviados: number; numeroInvalido: number; suspensao: number }>();

      (data || []).forEach((item: any) => {
        const dia = item.criado_em ? item.criado_em.substring(0, 10) : null;
        if (!dia) return;

        const atual = porDia.get(dia) || { total: 0, enviados: 0, numeroInvalido: 0, suspensao: 0 };
        const tagUpper = String(item.tag || '').toUpperCase();
        const isSuspensao = tagUpper.includes('T5') || tagUpper.includes('SUSPENS');

        atual.total += 1;
        if (isSuspensao) {
          atual.suspensao += 1;
        } else {
          atual.enviados += 1;
        }
        porDia.set(dia, atual);
      });

      const disparosArray: DisparoDiario[] = Array.from(porDia.entries()).map(([dia, counts]) => ({
        data: dia,
        quantidade: counts.total,
        dataFormatada: format(new Date(dia + 'T12:00:00'), 'dd/MM', { locale: ptBR }),
        enviados: counts.enviados,
        numeroInvalido: counts.numeroInvalido,
        suspensao: counts.suspensao,
      }));

      // Ordenar por data
      disparosArray.sort((a, b) => a.data.localeCompare(b.data));

      // Calcular totais
      const totalDisparos = disparosArray.reduce((acc, d) => acc + d.quantidade, 0);
      const totalEnviados = disparosArray.reduce((acc, d) => acc + d.enviados, 0);
      const totalNumeroInvalido = disparosArray.reduce((acc, d) => acc + d.numeroInvalido, 0);
      const totalSuspensao = disparosArray.reduce((acc, d) => acc + d.suspensao, 0);
      const mediaDisparos = disparosArray.length > 0 ? totalDisparos / disparosArray.length : 0;

      console.log('✅ [Disparos] Total:', totalDisparos, '| Enviados:', totalEnviados, '| Inválidos:', totalNumeroInvalido, '| Suspensão:', totalSuspensao);

      setDisparos(disparosArray);
      setTotal(totalDisparos);
      setTotaisPorStatus({ enviados: totalEnviados, numeroInvalido: totalNumeroInvalido, suspensao: totalSuspensao });
      setMedia(Math.round(mediaDisparos));
    } catch (err) {
      console.error('❌ [Disparos] Erro inesperado:', err);
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
    } finally {
      setIsLoading(false);
    }
  }, [tenantId, dateFrom, dateTo]);

  useEffect(() => {
    fetchDisparos();
  }, [fetchDisparos]);

  return { disparos, total, totaisPorStatus, media, isLoading, error, refetch: fetchDisparos };
};
