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

      // Buscar disparos agrupados por dia E por status usando nova RPC
      const { data, error: queryError } = await (supabase as any)
        .rpc('sieg_fin_contar_disparos_por_status', {
          p_empresa_id: tenantId,
          p_data_inicio: startRange.toISOString(),
          p_data_fim: endRange.toISOString()
        });

      if (queryError) {
        console.error('❌ [Disparos] Erro:', queryError);
        // Se função não existe, tentar a antiga
        if (queryError.code === '42883' || queryError.message?.includes('does not exist')) {
          console.warn('⚠️ [Disparos] Função RPC não encontrada, tentando antiga...');
          
          // Fallback para função antiga
          const { data: dataAntiga, error: erroAntigo } = await (supabase as any)
            .rpc('sieg_fin_contar_disparos_por_dia', {
              p_empresa_id: tenantId,
              p_data_inicio: startRange.toISOString(),
              p_data_fim: endRange.toISOString()
            });
          
          if (erroAntigo) {
            setDisparos([]);
            setTotal(0);
            setTotaisPorStatus({ enviados: 0, numeroInvalido: 0, suspensao: 0 });
            setMedia(0);
            return;
          }
          
          const disparosArray: DisparoDiario[] = (dataAntiga || []).map((d: { dia: string; quantidade: number }) => ({
            data: d.dia,
            quantidade: Number(d.quantidade),
            dataFormatada: format(new Date(d.dia + 'T12:00:00'), 'dd/MM', { locale: ptBR }),
            enviados: Number(d.quantidade),
            numeroInvalido: 0,
            suspensao: 0,
          }));
          
          disparosArray.sort((a, b) => a.data.localeCompare(b.data));
          const totalDisparos = disparosArray.reduce((acc, d) => acc + d.quantidade, 0);
          const mediaDisparos = disparosArray.length > 0 ? totalDisparos / disparosArray.length : 0;
          
          setDisparos(disparosArray);
          setTotal(totalDisparos);
          setTotaisPorStatus({ enviados: totalDisparos, numeroInvalido: 0, suspensao: 0 });
          setMedia(Math.round(mediaDisparos));
          return;
        }
        setError('Erro ao carregar disparos');
        return;
      }

      // Converter resultado da nova RPC para array formatado
      interface DisparoStatusResult {
        dia: string;
        total: number;
        enviados: number;
        numero_invalido: number;
        suspensao: number;
      }
      
      const disparosArray: DisparoDiario[] = (data || []).map((d: DisparoStatusResult) => ({
        data: d.dia,
        quantidade: Number(d.total),
        dataFormatada: format(new Date(d.dia + 'T12:00:00'), 'dd/MM', { locale: ptBR }),
        enviados: Number(d.enviados),
        numeroInvalido: Number(d.numero_invalido),
        suspensao: Number(d.suspensao),
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
