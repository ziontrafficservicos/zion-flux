import { MIN_DATA_DATE } from '@/lib/constants';
import { toBrasiliaDateString } from '@/lib/dateUtils';

export type LeadStage = 'novo_lead' | 'qualificacao' | 'qualificados' | 'descartados' | 'followup';

export const STAGES: LeadStage[] = ['novo_lead', 'qualificacao', 'qualificados', 'descartados', 'followup'];

const BASE_LABELS: Record<LeadStage, { title: string; description: string }> = {
  novo_lead: {
    title: 'Novo Lead',
    description: 'Leads recém captados pelo funil',
  },
  qualificacao: {
    title: 'Qualificando',
    description: 'Leads em processo de qualificação',
  },
  qualificados: {
    title: 'Qualificados',
    description: 'Leads prontos para conversão',
  },
  descartados: {
    title: 'Desqualificados',
    description: 'Leads desqualificados ou perdidos',
  },
  followup: {
    title: 'Follow-up',
    description: 'Leads em acompanhamento ativo',
  },
};

const SIEG_LABELS: Partial<Record<LeadStage, { title: string; description: string }>> = {
  novo_lead: {
    title: 'T1 - Sem Resposta',
    description: 'Leads sem resposta inicial',
  },
  qualificacao: {
    title: 'T2 - Respondido',
    description: 'Leads que responderam à IA',
  },
  qualificados: {
    title: 'T3 - Pago IA',
    description: 'Leads que pagaram via IA',
  },
  followup: {
    title: 'T4 - Transferido',
    description: 'Leads transferidos para atendimento humano',
  },
  descartados: {
    title: 'T5 - Passível de Suspensão',
    description: 'Leads desqualificados ou a suspender',
  },
};

const ASF_LABELS: Partial<Record<LeadStage, { title: string; description: string }>> = {
  novo_lead: {
    title: 'T1 - Novo Lead',
    description: 'Leads recém captados pelo funil',
  },
  qualificacao: {
    title: 'T2 - Qualificando',
    description: 'Leads em processo de qualificação',
  },
  qualificados: {
    title: 'T3 - Qualificado',
    description: 'Leads prontos para conversão',
  },
  followup: {
    title: 'Follow-up',
    description: 'Leads em acompanhamento ativo',
  },
  descartados: {
    title: 'T5 - Desqualificados',
    description: 'Leads desqualificados ou perdidos',
  },
};

const NORMALIZED_STAGE_MAP: Record<string, LeadStage> = {
  'novo_lead': 'novo_lead',
  'novo lead': 'novo_lead',
  'novo-lead': 'novo_lead',
  t1: 'novo_lead',
  qualificacao: 'qualificacao',
  'qualificação': 'qualificacao',
  qualificando: 'qualificacao',
  t2: 'qualificacao',
  qualificados: 'qualificados',
  qualificado: 'qualificados',
  'qualificado(a)': 'qualificados',
  t3: 'qualificados',
  followup: 'followup',
  'follow-up': 'followup',
  t4: 'followup',
  descartados: 'descartados',
  desqualificado: 'descartados',
  'desqualificado(a)': 'descartados',
  t5: 'descartados',
};

const toIsoDate = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const toStartOfDayIso = (date: Date) => new Date(`${toIsoDate(date)}T00:00:00-03:00`).toISOString();

export const buildEndExclusiveIso = (date: Date) => {
  const next = new Date(date);
  next.setDate(next.getDate() + 1);
  return toStartOfDayIso(next);
};

export const resolveLabels = (slug?: string) => {
  if (slug === 'sieg' || slug === 'sieg-pre-vendas') return { ...BASE_LABELS, ...SIEG_LABELS };
  if (slug === 'asf') return { ...BASE_LABELS, ...ASF_LABELS };
  return BASE_LABELS;
};

