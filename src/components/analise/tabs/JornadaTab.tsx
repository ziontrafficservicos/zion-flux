import { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { 
  Clock, 
  ArrowRight, 
  CheckCircle2,
  Circle,
  RefreshCw
} from 'lucide-react';
import { supabase as centralSupabase } from '@/integrations/supabase/client';

interface HistoricoTag {
  id: string;
  tag_anterior: string | null;
  tag_nova: string;
  estagio_anterior: string | null;
  estagio_novo: string | null;
  tempo_no_estagio_anterior: number | null;
  criado_em: string;
  criado_por: string;
}

interface JornadaTabProps {
  leadId: string;
  telefone: string;
}

// Cores por estágio
const ESTAGIO_CONFIG: Record<string, { cor: string; bg: string; label: string }> = {
  'T1': { cor: 'text-red-600', bg: 'bg-red-100 border-red-200', label: 'T1 - Sem Resposta' },
  'T2': { cor: 'text-blue-600', bg: 'bg-blue-100 border-blue-200', label: 'T2 - Respondido' },
  'T3': { cor: 'text-emerald-600', bg: 'bg-emerald-100 border-emerald-200', label: 'T3 - Pago IA' },
  'T4': { cor: 'text-amber-600', bg: 'bg-amber-100 border-amber-200', label: 'T4 - Transferido' },
  'T5': { cor: 'text-purple-600', bg: 'bg-purple-100 border-purple-200', label: 'T5 - Suspensão' },
};

function getEstagioConfig(estagio: string | null) {
  if (!estagio) return { cor: 'text-gray-600', bg: 'bg-gray-100 border-gray-200', label: 'Indefinido' };
  return ESTAGIO_CONFIG[estagio] || { cor: 'text-gray-600', bg: 'bg-gray-100 border-gray-200', label: estagio };
}

function formatarData(dataStr: string): string {
  const data = new Date(dataStr);
  return data.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

function formatarTempo(segundos: number | null): string {
  if (!segundos || segundos === 0) return '-';
  if (segundos < 60) return `${Math.round(segundos)} segundos`;
  if (segundos < 3600) return `${Math.round(segundos / 60)} minutos`;
  if (segundos < 86400) return `${(segundos / 3600).toFixed(1)} horas`;
  return `${(segundos / 86400).toFixed(1)} dias`;
}

export const JornadaTab = ({ leadId, telefone }: JornadaTabProps) => {
  const [historico, setHistorico] = useState<HistoricoTag[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchHistorico() {
      setIsLoading(true);
      try {
        const { data, error } = await (centralSupabase as any)
          .from('sieg_fin_historico_tags_lead')
          .select('*')
          .eq('lead_id', leadId)
          .order('criado_em', { ascending: true });

        if (error) throw error;
        setHistorico(data || []);
      } catch (err) {
        console.error('Erro ao buscar histórico:', err);
      } finally {
        setIsLoading(false);
      }
    }

    if (leadId) {
      fetchHistorico();
    }
  }, [leadId]);

  if (isLoading) {
    return (
      <div className="p-6 flex items-center justify-center">
        <RefreshCw className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (historico.length === 0) {
    return (
      <div className="p-6">
        <div className="bg-white dark:bg-card rounded-xl p-8 border border-border shadow-sm text-center">
          <Circle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">
            Nenhum histórico de jornada encontrado para este cliente.
          </p>
          <p className="text-sm text-muted-foreground mt-2">
            O histórico será registrado automaticamente a partir de agora.
          </p>
        </div>
      </div>
    );
  }

  // Calcular tempo total da jornada
  const tempoTotal = historico.reduce((acc, h) => acc + (h.tempo_no_estagio_anterior || 0), 0);

  return (
    <div className="p-6">
      <div className="bg-white dark:bg-card rounded-xl p-6 border border-border shadow-sm">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h3 className="font-semibold text-lg">Jornada do Cliente</h3>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="h-4 w-4" />
            <span>Tempo total: {formatarTempo(tempoTotal)}</span>
          </div>
        </div>

        {/* Timeline */}
        <div className="relative">
          {/* Linha vertical */}
          <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gradient-to-b from-primary/50 to-primary/10" />

          <div className="space-y-6">
            {historico.map((etapa, index) => {
              const config = getEstagioConfig(etapa.estagio_novo);
              const isUltimo = index === historico.length - 1;
              const isPrimeiro = index === 0;

              return (
                <div key={etapa.id} className="relative pl-10">
                  {/* Ícone na timeline */}
                  <div className={`absolute left-0 w-8 h-8 rounded-full flex items-center justify-center border-2 ${
                    isUltimo 
                      ? 'bg-primary border-primary text-white' 
                      : 'bg-white border-primary/50 text-primary'
                  }`}>
                    {isUltimo ? (
                      <CheckCircle2 className="h-4 w-4" />
                    ) : (
                      <span className="text-xs font-bold">{index + 1}</span>
                    )}
                  </div>

                  {/* Conteúdo */}
                  <div className={`p-4 rounded-lg border ${config.bg}`}>
                    <div className="flex items-center justify-between mb-2">
                      <Badge className={`${config.bg} ${config.cor} border`}>
                        {config.label}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {formatarData(etapa.criado_em)}
                      </span>
                    </div>

                    {/* Transição */}
                    {etapa.tag_anterior && (
                      <div className="flex items-center gap-2 text-sm mb-2">
                        <span className="text-muted-foreground line-through">{etapa.tag_anterior}</span>
                        <ArrowRight className="h-3 w-3 text-muted-foreground" />
                        <span className="font-medium">{etapa.tag_nova}</span>
                      </div>
                    )}

                    {isPrimeiro && !etapa.tag_anterior && (
                      <p className="text-sm text-muted-foreground mb-2">
                        Cliente entrou no sistema
                      </p>
                    )}

                    {/* Tempo no estágio anterior */}
                    {etapa.tempo_no_estagio_anterior > 0 && (
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        <span>Permaneceu {formatarTempo(etapa.tempo_no_estagio_anterior)} no estágio anterior</span>
                      </div>
                    )}

                    {/* Quem fez a mudança */}
                    <div className="mt-2 text-xs text-muted-foreground">
                      Por: {etapa.criado_por === 'IA' ? 'IA Maria' : etapa.criado_por}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
