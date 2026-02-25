export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      atualizacao_geral: {
        Row: {
          agente: string | null
          agente_2: string | null
          analise_comprovante: string | null
          atualizado_em: string | null
          canal: string | null
          cnpj: string | null
          codigo_barras: string | null
          codigo_barras_2: string | null
          conversation_id: string | null
          criado_em: string | null
          data_evento: string | null
          data_pagamento: string | null
          data_primeiro_contato: string | null
          data_transferencia: string | null
          data_ultimo_contato: string | null
          data_vencimento: string | null
          data_vencimento_novo: string | null
          emoji_reacao: string | null
          empresa_id: string | null
          erro_sistema: string | null
          fatura_info: string | null
          faturas_json: string | null
          flag_1: string | null
          flag_2: string | null
          forma_pagamento: string | null
          historico_completo: string | null
          historico_conversa_humano: string | null
          historico_conversa_ia: string | null
          historico_formatado: string | null
          hora_contato: string | null
          id: string
          is_comprovante: string | null
          link_boleto: string | null
          link_comprovante_1: string | null
          link_comprovante_2: string | null
          link_comprovante_3: string | null
          link_comprovante_4: string | null
          mensagem_final_1: string | null
          mensagem_final_2: string | null
          mensagem_followup: string | null
          mensagem_ia_sugerida: string | null
          mensagem_pos_pagamento_1: string | null
          mensagem_pos_pagamento_2: string | null
          mensagem_reengajamento: string | null
          message_id: string | null
          motivo_transferencia: string | null
          node_id: string | null
          nome_cliente: string | null
          nome_empresa: string | null
          nota_csat: string | null
          prompt_sistema: string | null
          qtd_mensagens: string | null
          qtd_mensagens_cliente: string | null
          qtd_mensagens_ia: string | null
          qtd_transferencias: string | null
          reason: string | null
          status_atendimento: string | null
          tag: string | null
          telefone: string | null
          timestamp_fim: string | null
          timestamp_inicio: string | null
          tipo_comprovante: string | null
          tipo_evento: string | null
          ultima_mensagem_cliente: string | null
          ultima_mensagem_texto: string | null
          valor_em_aberto: string | null
          valor_fatura: string | null
          valor_fatura_2: string | null
          valor_pago: string | null
          valor_total: string | null
        }
        Insert: {
          agente?: string | null
          agente_2?: string | null
          analise_comprovante?: string | null
          atualizado_em?: string | null
          canal?: string | null
          cnpj?: string | null
          codigo_barras?: string | null
          codigo_barras_2?: string | null
          conversation_id?: string | null
          criado_em?: string | null
          data_evento?: string | null
          data_pagamento?: string | null
          data_primeiro_contato?: string | null
          data_transferencia?: string | null
          data_ultimo_contato?: string | null
          data_vencimento?: string | null
          data_vencimento_novo?: string | null
          emoji_reacao?: string | null
          empresa_id?: string | null
          erro_sistema?: string | null
          fatura_info?: string | null
          faturas_json?: string | null
          flag_1?: string | null
          flag_2?: string | null
          forma_pagamento?: string | null
          historico_completo?: string | null
          historico_conversa_humano?: string | null
          historico_conversa_ia?: string | null
          historico_formatado?: string | null
          hora_contato?: string | null
          id?: string
          is_comprovante?: string | null
          link_boleto?: string | null
          link_comprovante_1?: string | null
          link_comprovante_2?: string | null
          link_comprovante_3?: string | null
          link_comprovante_4?: string | null
          mensagem_final_1?: string | null
          mensagem_final_2?: string | null
          mensagem_followup?: string | null
          mensagem_ia_sugerida?: string | null
          mensagem_pos_pagamento_1?: string | null
          mensagem_pos_pagamento_2?: string | null
          mensagem_reengajamento?: string | null
          message_id?: string | null
          motivo_transferencia?: string | null
          node_id?: string | null
          nome_cliente?: string | null
          nome_empresa?: string | null
          nota_csat?: string | null
          prompt_sistema?: string | null
          qtd_mensagens?: string | null
          qtd_mensagens_cliente?: string | null
          qtd_mensagens_ia?: string | null
          qtd_transferencias?: string | null
          reason?: string | null
          status_atendimento?: string | null
          tag?: string | null
          telefone?: string | null
          timestamp_fim?: string | null
          timestamp_inicio?: string | null
          tipo_comprovante?: string | null
          tipo_evento?: string | null
          ultima_mensagem_cliente?: string | null
          ultima_mensagem_texto?: string | null
          valor_em_aberto?: string | null
          valor_fatura?: string | null
          valor_fatura_2?: string | null
          valor_pago?: string | null
          valor_total?: string | null
        }
        Update: {
          agente?: string | null
          agente_2?: string | null
          analise_comprovante?: string | null
          atualizado_em?: string | null
          canal?: string | null
          cnpj?: string | null
          codigo_barras?: string | null
          codigo_barras_2?: string | null
          conversation_id?: string | null
          criado_em?: string | null
          data_evento?: string | null
          data_pagamento?: string | null
          data_primeiro_contato?: string | null
          data_transferencia?: string | null
          data_ultimo_contato?: string | null
          data_vencimento?: string | null
          data_vencimento_novo?: string | null
          emoji_reacao?: string | null
          empresa_id?: string | null
          erro_sistema?: string | null
          fatura_info?: string | null
          faturas_json?: string | null
          flag_1?: string | null
          flag_2?: string | null
          forma_pagamento?: string | null
          historico_completo?: string | null
          historico_conversa_humano?: string | null
          historico_conversa_ia?: string | null
          historico_formatado?: string | null
          hora_contato?: string | null
          id?: string
          is_comprovante?: string | null
          link_boleto?: string | null
          link_comprovante_1?: string | null
          link_comprovante_2?: string | null
          link_comprovante_3?: string | null
          link_comprovante_4?: string | null
          mensagem_final_1?: string | null
          mensagem_final_2?: string | null
          mensagem_followup?: string | null
          mensagem_ia_sugerida?: string | null
          mensagem_pos_pagamento_1?: string | null
          mensagem_pos_pagamento_2?: string | null
          mensagem_reengajamento?: string | null
          message_id?: string | null
          motivo_transferencia?: string | null
          node_id?: string | null
          nome_cliente?: string | null
          nome_empresa?: string | null
          nota_csat?: string | null
          prompt_sistema?: string | null
          qtd_mensagens?: string | null
          qtd_mensagens_cliente?: string | null
          qtd_mensagens_ia?: string | null
          qtd_transferencias?: string | null
          reason?: string | null
          status_atendimento?: string | null
          tag?: string | null
          telefone?: string | null
          timestamp_fim?: string | null
          timestamp_inicio?: string | null
          tipo_comprovante?: string | null
          tipo_evento?: string | null
          ultima_mensagem_cliente?: string | null
          ultima_mensagem_texto?: string | null
          valor_em_aberto?: string | null
          valor_fatura?: string | null
          valor_fatura_2?: string | null
          valor_pago?: string | null
          valor_total?: string | null
        }
        Relationships: []
      }
      audit_log: {
        Row: {
          acao: string
          campos_alterados: string[] | null
          criado_em: string | null
          dados_anteriores: Json | null
          dados_novos: Json | null
          descricao: string | null
          id: string
          ip_address: string | null
          registro_id: string | null
          tabela: string
          tenant_id: string | null
          user_agent: string | null
          user_email: string | null
          user_id: string | null
        }
        Insert: {
          acao: string
          campos_alterados?: string[] | null
          criado_em?: string | null
          dados_anteriores?: Json | null
          dados_novos?: Json | null
          descricao?: string | null
          id?: string
          ip_address?: string | null
          registro_id?: string | null
          tabela: string
          tenant_id?: string | null
          user_agent?: string | null
          user_email?: string | null
          user_id?: string | null
        }
        Update: {
          acao?: string
          campos_alterados?: string[] | null
          criado_em?: string | null
          dados_anteriores?: Json | null
          dados_novos?: Json | null
          descricao?: string | null
          id?: string
          ip_address?: string | null
          registro_id?: string | null
          tabela?: string
          tenant_id?: string | null
          user_agent?: string | null
          user_email?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_log_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_log_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenant_workspaces"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_log_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenant_workspaces"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "audit_log_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants_new"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_log_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "vw_dashboard_empresas"
            referencedColumns: ["empresa_id"]
          },
          {
            foreignKeyName: "audit_log_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "vw_leads_por_tag"
            referencedColumns: ["empresa_id"]
          },
          {
            foreignKeyName: "audit_log_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "vw_resumo_campanhas"
            referencedColumns: ["empresa_id"]
          },
          {
            foreignKeyName: "audit_log_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "vw_timeline_lead"
            referencedColumns: ["empresa_id"]
          },
          {
            foreignKeyName: "audit_log_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_log_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "perfis_usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      auditoria_sistema: {
        Row: {
          acao: string
          criado_em: string | null
          dados_anteriores: Json | null
          dados_novos: Json | null
          dados_sensiveis_acessados: string[] | null
          descricao: string | null
          empresa_id: string | null
          id: string
          ip_address: string | null
          recurso: string | null
          recurso_id: string | null
          user_agent: string | null
          usuario_email: string | null
          usuario_id: string | null
          usuario_nome: string | null
        }
        Insert: {
          acao: string
          criado_em?: string | null
          dados_anteriores?: Json | null
          dados_novos?: Json | null
          dados_sensiveis_acessados?: string[] | null
          descricao?: string | null
          empresa_id?: string | null
          id?: string
          ip_address?: string | null
          recurso?: string | null
          recurso_id?: string | null
          user_agent?: string | null
          usuario_email?: string | null
          usuario_id?: string | null
          usuario_nome?: string | null
        }
        Update: {
          acao?: string
          criado_em?: string | null
          dados_anteriores?: Json | null
          dados_novos?: Json | null
          dados_sensiveis_acessados?: string[] | null
          descricao?: string | null
          empresa_id?: string | null
          id?: string
          ip_address?: string | null
          recurso?: string | null
          recurso_id?: string | null
          user_agent?: string | null
          usuario_email?: string | null
          usuario_id?: string | null
          usuario_nome?: string | null
        }
        Relationships: []
      }
      campanhas: {
        Row: {
          atualizado_em: string | null
          configuracoes: Json | null
          criado_em: string | null
          data_fim: string | null
          data_inicio: string | null
          descricao: string | null
          empresa_id: string
          id: string
          nome: string
          status: string | null
          tipo: string
        }
        Insert: {
          atualizado_em?: string | null
          configuracoes?: Json | null
          criado_em?: string | null
          data_fim?: string | null
          data_inicio?: string | null
          descricao?: string | null
          empresa_id: string
          id?: string
          nome: string
          status?: string | null
          tipo: string
        }
        Update: {
          atualizado_em?: string | null
          configuracoes?: Json | null
          criado_em?: string | null
          data_fim?: string | null
          data_inicio?: string | null
          descricao?: string | null
          empresa_id?: string
          id?: string
          nome?: string
          status?: string | null
          tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: "campanhas_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campanhas_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "tenant_workspaces"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campanhas_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "tenant_workspaces"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "campanhas_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "tenants_new"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campanhas_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "vw_dashboard_empresas"
            referencedColumns: ["empresa_id"]
          },
          {
            foreignKeyName: "campanhas_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "vw_leads_por_tag"
            referencedColumns: ["empresa_id"]
          },
          {
            foreignKeyName: "campanhas_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "vw_resumo_campanhas"
            referencedColumns: ["empresa_id"]
          },
          {
            foreignKeyName: "campanhas_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "vw_timeline_lead"
            referencedColumns: ["empresa_id"]
          },
          {
            foreignKeyName: "campanhas_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      configuracoes_banco: {
        Row: {
          ativo: boolean | null
          chave_anon: string
          chave_banco: string
          criado_em: string | null
          criado_por: string | null
          id: string
          nome: string
          nome_secreto_service_role: string | null
          tenant_id: string | null
          url: string
        }
        Insert: {
          ativo?: boolean | null
          chave_anon: string
          chave_banco: string
          criado_em?: string | null
          criado_por?: string | null
          id?: string
          nome: string
          nome_secreto_service_role?: string | null
          tenant_id?: string | null
          url: string
        }
        Update: {
          ativo?: boolean | null
          chave_anon?: string
          chave_banco?: string
          criado_em?: string | null
          criado_por?: string | null
          id?: string
          nome?: string
          nome_secreto_service_role?: string | null
          tenant_id?: string | null
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "configuracoes_banco_criado_por_fkey"
            columns: ["criado_por"]
            isOneToOne: false
            referencedRelation: "perfis_usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "configuracoes_banco_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "configuracoes_banco_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenant_workspaces"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "configuracoes_banco_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenant_workspaces"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "configuracoes_banco_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants_new"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "configuracoes_banco_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "vw_dashboard_empresas"
            referencedColumns: ["empresa_id"]
          },
          {
            foreignKeyName: "configuracoes_banco_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "vw_leads_por_tag"
            referencedColumns: ["empresa_id"]
          },
          {
            foreignKeyName: "configuracoes_banco_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "vw_resumo_campanhas"
            referencedColumns: ["empresa_id"]
          },
          {
            foreignKeyName: "configuracoes_banco_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "vw_timeline_lead"
            referencedColumns: ["empresa_id"]
          },
          {
            foreignKeyName: "configuracoes_banco_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      confirmacaodeinscricaosieg: {
        Row: {
          created_at: string | null
          hora_resposta: string | null
          id: string
          nome: string | null
          source: string | null
          tag: string | null
          telefone: string | null
        }
        Insert: {
          created_at?: string | null
          hora_resposta?: string | null
          id?: string
          nome?: string | null
          source?: string | null
          tag?: string | null
          telefone?: string | null
        }
        Update: {
          created_at?: string | null
          hora_resposta?: string | null
          id?: string
          nome?: string | null
          source?: string | null
          tag?: string | null
          telefone?: string | null
        }
        Relationships: []
      }
      consentimento_lgpd: {
        Row: {
          aceito: boolean
          aceito_em: string | null
          criado_em: string | null
          id: string
          ip_address: string | null
          revogado_em: string | null
          tipo: string
          user_agent: string | null
          usuario_email: string | null
          usuario_id: string
          versao: string
        }
        Insert: {
          aceito?: boolean
          aceito_em?: string | null
          criado_em?: string | null
          id?: string
          ip_address?: string | null
          revogado_em?: string | null
          tipo: string
          user_agent?: string | null
          usuario_email?: string | null
          usuario_id: string
          versao: string
        }
        Update: {
          aceito?: boolean
          aceito_em?: string | null
          criado_em?: string | null
          id?: string
          ip_address?: string | null
          revogado_em?: string | null
          tipo?: string
          user_agent?: string | null
          usuario_email?: string | null
          usuario_id?: string
          versao?: string
        }
        Relationships: []
      }
      contas_meta_ads: {
        Row: {
          access_token: string | null
          account_id: string
          account_name: string
          atualizado_em: string | null
          criado_em: string | null
          id: string
          is_active: boolean | null
          workspace_id: string
        }
        Insert: {
          access_token?: string | null
          account_id: string
          account_name: string
          atualizado_em?: string | null
          criado_em?: string | null
          id?: string
          is_active?: boolean | null
          workspace_id: string
        }
        Update: {
          access_token?: string | null
          account_id?: string
          account_name?: string
          atualizado_em?: string | null
          criado_em?: string | null
          id?: string
          is_active?: boolean | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "contas_meta_ads_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contas_meta_ads_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "tenant_workspaces"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contas_meta_ads_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "tenant_workspaces"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "contas_meta_ads_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "tenants_new"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contas_meta_ads_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "vw_dashboard_empresas"
            referencedColumns: ["empresa_id"]
          },
          {
            foreignKeyName: "contas_meta_ads_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "vw_leads_por_tag"
            referencedColumns: ["empresa_id"]
          },
          {
            foreignKeyName: "contas_meta_ads_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "vw_resumo_campanhas"
            referencedColumns: ["empresa_id"]
          },
          {
            foreignKeyName: "contas_meta_ads_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "vw_timeline_lead"
            referencedColumns: ["empresa_id"]
          },
          {
            foreignKeyName: "contas_meta_ads_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      conversas_leads: {
        Row: {
          analista: string | null
          atualizado_em: string | null
          conversas: Json | null
          criado_em: string | null
          csat: number | null
          csat_feedback: string | null
          data_conclusao: string | null
          data_resposta_csat: string | null
          data_transferencia: string | null
          empresa_id: string | null
          ended_at: string | null
          id: number
          lead_id: string | null
          nome: string | null
          origem_atendimento: string | null
          source: string | null
          started_at: string | null
          tag: string | null
          telefone: string | null
        }
        Insert: {
          analista?: string | null
          atualizado_em?: string | null
          conversas?: Json | null
          criado_em?: string | null
          csat?: number | null
          csat_feedback?: string | null
          data_conclusao?: string | null
          data_resposta_csat?: string | null
          data_transferencia?: string | null
          empresa_id?: string | null
          ended_at?: string | null
          id?: number
          lead_id?: string | null
          nome?: string | null
          origem_atendimento?: string | null
          source?: string | null
          started_at?: string | null
          tag?: string | null
          telefone?: string | null
        }
        Update: {
          analista?: string | null
          atualizado_em?: string | null
          conversas?: Json | null
          criado_em?: string | null
          csat?: number | null
          csat_feedback?: string | null
          data_conclusao?: string | null
          data_resposta_csat?: string | null
          data_transferencia?: string | null
          empresa_id?: string | null
          ended_at?: string | null
          id?: number
          lead_id?: string | null
          nome?: string | null
          origem_atendimento?: string | null
          source?: string | null
          started_at?: string | null
          tag?: string | null
          telefone?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "conversas_leads_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversas_leads_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "tenant_workspaces"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversas_leads_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "tenant_workspaces"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "conversas_leads_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "tenants_new"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversas_leads_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "vw_dashboard_empresas"
            referencedColumns: ["empresa_id"]
          },
          {
            foreignKeyName: "conversas_leads_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "vw_leads_por_tag"
            referencedColumns: ["empresa_id"]
          },
          {
            foreignKeyName: "conversas_leads_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "vw_resumo_campanhas"
            referencedColumns: ["empresa_id"]
          },
          {
            foreignKeyName: "conversas_leads_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "vw_timeline_lead"
            referencedColumns: ["empresa_id"]
          },
          {
            foreignKeyName: "conversas_leads_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversas_leads_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversas_leads_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "vw_timeline_lead"
            referencedColumns: ["lead_id"]
          },
        ]
      }
      custos_anuncios_tenant: {
        Row: {
          atualizado_em: string | null
          cliques: number | null
          conversoes: number | null
          criado_em: string | null
          criado_por: string | null
          dia: string
          id: string
          id_campanha: string | null
          impressoes: number | null
          moeda: string | null
          nome_campanha: string | null
          origem: string | null
          tenant_id: string
          valor: number
        }
        Insert: {
          atualizado_em?: string | null
          cliques?: number | null
          conversoes?: number | null
          criado_em?: string | null
          criado_por?: string | null
          dia: string
          id?: string
          id_campanha?: string | null
          impressoes?: number | null
          moeda?: string | null
          nome_campanha?: string | null
          origem?: string | null
          tenant_id: string
          valor?: number
        }
        Update: {
          atualizado_em?: string | null
          cliques?: number | null
          conversoes?: number | null
          criado_em?: string | null
          criado_por?: string | null
          dia?: string
          id?: string
          id_campanha?: string | null
          impressoes?: number | null
          moeda?: string | null
          nome_campanha?: string | null
          origem?: string | null
          tenant_id?: string
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "tenant_ad_costs_created_by_fkey"
            columns: ["criado_por"]
            isOneToOne: false
            referencedRelation: "perfis_usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tenant_ad_costs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tenant_ad_costs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenant_workspaces"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tenant_ad_costs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenant_workspaces"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "tenant_ad_costs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants_new"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tenant_ad_costs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "vw_dashboard_empresas"
            referencedColumns: ["empresa_id"]
          },
          {
            foreignKeyName: "tenant_ad_costs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "vw_leads_por_tag"
            referencedColumns: ["empresa_id"]
          },
          {
            foreignKeyName: "tenant_ad_costs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "vw_resumo_campanhas"
            referencedColumns: ["empresa_id"]
          },
          {
            foreignKeyName: "tenant_ad_costs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "vw_timeline_lead"
            referencedColumns: ["empresa_id"]
          },
          {
            foreignKeyName: "tenant_ad_costs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      disparos: {
        Row: {
          campanha_id: string | null
          canal: string | null
          criado_em: string | null
          empresa: string | null
          empresa_id: string
          enviado_em: string | null
          id: string
          lead_id: string | null
          mensagem_id: string | null
          metadados: Json | null
          nome: string | null
          status: string | null
          telefone: string | null
          tipo_disparo: string | null
        }
        Insert: {
          campanha_id?: string | null
          canal?: string | null
          criado_em?: string | null
          empresa?: string | null
          empresa_id: string
          enviado_em?: string | null
          id?: string
          lead_id?: string | null
          mensagem_id?: string | null
          metadados?: Json | null
          nome?: string | null
          status?: string | null
          telefone?: string | null
          tipo_disparo?: string | null
        }
        Update: {
          campanha_id?: string | null
          canal?: string | null
          criado_em?: string | null
          empresa?: string | null
          empresa_id?: string
          enviado_em?: string | null
          id?: string
          lead_id?: string | null
          mensagem_id?: string | null
          metadados?: Json | null
          nome?: string | null
          status?: string | null
          telefone?: string | null
          tipo_disparo?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "disparos_campanha_id_fkey"
            columns: ["campanha_id"]
            isOneToOne: false
            referencedRelation: "campanhas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "disparos_campanha_id_fkey"
            columns: ["campanha_id"]
            isOneToOne: false
            referencedRelation: "vw_resumo_campanhas"
            referencedColumns: ["campanha_id"]
          },
          {
            foreignKeyName: "disparos_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "disparos_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "tenant_workspaces"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "disparos_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "tenant_workspaces"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "disparos_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "tenants_new"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "disparos_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "vw_dashboard_empresas"
            referencedColumns: ["empresa_id"]
          },
          {
            foreignKeyName: "disparos_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "vw_leads_por_tag"
            referencedColumns: ["empresa_id"]
          },
          {
            foreignKeyName: "disparos_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "vw_resumo_campanhas"
            referencedColumns: ["empresa_id"]
          },
          {
            foreignKeyName: "disparos_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "vw_timeline_lead"
            referencedColumns: ["empresa_id"]
          },
          {
            foreignKeyName: "disparos_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "disparos_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "disparos_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "vw_timeline_lead"
            referencedColumns: ["lead_id"]
          },
        ]
      }
      empresas: {
        Row: {
          ativa: boolean | null
          atualizado_em: string | null
          configuracoes: Json | null
          criado_em: string | null
          id: string
          nome: string
        }
        Insert: {
          ativa?: boolean | null
          atualizado_em?: string | null
          configuracoes?: Json | null
          criado_em?: string | null
          id?: string
          nome: string
        }
        Update: {
          ativa?: boolean | null
          atualizado_em?: string | null
          configuracoes?: Json | null
          criado_em?: string | null
          id?: string
          nome?: string
        }
        Relationships: []
      }
      eventos_lead: {
        Row: {
          agente_responsavel: string | null
          campanha_id: string | null
          criado_em: string | null
          dados_evento: Json | null
          empresa_id: string
          id: string
          lead_id: string
          observacoes: string | null
          tags_anteriores: string[] | null
          tags_novas: string[] | null
          tipo_evento: string
        }
        Insert: {
          agente_responsavel?: string | null
          campanha_id?: string | null
          criado_em?: string | null
          dados_evento?: Json | null
          empresa_id: string
          id?: string
          lead_id: string
          observacoes?: string | null
          tags_anteriores?: string[] | null
          tags_novas?: string[] | null
          tipo_evento: string
        }
        Update: {
          agente_responsavel?: string | null
          campanha_id?: string | null
          criado_em?: string | null
          dados_evento?: Json | null
          empresa_id?: string
          id?: string
          lead_id?: string
          observacoes?: string | null
          tags_anteriores?: string[] | null
          tags_novas?: string[] | null
          tipo_evento?: string
        }
        Relationships: [
          {
            foreignKeyName: "eventos_lead_campanha_id_fkey"
            columns: ["campanha_id"]
            isOneToOne: false
            referencedRelation: "campanhas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "eventos_lead_campanha_id_fkey"
            columns: ["campanha_id"]
            isOneToOne: false
            referencedRelation: "vw_resumo_campanhas"
            referencedColumns: ["campanha_id"]
          },
          {
            foreignKeyName: "eventos_lead_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "eventos_lead_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "tenant_workspaces"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "eventos_lead_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "tenant_workspaces"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "eventos_lead_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "tenants_new"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "eventos_lead_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "vw_dashboard_empresas"
            referencedColumns: ["empresa_id"]
          },
          {
            foreignKeyName: "eventos_lead_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "vw_leads_por_tag"
            referencedColumns: ["empresa_id"]
          },
          {
            foreignKeyName: "eventos_lead_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "vw_resumo_campanhas"
            referencedColumns: ["empresa_id"]
          },
          {
            foreignKeyName: "eventos_lead_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "vw_timeline_lead"
            referencedColumns: ["empresa_id"]
          },
          {
            foreignKeyName: "eventos_lead_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "eventos_lead_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "eventos_lead_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "vw_timeline_lead"
            referencedColumns: ["lead_id"]
          },
        ]
      }
      financeiro_sieg: {
        Row: {
          atendente: string | null
          atualizado_em: string | null
          cnpj: string | null
          criado_em: string | null
          data_pagamento: string | null
          data_pesquisa_enviada: string | null
          data_vencimento: string | null
          em_negociacao: number | null
          empresa_id: string | null
          historico_conversa: string | null
          id: string
          nome: string | null
          nome_empresa: string | null
          nota_csat: number | null
          observacoes: string | null
          opiniao_csat: string | null
          resposta_satisfacao: string | null
          situacao: string | null
          tag: string | null
          telefone: string | null
          valor_em_aberto: number | null
          valor_recuperado_humano: number | null
          valor_recuperado_ia: number | null
        }
        Insert: {
          atendente?: string | null
          atualizado_em?: string | null
          cnpj?: string | null
          criado_em?: string | null
          data_pagamento?: string | null
          data_pesquisa_enviada?: string | null
          data_vencimento?: string | null
          em_negociacao?: number | null
          empresa_id?: string | null
          historico_conversa?: string | null
          id?: string
          nome?: string | null
          nome_empresa?: string | null
          nota_csat?: number | null
          observacoes?: string | null
          opiniao_csat?: string | null
          resposta_satisfacao?: string | null
          situacao?: string | null
          tag?: string | null
          telefone?: string | null
          valor_em_aberto?: number | null
          valor_recuperado_humano?: number | null
          valor_recuperado_ia?: number | null
        }
        Update: {
          atendente?: string | null
          atualizado_em?: string | null
          cnpj?: string | null
          criado_em?: string | null
          data_pagamento?: string | null
          data_pesquisa_enviada?: string | null
          data_vencimento?: string | null
          em_negociacao?: number | null
          empresa_id?: string | null
          historico_conversa?: string | null
          id?: string
          nome?: string | null
          nome_empresa?: string | null
          nota_csat?: number | null
          observacoes?: string | null
          opiniao_csat?: string | null
          resposta_satisfacao?: string | null
          situacao?: string | null
          tag?: string | null
          telefone?: string | null
          valor_em_aberto?: number | null
          valor_recuperado_humano?: number | null
          valor_recuperado_ia?: number | null
        }
        Relationships: []
      }
      historico_disparos: {
        Row: {
          dados_antigos: Json | null
          dados_novos: Json | null
          disparo_id: string
          id: string
          operacao: string
          registrado_em: string | null
        }
        Insert: {
          dados_antigos?: Json | null
          dados_novos?: Json | null
          disparo_id: string
          id?: string
          operacao: string
          registrado_em?: string | null
        }
        Update: {
          dados_antigos?: Json | null
          dados_novos?: Json | null
          disparo_id?: string
          id?: string
          operacao?: string
          registrado_em?: string | null
        }
        Relationships: []
      }
      historico_tags_financeiros: {
        Row: {
          cnpj: string | null
          data_registro: string | null
          empresa_id: string
          financeiro_id: string
          id: string
          tag_anterior: string | null
          tag_nova: string | null
          telefone: string
          valor_recuperado_ia: number | null
        }
        Insert: {
          cnpj?: string | null
          data_registro?: string | null
          empresa_id: string
          financeiro_id: string
          id?: string
          tag_anterior?: string | null
          tag_nova?: string | null
          telefone: string
          valor_recuperado_ia?: number | null
        }
        Update: {
          cnpj?: string | null
          data_registro?: string | null
          empresa_id?: string
          financeiro_id?: string
          id?: string
          tag_anterior?: string | null
          tag_nova?: string | null
          telefone?: string
          valor_recuperado_ia?: number | null
        }
        Relationships: []
      }
      historico_tags_lead: {
        Row: {
          criado_em: string | null
          criado_por: string | null
          empresa_id: string | null
          estagio_anterior: string | null
          estagio_novo: string | null
          id: string
          lead_id: string
          motivo: string | null
          tag_anterior: string | null
          tag_nova: string
          telefone: string
          tempo_no_estagio_anterior: number | null
        }
        Insert: {
          criado_em?: string | null
          criado_por?: string | null
          empresa_id?: string | null
          estagio_anterior?: string | null
          estagio_novo?: string | null
          id?: string
          lead_id: string
          motivo?: string | null
          tag_anterior?: string | null
          tag_nova: string
          telefone: string
          tempo_no_estagio_anterior?: number | null
        }
        Update: {
          criado_em?: string | null
          criado_por?: string | null
          empresa_id?: string | null
          estagio_anterior?: string | null
          estagio_novo?: string | null
          id?: string
          lead_id?: string
          motivo?: string | null
          tag_anterior?: string | null
          tag_nova?: string
          telefone?: string
          tempo_no_estagio_anterior?: number | null
        }
        Relationships: []
      }
      historico_valores_financeiros: {
        Row: {
          cnpj: string | null
          data_registro: string | null
          diferenca: number | null
          empresa_id: string
          financeiro_id: string
          id: string
          telefone: string
          tipo_valor: string
          valor_anterior: number | null
          valor_novo: number | null
        }
        Insert: {
          cnpj?: string | null
          data_registro?: string | null
          diferenca?: number | null
          empresa_id: string
          financeiro_id: string
          id?: string
          telefone: string
          tipo_valor: string
          valor_anterior?: number | null
          valor_novo?: number | null
        }
        Update: {
          cnpj?: string | null
          data_registro?: string | null
          diferenca?: number | null
          empresa_id?: string
          financeiro_id?: string
          id?: string
          telefone?: string
          tipo_valor?: string
          valor_anterior?: number | null
          valor_novo?: number | null
        }
        Relationships: []
      }
      leads: {
        Row: {
          atualizado_em: string | null
          criado_em: string | null
          email: string | null
          empresa_id: string
          id: string
          metadados: Json | null
          nome: string
          origem: string | null
          status: string | null
          tags_atuais: string[] | null
          telefone: string
        }
        Insert: {
          atualizado_em?: string | null
          criado_em?: string | null
          email?: string | null
          empresa_id: string
          id?: string
          metadados?: Json | null
          nome: string
          origem?: string | null
          status?: string | null
          tags_atuais?: string[] | null
          telefone: string
        }
        Update: {
          atualizado_em?: string | null
          criado_em?: string | null
          email?: string | null
          empresa_id?: string
          id?: string
          metadados?: Json | null
          nome?: string
          origem?: string | null
          status?: string | null
          tags_atuais?: string[] | null
          telefone?: string
        }
        Relationships: [
          {
            foreignKeyName: "leads_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "tenant_workspaces"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "tenant_workspaces"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "leads_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "tenants_new"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "vw_dashboard_empresas"
            referencedColumns: ["empresa_id"]
          },
          {
            foreignKeyName: "leads_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "vw_leads_por_tag"
            referencedColumns: ["empresa_id"]
          },
          {
            foreignKeyName: "leads_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "vw_resumo_campanhas"
            referencedColumns: ["empresa_id"]
          },
          {
            foreignKeyName: "leads_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "vw_timeline_lead"
            referencedColumns: ["empresa_id"]
          },
          {
            foreignKeyName: "leads_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      leads_asf: {
        Row: {
          created_at: string | null
          historico_conversa: string | null
          id: string
          nome: string | null
          tag: string | null
          telefone: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          historico_conversa?: string | null
          id?: string
          nome?: string | null
          tag?: string | null
          telefone?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          historico_conversa?: string | null
          id?: string
          nome?: string | null
          tag?: string | null
          telefone?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      leads_asf_ofc: {
        Row: {
          canal_origem: string | null
          created_at: string | null
          data_entrada: string | null
          historico: string | null
          id: string
          nome: string | null
          resumo: string | null
          tag: string | null
          telefone: string | null
        }
        Insert: {
          canal_origem?: string | null
          created_at?: string | null
          data_entrada?: string | null
          historico?: string | null
          id?: string
          nome?: string | null
          resumo?: string | null
          tag?: string | null
          telefone?: string | null
        }
        Update: {
          canal_origem?: string | null
          created_at?: string | null
          data_entrada?: string | null
          historico?: string | null
          id?: string
          nome?: string | null
          resumo?: string | null
          tag?: string | null
          telefone?: string | null
        }
        Relationships: []
      }
      leads_dr_premium: {
        Row: {
          ano: string | null
          atualizado_em: string | null
          canal_origem: string | null
          criado_em: string | null
          data_entrada: string | null
          desqualificado: boolean | null
          hora_entrada: string | null
          id: string
          mes: string | null
          nome: string | null
          produtos: string | null
          tag: string | null
          telefone: string | null
          url_origem: string | null
        }
        Insert: {
          ano?: string | null
          atualizado_em?: string | null
          canal_origem?: string | null
          criado_em?: string | null
          data_entrada?: string | null
          desqualificado?: boolean | null
          hora_entrada?: string | null
          id?: string
          mes?: string | null
          nome?: string | null
          produtos?: string | null
          tag?: string | null
          telefone?: string | null
          url_origem?: string | null
        }
        Update: {
          ano?: string | null
          atualizado_em?: string | null
          canal_origem?: string | null
          criado_em?: string | null
          data_entrada?: string | null
          desqualificado?: boolean | null
          hora_entrada?: string | null
          id?: string
          mes?: string | null
          nome?: string | null
          produtos?: string | null
          tag?: string | null
          telefone?: string | null
          url_origem?: string | null
        }
        Relationships: []
      }
      leads_dr_premium_tags: {
        Row: {
          created_at: string | null
          historico_conversa: string | null
          id: string
          nome: string
          tag: string | null
          telefone: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          historico_conversa?: string | null
          id?: string
          nome: string
          tag?: string | null
          telefone: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          historico_conversa?: string | null
          id?: string
          nome?: string
          tag?: string | null
          telefone?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      mapeamentos_tags_tenant: {
        Row: {
          ativo: boolean | null
          atualizado_em: string | null
          criado_em: string | null
          criado_por: string | null
          descricao: string | null
          estagio_interno: string
          id: string
          ordem_exibicao: number | null
          rotulo_exibicao: string
          tag_externa: string
          tenant_id: string
        }
        Insert: {
          ativo?: boolean | null
          atualizado_em?: string | null
          criado_em?: string | null
          criado_por?: string | null
          descricao?: string | null
          estagio_interno: string
          id?: string
          ordem_exibicao?: number | null
          rotulo_exibicao: string
          tag_externa: string
          tenant_id: string
        }
        Update: {
          ativo?: boolean | null
          atualizado_em?: string | null
          criado_em?: string | null
          criado_por?: string | null
          descricao?: string | null
          estagio_interno?: string
          id?: string
          ordem_exibicao?: number | null
          rotulo_exibicao?: string
          tag_externa?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenant_tag_mappings_created_by_fkey"
            columns: ["criado_por"]
            isOneToOne: false
            referencedRelation: "perfis_usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tenant_tag_mappings_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tenant_tag_mappings_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenant_workspaces"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tenant_tag_mappings_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenant_workspaces"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "tenant_tag_mappings_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants_new"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tenant_tag_mappings_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "vw_dashboard_empresas"
            referencedColumns: ["empresa_id"]
          },
          {
            foreignKeyName: "tenant_tag_mappings_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "vw_leads_por_tag"
            referencedColumns: ["empresa_id"]
          },
          {
            foreignKeyName: "tenant_tag_mappings_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "vw_resumo_campanhas"
            referencedColumns: ["empresa_id"]
          },
          {
            foreignKeyName: "tenant_tag_mappings_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "vw_timeline_lead"
            referencedColumns: ["empresa_id"]
          },
          {
            foreignKeyName: "tenant_tag_mappings_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      membros_workspace: {
        Row: {
          role: string | null
          user_id: string
          workspace_id: string
        }
        Insert: {
          role?: string | null
          user_id: string
          workspace_id: string
        }
        Update: {
          role?: string | null
          user_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "membros_workspace_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "perfis_usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      n8n_chat_histories: {
        Row: {
          id: number
          message: Json
          session_id: string
        }
        Insert: {
          id?: number
          message: Json
          session_id: string
        }
        Update: {
          id?: number
          message?: Json
          session_id?: string
        }
        Relationships: []
      }
      pending_invites: {
        Row: {
          accepted_at: string | null
          criado_em: string | null
          custom_data: string | null
          email: string
          expires_at: string | null
          id: string
          invited_by: string | null
          permissions: string | null
          role: string
          token: string
          workspace_id: string
        }
        Insert: {
          accepted_at?: string | null
          criado_em?: string | null
          custom_data?: string | null
          email: string
          expires_at?: string | null
          id?: string
          invited_by?: string | null
          permissions?: string | null
          role?: string
          token: string
          workspace_id: string
        }
        Update: {
          accepted_at?: string | null
          criado_em?: string | null
          custom_data?: string | null
          email?: string
          expires_at?: string | null
          id?: string
          invited_by?: string | null
          permissions?: string | null
          role?: string
          token?: string
          workspace_id?: string
        }
        Relationships: []
      }
      solicitacoes_lgpd: {
        Row: {
          atendido_por: string | null
          atendido_por_nome: string | null
          atualizado_em: string | null
          concluido_em: string | null
          criado_em: string | null
          descricao: string | null
          email_solicitante: string
          id: string
          nome_solicitante: string | null
          prazo_legal: string | null
          resposta: string | null
          status: string | null
          telefone_solicitante: string | null
          tipo: string
          usuario_id: string | null
        }
        Insert: {
          atendido_por?: string | null
          atendido_por_nome?: string | null
          atualizado_em?: string | null
          concluido_em?: string | null
          criado_em?: string | null
          descricao?: string | null
          email_solicitante: string
          id?: string
          nome_solicitante?: string | null
          prazo_legal?: string | null
          resposta?: string | null
          status?: string | null
          telefone_solicitante?: string | null
          tipo: string
          usuario_id?: string | null
        }
        Update: {
          atendido_por?: string | null
          atendido_por_nome?: string | null
          atualizado_em?: string | null
          concluido_em?: string | null
          criado_em?: string | null
          descricao?: string | null
          email_solicitante?: string
          id?: string
          nome_solicitante?: string | null
          prazo_legal?: string | null
          resposta?: string | null
          status?: string | null
          telefone_solicitante?: string | null
          tipo?: string
          usuario_id?: string | null
        }
        Relationships: []
      }
      superlivejaneiro: {
        Row: {
          agente: string | null
          cnpj: string | null
          created_at: string | null
          email: string | null
          historico_ia: string | null
          id: string
          nome: string | null
          tag: string | null
          telefone: string | null
          transferido_humano_em: string | null
        }
        Insert: {
          agente?: string | null
          cnpj?: string | null
          created_at?: string | null
          email?: string | null
          historico_ia?: string | null
          id?: string
          nome?: string | null
          tag?: string | null
          telefone?: string | null
          transferido_humano_em?: string | null
        }
        Update: {
          agente?: string | null
          cnpj?: string | null
          created_at?: string | null
          email?: string | null
          historico_ia?: string | null
          id?: string
          nome?: string | null
          tag?: string | null
          telefone?: string | null
          transferido_humano_em?: string | null
        }
        Relationships: []
      }
      tenant_users: {
        Row: {
          active: boolean | null
          atualizado_em: string | null
          bloqueado: boolean | null
          bloqueado_em: string | null
          bloqueado_por: string | null
          criado_em: string | null
          custom_permissions: Json | null
          id: string
          role: string | null
          tenant_id: string
          ultimo_acesso: string | null
          user_id: string
        }
        Insert: {
          active?: boolean | null
          atualizado_em?: string | null
          bloqueado?: boolean | null
          bloqueado_em?: string | null
          bloqueado_por?: string | null
          criado_em?: string | null
          custom_permissions?: Json | null
          id?: string
          role?: string | null
          tenant_id: string
          ultimo_acesso?: string | null
          user_id: string
        }
        Update: {
          active?: boolean | null
          atualizado_em?: string | null
          bloqueado?: boolean | null
          bloqueado_em?: string | null
          bloqueado_por?: string | null
          criado_em?: string | null
          custom_permissions?: Json | null
          id?: string
          role?: string | null
          tenant_id?: string
          ultimo_acesso?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenant_users_bloqueado_por_fkey"
            columns: ["bloqueado_por"]
            isOneToOne: false
            referencedRelation: "perfis_usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tenant_users_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tenant_users_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenant_workspaces"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tenant_users_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenant_workspaces"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "tenant_users_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants_new"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tenant_users_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "vw_dashboard_empresas"
            referencedColumns: ["empresa_id"]
          },
          {
            foreignKeyName: "tenant_users_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "vw_leads_por_tag"
            referencedColumns: ["empresa_id"]
          },
          {
            foreignKeyName: "tenant_users_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "vw_resumo_campanhas"
            referencedColumns: ["empresa_id"]
          },
          {
            foreignKeyName: "tenant_users_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "vw_timeline_lead"
            referencedColumns: ["empresa_id"]
          },
          {
            foreignKeyName: "tenant_users_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      database_configs: {
        Row: {
          active: boolean | null
          anon_key: string | null
          created_at: string | null
          created_by: string | null
          database_key: string | null
          id: string | null
          name: string | null
          service_role_secret_name: string | null
          tenant_id: string | null
          url: string | null
        }
        Insert: {
          active?: boolean | null
          anon_key?: string | null
          created_at?: string | null
          created_by?: string | null
          database_key?: string | null
          id?: string | null
          name?: string | null
          service_role_secret_name?: string | null
          tenant_id?: string | null
          url?: string | null
        }
        Update: {
          active?: boolean | null
          anon_key?: string | null
          created_at?: string | null
          created_by?: string | null
          database_key?: string | null
          id?: string | null
          name?: string | null
          service_role_secret_name?: string | null
          tenant_id?: string | null
          url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "configuracoes_banco_criado_por_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "perfis_usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "configuracoes_banco_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "configuracoes_banco_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenant_workspaces"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "configuracoes_banco_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenant_workspaces"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "configuracoes_banco_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants_new"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "configuracoes_banco_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "vw_dashboard_empresas"
            referencedColumns: ["empresa_id"]
          },
          {
            foreignKeyName: "configuracoes_banco_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "vw_leads_por_tag"
            referencedColumns: ["empresa_id"]
          },
          {
            foreignKeyName: "configuracoes_banco_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "vw_resumo_campanhas"
            referencedColumns: ["empresa_id"]
          },
          {
            foreignKeyName: "configuracoes_banco_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "vw_timeline_lead"
            referencedColumns: ["empresa_id"]
          },
          {
            foreignKeyName: "configuracoes_banco_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      jornada_leads: {
        Row: {
          criado_por: string | null
          data_mudanca: string | null
          empresa_id: string | null
          estagio_anterior: string | null
          estagio_atual: string | null
          etapa_numero: number | null
          lead_id: string | null
          motivo: string | null
          nome: string | null
          nome_empresa: string | null
          tag_anterior: string | null
          tag_atual: string | null
          telefone: string | null
          tempo_formatado: string | null
          tempo_no_estagio_anterior: number | null
        }
        Relationships: []
      }
      kpi_overview_daily: {
        Row: {
          cpl: number | null
          day: string | null
          investimento: number | null
          leads_descartados: number | null
          leads_followup: number | null
          leads_qualificados: number | null
          leads_recebidos: number | null
          workspace_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "leads_empresa_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_empresa_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "tenant_workspaces"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_empresa_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "tenant_workspaces"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "leads_empresa_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "tenants_new"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_empresa_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "vw_dashboard_empresas"
            referencedColumns: ["empresa_id"]
          },
          {
            foreignKeyName: "leads_empresa_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "vw_leads_por_tag"
            referencedColumns: ["empresa_id"]
          },
          {
            foreignKeyName: "leads_empresa_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "vw_resumo_campanhas"
            referencedColumns: ["empresa_id"]
          },
          {
            foreignKeyName: "leads_empresa_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "vw_timeline_lead"
            referencedColumns: ["empresa_id"]
          },
          {
            foreignKeyName: "leads_empresa_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      meta_ads_accounts: {
        Row: {
          access_token: string | null
          account_id: string | null
          account_name: string | null
          created_at: string | null
          id: string | null
          is_active: boolean | null
          updated_at: string | null
          workspace_id: string | null
        }
        Insert: {
          access_token?: string | null
          account_id?: string | null
          account_name?: string | null
          created_at?: string | null
          id?: string | null
          is_active?: boolean | null
          updated_at?: string | null
          workspace_id?: string | null
        }
        Update: {
          access_token?: string | null
          account_id?: string | null
          account_name?: string | null
          created_at?: string | null
          id?: string | null
          is_active?: boolean | null
          updated_at?: string | null
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contas_meta_ads_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contas_meta_ads_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "tenant_workspaces"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contas_meta_ads_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "tenant_workspaces"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "contas_meta_ads_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "tenants_new"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contas_meta_ads_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "vw_dashboard_empresas"
            referencedColumns: ["empresa_id"]
          },
          {
            foreignKeyName: "contas_meta_ads_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "vw_leads_por_tag"
            referencedColumns: ["empresa_id"]
          },
          {
            foreignKeyName: "contas_meta_ads_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "vw_resumo_campanhas"
            referencedColumns: ["empresa_id"]
          },
          {
            foreignKeyName: "contas_meta_ads_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "vw_timeline_lead"
            referencedColumns: ["empresa_id"]
          },
          {
            foreignKeyName: "contas_meta_ads_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      metricas_estagios: {
        Row: {
          data: string | null
          empresa_id: string | null
          estagio: string | null
          tempo_medio_anterior_segundos: number | null
          tempo_medio_formatado: string | null
          total_entradas: number | null
        }
        Relationships: []
      }
      perfis_usuarios: {
        Row: {
          criado_em: string | null
          email: string | null
          id: string | null
          nome_completo: string | null
        }
        Insert: {
          criado_em?: string | null
          email?: string | null
          id?: string | null
          nome_completo?: never
        }
        Update: {
          criado_em?: string | null
          email?: string | null
          id?: string | null
          nome_completo?: never
        }
        Relationships: []
      }
      tenant_ad_costs: {
        Row: {
          amount: number | null
          campaign_id: string | null
          campaign_name: string | null
          clicks: number | null
          conversions: number | null
          created_at: string | null
          created_by: string | null
          currency: string | null
          day: string | null
          id: string | null
          impressions: number | null
          source: string | null
          tenant_id: string | null
          updated_at: string | null
        }
        Insert: {
          amount?: number | null
          campaign_id?: string | null
          campaign_name?: string | null
          clicks?: number | null
          conversions?: number | null
          created_at?: string | null
          created_by?: string | null
          currency?: string | null
          day?: string | null
          id?: string | null
          impressions?: number | null
          source?: string | null
          tenant_id?: string | null
          updated_at?: string | null
        }
        Update: {
          amount?: number | null
          campaign_id?: string | null
          campaign_name?: string | null
          clicks?: number | null
          conversions?: number | null
          created_at?: string | null
          created_by?: string | null
          currency?: string | null
          day?: string | null
          id?: string | null
          impressions?: number | null
          source?: string | null
          tenant_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tenant_ad_costs_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "perfis_usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tenant_ad_costs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tenant_ad_costs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenant_workspaces"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tenant_ad_costs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenant_workspaces"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "tenant_ad_costs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants_new"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tenant_ad_costs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "vw_dashboard_empresas"
            referencedColumns: ["empresa_id"]
          },
          {
            foreignKeyName: "tenant_ad_costs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "vw_leads_por_tag"
            referencedColumns: ["empresa_id"]
          },
          {
            foreignKeyName: "tenant_ad_costs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "vw_resumo_campanhas"
            referencedColumns: ["empresa_id"]
          },
          {
            foreignKeyName: "tenant_ad_costs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "vw_timeline_lead"
            referencedColumns: ["empresa_id"]
          },
          {
            foreignKeyName: "tenant_ad_costs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_conversations: {
        Row: {
          analyst: string | null
          completion_date: string | null
          conversations: Json | null
          created_at: string | null
          csat: number | null
          id: number | null
          lead_id: string | null
          name: string | null
          phone: string | null
          source: string | null
          tag: string | null
          tenant_id: string | null
          transfer_date: string | null
          updated_at: string | null
        }
        Insert: {
          analyst?: string | null
          completion_date?: string | null
          conversations?: Json | null
          created_at?: string | null
          csat?: number | null
          id?: number | null
          lead_id?: string | null
          name?: string | null
          phone?: string | null
          source?: string | null
          tag?: string | null
          tenant_id?: string | null
          transfer_date?: string | null
          updated_at?: string | null
        }
        Update: {
          analyst?: string | null
          completion_date?: string | null
          conversations?: Json | null
          created_at?: string | null
          csat?: number | null
          id?: number | null
          lead_id?: string | null
          name?: string | null
          phone?: string | null
          source?: string | null
          tag?: string | null
          tenant_id?: string | null
          transfer_date?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "conversas_leads_empresa_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversas_leads_empresa_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenant_workspaces"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversas_leads_empresa_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenant_workspaces"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "conversas_leads_empresa_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants_new"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversas_leads_empresa_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "vw_dashboard_empresas"
            referencedColumns: ["empresa_id"]
          },
          {
            foreignKeyName: "conversas_leads_empresa_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "vw_leads_por_tag"
            referencedColumns: ["empresa_id"]
          },
          {
            foreignKeyName: "conversas_leads_empresa_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "vw_resumo_campanhas"
            referencedColumns: ["empresa_id"]
          },
          {
            foreignKeyName: "conversas_leads_empresa_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "vw_timeline_lead"
            referencedColumns: ["empresa_id"]
          },
          {
            foreignKeyName: "conversas_leads_empresa_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversas_leads_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversas_leads_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "vw_timeline_lead"
            referencedColumns: ["lead_id"]
          },
        ]
      }
      tenant_tag_mappings: {
        Row: {
          active: boolean | null
          created_at: string | null
          created_by: string | null
          description: string | null
          display_label: string | null
          display_order: number | null
          external_tag: string | null
          id: string | null
          internal_stage: string | null
          tenant_id: string | null
          updated_at: string | null
        }
        Insert: {
          active?: boolean | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          display_label?: string | null
          display_order?: number | null
          external_tag?: string | null
          id?: string | null
          internal_stage?: string | null
          tenant_id?: string | null
          updated_at?: string | null
        }
        Update: {
          active?: boolean | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          display_label?: string | null
          display_order?: number | null
          external_tag?: string | null
          id?: string | null
          internal_stage?: string | null
          tenant_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tenant_tag_mappings_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "perfis_usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tenant_tag_mappings_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tenant_tag_mappings_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenant_workspaces"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tenant_tag_mappings_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenant_workspaces"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "tenant_tag_mappings_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants_new"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tenant_tag_mappings_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "vw_dashboard_empresas"
            referencedColumns: ["empresa_id"]
          },
          {
            foreignKeyName: "tenant_tag_mappings_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "vw_leads_por_tag"
            referencedColumns: ["empresa_id"]
          },
          {
            foreignKeyName: "tenant_tag_mappings_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "vw_resumo_campanhas"
            referencedColumns: ["empresa_id"]
          },
          {
            foreignKeyName: "tenant_tag_mappings_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "vw_timeline_lead"
            referencedColumns: ["empresa_id"]
          },
          {
            foreignKeyName: "tenant_tag_mappings_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_workspaces: {
        Row: {
          active: boolean | null
          branding: Json | null
          created_at: string | null
          custom_permissions: Json | null
          id: string | null
          logo_url: string | null
          name: string | null
          primary_color: string | null
          role: string | null
          segment: string | null
          settings: Json | null
          slug: string | null
          status: string | null
          tenant_id: string | null
          updated_at: string | null
        }
        Insert: {
          active?: boolean | null
          branding?: Json | null
          created_at?: string | null
          custom_permissions?: never
          id?: string | null
          logo_url?: never
          name?: string | null
          primary_color?: never
          role?: never
          segment?: never
          settings?: Json | null
          slug?: never
          status?: never
          tenant_id?: string | null
          updated_at?: string | null
        }
        Update: {
          active?: boolean | null
          branding?: Json | null
          created_at?: string | null
          custom_permissions?: never
          id?: string | null
          logo_url?: never
          name?: string | null
          primary_color?: never
          role?: never
          segment?: never
          settings?: Json | null
          slug?: never
          status?: never
          tenant_id?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      tenants_new: {
        Row: {
          active: boolean | null
          billing_email: string | null
          branding: Json | null
          created_at: string | null
          database_key: string | null
          domain: string | null
          id: string | null
          max_leads: number | null
          max_users: number | null
          name: string | null
          plan_type: string | null
          settings: Json | null
          slug: string | null
          updated_at: string | null
        }
        Insert: {
          active?: boolean | null
          billing_email?: never
          branding?: Json | null
          created_at?: string | null
          database_key?: never
          domain?: never
          id?: string | null
          max_leads?: never
          max_users?: never
          name?: string | null
          plan_type?: never
          settings?: Json | null
          slug?: never
          updated_at?: string | null
        }
        Update: {
          active?: boolean | null
          billing_email?: never
          branding?: Json | null
          created_at?: string | null
          database_key?: never
          domain?: never
          id?: string | null
          max_leads?: never
          max_users?: never
          name?: string | null
          plan_type?: never
          settings?: Json | null
          slug?: never
          updated_at?: string | null
        }
        Relationships: []
      }
      vw_dashboard_empresas: {
        Row: {
          ativa: boolean | null
          atualizado_em: string | null
          campanhas_ativas: number | null
          criado_em: string | null
          empresa_id: string | null
          empresa_nome: string | null
          leads_ativos: number | null
          taxa_conversao_geral_pct: number | null
          total_campanhas: number | null
          total_conversoes: number | null
          total_disparos: number | null
          total_eventos: number | null
          total_leads: number | null
        }
        Relationships: []
      }
      vw_leads_por_tag: {
        Row: {
          empresa_id: string | null
          empresa_nome: string | null
          percentual: number | null
          quantidade_leads: number | null
          tag: string | null
        }
        Relationships: []
      }
      vw_performance_agentes: {
        Row: {
          agente: string | null
          empresa_nome: string | null
          primeiro_atendimento: string | null
          taxa_conversao_pct: number | null
          total_conversoes: number | null
          total_leads_atendidos: number | null
          total_respostas: number | null
          total_transferencias: number | null
          ultimo_atendimento: string | null
        }
        Relationships: []
      }
      vw_resumo_campanhas: {
        Row: {
          atualizado_em: string | null
          campanha_id: string | null
          campanha_nome: string | null
          campanha_status: string | null
          campanha_tipo: string | null
          criado_em: string | null
          data_fim: string | null
          data_inicio: string | null
          empresa_id: string | null
          empresa_nome: string | null
          taxa_conversao_pct: number | null
          taxa_resposta_pct: number | null
          total_conversoes: number | null
          total_disparos: number | null
          total_entregues: number | null
          total_respostas: number | null
        }
        Relationships: []
      }
      vw_timeline_lead: {
        Row: {
          agente_responsavel: string | null
          campanha_nome: string | null
          dados_evento: Json | null
          email: string | null
          empresa_id: string | null
          empresa_nome: string | null
          evento_data: string | null
          evento_id: string | null
          lead_criado_em: string | null
          lead_id: string | null
          lead_nome: string | null
          lead_status: string | null
          observacoes: string | null
          tags_anteriores: string[] | null
          tags_atuais: string[] | null
          tags_novas: string[] | null
          telefone: string | null
          tipo_evento: string | null
        }
        Relationships: []
      }
      vw_ultimas_atividades: {
        Row: {
          agente_responsavel: string | null
          campanha_nome: string | null
          dados_evento: Json | null
          data_evento: string | null
          empresa_nome: string | null
          evento_id: string | null
          horas_atras: number | null
          lead_nome: string | null
          lead_telefone: string | null
          tipo_evento: string | null
        }
        Relationships: []
      }
      workspaces: {
        Row: {
          active: boolean | null
          created_at: string | null
          id: string | null
          name: string | null
          settings: Json | null
          updated_at: string | null
        }
        Insert: {
          active?: boolean | null
          created_at?: string | null
          id?: string | null
          name?: string | null
          settings?: Json | null
          updated_at?: string | null
        }
        Update: {
          active?: boolean | null
          created_at?: string | null
          id?: string | null
          name?: string | null
          settings?: Json | null
          updated_at?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      add_workspace_member: {
        Args: {
          p_role?: Database["public"]["Enums"]["app_role"]
          p_set_default_workspace?: boolean
          p_user_id: string
          p_workspace_id: string
        }
        Returns: Json
      }
      clean_phone_number: { Args: { phone: string }; Returns: string }
      cleanup_orphan_users: {
        Args: never
        Returns: {
          deleted_count: number
          deleted_emails: string[]
        }[]
      }
      contar_disparos_por_dia: {
        Args: {
          p_data_fim: string
          p_data_inicio: string
          p_empresa_id: string
        }
        Returns: {
          dia: string
          quantidade: number
        }[]
      }
      contar_disparos_por_status: {
        Args: {
          p_data_fim: string
          p_data_inicio: string
          p_empresa_id: string
        }
        Returns: {
          dia: string
          enviados: number
          numero_invalido: number
          suspensao: number
          total: number
        }[]
      }
      count_audit_logs: {
        Args: {
          p_acao?: string
          p_data_fim?: string
          p_data_inicio?: string
          p_tabela?: string
          p_tenant_id?: string
        }
        Returns: number
      }
      deletar_usuario_completo: {
        Args: { usuario_id: string }
        Returns: boolean
      }
      extrair_estagio: { Args: { tag_texto: string }; Returns: string }
      get_atendimentos_metrics: {
        Args: {
          p_data_hoje: string
          p_primeiro_dia_mes: string
          p_table_name: string
          p_ultimo_dia_mes: string
          p_workspace_id: string
        }
        Returns: Json
      }
      get_audit_logs: {
        Args: {
          p_acao?: string
          p_data_fim?: string
          p_data_inicio?: string
          p_limite?: number
          p_offset?: number
          p_tabela?: string
          p_tenant_id?: string
          p_user_id?: string
        }
        Returns: {
          acao: string
          campos_alterados: string[]
          criado_em: string
          dados_anteriores: Json
          dados_novos: Json
          descricao: string
          id: string
          registro_id: string
          tabela: string
          tenant_id: string
          user_email: string
          user_id: string
        }[]
      }
      get_current_tenant_id: { Args: never; Returns: string }
      get_tag_mapping: {
        Args: { p_external_tag: string; p_tenant_id: string }
        Returns: {
          description: string
          display_label: string
          internal_stage: string
        }[]
      }
      get_tenant_tags: {
        Args: { p_tenant_id: string }
        Returns: {
          description: string
          display_label: string
          display_order: number
          external_tag: string
          internal_stage: string
        }[]
      }
      get_user_permissions: {
        Args: { p_user_id: string; p_workspace_id: string }
        Returns: Json
      }
      get_user_workspaces: {
        Args: { _user_id: string }
        Returns: {
          workspace_id: string
        }[]
      }
      get_workspace_members_with_details: {
        Args: { p_workspace_id: string }
        Returns: {
          role: string
          user_email: string
          user_id: string
          user_name: string
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_phone_blocked: { Args: { phone: string }; Returns: boolean }
      is_workspace_member: {
        Args: { _user_id: string; _workspace_id: string }
        Returns: boolean
      }
      kpi_totais_periodo: {
        Args: { p_from: string; p_to: string; p_workspace_id: string }
        Returns: {
          cpl_medio: number
          total_investimento: number
          total_leads_descartados: number
          total_leads_followup: number
          total_leads_qualificados: number
          total_leads_recebidos: number
        }[]
      }
      limpar_historico_disparos: { Args: never; Returns: number }
      processar_dados_nicochat: {
        Args: {
          p_analista?: string
          p_csat?: string
          p_data_transferencia?: string
          p_lead_id?: number
          p_messages?: Json
          p_nome: string
          p_started?: string
          p_tag?: string
          p_telefone: string
          p_tenant_id: string
        }
        Returns: string
      }
      registrar_auditoria: {
        Args: {
          p_acao: string
          p_dados_anteriores?: Json
          p_dados_novos?: Json
          p_dados_sensiveis?: string[]
          p_descricao?: string
          p_empresa_id: string
          p_ip_address?: string
          p_recurso: string
          p_recurso_id: string
          p_user_agent?: string
          p_usuario_email: string
          p_usuario_id: string
          p_usuario_nome: string
        }
        Returns: string
      }
      remove_workspace_member: {
        Args: { p_user_id: string; p_workspace_id: string }
        Returns: Json
      }
      save_user_permissions: {
        Args: {
          p_permissions: string[]
          p_user_id: string
          p_workspace_id: string
        }
        Returns: Json
      }
      update_conversation_tag: {
        Args: {
          p_conversation_id: number
          p_new_tag: string
          p_table_name: string
        }
        Returns: boolean
      }
      update_workspace_member_role: {
        Args: { p_new_role: string; p_user_id: string; p_workspace_id: string }
        Returns: Json
      }
      user_belongs_to_tenant: {
        Args: { tenant_uuid: string; user_uuid: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "owner" | "admin" | "member" | "viewer"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["owner", "admin", "member", "viewer"],
    },
  },
} as const