export const extractPrimaryTag = (
  meta?: Record<string, any> | null,
  tagsAtuais?: string[] | null
) => {
  if (tagsAtuais && tagsAtuais.length > 0) return tagsAtuais[0];
  if (!meta || typeof meta !== 'object') return null;
  if (typeof meta.tag === 'string') return meta.tag;
  if (Array.isArray(meta.tags) && meta.tags[0]) return meta.tags[0];
  if (Array.isArray((meta as any).tags_atuais) && (meta as any).tags_atuais[0]) return (meta as any).tags_atuais[0];
  return meta.ultimo_evento?.tag ?? meta.ultimoEvento?.tag ?? null;
};

export const extractFinanceValue = (meta: Record<string, any> | null | undefined, key: string) => {
  if (!meta || typeof meta !== 'object') return null;
  const source = meta.financeiro ?? meta.finance ?? meta;
  const value = source?.[key];
  if (value === undefined || value === null) return null;
  return typeof value === 'number' ? value.toString() : String(value);
};

export const normalizeStage = (
  primaryStage?: string | null,
  slug?: string,
  secondarySource?: string | null
): LeadStage => {
  const candidates = [primaryStage, secondarySource];

  for (const candidate of candidates) {
    if (!candidate) continue;
    const normalized = candidate.toLowerCase().trim();
    if (STAGES.includes(candidate as LeadStage)) return candidate as LeadStage;
    if (NORMALIZED_STAGE_MAP[normalized]) return NORMALIZED_STAGE_MAP[normalized];
  }

  const heuristic = (primaryStage || secondarySource || '').toLowerCase().trim();

  if (heuristic) {
    if (slug === 'sieg' || slug === 'sieg-pre-vendas') {
      if (heuristic.includes('t3') || heuristic.includes('pago')) return 'qualificados';
      if (heuristic.includes('t4') || heuristic.includes('transfer')) return 'followup';
      if (heuristic.includes('t5') || heuristic.includes('desqual')) return 'descartados';
      if (heuristic.includes('t2') || heuristic.includes('respond')) return 'qualificacao';
    }

    if (slug === 'asf') {
      if (heuristic.includes('t3') || heuristic.includes('qualificado')) return 'qualificados';
      if (heuristic.includes('t5') || heuristic.includes('desqual')) return 'descartados';
      if (heuristic.includes('t2') || heuristic.includes('qualificando')) return 'qualificacao';
    }

    if (heuristic.includes('qualificado')) return 'qualificados';
    if (heuristic.includes('follow')) return 'followup';
    if (heuristic.includes('desqual')) return 'descartados';
    if (heuristic.includes('qualific')) return 'qualificacao';
  }

  return 'novo_lead';
};

export const buildDailyCounter = () => {
  const start = new Date(MIN_DATA_DATE);
  const end = new Date();
  const counter: Record<string, number> = {};
  const cursor = new Date(start);

  while (cursor <= end) {
    counter[cursor.toISOString().split('T')[0]] = 0;
    cursor.setDate(cursor.getDate() + 1);
  }

  return counter;
};

export const ensureReferenceDate = (date?: string | null) =>
  toBrasiliaDateString(date) || new Date().toISOString();

export interface LeadFromConversation {
  id: string;
  nome: string;
  telefone: string;
  email?: string | null;
  produto: string;
  canal_origem: string;
  stage: LeadStage;
  entered_at: string;
  reference_date: string;
  valor_em_aberto?: string | null;
  valor_recuperado_ia?: string | null;
  valor_recuperado_humano?: string | null;
  tags?: string[];
}

export interface LeadRow {
  id: string;
  empresa_id: string;
  nome?: string | null;
  nome_empresa?: string | null;
  telefone?: string | null;
  email?: string | null;
  tags_atuais?: string[] | null;
  metadados?: Record<string, any> | null;
  status?: string | null;
  origem?: string | null;
  criado_em?: string | null;
  atualizado_em?: string | null;
}

