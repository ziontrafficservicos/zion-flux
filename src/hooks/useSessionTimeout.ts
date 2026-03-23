import { useEffect, useCallback, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

const TIMEOUT_MINUTOS = 30;
const AVISO_MINUTOS = 5; // Avisar 5 minutos antes de expirar
const CHECK_INTERVAL_MS = 60000; // Verificar a cada 1 minuto

/**
 * Hook para gerenciar timeout de sessão por inatividade
 * Desloga o usuário após 30 minutos sem atividade
 */
export function useSessionTimeout() {
  const { toast } = useToast();
  const [ultimaAtividade, setUltimaAtividade] = useState<number>(Date.now());
  const [avisoExibido, setAvisoExibido] = useState(false);

  // Registrar atividade do usuário
  const registrarAtividade = useCallback(() => {
    setUltimaAtividade(Date.now());
    setAvisoExibido(false);
    localStorage.setItem('ultima_atividade', Date.now().toString());
  }, []);

  // Fazer logout
  const fazerLogout = useCallback(async () => {
    try {
      // Registrar logout na auditoria
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await (supabase as any).from('sieg_fin_auditoria_sistema').insert({
          usuario_id: user.id,
          usuario_email: user.email,
          acao: 'logout',
          recurso: 'sessao',
          descricao: 'Logout automático por inatividade',
        }).catch(() => {}); // Ignora erro se tabela não existir
      }

      await supabase.auth.signOut();
      localStorage.removeItem('ultima_atividade');
      
      toast({
        title: "Sessão expirada",
        description: "Você foi desconectado por inatividade. Faça login novamente.",
        variant: "destructive",
      });
      
      // Redirecionar para login
      window.location.href = '/login';
    } catch (error) {
      console.error('Erro ao fazer logout:', error);
    }
  }, [toast]);

  // Verificar timeout
  useEffect(() => {
    const verificarTimeout = () => {
      const agora = Date.now();
      const tempoInativo = agora - ultimaAtividade;
      const limiteMs = TIMEOUT_MINUTOS * 60 * 1000;
      const avisoMs = (TIMEOUT_MINUTOS - AVISO_MINUTOS) * 60 * 1000;

      // Expirou - fazer logout
      if (tempoInativo >= limiteMs) {
        fazerLogout();
        return;
      }

      // Aviso antes de expirar
      if (tempoInativo >= avisoMs && !avisoExibido) {
        setAvisoExibido(true);
        const minutosRestantes = Math.ceil((limiteMs - tempoInativo) / 60000);
        toast({
          title: "⚠️ Sessão expirando",
          description: `Sua sessão expirará em ${minutosRestantes} minutos por inatividade. Mova o mouse ou clique para continuar.`,
          duration: 10000,
        });
      }
    };

    // Verificar periodicamente
    const interval = setInterval(verificarTimeout, CHECK_INTERVAL_MS);

    // Verificar imediatamente ao montar
    verificarTimeout();

    return () => clearInterval(interval);
  }, [ultimaAtividade, avisoExibido, fazerLogout, toast]);

  // Registrar eventos de atividade
  useEffect(() => {
    const eventos = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart', 'click'];
    
    // Throttle para não registrar muitas vezes
    let ultimoRegistro = 0;
    const throttleMs = 30000; // Registrar no máximo a cada 30 segundos

    const handleAtividade = () => {
      const agora = Date.now();
      if (agora - ultimoRegistro > throttleMs) {
        ultimoRegistro = agora;
        registrarAtividade();
      }
    };

    eventos.forEach(evento => {
      window.addEventListener(evento, handleAtividade, { passive: true });
    });

    // Carregar última atividade do localStorage
    const salva = localStorage.getItem('ultima_atividade');
    if (salva) {
      setUltimaAtividade(parseInt(salva));
    }

    return () => {
      eventos.forEach(evento => {
        window.removeEventListener(evento, handleAtividade);
      });
    };
  }, [registrarAtividade]);

  return {
    registrarAtividade,
    tempoRestante: Math.max(0, TIMEOUT_MINUTOS - Math.floor((Date.now() - ultimaAtividade) / 60000)),
  };
}
