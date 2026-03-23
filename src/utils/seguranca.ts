/**
 * Utilitários de Segurança e LGPD
 * Funções para mascaramento de dados, validação e auditoria
 */

// =====================================================
// MASCARAMENTO DE DADOS SENSÍVEIS
// =====================================================

/**
 * Mascara CPF: 123.456.789-00 → ***.456.***-**
 */
export function mascararCPF(cpf: string | null | undefined): string {
  if (!cpf) return '***.***.***-**';
  
  // Remove formatação
  const cpfLimpo = cpf.replace(/\D/g, '');
  
  if (cpfLimpo.length !== 11) return cpf;
  
  // Mostra apenas os dígitos do meio
  return `***.${cpfLimpo.substring(3, 6)}.***-**`;
}

/**
 * Mascara telefone: 11999887766 → ****-7766
 */
export function mascararTelefone(telefone: string | null | undefined): string {
  if (!telefone) return '****-****';
  
  // Remove formatação
  const telLimpo = telefone.replace(/\D/g, '');
  
  if (telLimpo.length < 4) return '****-****';
  
  // Mostra apenas os últimos 4 dígitos
  const ultimos4 = telLimpo.slice(-4);
  return `****-${ultimos4}`;
}

/**
 * Mascara telefone parcialmente: 11999887766 → (11) *****-7766
 */
export function mascararTelefoneParcial(telefone: string | null | undefined): string {
  if (!telefone) return '(**) *****-****';
  
  const telLimpo = telefone.replace(/\D/g, '');
  
  if (telLimpo.length < 10) return mascararTelefone(telefone);
  
  const ddd = telLimpo.substring(0, 2);
  const ultimos4 = telLimpo.slice(-4);
  
  return `(${ddd}) *****-${ultimos4}`;
}

/**
 * Mascara email: usuario@email.com → u***o@e***.com
 */
export function mascararEmail(email: string | null | undefined): string {
  if (!email) return '***@***.***';
  
  const [usuario, dominio] = email.split('@');
  if (!usuario || !dominio) return '***@***.***';
  
  const usuarioMascarado = usuario.length > 2 
    ? `${usuario[0]}***${usuario[usuario.length - 1]}`
    : '***';
  
  const parteDominio = dominio.split('.');
  const dominioMascarado = parteDominio.length > 1
    ? `${parteDominio[0][0]}***.${parteDominio.slice(1).join('.')}`
    : '***';
  
  return `${usuarioMascarado}@${dominioMascarado}`;
}

/**
 * Mascara nome: João Silva → J*** S***
 */
export function mascararNome(nome: string | null | undefined): string {
  if (!nome) return '***';
  
  return nome.split(' ')
    .map(parte => parte.length > 0 ? `${parte[0]}***` : '')
    .join(' ');
}

// =====================================================
// VALIDAÇÃO DE SENHA FORTE
// =====================================================

export interface ValidacaoSenha {
  valida: boolean;
  erros: string[];
  forca: 'fraca' | 'media' | 'forte' | 'muito_forte';
  pontuacao: number;
}

/**
 * Valida força da senha conforme políticas de segurança
 * Requisitos mínimos:
 * - 8 caracteres
 * - 1 letra maiúscula
 * - 1 letra minúscula
 * - 1 número
 * - 1 caractere especial
 */
export function validarSenha(senha: string): ValidacaoSenha {
  const erros: string[] = [];
  let pontuacao = 0;
  
  // Comprimento mínimo
  if (senha.length < 8) {
    erros.push('A senha deve ter no mínimo 8 caracteres');
  } else {
    pontuacao += 1;
    if (senha.length >= 12) pontuacao += 1;
    if (senha.length >= 16) pontuacao += 1;
  }
  
  // Letra maiúscula
  if (!/[A-Z]/.test(senha)) {
    erros.push('A senha deve conter pelo menos uma letra maiúscula');
  } else {
    pontuacao += 1;
  }
  
  // Letra minúscula
  if (!/[a-z]/.test(senha)) {
    erros.push('A senha deve conter pelo menos uma letra minúscula');
  } else {
    pontuacao += 1;
  }
  
  // Número
  if (!/[0-9]/.test(senha)) {
    erros.push('A senha deve conter pelo menos um número');
  } else {
    pontuacao += 1;
  }
  
  // Caractere especial
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(senha)) {
    erros.push('A senha deve conter pelo menos um caractere especial (!@#$%^&*...)');
  } else {
    pontuacao += 1;
  }
  
  // Verificar sequências comuns
  const sequenciasProibidas = ['123456', 'abcdef', 'qwerty', 'senha', 'password', '111111'];
  for (const seq of sequenciasProibidas) {
    if (senha.toLowerCase().includes(seq)) {
      erros.push('A senha não pode conter sequências comuns');
      pontuacao -= 1;
      break;
    }
  }
  
  // Determinar força
  let forca: ValidacaoSenha['forca'] = 'fraca';
  if (pontuacao >= 7) forca = 'muito_forte';
  else if (pontuacao >= 5) forca = 'forte';
  else if (pontuacao >= 3) forca = 'media';
  
  return {
    valida: erros.length === 0,
    erros,
    forca,
    pontuacao: Math.max(0, pontuacao),
  };
}