export interface ConversaResumoRow {
  lead_id: string | null;
  empresa_id?: string | null;
  nome?: string | null;
  telefone?: string | null;
  tag?: string | null;
  source?: string | null;
  conversas?: Record<string, any>[] | null;
  criado_em?: string | null;
  atualizado_em?: string | null;
}

export const parseFinanceValue = (valor?: string | number | null) => {
  if (valor === null || valor === undefined) return 0;
  // Se já for número, retornar diretamente
  if (typeof valor === 'number') return Number.isNaN(valor) ? 0 : valor;
  // Se for string, fazer parse
  const cleaned = String(valor).replace(/[^0-9,.-]/g, '').replace(',', '.');
  const parsed = Number.parseFloat(cleaned);
  return Number.isNaN(parsed) ? 0 : parsed;
};

const PAGE_SIZE = 1000;

const createEmptyStageMap = () =>
  STAGES.reduce((acc, stage) => {
    acc[stage] = [] as LeadFromConversation[];
    return acc;
  }, {} as Record<LeadStage, LeadFromConversation[]>);

export interface FetchTenantLeadsParams {
  supabaseClient: any;
  tenantId: string;
  tenantSlug?: string;
  startISO: string;
  endISO: string;
  getStageFromTag?: (tag: string) => string;
  mappingsLoading?: boolean;
}

export interface FetchTenantLeadsResult {
  columns: Record<LeadStage, LeadFromConversation[]>;
  leads: LeadFromConversation[];
}