// =====================================================
// TIMEOUT DE SESSÃO
// =====================================================

const TIMEOUT_MINUTOS = 30;
const STORAGE_KEY = 'ultima_atividade';

/**
 * Registra atividade do usuário
 */
export function registrarAtividade(): void {
  localStorage.setItem(STORAGE_KEY, Date.now().toString());
}

/**
 * Verifica se a sessão expirou por inatividade
 */
export function sessaoExpirada(): boolean {
  const ultimaAtividade = localStorage.getItem(STORAGE_KEY);
  if (!ultimaAtividade) return false;
  
  const tempoInativo = Date.now() - parseInt(ultimaAtividade);
  const limiteMs = TIMEOUT_MINUTOS * 60 * 1000;
  
  return tempoInativo > limiteMs;
}

/**
 * Limpa dados de sessão
 */
export function limparSessao(): void {
  localStorage.removeItem(STORAGE_KEY);
}

/**
 * Retorna tempo restante da sessão em minutos
 */
export function tempoRestanteSessao(): number {
  const ultimaAtividade = localStorage.getItem(STORAGE_KEY);
  if (!ultimaAtividade) return TIMEOUT_MINUTOS;
  
  const tempoInativo = Date.now() - parseInt(ultimaAtividade);
  const limiteMs = TIMEOUT_MINUTOS * 60 * 1000;
  const restanteMs = limiteMs - tempoInativo;
  
  return Math.max(0, Math.floor(restanteMs / 60000));
}

// =====================================================
// AUDITORIA
// =====================================================

import { supabase } from '@/integrations/supabase/client';

export interface DadosAuditoria {
  acao: 'login' | 'logout' | 'visualizar' | 'criar' | 'editar' | 'excluir' | 'exportar';
  recurso: string;
  recursoId?: string;
  descricao?: string;
  dadosAnteriores?: any;
  dadosNovos?: any;
  dadosSensiveis?: string[];
}

/**
 * Registra ação no log de auditoria
 */
export async function registrarAuditoria(dados: DadosAuditoria): Promise<void> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) return;
    
    await (supabase as any).from('sieg_fin_auditoria_sistema').insert({
      usuario_id: user.id,
      usuario_email: user.email,
      acao: dados.acao,
      recurso: dados.recurso,
      recurso_id: dados.recursoId,
      descricao: dados.descricao,
      dados_anteriores: dados.dadosAnteriores,
      dados_novos: dados.dadosNovos,
      dados_sensiveis_acessados: dados.dadosSensiveis,
    });
  } catch (error) {
    console.error('[Auditoria] Erro ao registrar:', error);
  }
}

// =====================================================
// SANITIZAÇÃO DE INPUTS
// =====================================================

/**
 * Remove caracteres perigosos de strings (previne XSS)
 */
export function sanitizarInput(input: string): string {
  return input
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}

/**
 * Valida se é um email válido
 */
export function validarEmail(email: string): boolean {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email);
}

/**
 * Valida se é um telefone brasileiro válido
 */
export function validarTelefone(telefone: string): boolean {
  const telLimpo = telefone.replace(/\D/g, '');
  return telLimpo.length >= 10 && telLimpo.length <= 13;
}

/**
 * Valida se é um CPF válido (apenas formato, não verifica dígitos)
 */
export function validarCPF(cpf: string): boolean {
  const cpfLimpo = cpf.replace(/\D/g, '');
  return cpfLimpo.length === 11;
}