export async function fetchTenantLeads({
  supabaseClient,
  tenantId,
  tenantSlug,
  startISO,
  endISO,
  getStageFromTag,
  mappingsLoading = true,
}: FetchTenantLeadsParams): Promise<FetchTenantLeadsResult> {
  
  console.log('[fetchTenantLeads] Iniciando busca de leads...', { tenantId, tenantSlug });
  
  // Verificar se é SIEG Financeiro - usar tabela sieg_fin_financeiro
  const isSiegFinanceiro = tenantSlug === 'sieg-financeiro' || tenantSlug?.includes('financeiro');
  
  if (isSiegFinanceiro) {
    console.log('[fetchTenantLeads] 🏦 Workspace SIEG Financeiro detectado - usando tabela sieg_fin_financeiro');
    return fetchSiegFinanceiroLeads(supabaseClient, tenantId, startISO, endISO, getStageFromTag, mappingsLoading, tenantSlug);
  }

  const leadsRows: LeadRow[] = [];

  // Determinar tabelas corretas baseadas no tenant
  const workspaceSlug = tenantSlug || 'asf'; // Default para ASF
  const leadsTableName = 'sieg_fin_leads';
  const conversasTableName = 'sieg_fin_conversas_leads';
  
  console.log('[fetchTenantLeads] Usando tabelas:', { leads: leadsTableName, conversas: conversasTableName, workspace: workspaceSlug });

  // Buscar leads com paginação
  for (let page = 0; page < 200; page++) {
    const from = page * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;

    const { data, error } = await supabaseClient
      .from(leadsTableName)
      .select('id, empresa_id, nome, telefone, email, tags_atuais, metadados, status, origem, criado_em, atualizado_em')
      .eq('empresa_id', tenantId)
      .gte('criado_em', startISO)
      .lt('criado_em', endISO)
      .order('criado_em', { ascending: false })
      .range(from, to);

    if (error) throw error;
    if (!data || data.length === 0) break;

    leadsRows.push(...(data as LeadRow[]));
    if (data.length < PAGE_SIZE) break;
    
    if (page < 199) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  if (leadsRows.length === 0) {
    return { columns: createEmptyStageMap(), leads: [] };
  }

  const leadIds = leadsRows.map((lead) => lead.id).filter(Boolean);

  let conversaByLead: Record<string, ConversaResumoRow> = {};

  if (leadIds.length > 0) {
    try {
      const conversasSelectFields = 'id, lead_id, nome, telefone, tag, source, conversas, criado_em, atualizado_em, empresa_id';
      
      const { data: conversasData, error: conversasError } = await supabaseClient
        .from(conversasTableName)
        .select(conversasSelectFields)
        .in('lead_id', leadIds)
        .eq('empresa_id', tenantId);

      if (conversasError) {
        console.warn('[fetchTenantLeads] Erro ao buscar conversas:', conversasError);
      } else {
        conversaByLead = {};
        (conversasData as any[] | null)?.forEach((row) => {
          if (row.lead_id) {
            conversaByLead[row.lead_id] = row;
          }
        });
      }
    } catch (err) {
      console.warn('[fetchTenantLeads] Erro ao buscar conversas, continuando sem conversas:', err);
    }
  }

  const columns = createEmptyStageMap();
  const leads: LeadFromConversation[] = [];

  leadsRows.forEach((leadRow) => {
    const conversa = conversaByLead[leadRow.id];
    const primaryTag = extractPrimaryTag(leadRow.metadados, leadRow.tags_atuais) ?? conversa?.tag ?? null;
    const mappedStage = primaryTag && getStageFromTag && !mappingsLoading
      ? getStageFromTag(primaryTag)
      : undefined;

    const stage = normalizeStage(
      mappedStage ?? leadRow.status,
      tenantSlug,
      primaryTag ?? leadRow.status ?? conversa?.tag ?? undefined
    );

    const entered_at = leadRow.criado_em ?? new Date().toISOString();
    const reference_date = ensureReferenceDate(leadRow.criado_em) ?? new Date().toISOString();

    const lead: LeadFromConversation = {
      id: leadRow.id,
      nome: leadRow.nome || leadRow.nome_empresa || 'Sem nome',
      telefone: leadRow.telefone || '',
      email: leadRow.email || null,
      produto: leadRow.metadados?.produto || leadRow.metadados?.produto_interesse || '',
      canal_origem:
        leadRow.origem ||
        leadRow.metadados?.origem ||
        leadRow.metadados?.canal ||
        conversa?.source ||
        'desconhecido',
      stage,
      entered_at,
      reference_date,
      valor_em_aberto: extractFinanceValue(leadRow.metadados, 'valor_em_aberto'),
      valor_recuperado_ia: extractFinanceValue(leadRow.metadados, 'valor_recuperado_ia'),
      valor_recuperado_humano: extractFinanceValue(leadRow.metadados, 'valor_recuperado_humano'),
      tags: leadRow.tags_atuais ?? undefined,
    };

    columns[stage].push(lead);
    leads.push(lead);
  });

  return { columns, leads };
}

// Função específica para buscar dados do SIEG Financeiro da tabela sieg_fin_financeiro
async function fetchSiegFinanceiroLeads(
  supabaseClient: any,
  tenantId: string,
  startISO: string,
  endISO: string,
  getStageFromTag: ((tag: string) => string | undefined) | undefined,
  mappingsLoading: boolean,
  tenantSlug?: string
): Promise<FetchTenantLeadsResult> {
  
  console.log('[fetchSiegFinanceiroLeads] 🏦 Buscando dados da tabela sieg_fin_financeiro...');
  console.log('[fetchSiegFinanceiroLeads] 📋 Parâmetros:', { tenantId, tenantSlug, startISO, endISO });
  
  const columns = createEmptyStageMap();
  const leads: LeadFromConversation[] = [];
  const leadByEmpresaKey = new Map<string, LeadFromConversation>();

  // Buscar dados da tabela sieg_fin_financeiro com paginação e filtro de data
  for (let page = 0; page < 200; page++) {
    const from = page * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;

    const { data, error } = await supabaseClient
      .from('sieg_fin_financeiro')
      .select('id, empresa_id, nome, nome_empresa, cnpj, telefone, valor_em_aberto, valor_recuperado_ia, valor_recuperado_humano, em_negociacao, situacao, tag, data_vencimento, data_pagamento, observacoes, criado_em, atualizado_em, atendente, nota_csat, historico_conversa')
      .eq('empresa_id', tenantId)
      .gte('criado_em', startISO)
      .lt('criado_em', endISO)
      .order('criado_em', { ascending: false })
      .range(from, to);

    if (error) {
      console.error('[fetchSiegFinanceiroLeads] Erro:', error);
      throw error;
    }
    if (!data || data.length === 0) break;

    console.log(`[fetchSiegFinanceiroLeads] Página ${page + 1}: ${data.length} registros`);
    
    // Debug: mostrar distribuição de tags na primeira página
    if (page === 0) {
      const tagCounts: Record<string, number> = {};
      data.forEach((row: any) => {
        const t = row.tag || 'SEM_TAG';
        tagCounts[t] = (tagCounts[t] || 0) + 1;
      });
      console.log('[fetchSiegFinanceiroLeads] 🏷️ Tags encontradas:', tagCounts);
    }

    // Processar cada registro
    data.forEach((row: any, index: number) => {
      // Mapear tag para stage
      const tag = row.tag || '';
      const historicoConversa = row.historico_conversa || '';
      let stage: LeadStage = 'novo_lead';
      
      // Verificar se tem mensagens do cliente (You:) no histórico
      const temHistorico = historicoConversa && historicoConversa.includes('You:');
      const atendente = row.atendente || '';
      const semAgente = !atendente || atendente.trim() === '';
      
      // Verificar se tem comprovante de pagamento no histórico
      const historicoLower = historicoConversa.toLowerCase();
      const temComprovante = historicoLower.includes('comprovante') || 
                             historicoLower.includes('pix') || 
                             historicoLower.includes('pagamento') ||
                             historicoLower.includes('paguei') ||
                             historicoLower.includes('transferi') ||
                             historicoLower.includes('boleto') ||
                             historicoLower.includes('.jpg') ||
                             historicoLower.includes('.jpeg') ||
                             historicoLower.includes('.png') ||
                             historicoLower.includes('.pdf') ||
                             historicoLower.includes('image/') ||
                             historicoLower.includes('wa.me') ||
                             historicoLower.includes('whatsapp');
      
      // Verificar se tem mensagem de "passível de suspensão" no histórico
      const temMensagemSuspensao = historicoLower.includes('passivel de suspensao') ||
                                   historicoLower.includes('passível de suspensão') ||
                                   historicoLower.includes('suspensao') ||
                                   historicoLower.includes('suspensão');
      
      // Debug primeiros registros
      if (index < 5) {
        console.log(`[fetchSiegFinanceiroLeads] Row ${index}: tag="${tag}", temHistorico=${temHistorico}, semAgente=${semAgente}, temComprovante=${temComprovante}`);
      }
      
      // Mapeamento de tags do SIEG Financeiro (case insensitive)
      const tagUpper = String(tag).toUpperCase();
      
      // REGRA 1: Se tag é T5 -> T5 (não muda nunca)
      if (tagUpper.includes('T5') || tagUpper.includes('SUSPENS')) {
        stage = 'descartados';
      // REGRA 2: Se tag é T3 ou PAGO -> T3 (não muda)
      } else if (tagUpper.includes('T3') || tagUpper.includes('PAGO')) {
        stage = 'qualificados';
      // REGRA 3: Se tem agente atribuído -> T4 (Transferido)
      } else if (!semAgente) {
        stage = 'followup'; // T4 - TRANSFERIDO
      } else if (temMensagemSuspensao) {
        // Sem agente + mensagem de suspensão no histórico -> T5
        stage = 'descartados';
      } else if (temComprovante) {
        // Sem agente + tem comprovante de pagamento -> T3
        stage = 'qualificados';
      } else if (tagUpper.includes('T2') || tagUpper.includes('QUALIFICANDO')) {
        stage = 'qualificacao';
      } else {
        // T1 ou qualquer outra tag (sem agente)
        // Se tem histórico de conversa, significa que o cliente respondeu -> T2
        if (temHistorico) {
          stage = 'qualificacao'; // T2 - RESPONDIDO
        } else {
          stage = 'novo_lead'; // T1 - SEM RESPOSTA
        }
      }
      
      // Debug primeiros registros com stage
      if (index < 5) {
        console.log(`[fetchSiegFinanceiroLeads] Row ${index}: tag="${tag}", temHistorico=${temHistorico} -> stage="${stage}"`);
      }

      // DESABILITADO: O mapeamento customizado estava sobrescrevendo o mapeamento correto
      // Para SIEG Financeiro, usamos apenas o mapeamento hardcoded acima
      // if (getStageFromTag && !mappingsLoading && tag) {
      //   const mappedStage = getStageFromTag(tag);
      //   if (mappedStage && STAGES.includes(mappedStage as LeadStage)) {
      //     stage = mappedStage as LeadStage;
      //   }
      // }

      const entered_at = row.criado_em ?? new Date().toISOString();
      const reference_date = ensureReferenceDate(row.criado_em) ?? new Date().toISOString();

      const lead: LeadFromConversation = {
        id: row.id,
        nome: row.nome || row.nome_empresa || 'Sem nome',
        telefone: row.telefone || '',
        email: null,
        produto: row.cnpj || '',
        canal_origem: 'SIEG',
        stage,
        entered_at,
        reference_date,
        valor_em_aberto: row.valor_em_aberto || 0,
        valor_recuperado_ia: row.valor_recuperado_ia || 0,
        valor_recuperado_humano: row.valor_recuperado_humano || 0,
        tags: tag ? [tag] : undefined,
      };

      // CORREÇÃO (SIEG): "Total de Clientes" deve representar empresas únicas.
      // Usar CNPJ como chave; se CNPJ estiver vazio/nulo, usar telefone como fallback.
      const empresaKey = (row.cnpj && String(row.cnpj).trim().length > 0)
        ? `cnpj:${String(row.cnpj).trim()}`
        : `tel:${String(row.telefone || '').trim()}`;

      const existente = leadByEmpresaKey.get(empresaKey);

      // Heurística simples para escolher o melhor registro representativo para a empresa:
      // - Preferir quem tem status mais avançado (qualificados > followup > qualificacao > novo_lead > descartados)
      // - Em empate, preferir maior valor_em_aberto
      const stageRank: Record<LeadStage, number> = {
        qualificados: 5,
        followup: 4,
        qualificacao: 3,
        novo_lead: 2,
        descartados: 1,
      };

      const shouldReplace = !existente
        || stageRank[lead.stage] > stageRank[existente.stage]
        || (
          stageRank[lead.stage] === stageRank[existente.stage]
          && parseFinanceValue(lead.valor_em_aberto) > parseFinanceValue(existente.valor_em_aberto)
        );

      if (shouldReplace) {
        leadByEmpresaKey.set(empresaKey, lead);
      }
    });

    if (data.length < PAGE_SIZE) break;
    
    if (page < 199) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  // Reconstituir colunas e lista final a partir do agrupamento por empresaKey
  const uniqueLeads = Array.from(leadByEmpresaKey.values());
  const uniqueColumns = createEmptyStageMap();
  uniqueLeads.forEach((lead) => {
    uniqueColumns[lead.stage].push(lead);
  });

  console.log('[fetchSiegFinanceiroLeads] ✅ Total de leads (empresas únicas):', uniqueLeads.length);
  console.log('[fetchSiegFinanceiroLeads] 📊 Por stage (empresas únicas):', Object.entries(uniqueColumns).map(([s, l]) => `${s}: ${l.length}`).join(', '));

  return { columns: uniqueColumns, leads: uniqueLeads };
}
