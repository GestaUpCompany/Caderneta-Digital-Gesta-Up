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
    PostgrestVersion: "14.5"
  }
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      atividade_funcionarios: {
        Row: {
          atividade_id: string
          created_at: string
          detalhamento: string | null
          fim_at: string | null
          foto_url: string | null
          funcionario_id: string
          gps_accuracy: number | null
          id: string
          inicio_at: string | null
          justificada_at: string | null
          justificativa: string | null
          latitude: number | null
          local_id: string | null
          longitude: number | null
          status_individual: string
          tempo_gasto_segundos: number | null
          updated_at: string
        }
        Insert: {
          atividade_id: string
          created_at?: string
          detalhamento?: string | null
          fim_at?: string | null
          foto_url?: string | null
          funcionario_id: string
          gps_accuracy?: number | null
          id?: string
          inicio_at?: string | null
          justificada_at?: string | null
          justificativa?: string | null
          latitude?: number | null
          local_id?: string | null
          longitude?: number | null
          status_individual?: string
          tempo_gasto_segundos?: number | null
          updated_at?: string
        }
        Update: {
          atividade_id?: string
          created_at?: string
          detalhamento?: string | null
          fim_at?: string | null
          foto_url?: string | null
          funcionario_id?: string
          gps_accuracy?: number | null
          id?: string
          inicio_at?: string | null
          justificada_at?: string | null
          justificativa?: string | null
          latitude?: number | null
          local_id?: string | null
          longitude?: number | null
          status_individual?: string
          tempo_gasto_segundos?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "atividade_funcionarios_atividade_id_fkey"
            columns: ["atividade_id"]
            isOneToOne: false
            referencedRelation: "atividades"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "atividade_funcionarios_funcionario_id_fkey"
            columns: ["funcionario_id"]
            isOneToOne: false
            referencedRelation: "funcionarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "atividade_funcionarios_funcionario_id_fkey"
            columns: ["funcionario_id"]
            isOneToOne: false
            referencedRelation: "v_funcionarios_com_setores"
            referencedColumns: ["funcionario_id"]
          },
        ]
      }
      atividade_imprevisto_categorias: {
        Row: {
          ativo: boolean
          created_at: string
          fazenda_id: string
          id: string
          nome: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          fazenda_id: string
          id?: string
          nome: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          fazenda_id?: string
          id?: string
          nome?: string
        }
        Relationships: [
          {
            foreignKeyName: "atividade_imprevisto_categorias_fazenda_id_fkey"
            columns: ["fazenda_id"]
            isOneToOne: false
            referencedRelation: "fazendas"
            referencedColumns: ["id"]
          },
        ]
      }
      atividade_imprevistos: {
        Row: {
          atividade_funcionario_id: string
          created_at: string
          descricao: string | null
          id: string
          impacto_minutos: number | null
          local_id: string | null
          ocorrido_at: string
          tipo: string
        }
        Insert: {
          atividade_funcionario_id: string
          created_at?: string
          descricao?: string | null
          id?: string
          impacto_minutos?: number | null
          local_id?: string | null
          ocorrido_at?: string
          tipo: string
        }
        Update: {
          atividade_funcionario_id?: string
          created_at?: string
          descricao?: string | null
          id?: string
          impacto_minutos?: number | null
          local_id?: string | null
          ocorrido_at?: string
          tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: "atividade_imprevistos_atividade_funcionario_id_fkey"
            columns: ["atividade_funcionario_id"]
            isOneToOne: false
            referencedRelation: "atividade_funcionarios"
            referencedColumns: ["id"]
          },
        ]
      }
      atividade_sessoes: {
        Row: {
          atividade_funcionario_id: string
          created_at: string
          duracao_segundos: number | null
          fim_at: string | null
          id: string
          inicio_at: string
          local_id: string | null
          motivo_pausa: string | null
          trabalhada: boolean
        }
        Insert: {
          atividade_funcionario_id: string
          created_at?: string
          duracao_segundos?: number | null
          fim_at?: string | null
          id?: string
          inicio_at: string
          local_id?: string | null
          motivo_pausa?: string | null
          trabalhada?: boolean
        }
        Update: {
          atividade_funcionario_id?: string
          created_at?: string
          duracao_segundos?: number | null
          fim_at?: string | null
          id?: string
          inicio_at?: string
          local_id?: string | null
          motivo_pausa?: string | null
          trabalhada?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "atividade_sessoes_atividade_funcionario_id_fkey"
            columns: ["atividade_funcionario_id"]
            isOneToOne: false
            referencedRelation: "atividade_funcionarios"
            referencedColumns: ["id"]
          },
        ]
      }
      atividade_template_funcionarios: {
        Row: {
          created_at: string | null
          funcionario_id: string
          id: string
          template_id: string
        }
        Insert: {
          created_at?: string | null
          funcionario_id: string
          id?: string
          template_id: string
        }
        Update: {
          created_at?: string | null
          funcionario_id?: string
          id?: string
          template_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "atividade_template_funcionarios_funcionario_id_fkey"
            columns: ["funcionario_id"]
            isOneToOne: false
            referencedRelation: "funcionarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "atividade_template_funcionarios_funcionario_id_fkey"
            columns: ["funcionario_id"]
            isOneToOne: false
            referencedRelation: "v_funcionarios_com_setores"
            referencedColumns: ["funcionario_id"]
          },
          {
            foreignKeyName: "atividade_template_funcionarios_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "atividade_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      atividade_templates: {
        Row: {
          ativo: boolean
          created_at: string | null
          created_by: string | null
          deleted_at: string | null
          descricao: string | null
          fazenda_id: string
          id: string
          local: string | null
          local_id: string | null
          local_tipo: string | null
          prioridade: number
          setor_id: string | null
          titulo: string
          updated_at: string | null
        }
        Insert: {
          ativo?: boolean
          created_at?: string | null
          created_by?: string | null
          deleted_at?: string | null
          descricao?: string | null
          fazenda_id: string
          id?: string
          local?: string | null
          local_id?: string | null
          local_tipo?: string | null
          prioridade?: number
          setor_id?: string | null
          titulo: string
          updated_at?: string | null
        }
        Update: {
          ativo?: boolean
          created_at?: string | null
          created_by?: string | null
          deleted_at?: string | null
          descricao?: string | null
          fazenda_id?: string
          id?: string
          local?: string | null
          local_id?: string | null
          local_tipo?: string | null
          prioridade?: number
          setor_id?: string | null
          titulo?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "atividade_templates_fazenda_id_fkey"
            columns: ["fazenda_id"]
            isOneToOne: false
            referencedRelation: "fazendas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "atividade_templates_setor_id_fkey"
            columns: ["setor_id"]
            isOneToOne: false
            referencedRelation: "setores"
            referencedColumns: ["id"]
          },
        ]
      }
      atividades: {
        Row: {
          ativo: boolean
          atrasada: boolean
          created_at: string
          created_by: string | null
          data_fim: string
          data_inicio: string
          deleted_at: string | null
          descricao: string | null
          fazenda_id: string
          id: string
          local: string | null
          local_id: string | null
          local_tipo: string | null
          nao_prevista: boolean
          prioridade: number | null
          setor_id: string | null
          status: string
          titulo: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          atrasada?: boolean
          created_at?: string
          created_by?: string | null
          data_fim: string
          data_inicio: string
          deleted_at?: string | null
          descricao?: string | null
          fazenda_id: string
          id?: string
          local?: string | null
          local_id?: string | null
          local_tipo?: string | null
          nao_prevista?: boolean
          prioridade?: number | null
          setor_id?: string | null
          status?: string
          titulo: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          atrasada?: boolean
          created_at?: string
          created_by?: string | null
          data_fim?: string
          data_inicio?: string
          deleted_at?: string | null
          descricao?: string | null
          fazenda_id?: string
          id?: string
          local?: string | null
          local_id?: string | null
          local_tipo?: string | null
          nao_prevista?: boolean
          prioridade?: number | null
          setor_id?: string | null
          status?: string
          titulo?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "atividades_fazenda_id_fkey"
            columns: ["fazenda_id"]
            isOneToOne: false
            referencedRelation: "fazendas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "atividades_setor_id_fkey"
            columns: ["setor_id"]
            isOneToOne: false
            referencedRelation: "setores"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_log: {
        Row: {
          acao: string
          alteracoes: Json | null
          criado_em: string | null
          dados_antigos: Json | null
          dados_novos: Json | null
          dispositivo_id: string | null
          fazenda_id: string | null
          id: string
          impersonated_by: string | null
          ip: string | null
          ip_address: string | null
          is_impersonation: boolean
          is_soft_delete: boolean
          operacao: string | null
          origin_page: string | null
          registro_id: string | null
          source_app: string | null
          tabela: string | null
          transaction_id: number | null
          user_agent: string | null
          usuario_email: string | null
          usuario_id: string | null
          usuario_nome: string | null
          valor_anterior: Json | null
          valor_novo: Json | null
        }
        Insert: {
          acao: string
          alteracoes?: Json | null
          criado_em?: string | null
          dados_antigos?: Json | null
          dados_novos?: Json | null
          dispositivo_id?: string | null
          fazenda_id?: string | null
          id?: string
          impersonated_by?: string | null
          ip?: string | null
          ip_address?: string | null
          is_impersonation?: boolean
          is_soft_delete?: boolean
          operacao?: string | null
          origin_page?: string | null
          registro_id?: string | null
          source_app?: string | null
          tabela?: string | null
          transaction_id?: number | null
          user_agent?: string | null
          usuario_email?: string | null
          usuario_id?: string | null
          usuario_nome?: string | null
          valor_anterior?: Json | null
          valor_novo?: Json | null
        }
        Update: {
          acao?: string
          alteracoes?: Json | null
          criado_em?: string | null
          dados_antigos?: Json | null
          dados_novos?: Json | null
          dispositivo_id?: string | null
          fazenda_id?: string | null
          id?: string
          impersonated_by?: string | null
          ip?: string | null
          ip_address?: string | null
          is_impersonation?: boolean
          is_soft_delete?: boolean
          operacao?: string | null
          origin_page?: string | null
          registro_id?: string | null
          source_app?: string | null
          tabela?: string | null
          transaction_id?: number | null
          user_agent?: string | null
          usuario_email?: string | null
          usuario_id?: string | null
          usuario_nome?: string | null
          valor_anterior?: Json | null
          valor_novo?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_log_dispositivo_id_fkey"
            columns: ["dispositivo_id"]
            isOneToOne: false
            referencedRelation: "dispositivos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_log_fazenda_id_fkey"
            columns: ["fazenda_id"]
            isOneToOne: false
            referencedRelation: "fazendas"
            referencedColumns: ["id"]
          },
        ]
      }
      backup_consumo_guanabara_ate_2007: {
        Row: {
          consumo_medio_30dias_kg_mn: number | null
          consumo_medio_30dias_kg_ms: number | null
          consumo_medio_30dias_percent_pv: number | null
          consumo_medio_geral_kg_mn: number | null
          consumo_medio_geral_kg_ms: number | null
          consumo_medio_geral_percent_pv: number | null
          custo_medio_reais_cab_dia: number | null
          data: string | null
          fazenda_id: string | null
          formulacao: string | null
          id: string | null
          lote: string | null
        }
        Insert: {
          consumo_medio_30dias_kg_mn?: number | null
          consumo_medio_30dias_kg_ms?: number | null
          consumo_medio_30dias_percent_pv?: number | null
          consumo_medio_geral_kg_mn?: number | null
          consumo_medio_geral_kg_ms?: number | null
          consumo_medio_geral_percent_pv?: number | null
          custo_medio_reais_cab_dia?: number | null
          data?: string | null
          fazenda_id?: string | null
          formulacao?: string | null
          id?: string | null
          lote?: string | null
        }
        Update: {
          consumo_medio_30dias_kg_mn?: number | null
          consumo_medio_30dias_kg_ms?: number | null
          consumo_medio_30dias_percent_pv?: number | null
          consumo_medio_geral_kg_mn?: number | null
          consumo_medio_geral_kg_ms?: number | null
          consumo_medio_geral_percent_pv?: number | null
          custo_medio_reais_cab_dia?: number | null
          data?: string | null
          fazenda_id?: string | null
          formulacao?: string | null
          id?: string | null
          lote?: string | null
        }
        Relationships: []
      }
      backup_consumo_suplementacao_20260730: {
        Row: {
          backup_em: string | null
          consumo_medio_30dias_kg_mn: number | null
          consumo_medio_30dias_kg_ms: number | null
          consumo_medio_30dias_percent_pv: number | null
          consumo_medio_geral_kg_mn: number | null
          consumo_medio_geral_kg_ms: number | null
          consumo_medio_geral_percent_pv: number | null
          custo_medio_reais_cab_dia: number | null
          data: string | null
          fazenda_id: string | null
          formulacao: string | null
          id: string | null
          kg_cocho: number | null
          lote_id: string | null
          n_cabecas: number | null
          peso_vivo_kg: number | null
          qtd_bezerros: number | null
          updated_at: string | null
        }
        Insert: {
          backup_em?: string | null
          consumo_medio_30dias_kg_mn?: number | null
          consumo_medio_30dias_kg_ms?: number | null
          consumo_medio_30dias_percent_pv?: number | null
          consumo_medio_geral_kg_mn?: number | null
          consumo_medio_geral_kg_ms?: number | null
          consumo_medio_geral_percent_pv?: number | null
          custo_medio_reais_cab_dia?: number | null
          data?: string | null
          fazenda_id?: string | null
          formulacao?: string | null
          id?: string | null
          kg_cocho?: number | null
          lote_id?: string | null
          n_cabecas?: number | null
          peso_vivo_kg?: number | null
          qtd_bezerros?: number | null
          updated_at?: string | null
        }
        Update: {
          backup_em?: string | null
          consumo_medio_30dias_kg_mn?: number | null
          consumo_medio_30dias_kg_ms?: number | null
          consumo_medio_30dias_percent_pv?: number | null
          consumo_medio_geral_kg_mn?: number | null
          consumo_medio_geral_kg_ms?: number | null
          consumo_medio_geral_percent_pv?: number | null
          custo_medio_reais_cab_dia?: number | null
          data?: string | null
          fazenda_id?: string | null
          formulacao?: string | null
          id?: string | null
          kg_cocho?: number | null
          lote_id?: string | null
          n_cabecas?: number | null
          peso_vivo_kg?: number | null
          qtd_bezerros?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      backup_estorno_lote_categorias_20260918: {
        Row: {
          abate: number | null
          agio_percent: number | null
          ativo: boolean | null
          categoria: string | null
          categoria_origem_id: string | null
          consumo: number | null
          consumo_meta_porcentagem_pesovivo: number | null
          created_at: string | null
          custo_comissao_reais_cab: number | null
          custo_frete_reais_cab: number | null
          custo_identificacao_rastreabilidade_reais_cab: number | null
          custo_operacional_reais_cab_dia: number | null
          custo_sanidade_reais_cab: number | null
          custo_total_entrada_reais_cab: number | null
          custo_total_entrada_reais_lote: number | null
          data_ajuste_peso: string | null
          data_fim: string | null
          data_meta_projetada: string | null
          data_notificacao_meta: string | null
          data_notificacao_periodo: string | null
          data_pesagem: string | null
          dias_restantes_meta: number | null
          estrategia_nutricional: string | null
          faturamento_projetado_reais_lote_categoria: number | null
          formulacao_id: string | null
          gmd: string | null
          id: string | null
          idade: number | null
          lote_id: string | null
          margem_lucro_percent: number | null
          morte: number | null
          periodo: number | null
          peso_entrada_arrobas: number | null
          peso_entrada_kg_cab: number | null
          peso_venda_meta_arroba: number | null
          peso_vivo_atual_arroba_cab: number | null
          peso_vivo_atual_kg_cab: number | null
          peso_vivo_meta_kg_cab: number | null
          preco_custo_cab: number | null
          preco_custo_reais_arroba: number | null
          preco_entrada_reais_arroba: number | null
          preco_entrada_reais_cab: number | null
          preco_entrada_reais_kg: number | null
          preco_venda_projetado_reais_arroba: number | null
          preco_venda_sugerido_cab: number | null
          producao_atual_arroba_cab: number | null
          producao_projetada_arroba_cab: number | null
          qtd_bezerros: number | null
          quant_atual: number | null
          quant_inicial: number | null
          raca: string | null
          rc_atual: number | null
          rc_final: number | null
          rc_inicial: number | null
          sexo: string | null
          transf_entrada: number | null
          transf_saida: number | null
          updated_at: string | null
          venda_total_arroba_lote_categoria: number | null
        }
        Insert: {
          abate?: number | null
          agio_percent?: number | null
          ativo?: boolean | null
          categoria?: string | null
          categoria_origem_id?: string | null
          consumo?: number | null
          consumo_meta_porcentagem_pesovivo?: number | null
          created_at?: string | null
          custo_comissao_reais_cab?: number | null
          custo_frete_reais_cab?: number | null
          custo_identificacao_rastreabilidade_reais_cab?: number | null
          custo_operacional_reais_cab_dia?: number | null
          custo_sanidade_reais_cab?: number | null
          custo_total_entrada_reais_cab?: number | null
          custo_total_entrada_reais_lote?: number | null
          data_ajuste_peso?: string | null
          data_fim?: string | null
          data_meta_projetada?: string | null
          data_notificacao_meta?: string | null
          data_notificacao_periodo?: string | null
          data_pesagem?: string | null
          dias_restantes_meta?: number | null
          estrategia_nutricional?: string | null
          faturamento_projetado_reais_lote_categoria?: number | null
          formulacao_id?: string | null
          gmd?: string | null
          id?: string | null
          idade?: number | null
          lote_id?: string | null
          margem_lucro_percent?: number | null
          morte?: number | null
          periodo?: number | null
          peso_entrada_arrobas?: number | null
          peso_entrada_kg_cab?: number | null
          peso_venda_meta_arroba?: number | null
          peso_vivo_atual_arroba_cab?: number | null
          peso_vivo_atual_kg_cab?: number | null
          peso_vivo_meta_kg_cab?: number | null
          preco_custo_cab?: number | null
          preco_custo_reais_arroba?: number | null
          preco_entrada_reais_arroba?: number | null
          preco_entrada_reais_cab?: number | null
          preco_entrada_reais_kg?: number | null
          preco_venda_projetado_reais_arroba?: number | null
          preco_venda_sugerido_cab?: number | null
          producao_atual_arroba_cab?: number | null
          producao_projetada_arroba_cab?: number | null
          qtd_bezerros?: number | null
          quant_atual?: number | null
          quant_inicial?: number | null
          raca?: string | null
          rc_atual?: number | null
          rc_final?: number | null
          rc_inicial?: number | null
          sexo?: string | null
          transf_entrada?: number | null
          transf_saida?: number | null
          updated_at?: string | null
          venda_total_arroba_lote_categoria?: number | null
        }
        Update: {
          abate?: number | null
          agio_percent?: number | null
          ativo?: boolean | null
          categoria?: string | null
          categoria_origem_id?: string | null
          consumo?: number | null
          consumo_meta_porcentagem_pesovivo?: number | null
          created_at?: string | null
          custo_comissao_reais_cab?: number | null
          custo_frete_reais_cab?: number | null
          custo_identificacao_rastreabilidade_reais_cab?: number | null
          custo_operacional_reais_cab_dia?: number | null
          custo_sanidade_reais_cab?: number | null
          custo_total_entrada_reais_cab?: number | null
          custo_total_entrada_reais_lote?: number | null
          data_ajuste_peso?: string | null
          data_fim?: string | null
          data_meta_projetada?: string | null
          data_notificacao_meta?: string | null
          data_notificacao_periodo?: string | null
          data_pesagem?: string | null
          dias_restantes_meta?: number | null
          estrategia_nutricional?: string | null
          faturamento_projetado_reais_lote_categoria?: number | null
          formulacao_id?: string | null
          gmd?: string | null
          id?: string | null
          idade?: number | null
          lote_id?: string | null
          margem_lucro_percent?: number | null
          morte?: number | null
          periodo?: number | null
          peso_entrada_arrobas?: number | null
          peso_entrada_kg_cab?: number | null
          peso_venda_meta_arroba?: number | null
          peso_vivo_atual_arroba_cab?: number | null
          peso_vivo_atual_kg_cab?: number | null
          peso_vivo_meta_kg_cab?: number | null
          preco_custo_cab?: number | null
          preco_custo_reais_arroba?: number | null
          preco_entrada_reais_arroba?: number | null
          preco_entrada_reais_cab?: number | null
          preco_entrada_reais_kg?: number | null
          preco_venda_projetado_reais_arroba?: number | null
          preco_venda_sugerido_cab?: number | null
          producao_atual_arroba_cab?: number | null
          producao_projetada_arroba_cab?: number | null
          qtd_bezerros?: number | null
          quant_atual?: number | null
          quant_inicial?: number | null
          raca?: string | null
          rc_atual?: number | null
          rc_final?: number | null
          rc_inicial?: number | null
          sexo?: string | null
          transf_entrada?: number | null
          transf_saida?: number | null
          updated_at?: string | null
          venda_total_arroba_lote_categoria?: number | null
        }
        Relationships: []
      }
      backup_estorno_movimentacao_20260918: {
        Row: {
          brinco: string | null
          categoria: string | null
          causa_observacao: string | null
          chip: string | null
          created_at: string | null
          data: string | null
          deleted_at: string | null
          destino: string | null
          dispositivo_id: string | null
          equipe: number | null
          equipe_nomes: Json | null
          fazenda_destino_id: string | null
          fazenda_id: string | null
          id: string | null
          idade: number | null
          individuo_id: string | null
          local_id: string | null
          lote_destino_id: string | null
          lote_origem: string | null
          lote_origem_id: string | null
          motivo_movimentacao:
            | Database["public"]["Enums"]["tipo_movimentacao_motivo"]
            | null
          nome_usuario: string | null
          numero_cabecas: number | null
          peso_vivo_atual_kg: number | null
          raca: string | null
          responsavel: string | null
          sexo: string | null
          subtipo:
            | Database["public"]["Enums"]["tipo_movimentacao_subtipo"]
            | null
          sync_status: string | null
          tipo_entrada: string | null
          tipo_saida: string | null
          updated_at: string | null
          version: number | null
        }
        Insert: {
          brinco?: string | null
          categoria?: string | null
          causa_observacao?: string | null
          chip?: string | null
          created_at?: string | null
          data?: string | null
          deleted_at?: string | null
          destino?: string | null
          dispositivo_id?: string | null
          equipe?: number | null
          equipe_nomes?: Json | null
          fazenda_destino_id?: string | null
          fazenda_id?: string | null
          id?: string | null
          idade?: number | null
          individuo_id?: string | null
          local_id?: string | null
          lote_destino_id?: string | null
          lote_origem?: string | null
          lote_origem_id?: string | null
          motivo_movimentacao?:
            | Database["public"]["Enums"]["tipo_movimentacao_motivo"]
            | null
          nome_usuario?: string | null
          numero_cabecas?: number | null
          peso_vivo_atual_kg?: number | null
          raca?: string | null
          responsavel?: string | null
          sexo?: string | null
          subtipo?:
            | Database["public"]["Enums"]["tipo_movimentacao_subtipo"]
            | null
          sync_status?: string | null
          tipo_entrada?: string | null
          tipo_saida?: string | null
          updated_at?: string | null
          version?: number | null
        }
        Update: {
          brinco?: string | null
          categoria?: string | null
          causa_observacao?: string | null
          chip?: string | null
          created_at?: string | null
          data?: string | null
          deleted_at?: string | null
          destino?: string | null
          dispositivo_id?: string | null
          equipe?: number | null
          equipe_nomes?: Json | null
          fazenda_destino_id?: string | null
          fazenda_id?: string | null
          id?: string | null
          idade?: number | null
          individuo_id?: string | null
          local_id?: string | null
          lote_destino_id?: string | null
          lote_origem?: string | null
          lote_origem_id?: string | null
          motivo_movimentacao?:
            | Database["public"]["Enums"]["tipo_movimentacao_motivo"]
            | null
          nome_usuario?: string | null
          numero_cabecas?: number | null
          peso_vivo_atual_kg?: number | null
          raca?: string | null
          responsavel?: string | null
          sexo?: string | null
          subtipo?:
            | Database["public"]["Enums"]["tipo_movimentacao_subtipo"]
            | null
          sync_status?: string | null
          tipo_entrada?: string | null
          tipo_saida?: string | null
          updated_at?: string | null
          version?: number | null
        }
        Relationships: []
      }
      backup_estorno_suplementacao_20260918: {
        Row: {
          categorias: string | null
          checklist: Json | null
          consumo_medio_30dias_kg_mn: number | null
          consumo_medio_30dias_kg_ms: number | null
          consumo_medio_30dias_percent_pv: number | null
          consumo_medio_geral_kg_mn: number | null
          consumo_medio_geral_kg_ms: number | null
          consumo_medio_geral_percent_pv: number | null
          created_at: string | null
          custo_medio_reais_cab_dia: number | null
          data: string | null
          deleted_at: string | null
          dispositivo_id: string | null
          escore_fezes: string | null
          espacamento_cocho_cm_cab: number | null
          espacamento_cocho_detalhes: Json | null
          espacamento_cocho_ideal: Json | null
          espacamento_cocho_obs: string | null
          fazenda_id: string | null
          formulacao: string | null
          formulacao_id: string | null
          id: string | null
          kg_cocho: number | null
          kg_deposito: number | null
          leitura: string | null
          local_id: string | null
          lote: string | null
          lote_id: string | null
          n_cabecas: number | null
          nome_usuario: string | null
          pasto: string | null
          pasto_id: string | null
          peso_vivo_kg: number | null
          qtd_bezerros: number | null
          sync_status: string | null
          tratador: string | null
          updated_at: string | null
          version: number | null
        }
        Insert: {
          categorias?: string | null
          checklist?: Json | null
          consumo_medio_30dias_kg_mn?: number | null
          consumo_medio_30dias_kg_ms?: number | null
          consumo_medio_30dias_percent_pv?: number | null
          consumo_medio_geral_kg_mn?: number | null
          consumo_medio_geral_kg_ms?: number | null
          consumo_medio_geral_percent_pv?: number | null
          created_at?: string | null
          custo_medio_reais_cab_dia?: number | null
          data?: string | null
          deleted_at?: string | null
          dispositivo_id?: string | null
          escore_fezes?: string | null
          espacamento_cocho_cm_cab?: number | null
          espacamento_cocho_detalhes?: Json | null
          espacamento_cocho_ideal?: Json | null
          espacamento_cocho_obs?: string | null
          fazenda_id?: string | null
          formulacao?: string | null
          formulacao_id?: string | null
          id?: string | null
          kg_cocho?: number | null
          kg_deposito?: number | null
          leitura?: string | null
          local_id?: string | null
          lote?: string | null
          lote_id?: string | null
          n_cabecas?: number | null
          nome_usuario?: string | null
          pasto?: string | null
          pasto_id?: string | null
          peso_vivo_kg?: number | null
          qtd_bezerros?: number | null
          sync_status?: string | null
          tratador?: string | null
          updated_at?: string | null
          version?: number | null
        }
        Update: {
          categorias?: string | null
          checklist?: Json | null
          consumo_medio_30dias_kg_mn?: number | null
          consumo_medio_30dias_kg_ms?: number | null
          consumo_medio_30dias_percent_pv?: number | null
          consumo_medio_geral_kg_mn?: number | null
          consumo_medio_geral_kg_ms?: number | null
          consumo_medio_geral_percent_pv?: number | null
          created_at?: string | null
          custo_medio_reais_cab_dia?: number | null
          data?: string | null
          deleted_at?: string | null
          dispositivo_id?: string | null
          escore_fezes?: string | null
          espacamento_cocho_cm_cab?: number | null
          espacamento_cocho_detalhes?: Json | null
          espacamento_cocho_ideal?: Json | null
          espacamento_cocho_obs?: string | null
          fazenda_id?: string | null
          formulacao?: string | null
          formulacao_id?: string | null
          id?: string | null
          kg_cocho?: number | null
          kg_deposito?: number | null
          leitura?: string | null
          local_id?: string | null
          lote?: string | null
          lote_id?: string | null
          n_cabecas?: number | null
          nome_usuario?: string | null
          pasto?: string | null
          pasto_id?: string | null
          peso_vivo_kg?: number | null
          qtd_bezerros?: number | null
          sync_status?: string | null
          tratador?: string | null
          updated_at?: string | null
          version?: number | null
        }
        Relationships: []
      }
      backup_lote_categorias_20260914: {
        Row: {
          abate: number | null
          agio_percent: number | null
          ativo: boolean | null
          backup_em: string | null
          categoria: string | null
          categoria_origem_id: string | null
          consumo: number | null
          consumo_meta_porcentagem_pesovivo: number | null
          created_at: string | null
          custo_comissao_reais_cab: number | null
          custo_frete_reais_cab: number | null
          custo_identificacao_rastreabilidade_reais_cab: number | null
          custo_operacional_reais_cab_dia: number | null
          custo_sanidade_reais_cab: number | null
          custo_total_entrada_reais_cab: number | null
          custo_total_entrada_reais_lote: number | null
          data_ajuste_peso: string | null
          data_fim: string | null
          data_meta_projetada: string | null
          data_notificacao_meta: string | null
          data_notificacao_periodo: string | null
          data_pesagem: string | null
          dias_restantes_meta: number | null
          estrategia_nutricional: string | null
          faturamento_projetado_reais_lote_categoria: number | null
          formulacao_id: string | null
          gmd: string | null
          id: string | null
          idade: number | null
          lote_id: string | null
          margem_lucro_percent: number | null
          morte: number | null
          periodo: number | null
          peso_entrada_arrobas: number | null
          peso_entrada_kg_cab: number | null
          peso_venda_meta_arroba: number | null
          peso_vivo_atual_arroba_cab: number | null
          peso_vivo_atual_kg_cab: number | null
          peso_vivo_meta_kg_cab: number | null
          preco_custo_cab: number | null
          preco_custo_reais_arroba: number | null
          preco_entrada_reais_arroba: number | null
          preco_entrada_reais_cab: number | null
          preco_entrada_reais_kg: number | null
          preco_venda_projetado_reais_arroba: number | null
          preco_venda_sugerido_cab: number | null
          producao_atual_arroba_cab: number | null
          producao_projetada_arroba_cab: number | null
          qtd_bezerros: number | null
          quant_atual: number | null
          quant_inicial: number | null
          raca: string | null
          rc_atual: number | null
          rc_final: number | null
          rc_inicial: number | null
          sexo: string | null
          transf_entrada: number | null
          transf_saida: number | null
          updated_at: string | null
          venda_total_arroba_lote_categoria: number | null
        }
        Insert: {
          abate?: number | null
          agio_percent?: number | null
          ativo?: boolean | null
          backup_em?: string | null
          categoria?: string | null
          categoria_origem_id?: string | null
          consumo?: number | null
          consumo_meta_porcentagem_pesovivo?: number | null
          created_at?: string | null
          custo_comissao_reais_cab?: number | null
          custo_frete_reais_cab?: number | null
          custo_identificacao_rastreabilidade_reais_cab?: number | null
          custo_operacional_reais_cab_dia?: number | null
          custo_sanidade_reais_cab?: number | null
          custo_total_entrada_reais_cab?: number | null
          custo_total_entrada_reais_lote?: number | null
          data_ajuste_peso?: string | null
          data_fim?: string | null
          data_meta_projetada?: string | null
          data_notificacao_meta?: string | null
          data_notificacao_periodo?: string | null
          data_pesagem?: string | null
          dias_restantes_meta?: number | null
          estrategia_nutricional?: string | null
          faturamento_projetado_reais_lote_categoria?: number | null
          formulacao_id?: string | null
          gmd?: string | null
          id?: string | null
          idade?: number | null
          lote_id?: string | null
          margem_lucro_percent?: number | null
          morte?: number | null
          periodo?: number | null
          peso_entrada_arrobas?: number | null
          peso_entrada_kg_cab?: number | null
          peso_venda_meta_arroba?: number | null
          peso_vivo_atual_arroba_cab?: number | null
          peso_vivo_atual_kg_cab?: number | null
          peso_vivo_meta_kg_cab?: number | null
          preco_custo_cab?: number | null
          preco_custo_reais_arroba?: number | null
          preco_entrada_reais_arroba?: number | null
          preco_entrada_reais_cab?: number | null
          preco_entrada_reais_kg?: number | null
          preco_venda_projetado_reais_arroba?: number | null
          preco_venda_sugerido_cab?: number | null
          producao_atual_arroba_cab?: number | null
          producao_projetada_arroba_cab?: number | null
          qtd_bezerros?: number | null
          quant_atual?: number | null
          quant_inicial?: number | null
          raca?: string | null
          rc_atual?: number | null
          rc_final?: number | null
          rc_inicial?: number | null
          sexo?: string | null
          transf_entrada?: number | null
          transf_saida?: number | null
          updated_at?: string | null
          venda_total_arroba_lote_categoria?: number | null
        }
        Update: {
          abate?: number | null
          agio_percent?: number | null
          ativo?: boolean | null
          backup_em?: string | null
          categoria?: string | null
          categoria_origem_id?: string | null
          consumo?: number | null
          consumo_meta_porcentagem_pesovivo?: number | null
          created_at?: string | null
          custo_comissao_reais_cab?: number | null
          custo_frete_reais_cab?: number | null
          custo_identificacao_rastreabilidade_reais_cab?: number | null
          custo_operacional_reais_cab_dia?: number | null
          custo_sanidade_reais_cab?: number | null
          custo_total_entrada_reais_cab?: number | null
          custo_total_entrada_reais_lote?: number | null
          data_ajuste_peso?: string | null
          data_fim?: string | null
          data_meta_projetada?: string | null
          data_notificacao_meta?: string | null
          data_notificacao_periodo?: string | null
          data_pesagem?: string | null
          dias_restantes_meta?: number | null
          estrategia_nutricional?: string | null
          faturamento_projetado_reais_lote_categoria?: number | null
          formulacao_id?: string | null
          gmd?: string | null
          id?: string | null
          idade?: number | null
          lote_id?: string | null
          margem_lucro_percent?: number | null
          morte?: number | null
          periodo?: number | null
          peso_entrada_arrobas?: number | null
          peso_entrada_kg_cab?: number | null
          peso_venda_meta_arroba?: number | null
          peso_vivo_atual_arroba_cab?: number | null
          peso_vivo_atual_kg_cab?: number | null
          peso_vivo_meta_kg_cab?: number | null
          preco_custo_cab?: number | null
          preco_custo_reais_arroba?: number | null
          preco_entrada_reais_arroba?: number | null
          preco_entrada_reais_cab?: number | null
          preco_entrada_reais_kg?: number | null
          preco_venda_projetado_reais_arroba?: number | null
          preco_venda_sugerido_cab?: number | null
          producao_atual_arroba_cab?: number | null
          producao_projetada_arroba_cab?: number | null
          qtd_bezerros?: number | null
          quant_atual?: number | null
          quant_inicial?: number | null
          raca?: string | null
          rc_atual?: number | null
          rc_final?: number | null
          rc_inicial?: number | null
          sexo?: string | null
          transf_entrada?: number | null
          transf_saida?: number | null
          updated_at?: string | null
          venda_total_arroba_lote_categoria?: number | null
        }
        Relationships: []
      }
      backup_lote_categorias_20260914_sistemico: {
        Row: {
          abate: number | null
          agio_percent: number | null
          ativo: boolean | null
          backup_em: string | null
          categoria: string | null
          categoria_origem_id: string | null
          consumo: number | null
          consumo_meta_porcentagem_pesovivo: number | null
          created_at: string | null
          custo_comissao_reais_cab: number | null
          custo_frete_reais_cab: number | null
          custo_identificacao_rastreabilidade_reais_cab: number | null
          custo_operacional_reais_cab_dia: number | null
          custo_sanidade_reais_cab: number | null
          custo_total_entrada_reais_cab: number | null
          custo_total_entrada_reais_lote: number | null
          data_ajuste_peso: string | null
          data_fim: string | null
          data_meta_projetada: string | null
          data_notificacao_meta: string | null
          data_notificacao_periodo: string | null
          data_pesagem: string | null
          dias_restantes_meta: number | null
          estrategia_nutricional: string | null
          faturamento_projetado_reais_lote_categoria: number | null
          formulacao_id: string | null
          gmd: string | null
          id: string | null
          idade: number | null
          lote_id: string | null
          margem_lucro_percent: number | null
          morte: number | null
          periodo: number | null
          peso_entrada_arrobas: number | null
          peso_entrada_kg_cab: number | null
          peso_venda_meta_arroba: number | null
          peso_vivo_atual_arroba_cab: number | null
          peso_vivo_atual_kg_cab: number | null
          peso_vivo_meta_kg_cab: number | null
          preco_custo_cab: number | null
          preco_custo_reais_arroba: number | null
          preco_entrada_reais_arroba: number | null
          preco_entrada_reais_cab: number | null
          preco_entrada_reais_kg: number | null
          preco_venda_projetado_reais_arroba: number | null
          preco_venda_sugerido_cab: number | null
          producao_atual_arroba_cab: number | null
          producao_projetada_arroba_cab: number | null
          qtd_bezerros: number | null
          quant_atual: number | null
          quant_inicial: number | null
          raca: string | null
          rc_atual: number | null
          rc_final: number | null
          rc_inicial: number | null
          sexo: string | null
          transf_entrada: number | null
          transf_saida: number | null
          updated_at: string | null
          venda_total_arroba_lote_categoria: number | null
        }
        Insert: {
          abate?: number | null
          agio_percent?: number | null
          ativo?: boolean | null
          backup_em?: string | null
          categoria?: string | null
          categoria_origem_id?: string | null
          consumo?: number | null
          consumo_meta_porcentagem_pesovivo?: number | null
          created_at?: string | null
          custo_comissao_reais_cab?: number | null
          custo_frete_reais_cab?: number | null
          custo_identificacao_rastreabilidade_reais_cab?: number | null
          custo_operacional_reais_cab_dia?: number | null
          custo_sanidade_reais_cab?: number | null
          custo_total_entrada_reais_cab?: number | null
          custo_total_entrada_reais_lote?: number | null
          data_ajuste_peso?: string | null
          data_fim?: string | null
          data_meta_projetada?: string | null
          data_notificacao_meta?: string | null
          data_notificacao_periodo?: string | null
          data_pesagem?: string | null
          dias_restantes_meta?: number | null
          estrategia_nutricional?: string | null
          faturamento_projetado_reais_lote_categoria?: number | null
          formulacao_id?: string | null
          gmd?: string | null
          id?: string | null
          idade?: number | null
          lote_id?: string | null
          margem_lucro_percent?: number | null
          morte?: number | null
          periodo?: number | null
          peso_entrada_arrobas?: number | null
          peso_entrada_kg_cab?: number | null
          peso_venda_meta_arroba?: number | null
          peso_vivo_atual_arroba_cab?: number | null
          peso_vivo_atual_kg_cab?: number | null
          peso_vivo_meta_kg_cab?: number | null
          preco_custo_cab?: number | null
          preco_custo_reais_arroba?: number | null
          preco_entrada_reais_arroba?: number | null
          preco_entrada_reais_cab?: number | null
          preco_entrada_reais_kg?: number | null
          preco_venda_projetado_reais_arroba?: number | null
          preco_venda_sugerido_cab?: number | null
          producao_atual_arroba_cab?: number | null
          producao_projetada_arroba_cab?: number | null
          qtd_bezerros?: number | null
          quant_atual?: number | null
          quant_inicial?: number | null
          raca?: string | null
          rc_atual?: number | null
          rc_final?: number | null
          rc_inicial?: number | null
          sexo?: string | null
          transf_entrada?: number | null
          transf_saida?: number | null
          updated_at?: string | null
          venda_total_arroba_lote_categoria?: number | null
        }
        Update: {
          abate?: number | null
          agio_percent?: number | null
          ativo?: boolean | null
          backup_em?: string | null
          categoria?: string | null
          categoria_origem_id?: string | null
          consumo?: number | null
          consumo_meta_porcentagem_pesovivo?: number | null
          created_at?: string | null
          custo_comissao_reais_cab?: number | null
          custo_frete_reais_cab?: number | null
          custo_identificacao_rastreabilidade_reais_cab?: number | null
          custo_operacional_reais_cab_dia?: number | null
          custo_sanidade_reais_cab?: number | null
          custo_total_entrada_reais_cab?: number | null
          custo_total_entrada_reais_lote?: number | null
          data_ajuste_peso?: string | null
          data_fim?: string | null
          data_meta_projetada?: string | null
          data_notificacao_meta?: string | null
          data_notificacao_periodo?: string | null
          data_pesagem?: string | null
          dias_restantes_meta?: number | null
          estrategia_nutricional?: string | null
          faturamento_projetado_reais_lote_categoria?: number | null
          formulacao_id?: string | null
          gmd?: string | null
          id?: string | null
          idade?: number | null
          lote_id?: string | null
          margem_lucro_percent?: number | null
          morte?: number | null
          periodo?: number | null
          peso_entrada_arrobas?: number | null
          peso_entrada_kg_cab?: number | null
          peso_venda_meta_arroba?: number | null
          peso_vivo_atual_arroba_cab?: number | null
          peso_vivo_atual_kg_cab?: number | null
          peso_vivo_meta_kg_cab?: number | null
          preco_custo_cab?: number | null
          preco_custo_reais_arroba?: number | null
          preco_entrada_reais_arroba?: number | null
          preco_entrada_reais_cab?: number | null
          preco_entrada_reais_kg?: number | null
          preco_venda_projetado_reais_arroba?: number | null
          preco_venda_sugerido_cab?: number | null
          producao_atual_arroba_cab?: number | null
          producao_projetada_arroba_cab?: number | null
          qtd_bezerros?: number | null
          quant_atual?: number | null
          quant_inicial?: number | null
          raca?: string | null
          rc_atual?: number | null
          rc_final?: number | null
          rc_inicial?: number | null
          sexo?: string | null
          transf_entrada?: number | null
          transf_saida?: number | null
          updated_at?: string | null
          venda_total_arroba_lote_categoria?: number | null
        }
        Relationships: []
      }
      backup_lote_categorias_guanabara_20260731: {
        Row: {
          abate: number | null
          agio_percent: number | null
          ativo: boolean | null
          categoria: string | null
          categoria_origem_id: string | null
          consumo: number | null
          consumo_meta_porcentagem_pesovivo: number | null
          created_at: string | null
          custo_comissao_reais_cab: number | null
          custo_frete_reais_cab: number | null
          custo_identificacao_rastreabilidade_reais_cab: number | null
          custo_operacional_reais_cab_dia: number | null
          custo_sanidade_reais_cab: number | null
          custo_total_entrada_reais_cab: number | null
          custo_total_entrada_reais_lote: number | null
          data_ajuste_peso: string | null
          data_fim: string | null
          data_meta_projetada: string | null
          data_pesagem: string | null
          dias_restantes_meta: number | null
          estrategia_nutricional: string | null
          faturamento_projetado_reais_lote_categoria: number | null
          formulacao_id: string | null
          gmd: string | null
          id: string | null
          idade: number | null
          lote_ativo: boolean | null
          lote_id: string | null
          lote_nome: string | null
          margem_lucro_percent: number | null
          morte: number | null
          periodo: number | null
          peso_entrada_arrobas: number | null
          peso_entrada_kg_cab: number | null
          peso_venda_meta_arroba: number | null
          peso_vivo_atual_arroba_cab: number | null
          peso_vivo_atual_kg_cab: number | null
          peso_vivo_meta_kg_cab: number | null
          preco_custo_cab: number | null
          preco_custo_reais_arroba: number | null
          preco_entrada_reais_arroba: number | null
          preco_entrada_reais_cab: number | null
          preco_entrada_reais_kg: number | null
          preco_venda_projetado_reais_arroba: number | null
          preco_venda_sugerido_cab: number | null
          producao_atual_arroba_cab: number | null
          producao_projetada_arroba_cab: number | null
          qtd_bezerros: number | null
          quant_atual: number | null
          quant_inicial: number | null
          raca: string | null
          rc_atual: number | null
          rc_final: number | null
          rc_inicial: number | null
          sexo: string | null
          transf_entrada: number | null
          transf_saida: number | null
          updated_at: string | null
          venda_total_arroba_lote_categoria: number | null
        }
        Insert: {
          abate?: number | null
          agio_percent?: number | null
          ativo?: boolean | null
          categoria?: string | null
          categoria_origem_id?: string | null
          consumo?: number | null
          consumo_meta_porcentagem_pesovivo?: number | null
          created_at?: string | null
          custo_comissao_reais_cab?: number | null
          custo_frete_reais_cab?: number | null
          custo_identificacao_rastreabilidade_reais_cab?: number | null
          custo_operacional_reais_cab_dia?: number | null
          custo_sanidade_reais_cab?: number | null
          custo_total_entrada_reais_cab?: number | null
          custo_total_entrada_reais_lote?: number | null
          data_ajuste_peso?: string | null
          data_fim?: string | null
          data_meta_projetada?: string | null
          data_pesagem?: string | null
          dias_restantes_meta?: number | null
          estrategia_nutricional?: string | null
          faturamento_projetado_reais_lote_categoria?: number | null
          formulacao_id?: string | null
          gmd?: string | null
          id?: string | null
          idade?: number | null
          lote_ativo?: boolean | null
          lote_id?: string | null
          lote_nome?: string | null
          margem_lucro_percent?: number | null
          morte?: number | null
          periodo?: number | null
          peso_entrada_arrobas?: number | null
          peso_entrada_kg_cab?: number | null
          peso_venda_meta_arroba?: number | null
          peso_vivo_atual_arroba_cab?: number | null
          peso_vivo_atual_kg_cab?: number | null
          peso_vivo_meta_kg_cab?: number | null
          preco_custo_cab?: number | null
          preco_custo_reais_arroba?: number | null
          preco_entrada_reais_arroba?: number | null
          preco_entrada_reais_cab?: number | null
          preco_entrada_reais_kg?: number | null
          preco_venda_projetado_reais_arroba?: number | null
          preco_venda_sugerido_cab?: number | null
          producao_atual_arroba_cab?: number | null
          producao_projetada_arroba_cab?: number | null
          qtd_bezerros?: number | null
          quant_atual?: number | null
          quant_inicial?: number | null
          raca?: string | null
          rc_atual?: number | null
          rc_final?: number | null
          rc_inicial?: number | null
          sexo?: string | null
          transf_entrada?: number | null
          transf_saida?: number | null
          updated_at?: string | null
          venda_total_arroba_lote_categoria?: number | null
        }
        Update: {
          abate?: number | null
          agio_percent?: number | null
          ativo?: boolean | null
          categoria?: string | null
          categoria_origem_id?: string | null
          consumo?: number | null
          consumo_meta_porcentagem_pesovivo?: number | null
          created_at?: string | null
          custo_comissao_reais_cab?: number | null
          custo_frete_reais_cab?: number | null
          custo_identificacao_rastreabilidade_reais_cab?: number | null
          custo_operacional_reais_cab_dia?: number | null
          custo_sanidade_reais_cab?: number | null
          custo_total_entrada_reais_cab?: number | null
          custo_total_entrada_reais_lote?: number | null
          data_ajuste_peso?: string | null
          data_fim?: string | null
          data_meta_projetada?: string | null
          data_pesagem?: string | null
          dias_restantes_meta?: number | null
          estrategia_nutricional?: string | null
          faturamento_projetado_reais_lote_categoria?: number | null
          formulacao_id?: string | null
          gmd?: string | null
          id?: string | null
          idade?: number | null
          lote_ativo?: boolean | null
          lote_id?: string | null
          lote_nome?: string | null
          margem_lucro_percent?: number | null
          morte?: number | null
          periodo?: number | null
          peso_entrada_arrobas?: number | null
          peso_entrada_kg_cab?: number | null
          peso_venda_meta_arroba?: number | null
          peso_vivo_atual_arroba_cab?: number | null
          peso_vivo_atual_kg_cab?: number | null
          peso_vivo_meta_kg_cab?: number | null
          preco_custo_cab?: number | null
          preco_custo_reais_arroba?: number | null
          preco_entrada_reais_arroba?: number | null
          preco_entrada_reais_cab?: number | null
          preco_entrada_reais_kg?: number | null
          preco_venda_projetado_reais_arroba?: number | null
          preco_venda_sugerido_cab?: number | null
          producao_atual_arroba_cab?: number | null
          producao_projetada_arroba_cab?: number | null
          qtd_bezerros?: number | null
          quant_atual?: number | null
          quant_inicial?: number | null
          raca?: string | null
          rc_atual?: number | null
          rc_final?: number | null
          rc_inicial?: number | null
          sexo?: string | null
          transf_entrada?: number | null
          transf_saida?: number | null
          updated_at?: string | null
          venda_total_arroba_lote_categoria?: number | null
        }
        Relationships: []
      }
      backup_planos_guanabara_20260731: {
        Row: {
          ativo: boolean | null
          categoria: string | null
          data_ajuste_original: string | null
          data_fim: string | null
          data_inicio_original: string | null
          data_pesagem: string | null
          formulacao_gmd: number | null
          formulacao_id: string | null
          gmd_planejado: number | null
          lote_categoria_id: string | null
          lote_id: string | null
          lote_nome: string | null
          peso_atual_original: number | null
          peso_entrada_kg_cab: number | null
          peso_inicio_original: number | null
          plano_id: string | null
          plano_nome: string | null
        }
        Insert: {
          ativo?: boolean | null
          categoria?: string | null
          data_ajuste_original?: string | null
          data_fim?: string | null
          data_inicio_original?: string | null
          data_pesagem?: string | null
          formulacao_gmd?: number | null
          formulacao_id?: string | null
          gmd_planejado?: number | null
          lote_categoria_id?: string | null
          lote_id?: string | null
          lote_nome?: string | null
          peso_atual_original?: number | null
          peso_entrada_kg_cab?: number | null
          peso_inicio_original?: number | null
          plano_id?: string | null
          plano_nome?: string | null
        }
        Update: {
          ativo?: boolean | null
          categoria?: string | null
          data_ajuste_original?: string | null
          data_fim?: string | null
          data_inicio_original?: string | null
          data_pesagem?: string | null
          formulacao_gmd?: number | null
          formulacao_id?: string | null
          gmd_planejado?: number | null
          lote_categoria_id?: string | null
          lote_id?: string | null
          lote_nome?: string | null
          peso_atual_original?: number | null
          peso_entrada_kg_cab?: number | null
          peso_inicio_original?: number | null
          plano_id?: string | null
          plano_nome?: string | null
        }
        Relationships: []
      }
      backup_planos_nutricionais_guanabara_20260731_v2: {
        Row: {
          ativo: boolean | null
          condicao_migracao: string | null
          created_at: string | null
          data_fim: string | null
          data_inicio: string | null
          fazenda_id: string | null
          formulacao_id: string | null
          gmd_planejado: number | null
          id: string | null
          lote_categoria_id: string | null
          lote_id: string | null
          migracao_automatica: boolean | null
          nome: string | null
          ordem: number | null
          periodo_dias: number | null
          peso_inicio_kg_cab: number | null
          peso_meta_kg: number | null
          rc_inicio: number | null
          updated_at: string | null
        }
        Insert: {
          ativo?: boolean | null
          condicao_migracao?: string | null
          created_at?: string | null
          data_fim?: string | null
          data_inicio?: string | null
          fazenda_id?: string | null
          formulacao_id?: string | null
          gmd_planejado?: number | null
          id?: string | null
          lote_categoria_id?: string | null
          lote_id?: string | null
          migracao_automatica?: boolean | null
          nome?: string | null
          ordem?: number | null
          periodo_dias?: number | null
          peso_inicio_kg_cab?: number | null
          peso_meta_kg?: number | null
          rc_inicio?: number | null
          updated_at?: string | null
        }
        Update: {
          ativo?: boolean | null
          condicao_migracao?: string | null
          created_at?: string | null
          data_fim?: string | null
          data_inicio?: string | null
          fazenda_id?: string | null
          formulacao_id?: string | null
          gmd_planejado?: number | null
          id?: string | null
          lote_categoria_id?: string | null
          lote_id?: string | null
          migracao_automatica?: boolean | null
          nome?: string | null
          ordem?: number | null
          periodo_dias?: number | null
          peso_inicio_kg_cab?: number | null
          peso_meta_kg?: number | null
          rc_inicio?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      backup_planos_snapshots_guanabara_20260731: {
        Row: {
          created_at: string | null
          duracao_dias: number | null
          fazenda_id: string | null
          ganho_peso_total_kg_cab: number | null
          gmd_planejado: number | null
          gmd_realizado: number | null
          id: string | null
          lote_categoria_id: string | null
          metricas_derivadas: Json | null
          mortalidade_percent: number | null
          motivo_migracao: string | null
          plano_anterior_id: string | null
          plano_nutricional_id: string | null
          plano_posterior_id: string | null
          producao_arroba_lote: number | null
          snapshot: Json | null
          tipo_snapshot: string | null
        }
        Insert: {
          created_at?: string | null
          duracao_dias?: number | null
          fazenda_id?: string | null
          ganho_peso_total_kg_cab?: number | null
          gmd_planejado?: number | null
          gmd_realizado?: number | null
          id?: string | null
          lote_categoria_id?: string | null
          metricas_derivadas?: Json | null
          mortalidade_percent?: number | null
          motivo_migracao?: string | null
          plano_anterior_id?: string | null
          plano_nutricional_id?: string | null
          plano_posterior_id?: string | null
          producao_arroba_lote?: number | null
          snapshot?: Json | null
          tipo_snapshot?: string | null
        }
        Update: {
          created_at?: string | null
          duracao_dias?: number | null
          fazenda_id?: string | null
          ganho_peso_total_kg_cab?: number | null
          gmd_planejado?: number | null
          gmd_realizado?: number | null
          id?: string | null
          lote_categoria_id?: string | null
          metricas_derivadas?: Json | null
          mortalidade_percent?: number | null
          motivo_migracao?: string | null
          plano_anterior_id?: string | null
          plano_nutricional_id?: string | null
          plano_posterior_id?: string | null
          producao_arroba_lote?: number | null
          snapshot?: Json | null
          tipo_snapshot?: string | null
        }
        Relationships: []
      }
      backup_registros_suplementacao_consumo_20260811: {
        Row: {
          backup_em: string | null
          consumo_medio_30dias_kg_mn: number | null
          consumo_medio_30dias_kg_ms: number | null
          consumo_medio_30dias_percent_pv: number | null
          consumo_medio_geral_kg_mn: number | null
          consumo_medio_geral_kg_ms: number | null
          consumo_medio_geral_percent_pv: number | null
          custo_medio_reais_cab_dia: number | null
          data: string | null
          fazenda_id: string | null
          formulacao: string | null
          id: string | null
          kg_cocho: number | null
          lote_id: string | null
          n_cabecas: number | null
          peso_vivo_kg: number | null
          qtd_bezerros: number | null
          updated_at: string | null
        }
        Insert: {
          backup_em?: string | null
          consumo_medio_30dias_kg_mn?: number | null
          consumo_medio_30dias_kg_ms?: number | null
          consumo_medio_30dias_percent_pv?: number | null
          consumo_medio_geral_kg_mn?: number | null
          consumo_medio_geral_kg_ms?: number | null
          consumo_medio_geral_percent_pv?: number | null
          custo_medio_reais_cab_dia?: number | null
          data?: string | null
          fazenda_id?: string | null
          formulacao?: string | null
          id?: string | null
          kg_cocho?: number | null
          lote_id?: string | null
          n_cabecas?: number | null
          peso_vivo_kg?: number | null
          qtd_bezerros?: number | null
          updated_at?: string | null
        }
        Update: {
          backup_em?: string | null
          consumo_medio_30dias_kg_mn?: number | null
          consumo_medio_30dias_kg_ms?: number | null
          consumo_medio_30dias_percent_pv?: number | null
          consumo_medio_geral_kg_mn?: number | null
          consumo_medio_geral_kg_ms?: number | null
          consumo_medio_geral_percent_pv?: number | null
          custo_medio_reais_cab_dia?: number | null
          data?: string | null
          fazenda_id?: string | null
          formulacao?: string | null
          id?: string | null
          kg_cocho?: number | null
          lote_id?: string | null
          n_cabecas?: number | null
          peso_vivo_kg?: number | null
          qtd_bezerros?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      backup_registros_suplementacao_guanabara_ate_20260720: {
        Row: {
          categorias: string | null
          checklist: Json | null
          consumo_medio_30dias_kg_mn: number | null
          consumo_medio_30dias_kg_ms: number | null
          consumo_medio_30dias_percent_pv: number | null
          consumo_medio_geral_kg_mn: number | null
          consumo_medio_geral_kg_ms: number | null
          consumo_medio_geral_percent_pv: number | null
          created_at: string | null
          custo_medio_reais_cab_dia: number | null
          data: string | null
          deleted_at: string | null
          dispositivo_id: string | null
          escore_fezes: string | null
          espacamento_cocho_cm_cab: number | null
          espacamento_cocho_detalhes: Json | null
          espacamento_cocho_ideal: Json | null
          espacamento_cocho_obs: string | null
          fazenda_id: string | null
          formulacao: string | null
          id: string | null
          kg_cocho: number | null
          kg_deposito: number | null
          leitura: string | null
          lote: string | null
          lote_id: string | null
          n_cabecas: number | null
          nome_usuario: string | null
          pasto: string | null
          pasto_id: string | null
          peso_vivo_kg: number | null
          qtd_bezerros: number | null
          sync_status: string | null
          tratador: string | null
          updated_at: string | null
          version: number | null
        }
        Insert: {
          categorias?: string | null
          checklist?: Json | null
          consumo_medio_30dias_kg_mn?: number | null
          consumo_medio_30dias_kg_ms?: number | null
          consumo_medio_30dias_percent_pv?: number | null
          consumo_medio_geral_kg_mn?: number | null
          consumo_medio_geral_kg_ms?: number | null
          consumo_medio_geral_percent_pv?: number | null
          created_at?: string | null
          custo_medio_reais_cab_dia?: number | null
          data?: string | null
          deleted_at?: string | null
          dispositivo_id?: string | null
          escore_fezes?: string | null
          espacamento_cocho_cm_cab?: number | null
          espacamento_cocho_detalhes?: Json | null
          espacamento_cocho_ideal?: Json | null
          espacamento_cocho_obs?: string | null
          fazenda_id?: string | null
          formulacao?: string | null
          id?: string | null
          kg_cocho?: number | null
          kg_deposito?: number | null
          leitura?: string | null
          lote?: string | null
          lote_id?: string | null
          n_cabecas?: number | null
          nome_usuario?: string | null
          pasto?: string | null
          pasto_id?: string | null
          peso_vivo_kg?: number | null
          qtd_bezerros?: number | null
          sync_status?: string | null
          tratador?: string | null
          updated_at?: string | null
          version?: number | null
        }
        Update: {
          categorias?: string | null
          checklist?: Json | null
          consumo_medio_30dias_kg_mn?: number | null
          consumo_medio_30dias_kg_ms?: number | null
          consumo_medio_30dias_percent_pv?: number | null
          consumo_medio_geral_kg_mn?: number | null
          consumo_medio_geral_kg_ms?: number | null
          consumo_medio_geral_percent_pv?: number | null
          created_at?: string | null
          custo_medio_reais_cab_dia?: number | null
          data?: string | null
          deleted_at?: string | null
          dispositivo_id?: string | null
          escore_fezes?: string | null
          espacamento_cocho_cm_cab?: number | null
          espacamento_cocho_detalhes?: Json | null
          espacamento_cocho_ideal?: Json | null
          espacamento_cocho_obs?: string | null
          fazenda_id?: string | null
          formulacao?: string | null
          id?: string | null
          kg_cocho?: number | null
          kg_deposito?: number | null
          leitura?: string | null
          lote?: string | null
          lote_id?: string | null
          n_cabecas?: number | null
          nome_usuario?: string | null
          pasto?: string | null
          pasto_id?: string | null
          peso_vivo_kg?: number | null
          qtd_bezerros?: number | null
          sync_status?: string | null
          tratador?: string | null
          updated_at?: string | null
          version?: number | null
        }
        Relationships: []
      }
      bebedouros: {
        Row: {
          ativo: boolean | null
          capacidade: number | null
          created_at: string | null
          data_ultima_limpeza: string | null
          deleted_at: string | null
          fazenda_id: string
          geometria: unknown
          id: string
          meta_intervalo_limpeza: number | null
          nome: string
          setor_id: string | null
          updated_at: string | null
        }
        Insert: {
          ativo?: boolean | null
          capacidade?: number | null
          created_at?: string | null
          data_ultima_limpeza?: string | null
          deleted_at?: string | null
          fazenda_id: string
          geometria?: unknown
          id?: string
          meta_intervalo_limpeza?: number | null
          nome: string
          setor_id?: string | null
          updated_at?: string | null
        }
        Update: {
          ativo?: boolean | null
          capacidade?: number | null
          created_at?: string | null
          data_ultima_limpeza?: string | null
          deleted_at?: string | null
          fazenda_id?: string
          geometria?: unknown
          id?: string
          meta_intervalo_limpeza?: number | null
          nome?: string
          setor_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bebedouros_fazenda_id_fkey"
            columns: ["fazenda_id"]
            isOneToOne: false
            referencedRelation: "fazendas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bebedouros_setor_id_fkey"
            columns: ["setor_id"]
            isOneToOne: false
            referencedRelation: "setores"
            referencedColumns: ["id"]
          },
        ]
      }
      categorias: {
        Row: {
          ativo: boolean | null
          created_at: string | null
          descricao: string | null
          fazenda_id: string
          id: string
          nome: string
          updated_at: string | null
        }
        Insert: {
          ativo?: boolean | null
          created_at?: string | null
          descricao?: string | null
          fazenda_id: string
          id?: string
          nome: string
          updated_at?: string | null
        }
        Update: {
          ativo?: boolean | null
          created_at?: string | null
          descricao?: string | null
          fazenda_id?: string
          id?: string
          nome?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "categorias_fazenda_id_fkey"
            columns: ["fazenda_id"]
            isOneToOne: false
            referencedRelation: "fazendas"
            referencedColumns: ["id"]
          },
        ]
      }
      causas_morte: {
        Row: {
          ativo: boolean | null
          created_at: string | null
          deleted_at: string | null
          descricao: string | null
          fazenda_id: string
          id: string
          nome: string
          updated_at: string | null
        }
        Insert: {
          ativo?: boolean | null
          created_at?: string | null
          deleted_at?: string | null
          descricao?: string | null
          fazenda_id: string
          id?: string
          nome: string
          updated_at?: string | null
        }
        Update: {
          ativo?: boolean | null
          created_at?: string | null
          deleted_at?: string | null
          descricao?: string | null
          fazenda_id?: string
          id?: string
          nome?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "causas_morte_fazenda_id_fkey"
            columns: ["fazenda_id"]
            isOneToOne: false
            referencedRelation: "fazendas"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_ia_logs: {
        Row: {
          created_at: string
          custo_estimado_usd: number | null
          erro: string | null
          fazenda_id: string
          funcoes_chamadas: Json | null
          id: string
          modelo: string | null
          pergunta: string
          resposta: string | null
          tokens_cached: number | null
          tokens_input: number | null
          tokens_output: number | null
          usuario_id: string
        }
        Insert: {
          created_at?: string
          custo_estimado_usd?: number | null
          erro?: string | null
          fazenda_id: string
          funcoes_chamadas?: Json | null
          id?: string
          modelo?: string | null
          pergunta: string
          resposta?: string | null
          tokens_cached?: number | null
          tokens_input?: number | null
          tokens_output?: number | null
          usuario_id: string
        }
        Update: {
          created_at?: string
          custo_estimado_usd?: number | null
          erro?: string | null
          fazenda_id?: string
          funcoes_chamadas?: Json | null
          id?: string
          modelo?: string | null
          pergunta?: string
          resposta?: string | null
          tokens_cached?: number | null
          tokens_input?: number | null
          tokens_output?: number | null
          usuario_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_ia_logs_fazenda_id_fkey"
            columns: ["fazenda_id"]
            isOneToOne: false
            referencedRelation: "fazendas"
            referencedColumns: ["id"]
          },
        ]
      }
      checklist_regras: {
        Row: {
          ativo: boolean | null
          cadernetas: string[]
          created_at: string | null
          data_fim: string | null
          data_inicio: string
          fazenda_id: string
          id: string
          tipo: string
          updated_at: string | null
        }
        Insert: {
          ativo?: boolean | null
          cadernetas?: string[]
          created_at?: string | null
          data_fim?: string | null
          data_inicio: string
          fazenda_id: string
          id?: string
          tipo?: string
          updated_at?: string | null
        }
        Update: {
          ativo?: boolean | null
          cadernetas?: string[]
          created_at?: string | null
          data_fim?: string | null
          data_inicio?: string
          fazenda_id?: string
          id?: string
          tipo?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "checklist_regras_fazenda_id_fkey"
            columns: ["fazenda_id"]
            isOneToOne: false
            referencedRelation: "fazendas"
            referencedColumns: ["id"]
          },
        ]
      }
      conflitos: {
        Row: {
          criado_em: string | null
          dados_local: Json | null
          dados_remoto: Json | null
          fazenda_id: string
          id: string
          registro_id: string
          resolvido_em: string | null
          resolvido_por: string | null
          tabela: string
          versao_local: number | null
          versao_remota: number | null
        }
        Insert: {
          criado_em?: string | null
          dados_local?: Json | null
          dados_remoto?: Json | null
          fazenda_id: string
          id?: string
          registro_id: string
          resolvido_em?: string | null
          resolvido_por?: string | null
          tabela: string
          versao_local?: number | null
          versao_remota?: number | null
        }
        Update: {
          criado_em?: string | null
          dados_local?: Json | null
          dados_remoto?: Json | null
          fazenda_id?: string
          id?: string
          registro_id?: string
          resolvido_em?: string | null
          resolvido_por?: string | null
          tabela?: string
          versao_local?: number | null
          versao_remota?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "conflictos_fazenda_id_fkey"
            columns: ["fazenda_id"]
            isOneToOne: false
            referencedRelation: "fazendas"
            referencedColumns: ["id"]
          },
        ]
      }
      currais: {
        Row: {
          ativo: boolean | null
          created_at: string | null
          deleted_at: string | null
          fazenda_id: string
          geometria: unknown
          id: string
          linha_id: string | null
          lote_id: string | null
          nome: string
          updated_at: string | null
        }
        Insert: {
          ativo?: boolean | null
          created_at?: string | null
          deleted_at?: string | null
          fazenda_id: string
          geometria?: unknown
          id?: string
          linha_id?: string | null
          lote_id?: string | null
          nome: string
          updated_at?: string | null
        }
        Update: {
          ativo?: boolean | null
          created_at?: string | null
          deleted_at?: string | null
          fazenda_id?: string
          geometria?: unknown
          id?: string
          linha_id?: string | null
          lote_id?: string | null
          nome?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "currais_fazenda_id_fkey"
            columns: ["fazenda_id"]
            isOneToOne: false
            referencedRelation: "fazendas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "currais_linha_id_fkey"
            columns: ["linha_id"]
            isOneToOne: false
            referencedRelation: "linhas_confinamento"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "currais_lote_id_fkey"
            columns: ["lote_id"]
            isOneToOne: false
            referencedRelation: "lotes"
            referencedColumns: ["id"]
          },
        ]
      }
      dispositivos: {
        Row: {
          ativo: boolean | null
          created_at: string | null
          device_id: string
          fazenda_id: string
          id: string
          modelo: string | null
          nome: string | null
          plataforma: string | null
          ultimo_acesso: string | null
          updated_at: string | null
        }
        Insert: {
          ativo?: boolean | null
          created_at?: string | null
          device_id: string
          fazenda_id: string
          id?: string
          modelo?: string | null
          nome?: string | null
          plataforma?: string | null
          ultimo_acesso?: string | null
          updated_at?: string | null
        }
        Update: {
          ativo?: boolean | null
          created_at?: string | null
          device_id?: string
          fazenda_id?: string
          id?: string
          modelo?: string | null
          nome?: string | null
          plataforma?: string | null
          ultimo_acesso?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "dispositivos_fazenda_id_fkey"
            columns: ["fazenda_id"]
            isOneToOne: false
            referencedRelation: "fazendas"
            referencedColumns: ["id"]
          },
        ]
      }
      entrada_insumos_itens: {
        Row: {
          entrada_id: string
          formulacao_id: string | null
          id: string
          insumo_id: string | null
          local_id: string | null
          lote: string | null
          produto: string | null
          quantidade: number
          validade: string | null
          valor_total: number | null
          valor_unitario: number | null
        }
        Insert: {
          entrada_id: string
          formulacao_id?: string | null
          id?: string
          insumo_id?: string | null
          local_id?: string | null
          lote?: string | null
          produto?: string | null
          quantidade: number
          validade?: string | null
          valor_total?: number | null
          valor_unitario?: number | null
        }
        Update: {
          entrada_id?: string
          formulacao_id?: string | null
          id?: string
          insumo_id?: string | null
          local_id?: string | null
          lote?: string | null
          produto?: string | null
          quantidade?: number
          validade?: string | null
          valor_total?: number | null
          valor_unitario?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "entrada_insumos_itens_entrada_id_fkey"
            columns: ["entrada_id"]
            isOneToOne: false
            referencedRelation: "registros_entrada_insumos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "entrada_insumos_itens_formulacao_id_fkey"
            columns: ["formulacao_id"]
            isOneToOne: false
            referencedRelation: "formulacoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "entrada_insumos_itens_insumo_id_fkey"
            columns: ["insumo_id"]
            isOneToOne: false
            referencedRelation: "insumos"
            referencedColumns: ["id"]
          },
        ]
      }
      execucoes_rotina: {
        Row: {
          caderneta_id: string
          concluido: boolean | null
          created_at: string | null
          data: string
          dispositivo_id: string | null
          fazenda_id: string
          funcionario_id: string
          horario_programado: string | null
          id: string
          observacao: string | null
          primeiro_acesso: string | null
          primeiro_acesso_local: string | null
          primeiro_registro: string | null
          primeiro_registro_local: string | null
          rotina_id: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          caderneta_id: string
          concluido?: boolean | null
          created_at?: string | null
          data: string
          dispositivo_id?: string | null
          fazenda_id: string
          funcionario_id: string
          horario_programado?: string | null
          id?: string
          observacao?: string | null
          primeiro_acesso?: string | null
          primeiro_acesso_local?: string | null
          primeiro_registro?: string | null
          primeiro_registro_local?: string | null
          rotina_id?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          caderneta_id?: string
          concluido?: boolean | null
          created_at?: string | null
          data?: string
          dispositivo_id?: string | null
          fazenda_id?: string
          funcionario_id?: string
          horario_programado?: string | null
          id?: string
          observacao?: string | null
          primeiro_acesso?: string | null
          primeiro_acesso_local?: string | null
          primeiro_registro?: string | null
          primeiro_registro_local?: string | null
          rotina_id?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "execucoes_rotina_fazenda_id_fkey"
            columns: ["fazenda_id"]
            isOneToOne: false
            referencedRelation: "fazendas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "execucoes_rotina_funcionario_id_fkey"
            columns: ["funcionario_id"]
            isOneToOne: false
            referencedRelation: "funcionarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "execucoes_rotina_funcionario_id_fkey"
            columns: ["funcionario_id"]
            isOneToOne: false
            referencedRelation: "v_funcionarios_com_setores"
            referencedColumns: ["funcionario_id"]
          },
          {
            foreignKeyName: "execucoes_rotina_rotina_id_fkey"
            columns: ["rotina_id"]
            isOneToOne: false
            referencedRelation: "rotinas"
            referencedColumns: ["id"]
          },
        ]
      }
      execucoes_rotina_historico: {
        Row: {
          acao: string
          created_at: string | null
          dados_anteriores: Json | null
          execucao_rotina_id: string
          id: string
          motivo: string
          usuario_id: string
        }
        Insert: {
          acao: string
          created_at?: string | null
          dados_anteriores?: Json | null
          execucao_rotina_id: string
          id?: string
          motivo: string
          usuario_id: string
        }
        Update: {
          acao?: string
          created_at?: string | null
          dados_anteriores?: Json | null
          execucao_rotina_id?: string
          id?: string
          motivo?: string
          usuario_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "execucoes_rotina_historico_execucao_rotina_id_fkey"
            columns: ["execucao_rotina_id"]
            isOneToOne: false
            referencedRelation: "execucoes_rotina"
            referencedColumns: ["id"]
          },
        ]
      }
      faixas_categorias: {
        Row: {
          ativo: boolean
          cor: string | null
          created_at: string
          deleted_at: string | null
          destino: string | null
          fazenda_id: string
          id: string
          nome: string
          ordem: number
          peso_max: number
          peso_min: number
          sexo: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          cor?: string | null
          created_at?: string
          deleted_at?: string | null
          destino?: string | null
          fazenda_id: string
          id?: string
          nome: string
          ordem?: number
          peso_max?: number
          peso_min?: number
          sexo: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          cor?: string | null
          created_at?: string
          deleted_at?: string | null
          destino?: string | null
          fazenda_id?: string
          id?: string
          nome?: string
          ordem?: number
          peso_max?: number
          peso_min?: number
          sexo?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "faixas_categorias_fazenda_id_fkey"
            columns: ["fazenda_id"]
            isOneToOne: false
            referencedRelation: "fazendas"
            referencedColumns: ["id"]
          },
        ]
      }
      fazendas: {
        Row: {
          acesso_comercial: boolean
          acesso_confinamento: boolean
          acesso_id: string
          ativo: boolean | null
          bounding_box: unknown
          cnpj: string | null
          controle_acesso_habilitado: boolean | null
          created_at: string | null
          email: string | null
          endereco: string | null
          expediente_dias: Json | null
          expediente_habilitado: boolean | null
          expediente_timezone: string | null
          grupo_id: string | null
          id: string
          logo_url: string | null
          nome: string
          planilha_id: string | null
          rbac_versao: number
          telefone: string | null
          timezone: string | null
          tolerancia_rotina_minutos: number | null
          trava_suplementacao: boolean
          updated_at: string | null
        }
        Insert: {
          acesso_comercial?: boolean
          acesso_confinamento?: boolean
          acesso_id: string
          ativo?: boolean | null
          bounding_box?: unknown
          cnpj?: string | null
          controle_acesso_habilitado?: boolean | null
          created_at?: string | null
          email?: string | null
          endereco?: string | null
          expediente_dias?: Json | null
          expediente_habilitado?: boolean | null
          expediente_timezone?: string | null
          grupo_id?: string | null
          id?: string
          logo_url?: string | null
          nome: string
          planilha_id?: string | null
          rbac_versao?: number
          telefone?: string | null
          timezone?: string | null
          tolerancia_rotina_minutos?: number | null
          trava_suplementacao?: boolean
          updated_at?: string | null
        }
        Update: {
          acesso_comercial?: boolean
          acesso_confinamento?: boolean
          acesso_id?: string
          ativo?: boolean | null
          bounding_box?: unknown
          cnpj?: string | null
          controle_acesso_habilitado?: boolean | null
          created_at?: string | null
          email?: string | null
          endereco?: string | null
          expediente_dias?: Json | null
          expediente_habilitado?: boolean | null
          expediente_timezone?: string | null
          grupo_id?: string | null
          id?: string
          logo_url?: string | null
          nome?: string
          planilha_id?: string | null
          rbac_versao?: number
          telefone?: string | null
          timezone?: string | null
          tolerancia_rotina_minutos?: number | null
          trava_suplementacao?: boolean
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fazendas_grupo_id_fkey"
            columns: ["grupo_id"]
            isOneToOne: false
            referencedRelation: "grupos_fazenda"
            referencedColumns: ["id"]
          },
        ]
      }
      formulacao_categorias_gmd: {
        Row: {
          categoria: string
          created_at: string
          formulacao_id: string
          gmd: number
          id: string
          ordem: number
          updated_at: string
        }
        Insert: {
          categoria: string
          created_at?: string
          formulacao_id: string
          gmd: number
          id?: string
          ordem?: number
          updated_at?: string
        }
        Update: {
          categoria?: string
          created_at?: string
          formulacao_id?: string
          gmd?: number
          id?: string
          ordem?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "formulacao_categorias_gmd_formulacao_id_fkey"
            columns: ["formulacao_id"]
            isOneToOne: false
            referencedRelation: "formulacoes"
            referencedColumns: ["id"]
          },
        ]
      }
      formulacao_insumos: {
        Row: {
          formula_teor_ms: number
          formulacao_id: string
          insumo_id: string
          ordem: number
        }
        Insert: {
          formula_teor_ms?: number
          formulacao_id: string
          insumo_id: string
          ordem?: number
        }
        Update: {
          formula_teor_ms?: number
          formulacao_id?: string
          insumo_id?: string
          ordem?: number
        }
        Relationships: [
          {
            foreignKeyName: "formulacao_insumos_formulacao_id_fkey"
            columns: ["formulacao_id"]
            isOneToOne: false
            referencedRelation: "formulacoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "formulacao_insumos_insumo_id_fkey"
            columns: ["insumo_id"]
            isOneToOne: false
            referencedRelation: "insumos"
            referencedColumns: ["id"]
          },
        ]
      }
      formulacoes: {
        Row: {
          ativo: boolean | null
          categoria: string | null
          categoria_inferida_automaticamente: boolean
          categoria_inferida_observacao: string | null
          consumo_mn_kg_cab_dia: number | null
          consumo_ms_kg_cab_dia: number | null
          consumo_ms_percent_pv: number | null
          controla_estoque: boolean
          created_at: string | null
          custo_dieta_reais_cab_dia: number | null
          custo_mn_tonelada: number | null
          custo_ms_tonelada: number | null
          custo_total: number | null
          custo_total_estoque: number
          custo_unitario: number
          deleted_at: string | null
          descricao: string | null
          e_creep: boolean
          e_premix: boolean
          estoque_atual: number
          estoque_minimo: number
          fazenda_id: string
          forma_fornecimento: string
          gmd: number | null
          id: string
          insumos: Json | null
          kg_por_saco: number | null
          nome: string
          peso_vivo_medio: number | null
          sistema_producao: string | null
          teor_ms_dieta: number | null
          tipo: string | null
          updated_at: string | null
          versao: number
        }
        Insert: {
          ativo?: boolean | null
          categoria?: string | null
          categoria_inferida_automaticamente?: boolean
          categoria_inferida_observacao?: string | null
          consumo_mn_kg_cab_dia?: number | null
          consumo_ms_kg_cab_dia?: number | null
          consumo_ms_percent_pv?: number | null
          controla_estoque?: boolean
          created_at?: string | null
          custo_dieta_reais_cab_dia?: number | null
          custo_mn_tonelada?: number | null
          custo_ms_tonelada?: number | null
          custo_total?: number | null
          custo_total_estoque?: number
          custo_unitario?: number
          deleted_at?: string | null
          descricao?: string | null
          e_creep?: boolean
          e_premix?: boolean
          estoque_atual?: number
          estoque_minimo?: number
          fazenda_id: string
          forma_fornecimento?: string
          gmd?: number | null
          id?: string
          insumos?: Json | null
          kg_por_saco?: number | null
          nome: string
          peso_vivo_medio?: number | null
          sistema_producao?: string | null
          teor_ms_dieta?: number | null
          tipo?: string | null
          updated_at?: string | null
          versao?: number
        }
        Update: {
          ativo?: boolean | null
          categoria?: string | null
          categoria_inferida_automaticamente?: boolean
          categoria_inferida_observacao?: string | null
          consumo_mn_kg_cab_dia?: number | null
          consumo_ms_kg_cab_dia?: number | null
          consumo_ms_percent_pv?: number | null
          controla_estoque?: boolean
          created_at?: string | null
          custo_dieta_reais_cab_dia?: number | null
          custo_mn_tonelada?: number | null
          custo_ms_tonelada?: number | null
          custo_total?: number | null
          custo_total_estoque?: number
          custo_unitario?: number
          deleted_at?: string | null
          descricao?: string | null
          e_creep?: boolean
          e_premix?: boolean
          estoque_atual?: number
          estoque_minimo?: number
          fazenda_id?: string
          forma_fornecimento?: string
          gmd?: number | null
          id?: string
          insumos?: Json | null
          kg_por_saco?: number | null
          nome?: string
          peso_vivo_medio?: number | null
          sistema_producao?: string | null
          teor_ms_dieta?: number | null
          tipo?: string | null
          updated_at?: string | null
          versao?: number
        }
        Relationships: [
          {
            foreignKeyName: "dietas_fazenda_id_fkey"
            columns: ["fazenda_id"]
            isOneToOne: false
            referencedRelation: "fazendas"
            referencedColumns: ["id"]
          },
        ]
      }
      formulacoes_historico: {
        Row: {
          alterado_em: string
          alterado_por: string | null
          formulacao_id: string
          id: string
          snapshot_jsonb: Json
          versao_snapshot: number
        }
        Insert: {
          alterado_em?: string
          alterado_por?: string | null
          formulacao_id: string
          id?: string
          snapshot_jsonb: Json
          versao_snapshot: number
        }
        Update: {
          alterado_em?: string
          alterado_por?: string | null
          formulacao_id?: string
          id?: string
          snapshot_jsonb?: Json
          versao_snapshot?: number
        }
        Relationships: []
      }
      fornecedores: {
        Row: {
          ativo: boolean | null
          cep: string | null
          cidade: string | null
          cnpj: string | null
          created_at: string | null
          deleted_at: string | null
          email: string | null
          endereco: string | null
          estado: string | null
          fazenda_id: string
          id: string
          nome: string
          razao_social: string | null
          telefone: string | null
          updated_at: string | null
        }
        Insert: {
          ativo?: boolean | null
          cep?: string | null
          cidade?: string | null
          cnpj?: string | null
          created_at?: string | null
          deleted_at?: string | null
          email?: string | null
          endereco?: string | null
          estado?: string | null
          fazenda_id: string
          id?: string
          nome: string
          razao_social?: string | null
          telefone?: string | null
          updated_at?: string | null
        }
        Update: {
          ativo?: boolean | null
          cep?: string | null
          cidade?: string | null
          cnpj?: string | null
          created_at?: string | null
          deleted_at?: string | null
          email?: string | null
          endereco?: string | null
          estado?: string | null
          fazenda_id?: string
          id?: string
          nome?: string
          razao_social?: string | null
          telefone?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fornecedores_fazenda_id_fkey"
            columns: ["fazenda_id"]
            isOneToOne: false
            referencedRelation: "fazendas"
            referencedColumns: ["id"]
          },
        ]
      }
      frigorificos: {
        Row: {
          ativo: boolean | null
          cep: string | null
          cidade: string | null
          cnpj: string | null
          created_at: string | null
          email: string | null
          endereco: string | null
          estado: string | null
          fazenda_id: string
          id: string
          nome: string
          razao_social: string | null
          telefone: string | null
          updated_at: string | null
        }
        Insert: {
          ativo?: boolean | null
          cep?: string | null
          cidade?: string | null
          cnpj?: string | null
          created_at?: string | null
          email?: string | null
          endereco?: string | null
          estado?: string | null
          fazenda_id: string
          id?: string
          nome: string
          razao_social?: string | null
          telefone?: string | null
          updated_at?: string | null
        }
        Update: {
          ativo?: boolean | null
          cep?: string | null
          cidade?: string | null
          cnpj?: string | null
          created_at?: string | null
          email?: string | null
          endereco?: string | null
          estado?: string | null
          fazenda_id?: string
          id?: string
          nome?: string
          razao_social?: string | null
          telefone?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "frigorificos_fazenda_id_fkey"
            columns: ["fazenda_id"]
            isOneToOne: false
            referencedRelation: "fazendas"
            referencedColumns: ["id"]
          },
        ]
      }
      funcionario_setores: {
        Row: {
          created_at: string | null
          fazenda_id: string
          funcionario_id: string
          id: string
          setor_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          fazenda_id: string
          funcionario_id: string
          id?: string
          setor_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          fazenda_id?: string
          funcionario_id?: string
          id?: string
          setor_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "funcionario_setores_fazenda_id_fkey"
            columns: ["fazenda_id"]
            isOneToOne: false
            referencedRelation: "fazendas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "funcionario_setores_funcionario_id_fkey"
            columns: ["funcionario_id"]
            isOneToOne: false
            referencedRelation: "funcionarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "funcionario_setores_funcionario_id_fkey"
            columns: ["funcionario_id"]
            isOneToOne: false
            referencedRelation: "v_funcionarios_com_setores"
            referencedColumns: ["funcionario_id"]
          },
          {
            foreignKeyName: "funcionario_setores_setor_id_fkey"
            columns: ["setor_id"]
            isOneToOne: false
            referencedRelation: "setores"
            referencedColumns: ["id"]
          },
        ]
      }
      funcionarios: {
        Row: {
          acessa_app: boolean | null
          ativo: boolean | null
          cadernetas_permitidas: Json | null
          cargo: string | null
          cpf: string | null
          created_at: string | null
          deleted_at: string | null
          expediente_override: Json | null
          fazenda_id: string
          id: string
          nome: string
          pin_hash: string | null
          setor_id: string | null
          telefone: string | null
          updated_at: string | null
        }
        Insert: {
          acessa_app?: boolean | null
          ativo?: boolean | null
          cadernetas_permitidas?: Json | null
          cargo?: string | null
          cpf?: string | null
          created_at?: string | null
          deleted_at?: string | null
          expediente_override?: Json | null
          fazenda_id: string
          id?: string
          nome: string
          pin_hash?: string | null
          setor_id?: string | null
          telefone?: string | null
          updated_at?: string | null
        }
        Update: {
          acessa_app?: boolean | null
          ativo?: boolean | null
          cadernetas_permitidas?: Json | null
          cargo?: string | null
          cpf?: string | null
          created_at?: string | null
          deleted_at?: string | null
          expediente_override?: Json | null
          fazenda_id?: string
          id?: string
          nome?: string
          pin_hash?: string | null
          setor_id?: string | null
          telefone?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "funcionarios_fazenda_id_fkey"
            columns: ["fazenda_id"]
            isOneToOne: false
            referencedRelation: "fazendas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "funcionarios_setor_id_fkey"
            columns: ["setor_id"]
            isOneToOne: false
            referencedRelation: "setores"
            referencedColumns: ["id"]
          },
        ]
      }
      grupos_fazenda: {
        Row: {
          ativo: boolean
          created_at: string
          id: string
          nome: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          id?: string
          nome: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          id?: string
          nome?: string
          updated_at?: string
        }
        Relationships: []
      }
      historico_limpezas_bebedouros: {
        Row: {
          bebedouro_id: string
          created_at: string | null
          data_limpeza: string
          fazenda_id: string
          id: string
          observacao: string | null
          responsavel: string | null
          updated_at: string | null
        }
        Insert: {
          bebedouro_id: string
          created_at?: string | null
          data_limpeza: string
          fazenda_id: string
          id?: string
          observacao?: string | null
          responsavel?: string | null
          updated_at?: string | null
        }
        Update: {
          bebedouro_id?: string
          created_at?: string | null
          data_limpeza?: string
          fazenda_id?: string
          id?: string
          observacao?: string | null
          responsavel?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "historico_limpezas_bebedouros_bebedouro_id_fkey"
            columns: ["bebedouro_id"]
            isOneToOne: false
            referencedRelation: "bebedouros"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "historico_limpezas_bebedouros_fazenda_id_fkey"
            columns: ["fazenda_id"]
            isOneToOne: false
            referencedRelation: "fazendas"
            referencedColumns: ["id"]
          },
        ]
      }
      ia_config_global: {
        Row: {
          atualizado_em: string
          cotacao_usd_brl: number
          id: number
        }
        Insert: {
          atualizado_em?: string
          cotacao_usd_brl?: number
          id?: number
        }
        Update: {
          atualizado_em?: string
          cotacao_usd_brl?: number
          id?: number
        }
        Relationships: []
      }
      ia_fazenda_config: {
        Row: {
          atualizado_em: string
          criado_em: string
          custo_cached_por_mil: number
          custo_input_por_mil: number
          custo_output_por_mil: number
          fazenda_id: string
          ia_ativo: boolean
          limite_diario: number
        }
        Insert: {
          atualizado_em?: string
          criado_em?: string
          custo_cached_por_mil?: number
          custo_input_por_mil?: number
          custo_output_por_mil?: number
          fazenda_id: string
          ia_ativo?: boolean
          limite_diario?: number
        }
        Update: {
          atualizado_em?: string
          criado_em?: string
          custo_cached_por_mil?: number
          custo_input_por_mil?: number
          custo_output_por_mil?: number
          fazenda_id?: string
          ia_ativo?: boolean
          limite_diario?: number
        }
        Relationships: [
          {
            foreignKeyName: "ia_fazenda_config_fazenda_id_fkey"
            columns: ["fazenda_id"]
            isOneToOne: true
            referencedRelation: "fazendas"
            referencedColumns: ["id"]
          },
        ]
      }
      impersonation_sessions: {
        Row: {
          ended_at: string | null
          expires_at: string
          id: string
          is_active: boolean
          reason: string | null
          started_at: string
          super_admin_email: string
          super_admin_id: string
          target_fazenda_id: string | null
          target_fazenda_nome: string | null
          target_user_email: string
          target_user_id: string
          target_user_nome: string
        }
        Insert: {
          ended_at?: string | null
          expires_at?: string
          id?: string
          is_active?: boolean
          reason?: string | null
          started_at?: string
          super_admin_email: string
          super_admin_id: string
          target_fazenda_id?: string | null
          target_fazenda_nome?: string | null
          target_user_email: string
          target_user_id: string
          target_user_nome: string
        }
        Update: {
          ended_at?: string | null
          expires_at?: string
          id?: string
          is_active?: boolean
          reason?: string | null
          started_at?: string
          super_admin_email?: string
          super_admin_id?: string
          target_fazenda_id?: string | null
          target_fazenda_nome?: string | null
          target_user_email?: string
          target_user_id?: string
          target_user_nome?: string
        }
        Relationships: []
      }
      implementos: {
        Row: {
          ativo: boolean | null
          created_at: string | null
          deleted_at: string | null
          fazenda_id: string
          id: string
          nome: string
          updated_at: string | null
        }
        Insert: {
          ativo?: boolean | null
          created_at?: string | null
          deleted_at?: string | null
          fazenda_id: string
          id?: string
          nome: string
          updated_at?: string | null
        }
        Update: {
          ativo?: boolean | null
          created_at?: string | null
          deleted_at?: string | null
          fazenda_id?: string
          id?: string
          nome?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      individuos: {
        Row: {
          agio_desagio: number | null
          categoria: string
          classificacao_matriz: string | null
          created_at: string | null
          data_desmama: string | null
          data_entrada_fazenda: string | null
          data_formacao_lote: string | null
          data_insercao_rastreabilidade: string | null
          data_liberacao_sisbov: string | null
          data_nascimento: string | null
          deleted_at: string | null
          estrategia_nutricional_id: string | null
          estrategia_nutricional_nome: string | null
          estrategia_nutricional_tipo: string | null
          fazenda_id: string
          fornecedor: string | null
          gmd_kg_cab_dia: number | null
          id: string
          id_brinco: string | null
          id_brinco_mae: string | null
          id_chip: string | null
          id_chip_mae: string | null
          id_manejo: string | null
          id_provisorio_cria: string | null
          idade_atual_dias: number | null
          idade_atual_meses: number | null
          idade_era: string | null
          lote_atual: string | null
          mae: string | null
          mae_adotiva_id: string | null
          numero_partos: number | null
          origem: string | null
          pai: string | null
          parto: string[] | null
          pasto_atual: string | null
          periodo_desmama_dias: number | null
          periodo_desmama_meses: number | null
          periodo_fazenda_dias: number | null
          periodo_noventena: number | null
          periodo_restante_liberacao: number | null
          periodo_ultima_estrategia_nutricional_dias: number | null
          peso_atual_kg: number | null
          peso_desmama_kg: number | null
          peso_meta_kg: number | null
          peso_nascimento_kg: number | null
          preco_arroba_boi_gordo: number | null
          preco_entrada_reais_arroba: number | null
          preco_entrada_reais_cabeca: number | null
          preco_entrada_reais_kg: number | null
          propriedade_atual: string | null
          propriedade_origem: string | null
          protocolo_sanitario: string | null
          pv_entrada_arroba: number | null
          pv_entrada_kg: number | null
          raca: string
          rc_inicial_kg: number | null
          setor_atual: string | null
          sexo: string
          status: string
          sync_status: string | null
          updated_at: string | null
          version: number | null
        }
        Insert: {
          agio_desagio?: number | null
          categoria: string
          classificacao_matriz?: string | null
          created_at?: string | null
          data_desmama?: string | null
          data_entrada_fazenda?: string | null
          data_formacao_lote?: string | null
          data_insercao_rastreabilidade?: string | null
          data_liberacao_sisbov?: string | null
          data_nascimento?: string | null
          deleted_at?: string | null
          estrategia_nutricional_id?: string | null
          estrategia_nutricional_nome?: string | null
          estrategia_nutricional_tipo?: string | null
          fazenda_id: string
          fornecedor?: string | null
          gmd_kg_cab_dia?: number | null
          id?: string
          id_brinco?: string | null
          id_brinco_mae?: string | null
          id_chip?: string | null
          id_chip_mae?: string | null
          id_manejo?: string | null
          id_provisorio_cria?: string | null
          idade_atual_dias?: number | null
          idade_atual_meses?: number | null
          idade_era?: string | null
          lote_atual?: string | null
          mae?: string | null
          mae_adotiva_id?: string | null
          numero_partos?: number | null
          origem?: string | null
          pai?: string | null
          parto?: string[] | null
          pasto_atual?: string | null
          periodo_desmama_dias?: number | null
          periodo_desmama_meses?: number | null
          periodo_fazenda_dias?: number | null
          periodo_noventena?: number | null
          periodo_restante_liberacao?: number | null
          periodo_ultima_estrategia_nutricional_dias?: number | null
          peso_atual_kg?: number | null
          peso_desmama_kg?: number | null
          peso_meta_kg?: number | null
          peso_nascimento_kg?: number | null
          preco_arroba_boi_gordo?: number | null
          preco_entrada_reais_arroba?: number | null
          preco_entrada_reais_cabeca?: number | null
          preco_entrada_reais_kg?: number | null
          propriedade_atual?: string | null
          propriedade_origem?: string | null
          protocolo_sanitario?: string | null
          pv_entrada_arroba?: number | null
          pv_entrada_kg?: number | null
          raca: string
          rc_inicial_kg?: number | null
          setor_atual?: string | null
          sexo: string
          status?: string
          sync_status?: string | null
          updated_at?: string | null
          version?: number | null
        }
        Update: {
          agio_desagio?: number | null
          categoria?: string
          classificacao_matriz?: string | null
          created_at?: string | null
          data_desmama?: string | null
          data_entrada_fazenda?: string | null
          data_formacao_lote?: string | null
          data_insercao_rastreabilidade?: string | null
          data_liberacao_sisbov?: string | null
          data_nascimento?: string | null
          deleted_at?: string | null
          estrategia_nutricional_id?: string | null
          estrategia_nutricional_nome?: string | null
          estrategia_nutricional_tipo?: string | null
          fazenda_id?: string
          fornecedor?: string | null
          gmd_kg_cab_dia?: number | null
          id?: string
          id_brinco?: string | null
          id_brinco_mae?: string | null
          id_chip?: string | null
          id_chip_mae?: string | null
          id_manejo?: string | null
          id_provisorio_cria?: string | null
          idade_atual_dias?: number | null
          idade_atual_meses?: number | null
          idade_era?: string | null
          lote_atual?: string | null
          mae?: string | null
          mae_adotiva_id?: string | null
          numero_partos?: number | null
          origem?: string | null
          pai?: string | null
          parto?: string[] | null
          pasto_atual?: string | null
          periodo_desmama_dias?: number | null
          periodo_desmama_meses?: number | null
          periodo_fazenda_dias?: number | null
          periodo_noventena?: number | null
          periodo_restante_liberacao?: number | null
          periodo_ultima_estrategia_nutricional_dias?: number | null
          peso_atual_kg?: number | null
          peso_desmama_kg?: number | null
          peso_meta_kg?: number | null
          peso_nascimento_kg?: number | null
          preco_arroba_boi_gordo?: number | null
          preco_entrada_reais_arroba?: number | null
          preco_entrada_reais_cabeca?: number | null
          preco_entrada_reais_kg?: number | null
          propriedade_atual?: string | null
          propriedade_origem?: string | null
          protocolo_sanitario?: string | null
          pv_entrada_arroba?: number | null
          pv_entrada_kg?: number | null
          raca?: string
          rc_inicial_kg?: number | null
          setor_atual?: string | null
          sexo?: string
          status?: string
          sync_status?: string | null
          updated_at?: string | null
          version?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "individuos_fazenda_id_fkey"
            columns: ["fazenda_id"]
            isOneToOne: false
            referencedRelation: "fazendas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "individuos_fornecedor_fkey"
            columns: ["fornecedor"]
            isOneToOne: false
            referencedRelation: "fornecedores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "individuos_lote_atual_fkey"
            columns: ["lote_atual"]
            isOneToOne: false
            referencedRelation: "lotes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "individuos_mae_adotiva_id_fkey"
            columns: ["mae_adotiva_id"]
            isOneToOne: false
            referencedRelation: "individuos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "individuos_mae_fkey"
            columns: ["mae"]
            isOneToOne: false
            referencedRelation: "individuos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "individuos_pai_fkey"
            columns: ["pai"]
            isOneToOne: false
            referencedRelation: "individuos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "individuos_pasto_atual_fkey"
            columns: ["pasto_atual"]
            isOneToOne: false
            referencedRelation: "pastos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "individuos_setor_atual_fkey"
            columns: ["setor_atual"]
            isOneToOne: false
            referencedRelation: "setores"
            referencedColumns: ["id"]
          },
        ]
      }
      insumos: {
        Row: {
          ativo: boolean | null
          controla_estoque: boolean
          created_at: string | null
          custo_total_estoque: number | null
          custo_unitario: number | null
          deleted_at: string | null
          estoque_atual: number | null
          estoque_minimo: number
          fazenda_id: string
          formulacao_origem_id: string | null
          fornecedor: string | null
          id: string
          nome: string
          preco_ton_mn: number | null
          teor_ms: number | null
          tipo: string | null
          unidade: string | null
          updated_at: string | null
        }
        Insert: {
          ativo?: boolean | null
          controla_estoque?: boolean
          created_at?: string | null
          custo_total_estoque?: number | null
          custo_unitario?: number | null
          deleted_at?: string | null
          estoque_atual?: number | null
          estoque_minimo?: number
          fazenda_id: string
          formulacao_origem_id?: string | null
          fornecedor?: string | null
          id?: string
          nome: string
          preco_ton_mn?: number | null
          teor_ms?: number | null
          tipo?: string | null
          unidade?: string | null
          updated_at?: string | null
        }
        Update: {
          ativo?: boolean | null
          controla_estoque?: boolean
          created_at?: string | null
          custo_total_estoque?: number | null
          custo_unitario?: number | null
          deleted_at?: string | null
          estoque_atual?: number | null
          estoque_minimo?: number
          fazenda_id?: string
          formulacao_origem_id?: string | null
          fornecedor?: string | null
          id?: string
          nome?: string
          preco_ton_mn?: number | null
          teor_ms?: number | null
          tipo?: string | null
          unidade?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "insumos_fazenda_id_fkey"
            columns: ["fazenda_id"]
            isOneToOne: false
            referencedRelation: "fazendas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "insumos_formulacao_origem_id_fkey"
            columns: ["formulacao_origem_id"]
            isOneToOne: false
            referencedRelation: "formulacoes"
            referencedColumns: ["id"]
          },
        ]
      }
      itens_almoxarifado: {
        Row: {
          ativo: boolean | null
          classificacao: string
          controla_estoque: boolean
          created_at: string | null
          custo_total_estoque: number
          custo_unitario: number
          deleted_at: string | null
          estoque_atual: number
          estoque_minimo: number
          fazenda_id: string
          id: string
          nome: string
          unidade: string
          updated_at: string | null
        }
        Insert: {
          ativo?: boolean | null
          classificacao: string
          controla_estoque?: boolean
          created_at?: string | null
          custo_total_estoque?: number
          custo_unitario?: number
          deleted_at?: string | null
          estoque_atual?: number
          estoque_minimo?: number
          fazenda_id: string
          id?: string
          nome: string
          unidade?: string
          updated_at?: string | null
        }
        Update: {
          ativo?: boolean | null
          classificacao?: string
          controla_estoque?: boolean
          created_at?: string | null
          custo_total_estoque?: number
          custo_unitario?: number
          deleted_at?: string | null
          estoque_atual?: number
          estoque_minimo?: number
          fazenda_id?: string
          id?: string
          nome?: string
          unidade?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      itens_cantina: {
        Row: {
          ativo: boolean | null
          classificacao: string
          controla_estoque: boolean
          created_at: string | null
          custo_total_estoque: number
          custo_unitario: number
          deleted_at: string | null
          estoque_atual: number
          estoque_minimo: number
          fazenda_id: string
          id: string
          nome: string
          unidade_medida: string
          updated_at: string | null
        }
        Insert: {
          ativo?: boolean | null
          classificacao: string
          controla_estoque?: boolean
          created_at?: string | null
          custo_total_estoque?: number
          custo_unitario?: number
          deleted_at?: string | null
          estoque_atual?: number
          estoque_minimo?: number
          fazenda_id: string
          id?: string
          nome: string
          unidade_medida: string
          updated_at?: string | null
        }
        Update: {
          ativo?: boolean | null
          classificacao?: string
          controla_estoque?: boolean
          created_at?: string | null
          custo_total_estoque?: number
          custo_unitario?: number
          deleted_at?: string | null
          estoque_atual?: number
          estoque_minimo?: number
          fazenda_id?: string
          id?: string
          nome?: string
          unidade_medida?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "itens_cantina_fazenda_id_fkey"
            columns: ["fazenda_id"]
            isOneToOne: false
            referencedRelation: "fazendas"
            referencedColumns: ["id"]
          },
        ]
      }
      linhas_confinamento: {
        Row: {
          ativo: boolean
          comprimento_m: number | null
          created_at: string
          deleted_at: string | null
          fazenda_id: string
          id: string
          largura_m: number | null
          metros_cocho_m: number | null
          nome: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          comprimento_m?: number | null
          created_at?: string
          deleted_at?: string | null
          fazenda_id: string
          id?: string
          largura_m?: number | null
          metros_cocho_m?: number | null
          nome: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          comprimento_m?: number | null
          created_at?: string
          deleted_at?: string | null
          fazenda_id?: string
          id?: string
          largura_m?: number | null
          metros_cocho_m?: number | null
          nome?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "linhas_confinamento_fazenda_id_fkey"
            columns: ["fazenda_id"]
            isOneToOne: false
            referencedRelation: "fazendas"
            referencedColumns: ["id"]
          },
        ]
      }
      locais: {
        Row: {
          ativo: boolean | null
          created_at: string | null
          deleted_at: string | null
          fazenda_id: string
          id: string
          nome: string
          updated_at: string | null
        }
        Insert: {
          ativo?: boolean | null
          created_at?: string | null
          deleted_at?: string | null
          fazenda_id: string
          id?: string
          nome: string
          updated_at?: string | null
        }
        Update: {
          ativo?: boolean | null
          created_at?: string | null
          deleted_at?: string | null
          fazenda_id?: string
          id?: string
          nome?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "locais_fazenda_id_fkey"
            columns: ["fazenda_id"]
            isOneToOne: false
            referencedRelation: "fazendas"
            referencedColumns: ["id"]
          },
        ]
      }
      logs_sync_errors: {
        Row: {
          app_version: string | null
          caderneta: string
          created_at: string | null
          dispositivo_id: string | null
          dispositivo_uuid: string | null
          error_code: string | null
          error_details: string | null
          error_message: string | null
          fazenda_id: string
          id: string
          network_status: string | null
          operation: string
          payload: Json | null
          platform: string | null
          registro_id: string
          resolved_at: string | null
          resolved_by: string | null
          retry_count: number | null
        }
        Insert: {
          app_version?: string | null
          caderneta: string
          created_at?: string | null
          dispositivo_id?: string | null
          dispositivo_uuid?: string | null
          error_code?: string | null
          error_details?: string | null
          error_message?: string | null
          fazenda_id: string
          id?: string
          network_status?: string | null
          operation: string
          payload?: Json | null
          platform?: string | null
          registro_id: string
          resolved_at?: string | null
          resolved_by?: string | null
          retry_count?: number | null
        }
        Update: {
          app_version?: string | null
          caderneta?: string
          created_at?: string | null
          dispositivo_id?: string | null
          dispositivo_uuid?: string | null
          error_code?: string | null
          error_details?: string | null
          error_message?: string | null
          fazenda_id?: string
          id?: string
          network_status?: string | null
          operation?: string
          payload?: Json | null
          platform?: string | null
          registro_id?: string
          resolved_at?: string | null
          resolved_by?: string | null
          retry_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "logs_sync_errors_dispositivo_id_fkey"
            columns: ["dispositivo_id"]
            isOneToOne: false
            referencedRelation: "dispositivos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "logs_sync_errors_fazenda_id_fkey"
            columns: ["fazenda_id"]
            isOneToOne: false
            referencedRelation: "fazendas"
            referencedColumns: ["id"]
          },
        ]
      }
      lote_categorias: {
        Row: {
          abate: number | null
          agio_percent: number | null
          ativo: boolean | null
          categoria: string
          categoria_origem_id: string | null
          consumo: number | null
          consumo_meta_porcentagem_pesovivo: number | null
          created_at: string | null
          custo_comissao_reais_cab: number | null
          custo_frete_reais_cab: number | null
          custo_identificacao_rastreabilidade_reais_cab: number | null
          custo_operacional_reais_cab_dia: number | null
          custo_sanidade_reais_cab: number | null
          custo_total_entrada_reais_cab: number | null
          custo_total_entrada_reais_lote: number | null
          data_ajuste_peso: string | null
          data_fim: string | null
          data_meta_projetada: string | null
          data_notificacao_meta: string | null
          data_notificacao_periodo: string | null
          data_pesagem: string | null
          dias_restantes_meta: number | null
          estrategia_nutricional: string | null
          faturamento_projetado_reais_lote_categoria: number | null
          formulacao_id: string | null
          gmd: string | null
          id: string
          idade: number | null
          lote_id: string
          margem_lucro_percent: number | null
          morte: number | null
          periodo: number | null
          peso_entrada_arrobas: number | null
          peso_entrada_kg_cab: number | null
          peso_venda_meta_arroba: number | null
          peso_vivo_atual_arroba_cab: number | null
          peso_vivo_atual_kg_cab: number | null
          peso_vivo_meta_kg_cab: number | null
          preco_custo_cab: number | null
          preco_custo_reais_arroba: number | null
          preco_entrada_reais_arroba: number | null
          preco_entrada_reais_cab: number | null
          preco_entrada_reais_kg: number | null
          preco_venda_projetado_reais_arroba: number | null
          preco_venda_sugerido_cab: number | null
          producao_atual_arroba_cab: number | null
          producao_projetada_arroba_cab: number | null
          qtd_bezerros: number | null
          quant_atual: number | null
          quant_base: number | null
          quant_inicial: number | null
          raca: string | null
          rc_atual: number | null
          rc_final: number | null
          rc_inicial: number | null
          sexo: string | null
          transf_entrada: number | null
          transf_saida: number | null
          updated_at: string | null
          venda_total_arroba_lote_categoria: number | null
        }
        Insert: {
          abate?: number | null
          agio_percent?: number | null
          ativo?: boolean | null
          categoria: string
          categoria_origem_id?: string | null
          consumo?: number | null
          consumo_meta_porcentagem_pesovivo?: number | null
          created_at?: string | null
          custo_comissao_reais_cab?: number | null
          custo_frete_reais_cab?: number | null
          custo_identificacao_rastreabilidade_reais_cab?: number | null
          custo_operacional_reais_cab_dia?: number | null
          custo_sanidade_reais_cab?: number | null
          custo_total_entrada_reais_cab?: number | null
          custo_total_entrada_reais_lote?: number | null
          data_ajuste_peso?: string | null
          data_fim?: string | null
          data_meta_projetada?: string | null
          data_notificacao_meta?: string | null
          data_notificacao_periodo?: string | null
          data_pesagem?: string | null
          dias_restantes_meta?: number | null
          estrategia_nutricional?: string | null
          faturamento_projetado_reais_lote_categoria?: number | null
          formulacao_id?: string | null
          gmd?: string | null
          id?: string
          idade?: number | null
          lote_id: string
          margem_lucro_percent?: number | null
          morte?: number | null
          periodo?: number | null
          peso_entrada_arrobas?: number | null
          peso_entrada_kg_cab?: number | null
          peso_venda_meta_arroba?: number | null
          peso_vivo_atual_arroba_cab?: number | null
          peso_vivo_atual_kg_cab?: number | null
          peso_vivo_meta_kg_cab?: number | null
          preco_custo_cab?: number | null
          preco_custo_reais_arroba?: number | null
          preco_entrada_reais_arroba?: number | null
          preco_entrada_reais_cab?: number | null
          preco_entrada_reais_kg?: number | null
          preco_venda_projetado_reais_arroba?: number | null
          preco_venda_sugerido_cab?: number | null
          producao_atual_arroba_cab?: number | null
          producao_projetada_arroba_cab?: number | null
          qtd_bezerros?: number | null
          quant_atual?: number | null
          quant_base?: number | null
          quant_inicial?: number | null
          raca?: string | null
          rc_atual?: number | null
          rc_final?: number | null
          rc_inicial?: number | null
          sexo?: string | null
          transf_entrada?: number | null
          transf_saida?: number | null
          updated_at?: string | null
          venda_total_arroba_lote_categoria?: number | null
        }
        Update: {
          abate?: number | null
          agio_percent?: number | null
          ativo?: boolean | null
          categoria?: string
          categoria_origem_id?: string | null
          consumo?: number | null
          consumo_meta_porcentagem_pesovivo?: number | null
          created_at?: string | null
          custo_comissao_reais_cab?: number | null
          custo_frete_reais_cab?: number | null
          custo_identificacao_rastreabilidade_reais_cab?: number | null
          custo_operacional_reais_cab_dia?: number | null
          custo_sanidade_reais_cab?: number | null
          custo_total_entrada_reais_cab?: number | null
          custo_total_entrada_reais_lote?: number | null
          data_ajuste_peso?: string | null
          data_fim?: string | null
          data_meta_projetada?: string | null
          data_notificacao_meta?: string | null
          data_notificacao_periodo?: string | null
          data_pesagem?: string | null
          dias_restantes_meta?: number | null
          estrategia_nutricional?: string | null
          faturamento_projetado_reais_lote_categoria?: number | null
          formulacao_id?: string | null
          gmd?: string | null
          id?: string
          idade?: number | null
          lote_id?: string
          margem_lucro_percent?: number | null
          morte?: number | null
          periodo?: number | null
          peso_entrada_arrobas?: number | null
          peso_entrada_kg_cab?: number | null
          peso_venda_meta_arroba?: number | null
          peso_vivo_atual_arroba_cab?: number | null
          peso_vivo_atual_kg_cab?: number | null
          peso_vivo_meta_kg_cab?: number | null
          preco_custo_cab?: number | null
          preco_custo_reais_arroba?: number | null
          preco_entrada_reais_arroba?: number | null
          preco_entrada_reais_cab?: number | null
          preco_entrada_reais_kg?: number | null
          preco_venda_projetado_reais_arroba?: number | null
          preco_venda_sugerido_cab?: number | null
          producao_atual_arroba_cab?: number | null
          producao_projetada_arroba_cab?: number | null
          qtd_bezerros?: number | null
          quant_atual?: number | null
          quant_base?: number | null
          quant_inicial?: number | null
          raca?: string | null
          rc_atual?: number | null
          rc_final?: number | null
          rc_inicial?: number | null
          sexo?: string | null
          transf_entrada?: number | null
          transf_saida?: number | null
          updated_at?: string | null
          venda_total_arroba_lote_categoria?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "lote_categorias_formulacao_id_fkey"
            columns: ["formulacao_id"]
            isOneToOne: false
            referencedRelation: "formulacoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lote_categorias_lote_id_fkey"
            columns: ["lote_id"]
            isOneToOne: false
            referencedRelation: "lotes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lote_categorias_origem_fkey"
            columns: ["categoria_origem_id"]
            isOneToOne: false
            referencedRelation: "lote_categorias"
            referencedColumns: ["id"]
          },
        ]
      }
      lote_categorias_transicoes: {
        Row: {
          categoria_destino: string
          categoria_origem: string
          created_at: string
          data_transicao: string
          fazenda_id: string
          id: string
          lote_categoria_destino_id: string | null
          lote_categoria_origem_id: string | null
          lote_id: string
          motivo: string
          peso_na_transicao_kg: number | null
          snapshot_jsonb: Json
          usuario_id: string | null
        }
        Insert: {
          categoria_destino: string
          categoria_origem: string
          created_at?: string
          data_transicao?: string
          fazenda_id: string
          id?: string
          lote_categoria_destino_id?: string | null
          lote_categoria_origem_id?: string | null
          lote_id: string
          motivo?: string
          peso_na_transicao_kg?: number | null
          snapshot_jsonb?: Json
          usuario_id?: string | null
        }
        Update: {
          categoria_destino?: string
          categoria_origem?: string
          created_at?: string
          data_transicao?: string
          fazenda_id?: string
          id?: string
          lote_categoria_destino_id?: string | null
          lote_categoria_origem_id?: string | null
          lote_id?: string
          motivo?: string
          peso_na_transicao_kg?: number | null
          snapshot_jsonb?: Json
          usuario_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lote_categorias_transicoes_fazenda_id_fkey"
            columns: ["fazenda_id"]
            isOneToOne: false
            referencedRelation: "fazendas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lote_categorias_transicoes_lote_categoria_destino_id_fkey"
            columns: ["lote_categoria_destino_id"]
            isOneToOne: false
            referencedRelation: "lote_categorias"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lote_categorias_transicoes_lote_categoria_origem_id_fkey"
            columns: ["lote_categoria_origem_id"]
            isOneToOne: false
            referencedRelation: "lote_categorias"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lote_categorias_transicoes_lote_id_fkey"
            columns: ["lote_id"]
            isOneToOne: false
            referencedRelation: "lotes"
            referencedColumns: ["id"]
          },
        ]
      }
      lote_historico: {
        Row: {
          categoria: string | null
          created_at: string | null
          data_movimentacao: string
          fazenda_id: string | null
          id: string
          individuo_id: string | null
          lote_id: string
          observacoes: string | null
          peso_kg: number | null
          quantidade: number
          tipo_movimentacao: string
          updated_at: string | null
        }
        Insert: {
          categoria?: string | null
          created_at?: string | null
          data_movimentacao: string
          fazenda_id?: string | null
          id?: string
          individuo_id?: string | null
          lote_id: string
          observacoes?: string | null
          peso_kg?: number | null
          quantidade?: number
          tipo_movimentacao: string
          updated_at?: string | null
        }
        Update: {
          categoria?: string | null
          created_at?: string | null
          data_movimentacao?: string
          fazenda_id?: string | null
          id?: string
          individuo_id?: string | null
          lote_id?: string
          observacoes?: string | null
          peso_kg?: number | null
          quantidade?: number
          tipo_movimentacao?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_lote_historico_fazenda"
            columns: ["fazenda_id"]
            isOneToOne: false
            referencedRelation: "fazendas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lote_historico_individuo_id_fkey"
            columns: ["individuo_id"]
            isOneToOne: false
            referencedRelation: "individuos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lote_historico_lote_id_fkey"
            columns: ["lote_id"]
            isOneToOne: false
            referencedRelation: "lotes"
            referencedColumns: ["id"]
          },
        ]
      }
      lote_modulo_historico: {
        Row: {
          cabecas_entrada: number | null
          cabecas_saida: number | null
          created_at: string | null
          data_hora_entrada: string | null
          data_hora_saida: string | null
          desvio_tempo_ocupacao_percent: number | null
          id: string
          lote_id: string | null
          meta_intervalo_ocupacao_dias: number | null
          modulo_id: string | null
          peso_vivo_medio_entrada_kg: number | null
          peso_vivo_medio_saida_kg: number | null
          taxa_lotacao_ua_ha: number | null
          updated_at: string | null
        }
        Insert: {
          cabecas_entrada?: number | null
          cabecas_saida?: number | null
          created_at?: string | null
          data_hora_entrada?: string | null
          data_hora_saida?: string | null
          desvio_tempo_ocupacao_percent?: number | null
          id?: string
          lote_id?: string | null
          meta_intervalo_ocupacao_dias?: number | null
          modulo_id?: string | null
          peso_vivo_medio_entrada_kg?: number | null
          peso_vivo_medio_saida_kg?: number | null
          taxa_lotacao_ua_ha?: number | null
          updated_at?: string | null
        }
        Update: {
          cabecas_entrada?: number | null
          cabecas_saida?: number | null
          created_at?: string | null
          data_hora_entrada?: string | null
          data_hora_saida?: string | null
          desvio_tempo_ocupacao_percent?: number | null
          id?: string
          lote_id?: string | null
          meta_intervalo_ocupacao_dias?: number | null
          modulo_id?: string | null
          peso_vivo_medio_entrada_kg?: number | null
          peso_vivo_medio_saida_kg?: number | null
          taxa_lotacao_ua_ha?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lote_modulo_historico_lote_id_fkey"
            columns: ["lote_id"]
            isOneToOne: false
            referencedRelation: "lotes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lote_modulo_historico_modulo_id_fkey"
            columns: ["modulo_id"]
            isOneToOne: false
            referencedRelation: "modulos_pastos"
            referencedColumns: ["id"]
          },
        ]
      }
      lote_pasto_historico: {
        Row: {
          cabecas_entrada: number | null
          cabecas_saida: number | null
          created_at: string | null
          data_final: string | null
          data_hora_entrada: string | null
          data_hora_saida: string | null
          data_inicial: string
          desvio_tempo_ocupacao_percent: number | null
          id: string
          lote_id: string | null
          meta_intervalo_ocupacao_dias: number | null
          modulo_id: string | null
          pasto_id: string | null
          peso_vivo_medio_entrada_kg: number | null
          peso_vivo_medio_saida_kg: number | null
          taxa_lotacao_ua_ha: number | null
          updated_at: string | null
        }
        Insert: {
          cabecas_entrada?: number | null
          cabecas_saida?: number | null
          created_at?: string | null
          data_final?: string | null
          data_hora_entrada?: string | null
          data_hora_saida?: string | null
          data_inicial?: string
          desvio_tempo_ocupacao_percent?: number | null
          id?: string
          lote_id?: string | null
          meta_intervalo_ocupacao_dias?: number | null
          modulo_id?: string | null
          pasto_id?: string | null
          peso_vivo_medio_entrada_kg?: number | null
          peso_vivo_medio_saida_kg?: number | null
          taxa_lotacao_ua_ha?: number | null
          updated_at?: string | null
        }
        Update: {
          cabecas_entrada?: number | null
          cabecas_saida?: number | null
          created_at?: string | null
          data_final?: string | null
          data_hora_entrada?: string | null
          data_hora_saida?: string | null
          data_inicial?: string
          desvio_tempo_ocupacao_percent?: number | null
          id?: string
          lote_id?: string | null
          meta_intervalo_ocupacao_dias?: number | null
          modulo_id?: string | null
          pasto_id?: string | null
          peso_vivo_medio_entrada_kg?: number | null
          peso_vivo_medio_saida_kg?: number | null
          taxa_lotacao_ua_ha?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lote_pasto_historico_lote_id_fkey"
            columns: ["lote_id"]
            isOneToOne: false
            referencedRelation: "lotes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lote_pasto_historico_modulo_id_fkey"
            columns: ["modulo_id"]
            isOneToOne: false
            referencedRelation: "modulos_pastos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lote_pasto_historico_pasto_id_fkey"
            columns: ["pasto_id"]
            isOneToOne: false
            referencedRelation: "pastos"
            referencedColumns: ["id"]
          },
        ]
      }
      lotes: {
        Row: {
          ativo: boolean | null
          categorias: string | null
          created_at: string | null
          custo_operacional_reais_cab_dia: number | null
          data_embarque_prevista: string | null
          data_embarque_previsto: string | null
          data_liberacao_sisbov: string | null
          data_meta: string | null
          data_pesagem: string | null
          data_proximo_rodeio: string | null
          deleted_at: string | null
          destino: string | null
          dias_restantes_meta: number | null
          estrategia_nutricional: string | null
          fazenda_id: string
          formulacao_id: string | null
          gmd: string | null
          id: string
          idade: number | null
          idade_meses: number | null
          mes_competencia: string | null
          meta_intervalo_rodeio_dias: number | null
          modulo_id: string | null
          n_cabecas: number | null
          nome: string
          numero_cabecas: number | null
          numero_contrato: string | null
          pasto_id: string | null
          periodo: number | null
          periodo_liberacao_sisbov: string | null
          peso_entrada_kg: number | null
          peso_entrada_kg_cab: number | null
          peso_vivo_kg: number | null
          peso_vivo_meta_kg: number | null
          preco_animal_cab: number | null
          preco_animal_kg: number | null
          preco_cab: number | null
          preco_kg: number | null
          produtor_rural: string | null
          propriedade_origem: string | null
          qtd_bezerros: number | null
          quant_inicial: number | null
          quantidade_bezerros: number | null
          raca: string | null
          rc_inicial: number | null
          sexo: string | null
          sistema_producao: string | null
          updated_at: string | null
        }
        Insert: {
          ativo?: boolean | null
          categorias?: string | null
          created_at?: string | null
          custo_operacional_reais_cab_dia?: number | null
          data_embarque_prevista?: string | null
          data_embarque_previsto?: string | null
          data_liberacao_sisbov?: string | null
          data_meta?: string | null
          data_pesagem?: string | null
          data_proximo_rodeio?: string | null
          deleted_at?: string | null
          destino?: string | null
          dias_restantes_meta?: number | null
          estrategia_nutricional?: string | null
          fazenda_id: string
          formulacao_id?: string | null
          gmd?: string | null
          id?: string
          idade?: number | null
          idade_meses?: number | null
          mes_competencia?: string | null
          meta_intervalo_rodeio_dias?: number | null
          modulo_id?: string | null
          n_cabecas?: number | null
          nome: string
          numero_cabecas?: number | null
          numero_contrato?: string | null
          pasto_id?: string | null
          periodo?: number | null
          periodo_liberacao_sisbov?: string | null
          peso_entrada_kg?: number | null
          peso_entrada_kg_cab?: number | null
          peso_vivo_kg?: number | null
          peso_vivo_meta_kg?: number | null
          preco_animal_cab?: number | null
          preco_animal_kg?: number | null
          preco_cab?: number | null
          preco_kg?: number | null
          produtor_rural?: string | null
          propriedade_origem?: string | null
          qtd_bezerros?: number | null
          quant_inicial?: number | null
          quantidade_bezerros?: number | null
          raca?: string | null
          rc_inicial?: number | null
          sexo?: string | null
          sistema_producao?: string | null
          updated_at?: string | null
        }
        Update: {
          ativo?: boolean | null
          categorias?: string | null
          created_at?: string | null
          custo_operacional_reais_cab_dia?: number | null
          data_embarque_prevista?: string | null
          data_embarque_previsto?: string | null
          data_liberacao_sisbov?: string | null
          data_meta?: string | null
          data_pesagem?: string | null
          data_proximo_rodeio?: string | null
          deleted_at?: string | null
          destino?: string | null
          dias_restantes_meta?: number | null
          estrategia_nutricional?: string | null
          fazenda_id?: string
          formulacao_id?: string | null
          gmd?: string | null
          id?: string
          idade?: number | null
          idade_meses?: number | null
          mes_competencia?: string | null
          meta_intervalo_rodeio_dias?: number | null
          modulo_id?: string | null
          n_cabecas?: number | null
          nome?: string
          numero_cabecas?: number | null
          numero_contrato?: string | null
          pasto_id?: string | null
          periodo?: number | null
          periodo_liberacao_sisbov?: string | null
          peso_entrada_kg?: number | null
          peso_entrada_kg_cab?: number | null
          peso_vivo_kg?: number | null
          peso_vivo_meta_kg?: number | null
          preco_animal_cab?: number | null
          preco_animal_kg?: number | null
          preco_cab?: number | null
          preco_kg?: number | null
          produtor_rural?: string | null
          propriedade_origem?: string | null
          qtd_bezerros?: number | null
          quant_inicial?: number | null
          quantidade_bezerros?: number | null
          raca?: string | null
          rc_inicial?: number | null
          sexo?: string | null
          sistema_producao?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lotes_fazenda_id_fkey"
            columns: ["fazenda_id"]
            isOneToOne: false
            referencedRelation: "fazendas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lotes_formulacao_id_fkey"
            columns: ["formulacao_id"]
            isOneToOne: false
            referencedRelation: "formulacoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lotes_modulo_id_fkey"
            columns: ["modulo_id"]
            isOneToOne: false
            referencedRelation: "modulos_pastos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lotes_pasto_id_fkey"
            columns: ["pasto_id"]
            isOneToOne: false
            referencedRelation: "pastos"
            referencedColumns: ["id"]
          },
        ]
      }
      lotes_backup_20260526: {
        Row: {
          ativo: boolean | null
          categorias: string | null
          created_at: string | null
          custo_operacional: number | null
          data_embarque_prevista: string | null
          data_embarque_previsto: string | null
          data_liberacao_sisbov: string | null
          data_meta: string | null
          data_pesagem: string | null
          dias_restantes_meta: number | null
          estrategia_nutricional: string | null
          fazenda_id: string | null
          gmd: number | null
          id: string | null
          idade: number | null
          idade_meses: number | null
          mes_competencia: string | null
          n_cabecas: number | null
          nome: string | null
          numero_cabecas: number | null
          numero_contrato: string | null
          pasto_id: string | null
          periodo: number | null
          periodo_liberacao_sisbov: string | null
          peso_entrada: number | null
          peso_entrada_kg: number | null
          peso_vivo_kg: number | null
          peso_vivo_meta_kg: number | null
          preco_animal_cab: number | null
          preco_animal_kg: number | null
          preco_cab: number | null
          preco_kg: number | null
          produtor_rural: string | null
          propriedade_origem: string | null
          qtd_bezerros: number | null
          quant_inicial: number | null
          quantidade_bezerros: number | null
          raca: string | null
          rc_inicial: number | null
          sexo: string | null
          sistema_producao: string | null
          updated_at: string | null
        }
        Insert: {
          ativo?: boolean | null
          categorias?: string | null
          created_at?: string | null
          custo_operacional?: number | null
          data_embarque_prevista?: string | null
          data_embarque_previsto?: string | null
          data_liberacao_sisbov?: string | null
          data_meta?: string | null
          data_pesagem?: string | null
          dias_restantes_meta?: number | null
          estrategia_nutricional?: string | null
          fazenda_id?: string | null
          gmd?: number | null
          id?: string | null
          idade?: number | null
          idade_meses?: number | null
          mes_competencia?: string | null
          n_cabecas?: number | null
          nome?: string | null
          numero_cabecas?: number | null
          numero_contrato?: string | null
          pasto_id?: string | null
          periodo?: number | null
          periodo_liberacao_sisbov?: string | null
          peso_entrada?: number | null
          peso_entrada_kg?: number | null
          peso_vivo_kg?: number | null
          peso_vivo_meta_kg?: number | null
          preco_animal_cab?: number | null
          preco_animal_kg?: number | null
          preco_cab?: number | null
          preco_kg?: number | null
          produtor_rural?: string | null
          propriedade_origem?: string | null
          qtd_bezerros?: number | null
          quant_inicial?: number | null
          quantidade_bezerros?: number | null
          raca?: string | null
          rc_inicial?: number | null
          sexo?: string | null
          sistema_producao?: string | null
          updated_at?: string | null
        }
        Update: {
          ativo?: boolean | null
          categorias?: string | null
          created_at?: string | null
          custo_operacional?: number | null
          data_embarque_prevista?: string | null
          data_embarque_previsto?: string | null
          data_liberacao_sisbov?: string | null
          data_meta?: string | null
          data_pesagem?: string | null
          dias_restantes_meta?: number | null
          estrategia_nutricional?: string | null
          fazenda_id?: string | null
          gmd?: number | null
          id?: string | null
          idade?: number | null
          idade_meses?: number | null
          mes_competencia?: string | null
          n_cabecas?: number | null
          nome?: string | null
          numero_cabecas?: number | null
          numero_contrato?: string | null
          pasto_id?: string | null
          periodo?: number | null
          periodo_liberacao_sisbov?: string | null
          peso_entrada?: number | null
          peso_entrada_kg?: number | null
          peso_vivo_kg?: number | null
          peso_vivo_meta_kg?: number | null
          preco_animal_cab?: number | null
          preco_animal_kg?: number | null
          preco_cab?: number | null
          preco_kg?: number | null
          produtor_rural?: string | null
          propriedade_origem?: string | null
          qtd_bezerros?: number | null
          quant_inicial?: number | null
          quantidade_bezerros?: number | null
          raca?: string | null
          rc_inicial?: number | null
          sexo?: string | null
          sistema_producao?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      mapa_estradas: {
        Row: {
          ativo: boolean
          created_at: string
          deleted_at: string | null
          fazenda_id: string
          geometria: unknown
          gid: number
          id: string
          nome: string
          source: number | null
          target: number | null
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          deleted_at?: string | null
          fazenda_id: string
          geometria: unknown
          gid?: number
          id?: string
          nome: string
          source?: number | null
          target?: number | null
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          deleted_at?: string | null
          fazenda_id?: string
          geometria?: unknown
          gid?: number
          id?: string
          nome?: string
          source?: number | null
          target?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "mapa_estradas_fazenda_id_fkey"
            columns: ["fazenda_id"]
            isOneToOne: false
            referencedRelation: "fazendas"
            referencedColumns: ["id"]
          },
        ]
      }
      mapa_estradas_vertices_pgr: {
        Row: {
          chk: number | null
          cnt: number | null
          ein: number | null
          eout: number | null
          id: number
          the_geom: unknown
        }
        Insert: {
          chk?: number | null
          cnt?: number | null
          ein?: number | null
          eout?: number | null
          id?: number
          the_geom?: unknown
        }
        Update: {
          chk?: number | null
          cnt?: number | null
          ein?: number | null
          eout?: number | null
          id?: number
          the_geom?: unknown
        }
        Relationships: []
      }
      mapa_pontos: {
        Row: {
          ativo: boolean
          created_at: string
          deleted_at: string | null
          fazenda_id: string
          geometria: unknown
          id: string
          nome: string
          tipo: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          deleted_at?: string | null
          fazenda_id: string
          geometria: unknown
          id?: string
          nome: string
          tipo: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          deleted_at?: string | null
          fazenda_id?: string
          geometria?: unknown
          id?: string
          nome?: string
          tipo?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "mapa_pontos_fazenda_id_fkey"
            columns: ["fazenda_id"]
            isOneToOne: false
            referencedRelation: "fazendas"
            referencedColumns: ["id"]
          },
        ]
      }
      mapa_versao: {
        Row: {
          fazenda_id: string
          updated_at: string
        }
        Insert: {
          fazenda_id: string
          updated_at?: string
        }
        Update: {
          fazenda_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "mapa_versao_fazenda_id_fkey"
            columns: ["fazenda_id"]
            isOneToOne: true
            referencedRelation: "fazendas"
            referencedColumns: ["id"]
          },
        ]
      }
      maquinas_veiculos: {
        Row: {
          ano: number | null
          ativo: boolean | null
          capacidade: number | null
          categoria: Database["public"]["Enums"]["maquina_veiculo_categoria"]
          created_at: string | null
          custo_hora: number | null
          custo_km: number | null
          data_proxima_manutencao: string | null
          data_ultima_manutencao: string | null
          deleted_at: string | null
          fazenda_id: string
          horimetro: number | null
          id: string
          marca: string | null
          modelo: string | null
          nome: string
          observacoes: string | null
          operador_padrao: string | null
          outro_categoria: string | null
          placa: string | null
          quilometragem: number | null
          status: Database["public"]["Enums"]["maquina_veiculo_status"]
          tipo: Database["public"]["Enums"]["maquina_veiculo_tipo"]
          tipo_combustivel: string | null
          updated_at: string | null
        }
        Insert: {
          ano?: number | null
          ativo?: boolean | null
          capacidade?: number | null
          categoria: Database["public"]["Enums"]["maquina_veiculo_categoria"]
          created_at?: string | null
          custo_hora?: number | null
          custo_km?: number | null
          data_proxima_manutencao?: string | null
          data_ultima_manutencao?: string | null
          deleted_at?: string | null
          fazenda_id: string
          horimetro?: number | null
          id?: string
          marca?: string | null
          modelo?: string | null
          nome: string
          observacoes?: string | null
          operador_padrao?: string | null
          outro_categoria?: string | null
          placa?: string | null
          quilometragem?: number | null
          status?: Database["public"]["Enums"]["maquina_veiculo_status"]
          tipo: Database["public"]["Enums"]["maquina_veiculo_tipo"]
          tipo_combustivel?: string | null
          updated_at?: string | null
        }
        Update: {
          ano?: number | null
          ativo?: boolean | null
          capacidade?: number | null
          categoria?: Database["public"]["Enums"]["maquina_veiculo_categoria"]
          created_at?: string | null
          custo_hora?: number | null
          custo_km?: number | null
          data_proxima_manutencao?: string | null
          data_ultima_manutencao?: string | null
          deleted_at?: string | null
          fazenda_id?: string
          horimetro?: number | null
          id?: string
          marca?: string | null
          modelo?: string | null
          nome?: string
          observacoes?: string | null
          operador_padrao?: string | null
          outro_categoria?: string | null
          placa?: string | null
          quilometragem?: number | null
          status?: Database["public"]["Enums"]["maquina_veiculo_status"]
          tipo?: Database["public"]["Enums"]["maquina_veiculo_tipo"]
          tipo_combustivel?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "maquinas_veiculos_fazenda_id_fkey"
            columns: ["fazenda_id"]
            isOneToOne: false
            referencedRelation: "fazendas"
            referencedColumns: ["id"]
          },
        ]
      }
      medicamentos: {
        Row: {
          ativo: boolean | null
          created_at: string | null
          deleted_at: string | null
          dose_recomendada: string | null
          fazenda_id: string
          id: string
          nome_comercial: string
          outro_tipo: string | null
          principio_ativo: string
          tipo: Database["public"]["Enums"]["medicamento_tipo"]
          updated_at: string | null
        }
        Insert: {
          ativo?: boolean | null
          created_at?: string | null
          deleted_at?: string | null
          dose_recomendada?: string | null
          fazenda_id: string
          id?: string
          nome_comercial: string
          outro_tipo?: string | null
          principio_ativo: string
          tipo: Database["public"]["Enums"]["medicamento_tipo"]
          updated_at?: string | null
        }
        Update: {
          ativo?: boolean | null
          created_at?: string | null
          deleted_at?: string | null
          dose_recomendada?: string | null
          fazenda_id?: string
          id?: string
          nome_comercial?: string
          outro_tipo?: string | null
          principio_ativo?: string
          tipo?: Database["public"]["Enums"]["medicamento_tipo"]
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "medicamentos_fazenda_id_fkey"
            columns: ["fazenda_id"]
            isOneToOne: false
            referencedRelation: "fazendas"
            referencedColumns: ["id"]
          },
        ]
      }
      mineral: {
        Row: {
          ativo: boolean | null
          composicao: Json | null
          consumo_meta_porcentagem_pesovivo: number | null
          created_at: string | null
          custo_saco: number | null
          custo_total_estoque: number | null
          custo_unitario: number | null
          espacamento_ideal_cocho: number | null
          estoque_atual: number | null
          estoque_minimo: number | null
          fabricante: string | null
          fazenda_id: string
          fornecedor: string | null
          id: string
          marca: string | null
          nome: string
          peso_saco: number | null
          tipo: string | null
          unidade_medida: string | null
          updated_at: string | null
        }
        Insert: {
          ativo?: boolean | null
          composicao?: Json | null
          consumo_meta_porcentagem_pesovivo?: number | null
          created_at?: string | null
          custo_saco?: number | null
          custo_total_estoque?: number | null
          custo_unitario?: number | null
          espacamento_ideal_cocho?: number | null
          estoque_atual?: number | null
          estoque_minimo?: number | null
          fabricante?: string | null
          fazenda_id: string
          fornecedor?: string | null
          id?: string
          marca?: string | null
          nome: string
          peso_saco?: number | null
          tipo?: string | null
          unidade_medida?: string | null
          updated_at?: string | null
        }
        Update: {
          ativo?: boolean | null
          composicao?: Json | null
          consumo_meta_porcentagem_pesovivo?: number | null
          created_at?: string | null
          custo_saco?: number | null
          custo_total_estoque?: number | null
          custo_unitario?: number | null
          espacamento_ideal_cocho?: number | null
          estoque_atual?: number | null
          estoque_minimo?: number | null
          fabricante?: string | null
          fazenda_id?: string
          fornecedor?: string | null
          id?: string
          marca?: string | null
          nome?: string
          peso_saco?: number | null
          tipo?: string | null
          unidade_medida?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "mineral_fazenda_id_fkey"
            columns: ["fazenda_id"]
            isOneToOne: false
            referencedRelation: "fazendas"
            referencedColumns: ["id"]
          },
        ]
      }
      modulos_pastos: {
        Row: {
          area_util_total_ha: number | null
          ativo: boolean | null
          created_at: string | null
          deleted_at: string | null
          fazenda_id: string
          id: string
          meta_intervalo_ocupacao_dias: number | null
          nome: string
          responsavel: string | null
          setor_id: string | null
          sistema_producao: string | null
          updated_at: string | null
        }
        Insert: {
          area_util_total_ha?: number | null
          ativo?: boolean | null
          created_at?: string | null
          deleted_at?: string | null
          fazenda_id: string
          id?: string
          meta_intervalo_ocupacao_dias?: number | null
          nome: string
          responsavel?: string | null
          setor_id?: string | null
          sistema_producao?: string | null
          updated_at?: string | null
        }
        Update: {
          area_util_total_ha?: number | null
          ativo?: boolean | null
          created_at?: string | null
          deleted_at?: string | null
          fazenda_id?: string
          id?: string
          meta_intervalo_ocupacao_dias?: number | null
          nome?: string
          responsavel?: string | null
          setor_id?: string | null
          sistema_producao?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "modulos_pastos_fazenda_id_fkey"
            columns: ["fazenda_id"]
            isOneToOne: false
            referencedRelation: "fazendas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "modulos_pastos_setor_id_fkey"
            columns: ["setor_id"]
            isOneToOne: false
            referencedRelation: "setores"
            referencedColumns: ["id"]
          },
        ]
      }
      movimentacao_estoque: {
        Row: {
          created_at: string | null
          criado_por: string | null
          custo_total: number | null
          custo_unitario: number | null
          data_movimentacao: string
          fazenda_id: string
          fornecedor: string | null
          id: string
          insumo_id: string | null
          motivo: string | null
          nota_fiscal: string | null
          quantidade: number
          registro_id: string
          tabela_origem: string
          tipo_movimentacao: string
        }
        Insert: {
          created_at?: string | null
          criado_por?: string | null
          custo_total?: number | null
          custo_unitario?: number | null
          data_movimentacao?: string
          fazenda_id: string
          fornecedor?: string | null
          id?: string
          insumo_id?: string | null
          motivo?: string | null
          nota_fiscal?: string | null
          quantidade: number
          registro_id: string
          tabela_origem: string
          tipo_movimentacao: string
        }
        Update: {
          created_at?: string | null
          criado_por?: string | null
          custo_total?: number | null
          custo_unitario?: number | null
          data_movimentacao?: string
          fazenda_id?: string
          fornecedor?: string | null
          id?: string
          insumo_id?: string | null
          motivo?: string | null
          nota_fiscal?: string | null
          quantidade?: number
          registro_id?: string
          tabela_origem?: string
          tipo_movimentacao?: string
        }
        Relationships: [
          {
            foreignKeyName: "movimentacao_estoque_fazenda_id_fkey"
            columns: ["fazenda_id"]
            isOneToOne: false
            referencedRelation: "fazendas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "movimentacao_estoque_insumo_id_fkey"
            columns: ["insumo_id"]
            isOneToOne: false
            referencedRelation: "insumos"
            referencedColumns: ["id"]
          },
        ]
      }
      movimentacoes_almoxarifado: {
        Row: {
          aprovacao_manual: boolean
          created_at: string
          custo_unitario: number | null
          data: string
          deleted_at: string | null
          fazenda_id: string
          fornecedor: string | null
          id: string
          item_id: string
          local_id: string | null
          observacao: string | null
          origem: string | null
          quantidade: number
          quantidade_aprovada: number
          registro_origem_id: string | null
          requer_revisao: boolean
          retirada_id: string | null
          retirada_item_index: number | null
          tipo_movimentacao: string
          unidade: string | null
          updated_at: string
          valor_total: number | null
        }
        Insert: {
          aprovacao_manual?: boolean
          created_at?: string
          custo_unitario?: number | null
          data?: string
          deleted_at?: string | null
          fazenda_id: string
          fornecedor?: string | null
          id?: string
          item_id: string
          local_id?: string | null
          observacao?: string | null
          origem?: string | null
          quantidade: number
          quantidade_aprovada?: number
          registro_origem_id?: string | null
          requer_revisao?: boolean
          retirada_id?: string | null
          retirada_item_index?: number | null
          tipo_movimentacao: string
          unidade?: string | null
          updated_at?: string
          valor_total?: number | null
        }
        Update: {
          aprovacao_manual?: boolean
          created_at?: string
          custo_unitario?: number | null
          data?: string
          deleted_at?: string | null
          fazenda_id?: string
          fornecedor?: string | null
          id?: string
          item_id?: string
          local_id?: string | null
          observacao?: string | null
          origem?: string | null
          quantidade?: number
          quantidade_aprovada?: number
          registro_origem_id?: string | null
          requer_revisao?: boolean
          retirada_id?: string | null
          retirada_item_index?: number | null
          tipo_movimentacao?: string
          unidade?: string | null
          updated_at?: string
          valor_total?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "movimentacoes_almoxarifado_fazenda_id_fkey"
            columns: ["fazenda_id"]
            isOneToOne: false
            referencedRelation: "fazendas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "movimentacoes_almoxarifado_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "itens_almoxarifado"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "movimentacoes_almoxarifado_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "itens_almoxarifado_pwa"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "movimentacoes_almoxarifado_registro_origem_id_fkey"
            columns: ["registro_origem_id"]
            isOneToOne: false
            referencedRelation: "registros_almoxarifado"
            referencedColumns: ["id"]
          },
        ]
      }
      movimentacoes_cantina: {
        Row: {
          created_at: string
          custo_unitario: number | null
          data: string
          deleted_at: string | null
          fazenda_id: string
          fornecedor: string | null
          id: string
          item_id: string
          local_id: string | null
          observacao: string | null
          origem: string | null
          quantidade: number
          registro_origem_id: string | null
          tipo_movimentacao: string
          unidade: string | null
          updated_at: string
          valor_total: number | null
        }
        Insert: {
          created_at?: string
          custo_unitario?: number | null
          data?: string
          deleted_at?: string | null
          fazenda_id: string
          fornecedor?: string | null
          id?: string
          item_id: string
          local_id?: string | null
          observacao?: string | null
          origem?: string | null
          quantidade: number
          registro_origem_id?: string | null
          tipo_movimentacao: string
          unidade?: string | null
          updated_at?: string
          valor_total?: number | null
        }
        Update: {
          created_at?: string
          custo_unitario?: number | null
          data?: string
          deleted_at?: string | null
          fazenda_id?: string
          fornecedor?: string | null
          id?: string
          item_id?: string
          local_id?: string | null
          observacao?: string | null
          origem?: string | null
          quantidade?: number
          registro_origem_id?: string | null
          tipo_movimentacao?: string
          unidade?: string | null
          updated_at?: string
          valor_total?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "movimentacoes_cantina_fazenda_id_fkey"
            columns: ["fazenda_id"]
            isOneToOne: false
            referencedRelation: "fazendas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "movimentacoes_cantina_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "itens_cantina"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "movimentacoes_cantina_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "itens_cantina_pwa"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "movimentacoes_cantina_registro_origem_id_fkey"
            columns: ["registro_origem_id"]
            isOneToOne: false
            referencedRelation: "registros_alimentacao"
            referencedColumns: ["id"]
          },
        ]
      }
      movimentacoes_combustivel: {
        Row: {
          created_at: string | null
          data: string
          fazenda_id: string
          fornecedor: string | null
          id: string
          local_id: string | null
          nome_motorista: string | null
          nota_fiscal: string | null
          observacao: string | null
          origem: string
          placa_veiculo: string | null
          preco_por_litro: number | null
          quantidade_l: number
          registro_abastecimento_id: string | null
          tanque_id: string
          tipo_movimentacao: string
          updated_at: string | null
          valor_total: number | null
        }
        Insert: {
          created_at?: string | null
          data?: string
          fazenda_id: string
          fornecedor?: string | null
          id?: string
          local_id?: string | null
          nome_motorista?: string | null
          nota_fiscal?: string | null
          observacao?: string | null
          origem?: string
          placa_veiculo?: string | null
          preco_por_litro?: number | null
          quantidade_l: number
          registro_abastecimento_id?: string | null
          tanque_id: string
          tipo_movimentacao: string
          updated_at?: string | null
          valor_total?: number | null
        }
        Update: {
          created_at?: string | null
          data?: string
          fazenda_id?: string
          fornecedor?: string | null
          id?: string
          local_id?: string | null
          nome_motorista?: string | null
          nota_fiscal?: string | null
          observacao?: string | null
          origem?: string
          placa_veiculo?: string | null
          preco_por_litro?: number | null
          quantidade_l?: number
          registro_abastecimento_id?: string | null
          tanque_id?: string
          tipo_movimentacao?: string
          updated_at?: string | null
          valor_total?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "movimentacoes_combustivel_fazenda_id_fkey"
            columns: ["fazenda_id"]
            isOneToOne: false
            referencedRelation: "fazendas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "movimentacoes_combustivel_registro_abastecimento_id_fkey"
            columns: ["registro_abastecimento_id"]
            isOneToOne: false
            referencedRelation: "registros_abastecimento"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "movimentacoes_combustivel_tanque_id_fkey"
            columns: ["tanque_id"]
            isOneToOne: false
            referencedRelation: "tanques_combustivel"
            referencedColumns: ["id"]
          },
        ]
      }
      movimentacoes_estoque_suplementos: {
        Row: {
          created_at: string
          custo_unitario: number | null
          data: string | null
          deleted_at: string | null
          fazenda_id: string
          id: string
          item_id: string
          item_tipo: string
          local_id: string | null
          observacao: string | null
          origem: string | null
          quantidade: number
          registro_origem_id: string | null
          saldo_anterior: number | null
          saldo_posterior: number | null
          tipo_movimentacao: string
          updated_at: string
          usuario_id: string | null
          valor_total: number | null
        }
        Insert: {
          created_at?: string
          custo_unitario?: number | null
          data?: string | null
          deleted_at?: string | null
          fazenda_id: string
          id?: string
          item_id: string
          item_tipo: string
          local_id?: string | null
          observacao?: string | null
          origem?: string | null
          quantidade: number
          registro_origem_id?: string | null
          saldo_anterior?: number | null
          saldo_posterior?: number | null
          tipo_movimentacao: string
          updated_at?: string
          usuario_id?: string | null
          valor_total?: number | null
        }
        Update: {
          created_at?: string
          custo_unitario?: number | null
          data?: string | null
          deleted_at?: string | null
          fazenda_id?: string
          id?: string
          item_id?: string
          item_tipo?: string
          local_id?: string | null
          observacao?: string | null
          origem?: string | null
          quantidade?: number
          registro_origem_id?: string | null
          saldo_anterior?: number | null
          saldo_posterior?: number | null
          tipo_movimentacao?: string
          updated_at?: string
          usuario_id?: string | null
          valor_total?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "movimentacoes_estoque_suplementos_fazenda_id_fkey"
            columns: ["fazenda_id"]
            isOneToOne: false
            referencedRelation: "fazendas"
            referencedColumns: ["id"]
          },
        ]
      }
      notas_leitura_cocho_config: {
        Row: {
          created_at: string | null
          descricao: string | null
          fazenda_id: string
          id: string
          nota: number
          percentual_ajuste: number
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          descricao?: string | null
          fazenda_id: string
          id?: string
          nota: number
          percentual_ajuste: number
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          descricao?: string | null
          fazenda_id?: string
          id?: string
          nota?: number
          percentual_ajuste?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notas_leitura_cocho_config_fazenda_id_fkey"
            columns: ["fazenda_id"]
            isOneToOne: false
            referencedRelation: "fazendas"
            referencedColumns: ["id"]
          },
        ]
      }
      notificacoes: {
        Row: {
          acao_label: string | null
          acao_url: string | null
          created_at: string | null
          dados_jsonb: Json | null
          deleted_at: string | null
          fazenda_id: string
          id: string
          lida: boolean | null
          mensagem: string
          tipo: string
          titulo: string
          updated_at: string | null
          usuario_id: string
        }
        Insert: {
          acao_label?: string | null
          acao_url?: string | null
          created_at?: string | null
          dados_jsonb?: Json | null
          deleted_at?: string | null
          fazenda_id: string
          id?: string
          lida?: boolean | null
          mensagem: string
          tipo: string
          titulo: string
          updated_at?: string | null
          usuario_id: string
        }
        Update: {
          acao_label?: string | null
          acao_url?: string | null
          created_at?: string | null
          dados_jsonb?: Json | null
          deleted_at?: string | null
          fazenda_id?: string
          id?: string
          lida?: boolean | null
          mensagem?: string
          tipo?: string
          titulo?: string
          updated_at?: string | null
          usuario_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notificacoes_fazenda_id_fkey"
            columns: ["fazenda_id"]
            isOneToOne: false
            referencedRelation: "fazendas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notificacoes_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      notificacoes_config: {
        Row: {
          created_at: string | null
          fazenda_id: string
          id: string
          recategorizacao_ativo: boolean
          threshold_recategorizacao: number
          tratos_ativo: boolean
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          fazenda_id: string
          id?: string
          recategorizacao_ativo?: boolean
          threshold_recategorizacao?: number
          tratos_ativo?: boolean
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          fazenda_id?: string
          id?: string
          recategorizacao_ativo?: boolean
          threshold_recategorizacao?: number
          tratos_ativo?: boolean
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notificacoes_config_fazenda_id_fkey"
            columns: ["fazenda_id"]
            isOneToOne: true
            referencedRelation: "fazendas"
            referencedColumns: ["id"]
          },
        ]
      }
      ordens_servico: {
        Row: {
          ano: number | null
          cancelada_at: string | null
          categoria: string | null
          closed_at: string | null
          closed_by: string | null
          comprador: string | null
          corretora: string | null
          created_at: string | null
          data: string | null
          data_credito: string | null
          data_prevista_abate: string | null
          data_prevista_embarque: string | null
          data_prevista_pagamento: string | null
          deleted_at: string | null
          dispositivo_id: string | null
          fazenda_id: string
          id: string
          idade_era: string | null
          local_id: string | null
          motivo_cancelamento: string | null
          nome_usuario: string | null
          numero_os: string | null
          observacao: string | null
          preco_arroba: number | null
          quantidade_embarcada: number | null
          quantidade_prevista: number | null
          sequencial: number | null
          sexo: string | null
          status: string
          sync_status: string | null
          tipo: string
          tipo_venda: string | null
          updated_at: string | null
          valor_acerto: number | null
          venda_direta: boolean | null
          vendedor: string | null
          version: number | null
        }
        Insert: {
          ano?: number | null
          cancelada_at?: string | null
          categoria?: string | null
          closed_at?: string | null
          closed_by?: string | null
          comprador?: string | null
          corretora?: string | null
          created_at?: string | null
          data?: string | null
          data_credito?: string | null
          data_prevista_abate?: string | null
          data_prevista_embarque?: string | null
          data_prevista_pagamento?: string | null
          deleted_at?: string | null
          dispositivo_id?: string | null
          fazenda_id: string
          id?: string
          idade_era?: string | null
          local_id?: string | null
          motivo_cancelamento?: string | null
          nome_usuario?: string | null
          numero_os?: string | null
          observacao?: string | null
          preco_arroba?: number | null
          quantidade_embarcada?: number | null
          quantidade_prevista?: number | null
          sequencial?: number | null
          sexo?: string | null
          status?: string
          sync_status?: string | null
          tipo: string
          tipo_venda?: string | null
          updated_at?: string | null
          valor_acerto?: number | null
          venda_direta?: boolean | null
          vendedor?: string | null
          version?: number | null
        }
        Update: {
          ano?: number | null
          cancelada_at?: string | null
          categoria?: string | null
          closed_at?: string | null
          closed_by?: string | null
          comprador?: string | null
          corretora?: string | null
          created_at?: string | null
          data?: string | null
          data_credito?: string | null
          data_prevista_abate?: string | null
          data_prevista_embarque?: string | null
          data_prevista_pagamento?: string | null
          deleted_at?: string | null
          dispositivo_id?: string | null
          fazenda_id?: string
          id?: string
          idade_era?: string | null
          local_id?: string | null
          motivo_cancelamento?: string | null
          nome_usuario?: string | null
          numero_os?: string | null
          observacao?: string | null
          preco_arroba?: number | null
          quantidade_embarcada?: number | null
          quantidade_prevista?: number | null
          sequencial?: number | null
          sexo?: string | null
          status?: string
          sync_status?: string | null
          tipo?: string
          tipo_venda?: string | null
          updated_at?: string | null
          valor_acerto?: number | null
          venda_direta?: boolean | null
          vendedor?: string | null
          version?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "ordens_servico_closed_by_fkey"
            columns: ["closed_by"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ordens_servico_dispositivo_id_fkey"
            columns: ["dispositivo_id"]
            isOneToOne: false
            referencedRelation: "dispositivos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ordens_servico_fazenda_id_fkey"
            columns: ["fazenda_id"]
            isOneToOne: false
            referencedRelation: "fazendas"
            referencedColumns: ["id"]
          },
        ]
      }
      os_contadores: {
        Row: {
          ano: number
          fazenda_id: string
          tipo: string
          ultimo_sequencial: number
        }
        Insert: {
          ano: number
          fazenda_id: string
          tipo: string
          ultimo_sequencial?: number
        }
        Update: {
          ano?: number
          fazenda_id?: string
          tipo?: string
          ultimo_sequencial?: number
        }
        Relationships: [
          {
            foreignKeyName: "os_contadores_fazenda_id_fkey"
            columns: ["fazenda_id"]
            isOneToOne: false
            referencedRelation: "fazendas"
            referencedColumns: ["id"]
          },
        ]
      }
      os_documentos: {
        Row: {
          arquivo_url: string
          created_at: string | null
          deleted_at: string | null
          fazenda_id: string
          id: string
          nome_arquivo: string | null
          os_id: string
          tipo: string
          uploaded_by: string | null
        }
        Insert: {
          arquivo_url: string
          created_at?: string | null
          deleted_at?: string | null
          fazenda_id: string
          id?: string
          nome_arquivo?: string | null
          os_id: string
          tipo: string
          uploaded_by?: string | null
        }
        Update: {
          arquivo_url?: string
          created_at?: string | null
          deleted_at?: string | null
          fazenda_id?: string
          id?: string
          nome_arquivo?: string | null
          os_id?: string
          tipo?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "os_documentos_fazenda_id_fkey"
            columns: ["fazenda_id"]
            isOneToOne: false
            referencedRelation: "fazendas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "os_documentos_os_id_fkey"
            columns: ["os_id"]
            isOneToOne: false
            referencedRelation: "ordens_servico"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "os_documentos_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      pasto_bebedouros: {
        Row: {
          bebedouro_id: string
          created_at: string
          id: string
          pasto_id: string
        }
        Insert: {
          bebedouro_id: string
          created_at?: string
          id?: string
          pasto_id: string
        }
        Update: {
          bebedouro_id?: string
          created_at?: string
          id?: string
          pasto_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pasto_bebedouros_bebedouro_id_fkey"
            columns: ["bebedouro_id"]
            isOneToOne: false
            referencedRelation: "bebedouros"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pasto_bebedouros_pasto_id_fkey"
            columns: ["pasto_id"]
            isOneToOne: false
            referencedRelation: "pastos"
            referencedColumns: ["id"]
          },
        ]
      }
      pastos: {
        Row: {
          altura_entrada_cm: number | null
          altura_saida_cm: number | null
          area_total_ha: number | null
          area_util_ha: number | null
          area_util_porcentagem: number | null
          ativo: boolean | null
          bebedouros: Json | null
          created_at: string | null
          deleted_at: string | null
          especie: string | null
          fazenda_id: string
          fonte_agua_principal: string | null
          geometria: unknown
          id: string
          kg_deposito: number | null
          meta_intervalo_ocupacao_dias: number | null
          metragem_cocho_m: number | null
          modulo_id: string | null
          nivel_degradacao: number | null
          nome: string
          possui_deposito: boolean | null
          setor: string | null
          tipo: string | null
          updated_at: string | null
        }
        Insert: {
          altura_entrada_cm?: number | null
          altura_saida_cm?: number | null
          area_total_ha?: number | null
          area_util_ha?: number | null
          area_util_porcentagem?: number | null
          ativo?: boolean | null
          bebedouros?: Json | null
          created_at?: string | null
          deleted_at?: string | null
          especie?: string | null
          fazenda_id: string
          fonte_agua_principal?: string | null
          geometria?: unknown
          id?: string
          kg_deposito?: number | null
          meta_intervalo_ocupacao_dias?: number | null
          metragem_cocho_m?: number | null
          modulo_id?: string | null
          nivel_degradacao?: number | null
          nome: string
          possui_deposito?: boolean | null
          setor?: string | null
          tipo?: string | null
          updated_at?: string | null
        }
        Update: {
          altura_entrada_cm?: number | null
          altura_saida_cm?: number | null
          area_total_ha?: number | null
          area_util_ha?: number | null
          area_util_porcentagem?: number | null
          ativo?: boolean | null
          bebedouros?: Json | null
          created_at?: string | null
          deleted_at?: string | null
          especie?: string | null
          fazenda_id?: string
          fonte_agua_principal?: string | null
          geometria?: unknown
          id?: string
          kg_deposito?: number | null
          meta_intervalo_ocupacao_dias?: number | null
          metragem_cocho_m?: number | null
          modulo_id?: string | null
          nivel_degradacao?: number | null
          nome?: string
          possui_deposito?: boolean | null
          setor?: string | null
          tipo?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pastos_fazenda_id_fkey"
            columns: ["fazenda_id"]
            isOneToOne: false
            referencedRelation: "fazendas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pastos_modulo_id_fkey"
            columns: ["modulo_id"]
            isOneToOne: false
            referencedRelation: "modulos_pastos"
            referencedColumns: ["id"]
          },
        ]
      }
      peoes: {
        Row: {
          ativo: boolean | null
          created_at: string | null
          email: string
          fazenda_id: string
          id: string
          password: string
        }
        Insert: {
          ativo?: boolean | null
          created_at?: string | null
          email: string
          fazenda_id: string
          id?: string
          password: string
        }
        Update: {
          ativo?: boolean | null
          created_at?: string | null
          email?: string
          fazenda_id?: string
          id?: string
          password?: string
        }
        Relationships: []
      }
      peso_correcoes: {
        Row: {
          created_at: string
          data_pesagem: string
          fazenda_id: string
          id: string
          lote_categoria_id: string
          lote_id: string
          motivo: string | null
          peso_anterior_kg_cab: number
          peso_novo_kg_cab: number
          usuario_id: string | null
        }
        Insert: {
          created_at?: string
          data_pesagem: string
          fazenda_id: string
          id?: string
          lote_categoria_id: string
          lote_id: string
          motivo?: string | null
          peso_anterior_kg_cab: number
          peso_novo_kg_cab: number
          usuario_id?: string | null
        }
        Update: {
          created_at?: string
          data_pesagem?: string
          fazenda_id?: string
          id?: string
          lote_categoria_id?: string
          lote_id?: string
          motivo?: string | null
          peso_anterior_kg_cab?: number
          peso_novo_kg_cab?: number
          usuario_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "peso_correcoes_fazenda_id_fkey"
            columns: ["fazenda_id"]
            isOneToOne: false
            referencedRelation: "fazendas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "peso_correcoes_lote_categoria_id_fkey"
            columns: ["lote_categoria_id"]
            isOneToOne: false
            referencedRelation: "lote_categorias"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "peso_correcoes_lote_id_fkey"
            columns: ["lote_id"]
            isOneToOne: false
            referencedRelation: "lotes"
            referencedColumns: ["id"]
          },
        ]
      }
      plano_categoria_personalizacao: {
        Row: {
          ativo: boolean
          created_at: string
          data_fim_individual: string | null
          id: string
          lote_categoria_id: string
          periodo_dias: number | null
          peso_inicio_kg_cab: number | null
          peso_meta_kg: number | null
          plano_id: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          data_fim_individual?: string | null
          id?: string
          lote_categoria_id: string
          periodo_dias?: number | null
          peso_inicio_kg_cab?: number | null
          peso_meta_kg?: number | null
          plano_id: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          data_fim_individual?: string | null
          id?: string
          lote_categoria_id?: string
          periodo_dias?: number | null
          peso_inicio_kg_cab?: number | null
          peso_meta_kg?: number | null
          plano_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "plano_categoria_personalizacao_lote_categoria_id_fkey"
            columns: ["lote_categoria_id"]
            isOneToOne: false
            referencedRelation: "lote_categorias"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plano_categoria_personalizacao_plano_id_fkey"
            columns: ["plano_id"]
            isOneToOne: false
            referencedRelation: "planos_nutricionais"
            referencedColumns: ["id"]
          },
        ]
      }
      planos_nutricionais: {
        Row: {
          ativo: boolean | null
          condicao_migracao: string | null
          created_at: string | null
          data_fim: string | null
          data_inicio: string | null
          fazenda_id: string
          formulacao_id: string
          gmd_planejado: number | null
          id: string
          lote_categoria_id: string | null
          lote_id: string | null
          migracao_automatica: boolean
          nome: string
          ordem: number
          periodo_dias: number
          peso_inicio_kg_cab: number | null
          peso_meta_kg: number
          rc_inicio: number | null
          updated_at: string | null
        }
        Insert: {
          ativo?: boolean | null
          condicao_migracao?: string | null
          created_at?: string | null
          data_fim?: string | null
          data_inicio?: string | null
          fazenda_id: string
          formulacao_id: string
          gmd_planejado?: number | null
          id?: string
          lote_categoria_id?: string | null
          lote_id?: string | null
          migracao_automatica?: boolean
          nome: string
          ordem?: number
          periodo_dias: number
          peso_inicio_kg_cab?: number | null
          peso_meta_kg: number
          rc_inicio?: number | null
          updated_at?: string | null
        }
        Update: {
          ativo?: boolean | null
          condicao_migracao?: string | null
          created_at?: string | null
          data_fim?: string | null
          data_inicio?: string | null
          fazenda_id?: string
          formulacao_id?: string
          gmd_planejado?: number | null
          id?: string
          lote_categoria_id?: string | null
          lote_id?: string | null
          migracao_automatica?: boolean
          nome?: string
          ordem?: number
          periodo_dias?: number
          peso_inicio_kg_cab?: number | null
          peso_meta_kg?: number
          rc_inicio?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "planos_nutricionais_fazenda_id_fkey"
            columns: ["fazenda_id"]
            isOneToOne: false
            referencedRelation: "fazendas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "planos_nutricionais_formulacao_id_fkey"
            columns: ["formulacao_id"]
            isOneToOne: false
            referencedRelation: "formulacoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "planos_nutricionais_lote_categoria_id_fkey"
            columns: ["lote_categoria_id"]
            isOneToOne: false
            referencedRelation: "lote_categorias"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "planos_nutricionais_lote_id_fkey"
            columns: ["lote_id"]
            isOneToOne: false
            referencedRelation: "lotes"
            referencedColumns: ["id"]
          },
        ]
      }
      planos_nutricionais_snapshots: {
        Row: {
          created_at: string | null
          duracao_dias: number | null
          fazenda_id: string
          ganho_peso_total_kg_cab: number | null
          gmd_planejado: number | null
          gmd_realizado: number | null
          id: string
          lote_categoria_id: string
          metricas_derivadas: Json | null
          mortalidade_percent: number | null
          motivo_migracao: string | null
          plano_anterior_id: string | null
          plano_nutricional_id: string
          plano_posterior_id: string | null
          producao_arroba_lote: number | null
          snapshot: Json
          tipo_snapshot: string
        }
        Insert: {
          created_at?: string | null
          duracao_dias?: number | null
          fazenda_id: string
          ganho_peso_total_kg_cab?: number | null
          gmd_planejado?: number | null
          gmd_realizado?: number | null
          id?: string
          lote_categoria_id: string
          metricas_derivadas?: Json | null
          mortalidade_percent?: number | null
          motivo_migracao?: string | null
          plano_anterior_id?: string | null
          plano_nutricional_id: string
          plano_posterior_id?: string | null
          producao_arroba_lote?: number | null
          snapshot: Json
          tipo_snapshot?: string
        }
        Update: {
          created_at?: string | null
          duracao_dias?: number | null
          fazenda_id?: string
          ganho_peso_total_kg_cab?: number | null
          gmd_planejado?: number | null
          gmd_realizado?: number | null
          id?: string
          lote_categoria_id?: string
          metricas_derivadas?: Json | null
          mortalidade_percent?: number | null
          motivo_migracao?: string | null
          plano_anterior_id?: string | null
          plano_nutricional_id?: string
          plano_posterior_id?: string | null
          producao_arroba_lote?: number | null
          snapshot?: Json
          tipo_snapshot?: string
        }
        Relationships: [
          {
            foreignKeyName: "planos_nutricionais_snapshots_fazenda_id_fkey"
            columns: ["fazenda_id"]
            isOneToOne: false
            referencedRelation: "fazendas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "planos_nutricionais_snapshots_lote_categoria_id_fkey"
            columns: ["lote_categoria_id"]
            isOneToOne: false
            referencedRelation: "lote_categorias"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "planos_nutricionais_snapshots_plano_anterior_id_fkey"
            columns: ["plano_anterior_id"]
            isOneToOne: false
            referencedRelation: "planos_nutricionais"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "planos_nutricionais_snapshots_plano_nutricional_id_fkey"
            columns: ["plano_nutricional_id"]
            isOneToOne: false
            referencedRelation: "planos_nutricionais"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "planos_nutricionais_snapshots_plano_posterior_id_fkey"
            columns: ["plano_posterior_id"]
            isOneToOne: false
            referencedRelation: "planos_nutricionais"
            referencedColumns: ["id"]
          },
        ]
      }
      pluviometros: {
        Row: {
          ativo: boolean | null
          created_at: string | null
          deleted_at: string | null
          fazenda_id: string
          id: string
          localizacao: string
          nome: string
          updated_at: string | null
        }
        Insert: {
          ativo?: boolean | null
          created_at?: string | null
          deleted_at?: string | null
          fazenda_id: string
          id?: string
          localizacao: string
          nome: string
          updated_at?: string | null
        }
        Update: {
          ativo?: boolean | null
          created_at?: string | null
          deleted_at?: string | null
          fazenda_id?: string
          id?: string
          localizacao?: string
          nome?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pluviometros_fazenda_id_fkey"
            columns: ["fazenda_id"]
            isOneToOne: false
            referencedRelation: "fazendas"
            referencedColumns: ["id"]
          },
        ]
      }
      precos_categorias: {
        Row: {
          categoria: string
          fazenda_id: string
          id: string
          preco_kg: number
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          categoria: string
          fazenda_id: string
          id?: string
          preco_kg?: number
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          categoria?: string
          fazenda_id?: string
          id?: string
          preco_kg?: number
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "precos_categorias_fazenda_id_fkey"
            columns: ["fazenda_id"]
            isOneToOne: false
            referencedRelation: "fazendas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "precos_categorias_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      prioridades_atividades: {
        Row: {
          fazenda_id: string
          id: string
          nivel: number
          nome: string
        }
        Insert: {
          fazenda_id: string
          id?: string
          nivel: number
          nome: string
        }
        Update: {
          fazenda_id?: string
          id?: string
          nivel?: number
          nome?: string
        }
        Relationships: [
          {
            foreignKeyName: "prioridades_atividades_fazenda_id_fkey"
            columns: ["fazenda_id"]
            isOneToOne: false
            referencedRelation: "fazendas"
            referencedColumns: ["id"]
          },
        ]
      }
      programacao_tratos: {
        Row: {
          ativo: boolean
          created_at: string
          data_fim: string
          data_inicio: string
          fazenda_id: string
          id: string
          quantidade_tratos: number
          tipo: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          data_fim: string
          data_inicio: string
          fazenda_id: string
          id?: string
          quantidade_tratos?: number
          tipo?: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          data_fim?: string
          data_inicio?: string
          fazenda_id?: string
          id?: string
          quantidade_tratos?: number
          tipo?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "programacao_tratos_fazenda_id_fkey"
            columns: ["fazenda_id"]
            isOneToOne: false
            referencedRelation: "fazendas"
            referencedColumns: ["id"]
          },
        ]
      }
      programacao_tratos_currais: {
        Row: {
          created_at: string
          curral_id: string
          id: string
          kg_mn_dia: number
          lote_id: string | null
          n_cabecas_snapshot: number | null
          peso_vivo_medio_snapshot: number | null
          programacao_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          curral_id: string
          id?: string
          kg_mn_dia?: number
          lote_id?: string | null
          n_cabecas_snapshot?: number | null
          peso_vivo_medio_snapshot?: number | null
          programacao_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          curral_id?: string
          id?: string
          kg_mn_dia?: number
          lote_id?: string | null
          n_cabecas_snapshot?: number | null
          peso_vivo_medio_snapshot?: number | null
          programacao_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "programacao_tratos_currais_curral_id_fkey"
            columns: ["curral_id"]
            isOneToOne: false
            referencedRelation: "currais"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "programacao_tratos_currais_lote_id_fkey"
            columns: ["lote_id"]
            isOneToOne: false
            referencedRelation: "lotes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "programacao_tratos_currais_programacao_id_fkey"
            columns: ["programacao_id"]
            isOneToOne: false
            referencedRelation: "programacao_tratos"
            referencedColumns: ["id"]
          },
        ]
      }
      programacao_tratos_percentuais: {
        Row: {
          created_at: string
          horario_sugerido: string | null
          id: string
          ordem_trato: number
          percentual: number
          programacao_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          horario_sugerido?: string | null
          id?: string
          ordem_trato: number
          percentual?: number
          programacao_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          horario_sugerido?: string | null
          id?: string
          ordem_trato?: number
          percentual?: number
          programacao_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "programacao_tratos_percentuais_programacao_id_fkey"
            columns: ["programacao_id"]
            isOneToOne: false
            referencedRelation: "programacao_tratos"
            referencedColumns: ["id"]
          },
        ]
      }
      proteinado: {
        Row: {
          ativo: boolean | null
          composicao: Json | null
          consumo_meta_porcentagem_pesovivo: number | null
          created_at: string | null
          custo_saco: number | null
          custo_total_estoque: number | null
          custo_unitario: number | null
          espacamento_ideal_cocho: number | null
          estoque_atual: number | null
          estoque_minimo: number | null
          fabricante: string | null
          fazenda_id: string
          fornecedor: string | null
          id: string
          marca: string | null
          nome: string
          peso_saco: number | null
          teor_proteico: number | null
          tipo: string | null
          unidade_medida: string | null
          updated_at: string | null
        }
        Insert: {
          ativo?: boolean | null
          composicao?: Json | null
          consumo_meta_porcentagem_pesovivo?: number | null
          created_at?: string | null
          custo_saco?: number | null
          custo_total_estoque?: number | null
          custo_unitario?: number | null
          espacamento_ideal_cocho?: number | null
          estoque_atual?: number | null
          estoque_minimo?: number | null
          fabricante?: string | null
          fazenda_id: string
          fornecedor?: string | null
          id?: string
          marca?: string | null
          nome: string
          peso_saco?: number | null
          teor_proteico?: number | null
          tipo?: string | null
          unidade_medida?: string | null
          updated_at?: string | null
        }
        Update: {
          ativo?: boolean | null
          composicao?: Json | null
          consumo_meta_porcentagem_pesovivo?: number | null
          created_at?: string | null
          custo_saco?: number | null
          custo_total_estoque?: number | null
          custo_unitario?: number | null
          espacamento_ideal_cocho?: number | null
          estoque_atual?: number | null
          estoque_minimo?: number | null
          fabricante?: string | null
          fazenda_id?: string
          fornecedor?: string | null
          id?: string
          marca?: string | null
          nome?: string
          peso_saco?: number | null
          teor_proteico?: number | null
          tipo?: string | null
          unidade_medida?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "proteinado_fazenda_id_fkey"
            columns: ["fazenda_id"]
            isOneToOne: false
            referencedRelation: "fazendas"
            referencedColumns: ["id"]
          },
        ]
      }
      push_subscriptions: {
        Row: {
          created_at: string
          dispositivo_id: string
          endpoint: string
          fazenda_id: string
          funcionario_id: string | null
          id: string
          keys_auth: string
          keys_p256dh: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          dispositivo_id: string
          endpoint: string
          fazenda_id: string
          funcionario_id?: string | null
          id?: string
          keys_auth: string
          keys_p256dh: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          dispositivo_id?: string
          endpoint?: string
          fazenda_id?: string
          funcionario_id?: string | null
          id?: string
          keys_auth?: string
          keys_p256dh?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "push_subscriptions_fazenda_id_fkey"
            columns: ["fazenda_id"]
            isOneToOne: false
            referencedRelation: "fazendas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "push_subscriptions_funcionario_id_fkey"
            columns: ["funcionario_id"]
            isOneToOne: false
            referencedRelation: "peoes"
            referencedColumns: ["id"]
          },
        ]
      }
      racao: {
        Row: {
          ativo: boolean | null
          composicao: Json | null
          consumo_meta_porcentagem_pesovivo: number | null
          created_at: string | null
          custo_saco: number | null
          custo_total_estoque: number | null
          custo_unitario: number | null
          espacamento_ideal_cocho: number | null
          estoque_atual: number | null
          estoque_minimo: number | null
          fabricante: string | null
          fazenda_id: string
          fornecedor: string | null
          id: string
          marca: string | null
          nome: string
          peso_saco: number | null
          tipo: string | null
          unidade_medida: string | null
          updated_at: string | null
        }
        Insert: {
          ativo?: boolean | null
          composicao?: Json | null
          consumo_meta_porcentagem_pesovivo?: number | null
          created_at?: string | null
          custo_saco?: number | null
          custo_total_estoque?: number | null
          custo_unitario?: number | null
          espacamento_ideal_cocho?: number | null
          estoque_atual?: number | null
          estoque_minimo?: number | null
          fabricante?: string | null
          fazenda_id: string
          fornecedor?: string | null
          id?: string
          marca?: string | null
          nome: string
          peso_saco?: number | null
          tipo?: string | null
          unidade_medida?: string | null
          updated_at?: string | null
        }
        Update: {
          ativo?: boolean | null
          composicao?: Json | null
          consumo_meta_porcentagem_pesovivo?: number | null
          created_at?: string | null
          custo_saco?: number | null
          custo_total_estoque?: number | null
          custo_unitario?: number | null
          espacamento_ideal_cocho?: number | null
          estoque_atual?: number | null
          estoque_minimo?: number | null
          fabricante?: string | null
          fazenda_id?: string
          fornecedor?: string | null
          id?: string
          marca?: string | null
          nome?: string
          peso_saco?: number | null
          tipo?: string | null
          unidade_medida?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "racao_fazenda_id_fkey"
            columns: ["fazenda_id"]
            isOneToOne: false
            referencedRelation: "fazendas"
            referencedColumns: ["id"]
          },
        ]
      }
      racas: {
        Row: {
          ativo: boolean | null
          created_at: string | null
          deleted_at: string | null
          fazenda_id: string
          id: string
          nome: string
          updated_at: string | null
        }
        Insert: {
          ativo?: boolean | null
          created_at?: string | null
          deleted_at?: string | null
          fazenda_id: string
          id?: string
          nome: string
          updated_at?: string | null
        }
        Update: {
          ativo?: boolean | null
          created_at?: string | null
          deleted_at?: string | null
          fazenda_id?: string
          id?: string
          nome?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "racas_fazenda_id_fkey"
            columns: ["fazenda_id"]
            isOneToOne: false
            referencedRelation: "fazendas"
            referencedColumns: ["id"]
          },
        ]
      }
      registros_abastecimento: {
        Row: {
          baixa_estoque_id: string | null
          combustivel: string
          created_at: string
          data: string
          deleted_at: string | null
          dispositivo_id: string | null
          fazenda_id: string
          id: string
          local_id: string | null
          maquina_veiculo: string
          maquina_veiculo_id: string | null
          nome_usuario: string | null
          observacao: string | null
          odometro_horimetro: number | null
          operador_motorista: string
          placa: string | null
          quem_abasteceu: string
          sync_status: string
          tanque_id: string | null
          tanque_nome: string | null
          tipo_operacao: string
          tipo_operacao_outros: string | null
          total_abastecido: number
          total_bomba: number | null
          updated_at: string
          version: number
        }
        Insert: {
          baixa_estoque_id?: string | null
          combustivel: string
          created_at?: string
          data: string
          deleted_at?: string | null
          dispositivo_id?: string | null
          fazenda_id: string
          id?: string
          local_id?: string | null
          maquina_veiculo: string
          maquina_veiculo_id?: string | null
          nome_usuario?: string | null
          observacao?: string | null
          odometro_horimetro?: number | null
          operador_motorista: string
          placa?: string | null
          quem_abasteceu: string
          sync_status?: string
          tanque_id?: string | null
          tanque_nome?: string | null
          tipo_operacao: string
          tipo_operacao_outros?: string | null
          total_abastecido: number
          total_bomba?: number | null
          updated_at?: string
          version?: number
        }
        Update: {
          baixa_estoque_id?: string | null
          combustivel?: string
          created_at?: string
          data?: string
          deleted_at?: string | null
          dispositivo_id?: string | null
          fazenda_id?: string
          id?: string
          local_id?: string | null
          maquina_veiculo?: string
          maquina_veiculo_id?: string | null
          nome_usuario?: string | null
          observacao?: string | null
          odometro_horimetro?: number | null
          operador_motorista?: string
          placa?: string | null
          quem_abasteceu?: string
          sync_status?: string
          tanque_id?: string | null
          tanque_nome?: string | null
          tipo_operacao?: string
          tipo_operacao_outros?: string | null
          total_abastecido?: number
          total_bomba?: number | null
          updated_at?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "registros_abastecimento_baixa_estoque_id_fkey"
            columns: ["baixa_estoque_id"]
            isOneToOne: false
            referencedRelation: "movimentacoes_combustivel"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "registros_abastecimento_dispositivo_id_fkey"
            columns: ["dispositivo_id"]
            isOneToOne: false
            referencedRelation: "dispositivos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "registros_abastecimento_fazenda_id_fkey"
            columns: ["fazenda_id"]
            isOneToOne: false
            referencedRelation: "fazendas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "registros_abastecimento_tanque_id_fkey"
            columns: ["tanque_id"]
            isOneToOne: false
            referencedRelation: "tanques_combustivel"
            referencedColumns: ["id"]
          },
        ]
      }
      registros_alimentacao: {
        Row: {
          created_at: string | null
          data: string
          deleted_at: string | null
          destinatario: string | null
          dispositivo_id: string | null
          fazenda_id: string | null
          fornecedor: string | null
          id: string
          itens: Json | null
          itens_detalhe: Json | null
          local_id: string | null
          modo: string | null
          nome_outros: string | null
          nome_usuario: string | null
          numero_cafe_manha: number | null
          numero_cozinheiras: number | null
          numero_lanches: number | null
          numero_refeicoes_almoco: number | null
          numero_refeicoes_jantar: number | null
          observacao: string | null
          preco_unitario: number | null
          quantidade_marmitas: number | null
          quantidade_outros: string | null
          quem_ajudou: string | null
          quem_cozinhou: string | null
          quem_recebeu: string | null
          sync_status: string | null
          unidade_outros: string | null
          updated_at: string | null
          version: number | null
        }
        Insert: {
          created_at?: string | null
          data: string
          deleted_at?: string | null
          destinatario?: string | null
          dispositivo_id?: string | null
          fazenda_id?: string | null
          fornecedor?: string | null
          id?: string
          itens?: Json | null
          itens_detalhe?: Json | null
          local_id?: string | null
          modo?: string | null
          nome_outros?: string | null
          nome_usuario?: string | null
          numero_cafe_manha?: number | null
          numero_cozinheiras?: number | null
          numero_lanches?: number | null
          numero_refeicoes_almoco?: number | null
          numero_refeicoes_jantar?: number | null
          observacao?: string | null
          preco_unitario?: number | null
          quantidade_marmitas?: number | null
          quantidade_outros?: string | null
          quem_ajudou?: string | null
          quem_cozinhou?: string | null
          quem_recebeu?: string | null
          sync_status?: string | null
          unidade_outros?: string | null
          updated_at?: string | null
          version?: number | null
        }
        Update: {
          created_at?: string | null
          data?: string
          deleted_at?: string | null
          destinatario?: string | null
          dispositivo_id?: string | null
          fazenda_id?: string | null
          fornecedor?: string | null
          id?: string
          itens?: Json | null
          itens_detalhe?: Json | null
          local_id?: string | null
          modo?: string | null
          nome_outros?: string | null
          nome_usuario?: string | null
          numero_cafe_manha?: number | null
          numero_cozinheiras?: number | null
          numero_lanches?: number | null
          numero_refeicoes_almoco?: number | null
          numero_refeicoes_jantar?: number | null
          observacao?: string | null
          preco_unitario?: number | null
          quantidade_marmitas?: number | null
          quantidade_outros?: string | null
          quem_ajudou?: string | null
          quem_cozinhou?: string | null
          quem_recebeu?: string | null
          sync_status?: string | null
          unidade_outros?: string | null
          updated_at?: string | null
          version?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "registros_cantina_fazenda_id_fkey"
            columns: ["fazenda_id"]
            isOneToOne: false
            referencedRelation: "fazendas"
            referencedColumns: ["id"]
          },
        ]
      }
      registros_almoxarifado: {
        Row: {
          created_at: string | null
          data: string
          deleted_at: string | null
          dispositivo_id: string | null
          fazenda_id: string
          id: string
          itens: Json | null
          local_id: string | null
          nome_usuario: string | null
          observacao: string | null
          quem_entregou: string | null
          quem_pegou: string | null
          quem_recebeu: string | null
          setor: string | null
          sync_status: string | null
          tipo: string
          updated_at: string | null
          version: number | null
        }
        Insert: {
          created_at?: string | null
          data: string
          deleted_at?: string | null
          dispositivo_id?: string | null
          fazenda_id: string
          id?: string
          itens?: Json | null
          local_id?: string | null
          nome_usuario?: string | null
          observacao?: string | null
          quem_entregou?: string | null
          quem_pegou?: string | null
          quem_recebeu?: string | null
          setor?: string | null
          sync_status?: string | null
          tipo?: string
          updated_at?: string | null
          version?: number | null
        }
        Update: {
          created_at?: string | null
          data?: string
          deleted_at?: string | null
          dispositivo_id?: string | null
          fazenda_id?: string
          id?: string
          itens?: Json | null
          local_id?: string | null
          nome_usuario?: string | null
          observacao?: string | null
          quem_entregou?: string | null
          quem_pegou?: string | null
          quem_recebeu?: string | null
          setor?: string | null
          sync_status?: string | null
          tipo?: string
          updated_at?: string | null
          version?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "registros_almoxarifado_fazenda_id_fkey"
            columns: ["fazenda_id"]
            isOneToOne: false
            referencedRelation: "fazendas"
            referencedColumns: ["id"]
          },
        ]
      }
      registros_bebedouros: {
        Row: {
          checklist: Json | null
          created_at: string | null
          data: string
          deleted_at: string | null
          dispositivo_id: string | null
          fazenda_id: string
          id: string
          leitura_bebedouro: number | null
          local_id: string | null
          lote: string | null
          lote_id: string | null
          nome_usuario: string | null
          numero_bebedouro: string | null
          observacao: string | null
          pasto: string | null
          pasto_id: string | null
          responsavel: string | null
          sync_status: string | null
          updated_at: string | null
          version: number | null
        }
        Insert: {
          checklist?: Json | null
          created_at?: string | null
          data: string
          deleted_at?: string | null
          dispositivo_id?: string | null
          fazenda_id: string
          id?: string
          leitura_bebedouro?: number | null
          local_id?: string | null
          lote?: string | null
          lote_id?: string | null
          nome_usuario?: string | null
          numero_bebedouro?: string | null
          observacao?: string | null
          pasto?: string | null
          pasto_id?: string | null
          responsavel?: string | null
          sync_status?: string | null
          updated_at?: string | null
          version?: number | null
        }
        Update: {
          checklist?: Json | null
          created_at?: string | null
          data?: string
          deleted_at?: string | null
          dispositivo_id?: string | null
          fazenda_id?: string
          id?: string
          leitura_bebedouro?: number | null
          local_id?: string | null
          lote?: string | null
          lote_id?: string | null
          nome_usuario?: string | null
          numero_bebedouro?: string | null
          observacao?: string | null
          pasto?: string | null
          pasto_id?: string | null
          responsavel?: string | null
          sync_status?: string | null
          updated_at?: string | null
          version?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "registros_bebedouros_dispositivo_id_fkey"
            columns: ["dispositivo_id"]
            isOneToOne: false
            referencedRelation: "dispositivos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "registros_bebedouros_fazenda_id_fkey"
            columns: ["fazenda_id"]
            isOneToOne: false
            referencedRelation: "fazendas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "registros_bebedouros_lote_id_fkey"
            columns: ["lote_id"]
            isOneToOne: false
            referencedRelation: "lotes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "registros_bebedouros_pasto_id_fkey"
            columns: ["pasto_id"]
            isOneToOne: false
            referencedRelation: "pastos"
            referencedColumns: ["id"]
          },
        ]
      }
      registros_clima: {
        Row: {
          created_at: string | null
          data: string
          deleted_at: string | null
          dispositivo_id: string | null
          fazenda_id: string
          id: string
          local_id: string | null
          medicoes: Json | null
          nome_usuario: string | null
          observacao: string | null
          responsavel: string
          sync_status: string | null
          temperatura_media: number | null
          umidade_relativa: number | null
          updated_at: string | null
          version: number | null
        }
        Insert: {
          created_at?: string | null
          data: string
          deleted_at?: string | null
          dispositivo_id?: string | null
          fazenda_id: string
          id?: string
          local_id?: string | null
          medicoes?: Json | null
          nome_usuario?: string | null
          observacao?: string | null
          responsavel: string
          sync_status?: string | null
          temperatura_media?: number | null
          umidade_relativa?: number | null
          updated_at?: string | null
          version?: number | null
        }
        Update: {
          created_at?: string | null
          data?: string
          deleted_at?: string | null
          dispositivo_id?: string | null
          fazenda_id?: string
          id?: string
          local_id?: string | null
          medicoes?: Json | null
          nome_usuario?: string | null
          observacao?: string | null
          responsavel?: string
          sync_status?: string | null
          temperatura_media?: number | null
          umidade_relativa?: number | null
          updated_at?: string | null
          version?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "registros_clima_dispositivo_id_fkey"
            columns: ["dispositivo_id"]
            isOneToOne: false
            referencedRelation: "dispositivos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "registros_clima_fazenda_id_fkey"
            columns: ["fazenda_id"]
            isOneToOne: false
            referencedRelation: "fazendas"
            referencedColumns: ["id"]
          },
        ]
      }
      registros_enfermaria: {
        Row: {
          brinco: string | null
          categoria: string | null
          chip: string | null
          created_at: string | null
          data: string
          deleted_at: string | null
          diagnosticos: Json | null
          dispositivo_id: string | null
          fazenda_id: string
          foto_url: string | null
          id: string
          idade: string | null
          local_id: string | null
          lote: string | null
          lote_id: string | null
          medicamentos: Json | null
          nome_usuario: string | null
          pasto: string | null
          pasto_id: string | null
          raca: string | null
          sexo: string | null
          sync_status: string | null
          tipo_registro: string | null
          tratamento_obs: string | null
          tratamento_outros: string | null
          updated_at: string | null
          version: number | null
        }
        Insert: {
          brinco?: string | null
          categoria?: string | null
          chip?: string | null
          created_at?: string | null
          data: string
          deleted_at?: string | null
          diagnosticos?: Json | null
          dispositivo_id?: string | null
          fazenda_id: string
          foto_url?: string | null
          id?: string
          idade?: string | null
          local_id?: string | null
          lote?: string | null
          lote_id?: string | null
          medicamentos?: Json | null
          nome_usuario?: string | null
          pasto?: string | null
          pasto_id?: string | null
          raca?: string | null
          sexo?: string | null
          sync_status?: string | null
          tipo_registro?: string | null
          tratamento_obs?: string | null
          tratamento_outros?: string | null
          updated_at?: string | null
          version?: number | null
        }
        Update: {
          brinco?: string | null
          categoria?: string | null
          chip?: string | null
          created_at?: string | null
          data?: string
          deleted_at?: string | null
          diagnosticos?: Json | null
          dispositivo_id?: string | null
          fazenda_id?: string
          foto_url?: string | null
          id?: string
          idade?: string | null
          local_id?: string | null
          lote?: string | null
          lote_id?: string | null
          medicamentos?: Json | null
          nome_usuario?: string | null
          pasto?: string | null
          pasto_id?: string | null
          raca?: string | null
          sexo?: string | null
          sync_status?: string | null
          tipo_registro?: string | null
          tratamento_obs?: string | null
          tratamento_outros?: string | null
          updated_at?: string | null
          version?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "registros_enfermaria_dispositivo_id_fkey"
            columns: ["dispositivo_id"]
            isOneToOne: false
            referencedRelation: "dispositivos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "registros_enfermaria_fazenda_id_fkey"
            columns: ["fazenda_id"]
            isOneToOne: false
            referencedRelation: "fazendas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "registros_enfermaria_lote_id_fkey"
            columns: ["lote_id"]
            isOneToOne: false
            referencedRelation: "lotes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "registros_enfermaria_pasto_id_fkey"
            columns: ["pasto_id"]
            isOneToOne: false
            referencedRelation: "pastos"
            referencedColumns: ["id"]
          },
        ]
      }
      registros_entrada_insumos: {
        Row: {
          created_at: string | null
          data_entrada: string
          deleted_at: string | null
          dispositivo_id: string | null
          fazenda_id: string
          fornecedor: string | null
          horario: string | null
          id: string
          insumo_id: string | null
          local_id: string | null
          motorista: string | null
          nome_usuario: string | null
          nota_fiscal: string | null
          placa: string | null
          produto: string | null
          quantidade: number | null
          responsavel_recebimento: string | null
          sync_status: string | null
          updated_at: string | null
          valor_total: number | null
          valor_unitario: number | null
          version: number | null
        }
        Insert: {
          created_at?: string | null
          data_entrada: string
          deleted_at?: string | null
          dispositivo_id?: string | null
          fazenda_id: string
          fornecedor?: string | null
          horario?: string | null
          id?: string
          insumo_id?: string | null
          local_id?: string | null
          motorista?: string | null
          nome_usuario?: string | null
          nota_fiscal?: string | null
          placa?: string | null
          produto?: string | null
          quantidade?: number | null
          responsavel_recebimento?: string | null
          sync_status?: string | null
          updated_at?: string | null
          valor_total?: number | null
          valor_unitario?: number | null
          version?: number | null
        }
        Update: {
          created_at?: string | null
          data_entrada?: string
          deleted_at?: string | null
          dispositivo_id?: string | null
          fazenda_id?: string
          fornecedor?: string | null
          horario?: string | null
          id?: string
          insumo_id?: string | null
          local_id?: string | null
          motorista?: string | null
          nome_usuario?: string | null
          nota_fiscal?: string | null
          placa?: string | null
          produto?: string | null
          quantidade?: number | null
          responsavel_recebimento?: string | null
          sync_status?: string | null
          updated_at?: string | null
          valor_total?: number | null
          valor_unitario?: number | null
          version?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "registros_entrada_insumos_dispositivo_id_fkey"
            columns: ["dispositivo_id"]
            isOneToOne: false
            referencedRelation: "dispositivos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "registros_entrada_insumos_fazenda_id_fkey"
            columns: ["fazenda_id"]
            isOneToOne: false
            referencedRelation: "fazendas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "registros_entrada_insumos_insumo_id_fkey"
            columns: ["insumo_id"]
            isOneToOne: false
            referencedRelation: "insumos"
            referencedColumns: ["id"]
          },
        ]
      }
      registros_fabrica_confinamento: {
        Row: {
          concluido: boolean
          created_at: string
          data: string
          deleted_at: string | null
          dispositivo_id: string | null
          fazenda_id: string
          formulacao_id: string | null
          id: string
          local_id: string | null
          nome_usuario: string | null
          ordem_trato: number
          sync_status: string
          tipo: string
          total_previsto: number
          total_produzido: number
          updated_at: string
          vagao_id: string | null
          version: number
        }
        Insert: {
          concluido?: boolean
          created_at?: string
          data: string
          deleted_at?: string | null
          dispositivo_id?: string | null
          fazenda_id: string
          formulacao_id?: string | null
          id?: string
          local_id?: string | null
          nome_usuario?: string | null
          ordem_trato: number
          sync_status?: string
          tipo?: string
          total_previsto?: number
          total_produzido?: number
          updated_at?: string
          vagao_id?: string | null
          version?: number
        }
        Update: {
          concluido?: boolean
          created_at?: string
          data?: string
          deleted_at?: string | null
          dispositivo_id?: string | null
          fazenda_id?: string
          formulacao_id?: string | null
          id?: string
          local_id?: string | null
          nome_usuario?: string | null
          ordem_trato?: number
          sync_status?: string
          tipo?: string
          total_previsto?: number
          total_produzido?: number
          updated_at?: string
          vagao_id?: string | null
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "registros_fabrica_confinamento_fazenda_id_fkey"
            columns: ["fazenda_id"]
            isOneToOne: false
            referencedRelation: "fazendas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "registros_fabrica_confinamento_formulacao_id_fkey"
            columns: ["formulacao_id"]
            isOneToOne: false
            referencedRelation: "formulacoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "registros_fabrica_confinamento_vagao_id_fkey"
            columns: ["vagao_id"]
            isOneToOne: false
            referencedRelation: "vagoes"
            referencedColumns: ["id"]
          },
        ]
      }
      registros_fabrica_confinamento_insumos: {
        Row: {
          created_at: string
          id: string
          insumo_id: string
          kg_previsto: number
          kg_produzido: number
          local_id: string | null
          ordem: number
          registro_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          insumo_id: string
          kg_previsto?: number
          kg_produzido?: number
          local_id?: string | null
          ordem?: number
          registro_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          insumo_id?: string
          kg_previsto?: number
          kg_produzido?: number
          local_id?: string | null
          ordem?: number
          registro_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "registros_fabrica_confinamento_insumos_insumo_id_fkey"
            columns: ["insumo_id"]
            isOneToOne: false
            referencedRelation: "insumos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "registros_fabrica_confinamento_insumos_registro_id_fkey"
            columns: ["registro_id"]
            isOneToOne: false
            referencedRelation: "registros_fabrica_confinamento"
            referencedColumns: ["id"]
          },
        ]
      }
      registros_leitura_cocho: {
        Row: {
          created_at: string | null
          curral_id: string | null
          data: string
          deleted_at: string | null
          dispositivo_id: string | null
          fazenda_id: string
          id: string
          leitura_cocho: number | null
          local_id: string | null
          lote: string | null
          lote_id: string | null
          nome_usuario: string | null
          nota_config_id: string | null
          pasto_curral: string | null
          pasto_id: string | null
          responsavel: string | null
          sync_status: string | null
          updated_at: string | null
          version: number | null
        }
        Insert: {
          created_at?: string | null
          curral_id?: string | null
          data: string
          deleted_at?: string | null
          dispositivo_id?: string | null
          fazenda_id: string
          id?: string
          leitura_cocho?: number | null
          local_id?: string | null
          lote?: string | null
          lote_id?: string | null
          nome_usuario?: string | null
          nota_config_id?: string | null
          pasto_curral?: string | null
          pasto_id?: string | null
          responsavel?: string | null
          sync_status?: string | null
          updated_at?: string | null
          version?: number | null
        }
        Update: {
          created_at?: string | null
          curral_id?: string | null
          data?: string
          deleted_at?: string | null
          dispositivo_id?: string | null
          fazenda_id?: string
          id?: string
          leitura_cocho?: number | null
          local_id?: string | null
          lote?: string | null
          lote_id?: string | null
          nome_usuario?: string | null
          nota_config_id?: string | null
          pasto_curral?: string | null
          pasto_id?: string | null
          responsavel?: string | null
          sync_status?: string | null
          updated_at?: string | null
          version?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "registros_leitura_cocho_curral_id_fkey"
            columns: ["curral_id"]
            isOneToOne: false
            referencedRelation: "currais"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "registros_leitura_cocho_dispositivo_id_fkey"
            columns: ["dispositivo_id"]
            isOneToOne: false
            referencedRelation: "dispositivos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "registros_leitura_cocho_fazenda_id_fkey"
            columns: ["fazenda_id"]
            isOneToOne: false
            referencedRelation: "fazendas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "registros_leitura_cocho_lote_id_fkey"
            columns: ["lote_id"]
            isOneToOne: false
            referencedRelation: "lotes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "registros_leitura_cocho_nota_config_id_fkey"
            columns: ["nota_config_id"]
            isOneToOne: false
            referencedRelation: "notas_leitura_cocho_config"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "registros_leitura_cocho_pasto_id_fkey"
            columns: ["pasto_id"]
            isOneToOne: false
            referencedRelation: "pastos"
            referencedColumns: ["id"]
          },
        ]
      }
      registros_limpeza: {
        Row: {
          created_at: string | null
          data: string
          deleted_at: string | null
          dispositivo_id: string | null
          fazenda_id: string
          foto_url: string | null
          hora_final: string | null
          hora_inicio: string | null
          id: string
          limpeza_realizada: Json | null
          local: string | null
          local_id: string | null
          nome_usuario: string | null
          numero_equipe: number | null
          observacao: string | null
          setor: string | null
          sync_status: string | null
          updated_at: string | null
          version: number | null
        }
        Insert: {
          created_at?: string | null
          data: string
          deleted_at?: string | null
          dispositivo_id?: string | null
          fazenda_id: string
          foto_url?: string | null
          hora_final?: string | null
          hora_inicio?: string | null
          id?: string
          limpeza_realizada?: Json | null
          local?: string | null
          local_id?: string | null
          nome_usuario?: string | null
          numero_equipe?: number | null
          observacao?: string | null
          setor?: string | null
          sync_status?: string | null
          updated_at?: string | null
          version?: number | null
        }
        Update: {
          created_at?: string | null
          data?: string
          deleted_at?: string | null
          dispositivo_id?: string | null
          fazenda_id?: string
          foto_url?: string | null
          hora_final?: string | null
          hora_inicio?: string | null
          id?: string
          limpeza_realizada?: Json | null
          local?: string | null
          local_id?: string | null
          nome_usuario?: string | null
          numero_equipe?: number | null
          observacao?: string | null
          setor?: string | null
          sync_status?: string | null
          updated_at?: string | null
          version?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "registros_limpeza_dispositivo_id_fkey"
            columns: ["dispositivo_id"]
            isOneToOne: false
            referencedRelation: "dispositivos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "registros_limpeza_fazenda_id_fkey"
            columns: ["fazenda_id"]
            isOneToOne: false
            referencedRelation: "fazendas"
            referencedColumns: ["id"]
          },
        ]
      }
      registros_manutencao_maquinas: {
        Row: {
          checklist: Json | null
          created_at: string | null
          data: string
          deleted_at: string | null
          dispositivo_id: string | null
          fazenda_id: string
          foto_url: string | null
          id: number
          local_id: string | null
          nome_usuario: string | null
          observacao: string | null
          odometro_horimetro: string | null
          operador_motorista: string | null
          placa: string | null
          responsavel_checklist: string | null
          sync_status: string | null
          updated_at: string | null
          veiculo_trator: string | null
          version: number | null
        }
        Insert: {
          checklist?: Json | null
          created_at?: string | null
          data: string
          deleted_at?: string | null
          dispositivo_id?: string | null
          fazenda_id: string
          foto_url?: string | null
          id?: number
          local_id?: string | null
          nome_usuario?: string | null
          observacao?: string | null
          odometro_horimetro?: string | null
          operador_motorista?: string | null
          placa?: string | null
          responsavel_checklist?: string | null
          sync_status?: string | null
          updated_at?: string | null
          veiculo_trator?: string | null
          version?: number | null
        }
        Update: {
          checklist?: Json | null
          created_at?: string | null
          data?: string
          deleted_at?: string | null
          dispositivo_id?: string | null
          fazenda_id?: string
          foto_url?: string | null
          id?: number
          local_id?: string | null
          nome_usuario?: string | null
          observacao?: string | null
          odometro_horimetro?: string | null
          operador_motorista?: string | null
          placa?: string | null
          responsavel_checklist?: string | null
          sync_status?: string | null
          updated_at?: string | null
          veiculo_trator?: string | null
          version?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "registros_manutencao_maquinas_fazenda_id_fkey"
            columns: ["fazenda_id"]
            isOneToOne: false
            referencedRelation: "fazendas"
            referencedColumns: ["id"]
          },
        ]
      }
      registros_maternidade: {
        Row: {
          categoria_mae: string | null
          categoria_mae_adotiva: string | null
          created_at: string | null
          data: string
          deleted_at: string | null
          docilidade_matriz: number | null
          escore_matriz: string | null
          fazenda_id: string
          foto_url: string | null
          id: string
          id_brinco_cria: string | null
          id_brinco_mae: string | null
          id_brinco_mae_adotiva: string | null
          id_chip_cria: string | null
          id_chip_mae: string | null
          id_chip_mae_adotiva: string | null
          id_manejo_mae: string | null
          id_manejo_mae_adotiva: string | null
          id_provisorio_cria: string | null
          individuo_id_cria: string | null
          individuo_id_mae: string | null
          individuo_id_mae_adotiva: string | null
          local_id: string | null
          lote: string | null
          lote_id: string | null
          medicamentos: Json | null
          nome_usuario: string | null
          observacao_parto: string | null
          parto_vinculo_id: string | null
          pasto: string | null
          pasto_id: string | null
          peso_cria_kg: number | null
          raca: string | null
          raca_mae_adotiva: string | null
          sexo: string | null
          sync_status: string | null
          tipo_parto: Json | null
          tratamento: string | null
          updated_at: string | null
          version: number | null
        }
        Insert: {
          categoria_mae?: string | null
          categoria_mae_adotiva?: string | null
          created_at?: string | null
          data: string
          deleted_at?: string | null
          docilidade_matriz?: number | null
          escore_matriz?: string | null
          fazenda_id: string
          foto_url?: string | null
          id?: string
          id_brinco_cria?: string | null
          id_brinco_mae?: string | null
          id_brinco_mae_adotiva?: string | null
          id_chip_cria?: string | null
          id_chip_mae?: string | null
          id_chip_mae_adotiva?: string | null
          id_manejo_mae?: string | null
          id_manejo_mae_adotiva?: string | null
          id_provisorio_cria?: string | null
          individuo_id_cria?: string | null
          individuo_id_mae?: string | null
          individuo_id_mae_adotiva?: string | null
          local_id?: string | null
          lote?: string | null
          lote_id?: string | null
          medicamentos?: Json | null
          nome_usuario?: string | null
          observacao_parto?: string | null
          parto_vinculo_id?: string | null
          pasto?: string | null
          pasto_id?: string | null
          peso_cria_kg?: number | null
          raca?: string | null
          raca_mae_adotiva?: string | null
          sexo?: string | null
          sync_status?: string | null
          tipo_parto?: Json | null
          tratamento?: string | null
          updated_at?: string | null
          version?: number | null
        }
        Update: {
          categoria_mae?: string | null
          categoria_mae_adotiva?: string | null
          created_at?: string | null
          data?: string
          deleted_at?: string | null
          docilidade_matriz?: number | null
          escore_matriz?: string | null
          fazenda_id?: string
          foto_url?: string | null
          id?: string
          id_brinco_cria?: string | null
          id_brinco_mae?: string | null
          id_brinco_mae_adotiva?: string | null
          id_chip_cria?: string | null
          id_chip_mae?: string | null
          id_chip_mae_adotiva?: string | null
          id_manejo_mae?: string | null
          id_manejo_mae_adotiva?: string | null
          id_provisorio_cria?: string | null
          individuo_id_cria?: string | null
          individuo_id_mae?: string | null
          individuo_id_mae_adotiva?: string | null
          local_id?: string | null
          lote?: string | null
          lote_id?: string | null
          medicamentos?: Json | null
          nome_usuario?: string | null
          observacao_parto?: string | null
          parto_vinculo_id?: string | null
          pasto?: string | null
          pasto_id?: string | null
          peso_cria_kg?: number | null
          raca?: string | null
          raca_mae_adotiva?: string | null
          sexo?: string | null
          sync_status?: string | null
          tipo_parto?: Json | null
          tratamento?: string | null
          updated_at?: string | null
          version?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "registros_maternidade_fazenda_id_fkey"
            columns: ["fazenda_id"]
            isOneToOne: false
            referencedRelation: "fazendas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "registros_maternidade_individuo_id_cria_fkey"
            columns: ["individuo_id_cria"]
            isOneToOne: false
            referencedRelation: "individuos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "registros_maternidade_individuo_id_mae_adotiva_fkey"
            columns: ["individuo_id_mae_adotiva"]
            isOneToOne: false
            referencedRelation: "individuos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "registros_maternidade_individuo_id_mae_fkey"
            columns: ["individuo_id_mae"]
            isOneToOne: false
            referencedRelation: "individuos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "registros_maternidade_lote_id_fkey"
            columns: ["lote_id"]
            isOneToOne: false
            referencedRelation: "lotes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "registros_maternidade_pasto_id_fkey"
            columns: ["pasto_id"]
            isOneToOne: false
            referencedRelation: "pastos"
            referencedColumns: ["id"]
          },
        ]
      }
      registros_morte: {
        Row: {
          brinco: string | null
          categoria: string | null
          categoria_outros: string | null
          causa_morte: string | null
          checklist: Json | null
          chip: string | null
          created_at: string | null
          data: string
          deleted_at: string | null
          diagnosticos: Json | null
          dispositivo_id: string | null
          escore: number | null
          fazenda_id: string
          foto_url: string | null
          gps_accuracy: number | null
          id: string
          idade: string | null
          latitude: number | null
          local_id: string | null
          longitude: number | null
          lote: string | null
          lote_id: string | null
          nome_usuario: string | null
          nutricao_anterior: string | null
          nutricao_atual: string | null
          observacao_identificacao: string | null
          pasto: string | null
          pasto_id: string | null
          peso_vivo: number | null
          raca: string | null
          sexo: string | null
          sync_status: string | null
          updated_at: string | null
          version: number | null
        }
        Insert: {
          brinco?: string | null
          categoria?: string | null
          categoria_outros?: string | null
          causa_morte?: string | null
          checklist?: Json | null
          chip?: string | null
          created_at?: string | null
          data: string
          deleted_at?: string | null
          diagnosticos?: Json | null
          dispositivo_id?: string | null
          escore?: number | null
          fazenda_id: string
          foto_url?: string | null
          gps_accuracy?: number | null
          id?: string
          idade?: string | null
          latitude?: number | null
          local_id?: string | null
          longitude?: number | null
          lote?: string | null
          lote_id?: string | null
          nome_usuario?: string | null
          nutricao_anterior?: string | null
          nutricao_atual?: string | null
          observacao_identificacao?: string | null
          pasto?: string | null
          pasto_id?: string | null
          peso_vivo?: number | null
          raca?: string | null
          sexo?: string | null
          sync_status?: string | null
          updated_at?: string | null
          version?: number | null
        }
        Update: {
          brinco?: string | null
          categoria?: string | null
          categoria_outros?: string | null
          causa_morte?: string | null
          checklist?: Json | null
          chip?: string | null
          created_at?: string | null
          data?: string
          deleted_at?: string | null
          diagnosticos?: Json | null
          dispositivo_id?: string | null
          escore?: number | null
          fazenda_id?: string
          foto_url?: string | null
          gps_accuracy?: number | null
          id?: string
          idade?: string | null
          latitude?: number | null
          local_id?: string | null
          longitude?: number | null
          lote?: string | null
          lote_id?: string | null
          nome_usuario?: string | null
          nutricao_anterior?: string | null
          nutricao_atual?: string | null
          observacao_identificacao?: string | null
          pasto?: string | null
          pasto_id?: string | null
          peso_vivo?: number | null
          raca?: string | null
          sexo?: string | null
          sync_status?: string | null
          updated_at?: string | null
          version?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "registros_morte_lote_id_fkey"
            columns: ["lote_id"]
            isOneToOne: false
            referencedRelation: "lotes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "registros_morte_pasto_id_fkey"
            columns: ["pasto_id"]
            isOneToOne: false
            referencedRelation: "pastos"
            referencedColumns: ["id"]
          },
        ]
      }
      registros_movimentacao: {
        Row: {
          brinco: string | null
          categoria: string | null
          causa_observacao: string | null
          chip: string | null
          created_at: string | null
          data: string
          deleted_at: string | null
          destino: string | null
          dispositivo_id: string | null
          equipe: number | null
          equipe_nomes: Json | null
          fazenda_destino_id: string | null
          fazenda_id: string
          id: string
          idade: number | null
          individuo_id: string | null
          local_id: string | null
          lote_destino_id: string | null
          lote_origem: string | null
          lote_origem_id: string | null
          motivo_movimentacao:
            | Database["public"]["Enums"]["tipo_movimentacao_motivo"]
            | null
          nome_usuario: string | null
          numero_cabecas: number | null
          observacao: string | null
          os_id: string | null
          peso_vivo_atual_kg: number | null
          raca: string | null
          responsavel: string | null
          sessao_id: string | null
          sexo: string | null
          subtipo:
            | Database["public"]["Enums"]["tipo_movimentacao_subtipo"]
            | null
          sync_status: string | null
          tipo_entrada: string | null
          tipo_saida: string | null
          updated_at: string | null
          version: number | null
        }
        Insert: {
          brinco?: string | null
          categoria?: string | null
          causa_observacao?: string | null
          chip?: string | null
          created_at?: string | null
          data: string
          deleted_at?: string | null
          destino?: string | null
          dispositivo_id?: string | null
          equipe?: number | null
          equipe_nomes?: Json | null
          fazenda_destino_id?: string | null
          fazenda_id: string
          id?: string
          idade?: number | null
          individuo_id?: string | null
          local_id?: string | null
          lote_destino_id?: string | null
          lote_origem?: string | null
          lote_origem_id?: string | null
          motivo_movimentacao?:
            | Database["public"]["Enums"]["tipo_movimentacao_motivo"]
            | null
          nome_usuario?: string | null
          numero_cabecas?: number | null
          observacao?: string | null
          os_id?: string | null
          peso_vivo_atual_kg?: number | null
          raca?: string | null
          responsavel?: string | null
          sessao_id?: string | null
          sexo?: string | null
          subtipo?:
            | Database["public"]["Enums"]["tipo_movimentacao_subtipo"]
            | null
          sync_status?: string | null
          tipo_entrada?: string | null
          tipo_saida?: string | null
          updated_at?: string | null
          version?: number | null
        }
        Update: {
          brinco?: string | null
          categoria?: string | null
          causa_observacao?: string | null
          chip?: string | null
          created_at?: string | null
          data?: string
          deleted_at?: string | null
          destino?: string | null
          dispositivo_id?: string | null
          equipe?: number | null
          equipe_nomes?: Json | null
          fazenda_destino_id?: string | null
          fazenda_id?: string
          id?: string
          idade?: number | null
          individuo_id?: string | null
          local_id?: string | null
          lote_destino_id?: string | null
          lote_origem?: string | null
          lote_origem_id?: string | null
          motivo_movimentacao?:
            | Database["public"]["Enums"]["tipo_movimentacao_motivo"]
            | null
          nome_usuario?: string | null
          numero_cabecas?: number | null
          observacao?: string | null
          os_id?: string | null
          peso_vivo_atual_kg?: number | null
          raca?: string | null
          responsavel?: string | null
          sessao_id?: string | null
          sexo?: string | null
          subtipo?:
            | Database["public"]["Enums"]["tipo_movimentacao_subtipo"]
            | null
          sync_status?: string | null
          tipo_entrada?: string | null
          tipo_saida?: string | null
          updated_at?: string | null
          version?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_registros_movimentacao_individuo"
            columns: ["individuo_id"]
            isOneToOne: false
            referencedRelation: "individuos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "registros_movimentacao_dispositivo_id_fkey"
            columns: ["dispositivo_id"]
            isOneToOne: false
            referencedRelation: "dispositivos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "registros_movimentacao_fazenda_destino_id_fkey"
            columns: ["fazenda_destino_id"]
            isOneToOne: false
            referencedRelation: "fazendas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "registros_movimentacao_fazenda_id_fkey"
            columns: ["fazenda_id"]
            isOneToOne: false
            referencedRelation: "fazendas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "registros_movimentacao_lote_destino_id_fkey"
            columns: ["lote_destino_id"]
            isOneToOne: false
            referencedRelation: "lotes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "registros_movimentacao_lote_origem_id_fkey"
            columns: ["lote_origem_id"]
            isOneToOne: false
            referencedRelation: "lotes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "registros_movimentacao_os_id_fkey"
            columns: ["os_id"]
            isOneToOne: false
            referencedRelation: "ordens_servico"
            referencedColumns: ["id"]
          },
        ]
      }
      registros_oferta_trato: {
        Row: {
          created_at: string
          curral_id: string
          data: string
          deleted_at: string | null
          dispositivo_id: string | null
          fazenda_id: string
          id: string
          kg_ofertado_real: number | null
          kg_planejado: number | null
          leitura_cocho_nota: number | null
          local_id: string | null
          lote_id: string | null
          nome_usuario: string | null
          ordem_trato: number
          origem: string
          programacao_id: string | null
          sync_status: string | null
          updated_at: string
          version: number | null
        }
        Insert: {
          created_at?: string
          curral_id: string
          data: string
          deleted_at?: string | null
          dispositivo_id?: string | null
          fazenda_id: string
          id?: string
          kg_ofertado_real?: number | null
          kg_planejado?: number | null
          leitura_cocho_nota?: number | null
          local_id?: string | null
          lote_id?: string | null
          nome_usuario?: string | null
          ordem_trato: number
          origem?: string
          programacao_id?: string | null
          sync_status?: string | null
          updated_at?: string
          version?: number | null
        }
        Update: {
          created_at?: string
          curral_id?: string
          data?: string
          deleted_at?: string | null
          dispositivo_id?: string | null
          fazenda_id?: string
          id?: string
          kg_ofertado_real?: number | null
          kg_planejado?: number | null
          leitura_cocho_nota?: number | null
          local_id?: string | null
          lote_id?: string | null
          nome_usuario?: string | null
          ordem_trato?: number
          origem?: string
          programacao_id?: string | null
          sync_status?: string | null
          updated_at?: string
          version?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "registros_oferta_trato_curral_id_fkey"
            columns: ["curral_id"]
            isOneToOne: false
            referencedRelation: "currais"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "registros_oferta_trato_fazenda_id_fkey"
            columns: ["fazenda_id"]
            isOneToOne: false
            referencedRelation: "fazendas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "registros_oferta_trato_lote_id_fkey"
            columns: ["lote_id"]
            isOneToOne: false
            referencedRelation: "lotes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "registros_oferta_trato_programacao_id_fkey"
            columns: ["programacao_id"]
            isOneToOne: false
            referencedRelation: "programacao_tratos"
            referencedColumns: ["id"]
          },
        ]
      }
      registros_operacoes_maquinas: {
        Row: {
          aplicacoes: Json | null
          checklist: Json | null
          created_at: string
          data: string
          deleted_at: string | null
          dispositivo_id: string | null
          fazenda_id: string
          hora_final: string | null
          hora_inicial: string | null
          id: string
          implemento_utilizado: string | null
          local_id: string | null
          maquina_veiculo_id: string | null
          nome_usuario: string | null
          observacao: string | null
          odometro_horimetro_final: string | null
          odometro_horimetro_inicial: string | null
          sync_status: string
          tipo_operacao: string
          total_odometro_horimetro: string | null
          updated_at: string
          veiculo_trator: string
          version: number
        }
        Insert: {
          aplicacoes?: Json | null
          checklist?: Json | null
          created_at?: string
          data: string
          deleted_at?: string | null
          dispositivo_id?: string | null
          fazenda_id: string
          hora_final?: string | null
          hora_inicial?: string | null
          id?: string
          implemento_utilizado?: string | null
          local_id?: string | null
          maquina_veiculo_id?: string | null
          nome_usuario?: string | null
          observacao?: string | null
          odometro_horimetro_final?: string | null
          odometro_horimetro_inicial?: string | null
          sync_status?: string
          tipo_operacao: string
          total_odometro_horimetro?: string | null
          updated_at?: string
          veiculo_trator: string
          version?: number
        }
        Update: {
          aplicacoes?: Json | null
          checklist?: Json | null
          created_at?: string
          data?: string
          deleted_at?: string | null
          dispositivo_id?: string | null
          fazenda_id?: string
          hora_final?: string | null
          hora_inicial?: string | null
          id?: string
          implemento_utilizado?: string | null
          local_id?: string | null
          maquina_veiculo_id?: string | null
          nome_usuario?: string | null
          observacao?: string | null
          odometro_horimetro_final?: string | null
          odometro_horimetro_inicial?: string | null
          sync_status?: string
          tipo_operacao?: string
          total_odometro_horimetro?: string | null
          updated_at?: string
          veiculo_trator?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "registros_operacoes_maquinas_dispositivo_id_fkey"
            columns: ["dispositivo_id"]
            isOneToOne: false
            referencedRelation: "dispositivos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "registros_operacoes_maquinas_fazenda_id_fkey"
            columns: ["fazenda_id"]
            isOneToOne: false
            referencedRelation: "fazendas"
            referencedColumns: ["id"]
          },
        ]
      }
      registros_pastagens: {
        Row: {
          avaliacao_entrada: number | null
          avaliacao_geral: Json | null
          avaliacao_saida: number | null
          bezerro: number | null
          boi_magro: number | null
          categorias_detalhes: Json | null
          created_at: string | null
          data: string
          deleted_at: string | null
          dispositivo_id: string | null
          equipe_nomes: Json | null
          escore_fezes: number | null
          escore_gado: number | null
          fazenda_id: string
          gado_contado: string | null
          garrote: number | null
          horario_manejo: string | null
          id: string
          local_id: string | null
          lote: string | null
          lote_id: string | null
          manejador: string | null
          nome_usuario: string | null
          novilha: number | null
          numero_pessoas_manejo: number | null
          pasto_entrada: string | null
          pasto_entrada_area_util: number | null
          pasto_entrada_especie: string | null
          pasto_entrada_id: string | null
          pasto_saida: string | null
          pasto_saida_area_util: number | null
          pasto_saida_especie: string | null
          pasto_saida_id: string | null
          sync_status: string | null
          total_animais: number | null
          touro: number | null
          updated_at: string | null
          vaca: number | null
          version: number | null
        }
        Insert: {
          avaliacao_entrada?: number | null
          avaliacao_geral?: Json | null
          avaliacao_saida?: number | null
          bezerro?: number | null
          boi_magro?: number | null
          categorias_detalhes?: Json | null
          created_at?: string | null
          data: string
          deleted_at?: string | null
          dispositivo_id?: string | null
          equipe_nomes?: Json | null
          escore_fezes?: number | null
          escore_gado?: number | null
          fazenda_id: string
          gado_contado?: string | null
          garrote?: number | null
          horario_manejo?: string | null
          id?: string
          local_id?: string | null
          lote?: string | null
          lote_id?: string | null
          manejador?: string | null
          nome_usuario?: string | null
          novilha?: number | null
          numero_pessoas_manejo?: number | null
          pasto_entrada?: string | null
          pasto_entrada_area_util?: number | null
          pasto_entrada_especie?: string | null
          pasto_entrada_id?: string | null
          pasto_saida?: string | null
          pasto_saida_area_util?: number | null
          pasto_saida_especie?: string | null
          pasto_saida_id?: string | null
          sync_status?: string | null
          total_animais?: number | null
          touro?: number | null
          updated_at?: string | null
          vaca?: number | null
          version?: number | null
        }
        Update: {
          avaliacao_entrada?: number | null
          avaliacao_geral?: Json | null
          avaliacao_saida?: number | null
          bezerro?: number | null
          boi_magro?: number | null
          categorias_detalhes?: Json | null
          created_at?: string | null
          data?: string
          deleted_at?: string | null
          dispositivo_id?: string | null
          equipe_nomes?: Json | null
          escore_fezes?: number | null
          escore_gado?: number | null
          fazenda_id?: string
          gado_contado?: string | null
          garrote?: number | null
          horario_manejo?: string | null
          id?: string
          local_id?: string | null
          lote?: string | null
          lote_id?: string | null
          manejador?: string | null
          nome_usuario?: string | null
          novilha?: number | null
          numero_pessoas_manejo?: number | null
          pasto_entrada?: string | null
          pasto_entrada_area_util?: number | null
          pasto_entrada_especie?: string | null
          pasto_entrada_id?: string | null
          pasto_saida?: string | null
          pasto_saida_area_util?: number | null
          pasto_saida_especie?: string | null
          pasto_saida_id?: string | null
          sync_status?: string | null
          total_animais?: number | null
          touro?: number | null
          updated_at?: string | null
          vaca?: number | null
          version?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "registros_pastagens_dispositivo_id_fkey"
            columns: ["dispositivo_id"]
            isOneToOne: false
            referencedRelation: "dispositivos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "registros_pastagens_fazenda_id_fkey"
            columns: ["fazenda_id"]
            isOneToOne: false
            referencedRelation: "fazendas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "registros_pastagens_lote_id_fkey"
            columns: ["lote_id"]
            isOneToOne: false
            referencedRelation: "lotes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "registros_pastagens_pasto_entrada_id_fkey"
            columns: ["pasto_entrada_id"]
            isOneToOne: false
            referencedRelation: "pastos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "registros_pastagens_pasto_saida_id_fkey"
            columns: ["pasto_saida_id"]
            isOneToOne: false
            referencedRelation: "pastos"
            referencedColumns: ["id"]
          },
        ]
      }
      registros_pesagem: {
        Row: {
          acidente: boolean | null
          balanca_aferida: boolean | null
          categoria: string | null
          checklist_conferido: boolean | null
          created_at: string | null
          curral_limpo: boolean | null
          data: string
          deleted_at: string | null
          dispositivo_id: string | null
          equipe_ajustada: boolean | null
          fazenda_id: string
          gritaria: boolean | null
          horario_fim: string | null
          horario_inicio: string | null
          id: string
          id_brinco: string | null
          id_chip: string | null
          idade_dias: number | null
          idade_era: string | null
          individuo_id: string | null
          individuo_status_anterior: string | null
          local_id: string | null
          lote: string | null
          lote_id: string | null
          manejo_agil: boolean | null
          manejo_calmo: boolean | null
          nome_usuario: string | null
          os_id: string | null
          peso_kg: number | null
          raca: string | null
          responsavel: string | null
          sexo: string | null
          sync_status: string | null
          tempo_medio_min_cab: number | null
          tempo_preenchimento_seg: number | null
          tempo_total_min: number | null
          tipo_manejo: string
          updated_at: string | null
          version: number | null
        }
        Insert: {
          acidente?: boolean | null
          balanca_aferida?: boolean | null
          categoria?: string | null
          checklist_conferido?: boolean | null
          created_at?: string | null
          curral_limpo?: boolean | null
          data: string
          deleted_at?: string | null
          dispositivo_id?: string | null
          equipe_ajustada?: boolean | null
          fazenda_id: string
          gritaria?: boolean | null
          horario_fim?: string | null
          horario_inicio?: string | null
          id?: string
          id_brinco?: string | null
          id_chip?: string | null
          idade_dias?: number | null
          idade_era?: string | null
          individuo_id?: string | null
          individuo_status_anterior?: string | null
          local_id?: string | null
          lote?: string | null
          lote_id?: string | null
          manejo_agil?: boolean | null
          manejo_calmo?: boolean | null
          nome_usuario?: string | null
          os_id?: string | null
          peso_kg?: number | null
          raca?: string | null
          responsavel?: string | null
          sexo?: string | null
          sync_status?: string | null
          tempo_medio_min_cab?: number | null
          tempo_preenchimento_seg?: number | null
          tempo_total_min?: number | null
          tipo_manejo: string
          updated_at?: string | null
          version?: number | null
        }
        Update: {
          acidente?: boolean | null
          balanca_aferida?: boolean | null
          categoria?: string | null
          checklist_conferido?: boolean | null
          created_at?: string | null
          curral_limpo?: boolean | null
          data?: string
          deleted_at?: string | null
          dispositivo_id?: string | null
          equipe_ajustada?: boolean | null
          fazenda_id?: string
          gritaria?: boolean | null
          horario_fim?: string | null
          horario_inicio?: string | null
          id?: string
          id_brinco?: string | null
          id_chip?: string | null
          idade_dias?: number | null
          idade_era?: string | null
          individuo_id?: string | null
          individuo_status_anterior?: string | null
          local_id?: string | null
          lote?: string | null
          lote_id?: string | null
          manejo_agil?: boolean | null
          manejo_calmo?: boolean | null
          nome_usuario?: string | null
          os_id?: string | null
          peso_kg?: number | null
          raca?: string | null
          responsavel?: string | null
          sexo?: string | null
          sync_status?: string | null
          tempo_medio_min_cab?: number | null
          tempo_preenchimento_seg?: number | null
          tempo_total_min?: number | null
          tipo_manejo?: string
          updated_at?: string | null
          version?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "registros_pesagem_dispositivo_id_fkey"
            columns: ["dispositivo_id"]
            isOneToOne: false
            referencedRelation: "dispositivos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "registros_pesagem_fazenda_id_fkey"
            columns: ["fazenda_id"]
            isOneToOne: false
            referencedRelation: "fazendas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "registros_pesagem_individuo_id_fkey"
            columns: ["individuo_id"]
            isOneToOne: false
            referencedRelation: "individuos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "registros_pesagem_lote_id_fkey"
            columns: ["lote_id"]
            isOneToOne: false
            referencedRelation: "lotes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "registros_pesagem_os_id_fkey"
            columns: ["os_id"]
            isOneToOne: false
            referencedRelation: "ordens_servico"
            referencedColumns: ["id"]
          },
        ]
      }
      registros_problemas: {
        Row: {
          acao_corretiva_realizada: boolean | null
          acao_corretiva_realizada_obs: string | null
          causa_identificada: boolean | null
          causa_identificada_obs: string | null
          causa_raiz_identificada: boolean | null
          causa_raiz_identificada_obs: string | null
          created_at: string | null
          data: string
          deleted_at: string | null
          descricao_problema: string | null
          dispositivo_id: string | null
          fazenda_id: string
          gravidade_impacto: string | null
          gravidade_impacto_obs: string | null
          id: string
          local: string | null
          local_id: string | null
          nome_usuario: string | null
          prioridade: string | null
          setor: string | null
          setor_resolve: string | null
          sync_status: string | null
          tipo_ocorrencia: string | null
          tipo_ocorrencia_obs: string | null
          tipo_problema: string | null
          tipo_problema_obs: string | null
          updated_at: string | null
          version: number | null
        }
        Insert: {
          acao_corretiva_realizada?: boolean | null
          acao_corretiva_realizada_obs?: string | null
          causa_identificada?: boolean | null
          causa_identificada_obs?: string | null
          causa_raiz_identificada?: boolean | null
          causa_raiz_identificada_obs?: string | null
          created_at?: string | null
          data: string
          deleted_at?: string | null
          descricao_problema?: string | null
          dispositivo_id?: string | null
          fazenda_id: string
          gravidade_impacto?: string | null
          gravidade_impacto_obs?: string | null
          id?: string
          local?: string | null
          local_id?: string | null
          nome_usuario?: string | null
          prioridade?: string | null
          setor?: string | null
          setor_resolve?: string | null
          sync_status?: string | null
          tipo_ocorrencia?: string | null
          tipo_ocorrencia_obs?: string | null
          tipo_problema?: string | null
          tipo_problema_obs?: string | null
          updated_at?: string | null
          version?: number | null
        }
        Update: {
          acao_corretiva_realizada?: boolean | null
          acao_corretiva_realizada_obs?: string | null
          causa_identificada?: boolean | null
          causa_identificada_obs?: string | null
          causa_raiz_identificada?: boolean | null
          causa_raiz_identificada_obs?: string | null
          created_at?: string | null
          data?: string
          deleted_at?: string | null
          descricao_problema?: string | null
          dispositivo_id?: string | null
          fazenda_id?: string
          gravidade_impacto?: string | null
          gravidade_impacto_obs?: string | null
          id?: string
          local?: string | null
          local_id?: string | null
          nome_usuario?: string | null
          prioridade?: string | null
          setor?: string | null
          setor_resolve?: string | null
          sync_status?: string | null
          tipo_ocorrencia?: string | null
          tipo_ocorrencia_obs?: string | null
          tipo_problema?: string | null
          tipo_problema_obs?: string | null
          updated_at?: string | null
          version?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "registros_problemas_dispositivo_id_fkey"
            columns: ["dispositivo_id"]
            isOneToOne: false
            referencedRelation: "dispositivos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "registros_problemas_fazenda_id_fkey"
            columns: ["fazenda_id"]
            isOneToOne: false
            referencedRelation: "fazendas"
            referencedColumns: ["id"]
          },
        ]
      }
      registros_rodeio: {
        Row: {
          bezerro: number | null
          boi: number | null
          created_at: string | null
          data: string
          deleted_at: string | null
          diagnosticos: Json | null
          dispositivo_id: string | null
          equipe: number | null
          equipe_nomes: Json | null
          escore_fezes: number | null
          escore_gado: number | null
          fazenda_id: string
          foto_url: string | null
          gado_contado: string | null
          garrote: number | null
          id: string
          local_id: string | null
          lote: string | null
          lote_id: string | null
          nome_usuario: string | null
          novilha: number | null
          pasto: string | null
          pasto_id: string | null
          sync_status: string | null
          total_cabecas: number | null
          touro: number | null
          updated_at: string | null
          vaca: number | null
          version: number | null
        }
        Insert: {
          bezerro?: number | null
          boi?: number | null
          created_at?: string | null
          data: string
          deleted_at?: string | null
          diagnosticos?: Json | null
          dispositivo_id?: string | null
          equipe?: number | null
          equipe_nomes?: Json | null
          escore_fezes?: number | null
          escore_gado?: number | null
          fazenda_id: string
          foto_url?: string | null
          gado_contado?: string | null
          garrote?: number | null
          id?: string
          local_id?: string | null
          lote?: string | null
          lote_id?: string | null
          nome_usuario?: string | null
          novilha?: number | null
          pasto?: string | null
          pasto_id?: string | null
          sync_status?: string | null
          total_cabecas?: number | null
          touro?: number | null
          updated_at?: string | null
          vaca?: number | null
          version?: number | null
        }
        Update: {
          bezerro?: number | null
          boi?: number | null
          created_at?: string | null
          data?: string
          deleted_at?: string | null
          diagnosticos?: Json | null
          dispositivo_id?: string | null
          equipe?: number | null
          equipe_nomes?: Json | null
          escore_fezes?: number | null
          escore_gado?: number | null
          fazenda_id?: string
          foto_url?: string | null
          gado_contado?: string | null
          garrote?: number | null
          id?: string
          local_id?: string | null
          lote?: string | null
          lote_id?: string | null
          nome_usuario?: string | null
          novilha?: number | null
          pasto?: string | null
          pasto_id?: string | null
          sync_status?: string | null
          total_cabecas?: number | null
          touro?: number | null
          updated_at?: string | null
          vaca?: number | null
          version?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "registros_rodeio_dispositivo_id_fkey"
            columns: ["dispositivo_id"]
            isOneToOne: false
            referencedRelation: "dispositivos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "registros_rodeio_fazenda_id_fkey"
            columns: ["fazenda_id"]
            isOneToOne: false
            referencedRelation: "fazendas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "registros_rodeio_lote_id_fkey"
            columns: ["lote_id"]
            isOneToOne: false
            referencedRelation: "lotes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "registros_rodeio_pasto_id_fkey"
            columns: ["pasto_id"]
            isOneToOne: false
            referencedRelation: "pastos"
            referencedColumns: ["id"]
          },
        ]
      }
      registros_saida_insumos: {
        Row: {
          created_at: string | null
          data_producao: string
          deleted_at: string | null
          destino_producao: string | null
          dieta_produzida: string | null
          dispositivo_id: string | null
          fazenda_id: string
          formulacao_id: string | null
          id: string
          insumo_id: string | null
          insumos_quantidades: Json | null
          local_id: string | null
          nome_usuario: string | null
          sync_status: string | null
          total_produzido: number | null
          updated_at: string | null
          version: number | null
        }
        Insert: {
          created_at?: string | null
          data_producao: string
          deleted_at?: string | null
          destino_producao?: string | null
          dieta_produzida?: string | null
          dispositivo_id?: string | null
          fazenda_id: string
          formulacao_id?: string | null
          id?: string
          insumo_id?: string | null
          insumos_quantidades?: Json | null
          local_id?: string | null
          nome_usuario?: string | null
          sync_status?: string | null
          total_produzido?: number | null
          updated_at?: string | null
          version?: number | null
        }
        Update: {
          created_at?: string | null
          data_producao?: string
          deleted_at?: string | null
          destino_producao?: string | null
          dieta_produzida?: string | null
          dispositivo_id?: string | null
          fazenda_id?: string
          formulacao_id?: string | null
          id?: string
          insumo_id?: string | null
          insumos_quantidades?: Json | null
          local_id?: string | null
          nome_usuario?: string | null
          sync_status?: string | null
          total_produzido?: number | null
          updated_at?: string | null
          version?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "registros_saida_insumos_dispositivo_id_fkey"
            columns: ["dispositivo_id"]
            isOneToOne: false
            referencedRelation: "dispositivos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "registros_saida_insumos_fazenda_id_fkey"
            columns: ["fazenda_id"]
            isOneToOne: false
            referencedRelation: "fazendas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "registros_saida_insumos_formulacao_id_fkey"
            columns: ["formulacao_id"]
            isOneToOne: false
            referencedRelation: "formulacoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "registros_saida_insumos_insumo_id_fkey"
            columns: ["insumo_id"]
            isOneToOne: false
            referencedRelation: "insumos"
            referencedColumns: ["id"]
          },
        ]
      }
      registros_suplementacao: {
        Row: {
          categorias: string | null
          checklist: Json | null
          consumo_medio_30dias_kg_mn: number | null
          consumo_medio_30dias_kg_ms: number | null
          consumo_medio_30dias_percent_pv: number | null
          consumo_medio_geral_kg_mn: number | null
          consumo_medio_geral_kg_ms: number | null
          consumo_medio_geral_percent_pv: number | null
          created_at: string | null
          custo_medio_reais_cab_dia: number | null
          data: string
          data_local: string | null
          deleted_at: string | null
          dispositivo_id: string | null
          escopo: string
          escore_fezes: string | null
          espacamento_cocho_cm_cab: number | null
          espacamento_cocho_detalhes: Json | null
          espacamento_cocho_ideal: Json | null
          espacamento_cocho_obs: string | null
          fazenda_id: string
          forma_fornecimento: string | null
          formulacao: string | null
          formulacao_id: string | null
          grupo_operacao: string | null
          id: string
          kg_cocho: number
          kg_deposito: number | null
          leitura: string | null
          local_id: string | null
          lote: string | null
          lote_id: string | null
          n_cabecas: number | null
          nome_usuario: string | null
          pasto: string | null
          pasto_id: string | null
          peso_vivo_kg: number | null
          qtd_bezerros: number | null
          qtd_sacos: number | null
          sync_status: string | null
          tratador: string | null
          updated_at: string | null
          version: number | null
        }
        Insert: {
          categorias?: string | null
          checklist?: Json | null
          consumo_medio_30dias_kg_mn?: number | null
          consumo_medio_30dias_kg_ms?: number | null
          consumo_medio_30dias_percent_pv?: number | null
          consumo_medio_geral_kg_mn?: number | null
          consumo_medio_geral_kg_ms?: number | null
          consumo_medio_geral_percent_pv?: number | null
          created_at?: string | null
          custo_medio_reais_cab_dia?: number | null
          data: string
          data_local?: string | null
          deleted_at?: string | null
          dispositivo_id?: string | null
          escopo?: string
          escore_fezes?: string | null
          espacamento_cocho_cm_cab?: number | null
          espacamento_cocho_detalhes?: Json | null
          espacamento_cocho_ideal?: Json | null
          espacamento_cocho_obs?: string | null
          fazenda_id: string
          forma_fornecimento?: string | null
          formulacao?: string | null
          formulacao_id?: string | null
          grupo_operacao?: string | null
          id?: string
          kg_cocho?: number
          kg_deposito?: number | null
          leitura?: string | null
          local_id?: string | null
          lote?: string | null
          lote_id?: string | null
          n_cabecas?: number | null
          nome_usuario?: string | null
          pasto?: string | null
          pasto_id?: string | null
          peso_vivo_kg?: number | null
          qtd_bezerros?: number | null
          qtd_sacos?: number | null
          sync_status?: string | null
          tratador?: string | null
          updated_at?: string | null
          version?: number | null
        }
        Update: {
          categorias?: string | null
          checklist?: Json | null
          consumo_medio_30dias_kg_mn?: number | null
          consumo_medio_30dias_kg_ms?: number | null
          consumo_medio_30dias_percent_pv?: number | null
          consumo_medio_geral_kg_mn?: number | null
          consumo_medio_geral_kg_ms?: number | null
          consumo_medio_geral_percent_pv?: number | null
          created_at?: string | null
          custo_medio_reais_cab_dia?: number | null
          data?: string
          data_local?: string | null
          deleted_at?: string | null
          dispositivo_id?: string | null
          escopo?: string
          escore_fezes?: string | null
          espacamento_cocho_cm_cab?: number | null
          espacamento_cocho_detalhes?: Json | null
          espacamento_cocho_ideal?: Json | null
          espacamento_cocho_obs?: string | null
          fazenda_id?: string
          forma_fornecimento?: string | null
          formulacao?: string | null
          formulacao_id?: string | null
          grupo_operacao?: string | null
          id?: string
          kg_cocho?: number
          kg_deposito?: number | null
          leitura?: string | null
          local_id?: string | null
          lote?: string | null
          lote_id?: string | null
          n_cabecas?: number | null
          nome_usuario?: string | null
          pasto?: string | null
          pasto_id?: string | null
          peso_vivo_kg?: number | null
          qtd_bezerros?: number | null
          qtd_sacos?: number | null
          sync_status?: string | null
          tratador?: string | null
          updated_at?: string | null
          version?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "registros_suplementacao_dispositivo_id_fkey"
            columns: ["dispositivo_id"]
            isOneToOne: false
            referencedRelation: "dispositivos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "registros_suplementacao_fazenda_id_fkey"
            columns: ["fazenda_id"]
            isOneToOne: false
            referencedRelation: "fazendas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "registros_suplementacao_formulacao_id_fkey"
            columns: ["formulacao_id"]
            isOneToOne: false
            referencedRelation: "formulacoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "registros_suplementacao_lote_id_fkey"
            columns: ["lote_id"]
            isOneToOne: false
            referencedRelation: "lotes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "registros_suplementacao_pasto_id_fkey"
            columns: ["pasto_id"]
            isOneToOne: false
            referencedRelation: "pastos"
            referencedColumns: ["id"]
          },
        ]
      }
      relatorios_publicos: {
        Row: {
          ativo: boolean
          criado_em: string
          criado_por: string | null
          expira_em: string | null
          fazenda_id: string
          id: string
          tipo: string
          titulo: string
        }
        Insert: {
          ativo?: boolean
          criado_em?: string
          criado_por?: string | null
          expira_em?: string | null
          fazenda_id: string
          id?: string
          tipo: string
          titulo: string
        }
        Update: {
          ativo?: boolean
          criado_em?: string
          criado_por?: string | null
          expira_em?: string | null
          fazenda_id?: string
          id?: string
          tipo?: string
          titulo?: string
        }
        Relationships: [
          {
            foreignKeyName: "relatorios_publicos_criado_por_fkey"
            columns: ["criado_por"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "relatorios_publicos_fazenda_id_fkey"
            columns: ["fazenda_id"]
            isOneToOne: false
            referencedRelation: "fazendas"
            referencedColumns: ["id"]
          },
        ]
      }
      rotacao_pastos: {
        Row: {
          ativo: boolean | null
          created_at: string | null
          id: string
          modulo_id: string
          ordem: number
          pasto_id: string
          updated_at: string | null
        }
        Insert: {
          ativo?: boolean | null
          created_at?: string | null
          id?: string
          modulo_id: string
          ordem: number
          pasto_id: string
          updated_at?: string | null
        }
        Update: {
          ativo?: boolean | null
          created_at?: string | null
          id?: string
          modulo_id?: string
          ordem?: number
          pasto_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "rotacao_pastos_modulo_id_fkey"
            columns: ["modulo_id"]
            isOneToOne: false
            referencedRelation: "modulos_pastos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rotacao_pastos_pasto_id_fkey"
            columns: ["pasto_id"]
            isOneToOne: false
            referencedRelation: "pastos"
            referencedColumns: ["id"]
          },
        ]
      }
      rotinas: {
        Row: {
          ativo: boolean
          cadernetas: string[]
          created_at: string
          data_fim: string | null
          data_inicio: string
          dias_semana: number[]
          fazenda_id: string
          funcionario_id: string
          horarios: Json
          id: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          cadernetas?: string[]
          created_at?: string
          data_fim?: string | null
          data_inicio?: string
          dias_semana?: number[]
          fazenda_id: string
          funcionario_id: string
          horarios?: Json
          id?: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          cadernetas?: string[]
          created_at?: string
          data_fim?: string | null
          data_inicio?: string
          dias_semana?: number[]
          fazenda_id?: string
          funcionario_id?: string
          horarios?: Json
          id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "rotinas_fazenda_id_fkey"
            columns: ["fazenda_id"]
            isOneToOne: false
            referencedRelation: "fazendas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rotinas_funcionario_id_fkey"
            columns: ["funcionario_id"]
            isOneToOne: false
            referencedRelation: "funcionarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rotinas_funcionario_id_fkey"
            columns: ["funcionario_id"]
            isOneToOne: false
            referencedRelation: "v_funcionarios_com_setores"
            referencedColumns: ["funcionario_id"]
          },
        ]
      }
      saida_insumos_itens: {
        Row: {
          id: string
          insumo_id: string
          local_id: string | null
          quantidade: number
          saida_id: string
        }
        Insert: {
          id?: string
          insumo_id: string
          local_id?: string | null
          quantidade: number
          saida_id: string
        }
        Update: {
          id?: string
          insumo_id?: string
          local_id?: string | null
          quantidade?: number
          saida_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "saida_insumos_itens_insumo_id_fkey"
            columns: ["insumo_id"]
            isOneToOne: false
            referencedRelation: "insumos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "saida_insumos_itens_saida_id_fkey"
            columns: ["saida_id"]
            isOneToOne: false
            referencedRelation: "registros_saida_insumos"
            referencedColumns: ["id"]
          },
        ]
      }
      saved_filters: {
        Row: {
          created_at: string | null
          fazenda_id: string | null
          filtros: Json
          id: string
          is_preset: boolean | null
          nome: string
          tela: string
          updated_at: string | null
          usuario_id: string
        }
        Insert: {
          created_at?: string | null
          fazenda_id?: string | null
          filtros: Json
          id?: string
          is_preset?: boolean | null
          nome: string
          tela: string
          updated_at?: string | null
          usuario_id: string
        }
        Update: {
          created_at?: string | null
          fazenda_id?: string | null
          filtros?: Json
          id?: string
          is_preset?: boolean | null
          nome?: string
          tela?: string
          updated_at?: string | null
          usuario_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "saved_filters_fazenda_id_fkey"
            columns: ["fazenda_id"]
            isOneToOne: false
            referencedRelation: "fazendas"
            referencedColumns: ["id"]
          },
        ]
      }
      setores: {
        Row: {
          ativo: boolean | null
          created_at: string | null
          deleted_at: string | null
          fazenda_id: string
          id: string
          nome: string
          updated_at: string | null
        }
        Insert: {
          ativo?: boolean | null
          created_at?: string | null
          deleted_at?: string | null
          fazenda_id: string
          id?: string
          nome: string
          updated_at?: string | null
        }
        Update: {
          ativo?: boolean | null
          created_at?: string | null
          deleted_at?: string | null
          fazenda_id?: string
          id?: string
          nome?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      solicitacoes_novo_lote: {
        Row: {
          app_version: string | null
          aprovada_at: string | null
          aprovada_by: string | null
          categorias: Json
          categorias_editadas: Json | null
          created_at: string | null
          dados_lote_editado: Json | null
          dados_lote_proposto: Json
          dados_movimentacao: Json
          dispositivo_id: string | null
          fazenda_id: string
          id: string
          lote_criado_id: string | null
          lote_origem_id: string
          lote_origem_nome: string
          motivo_rejeicao: string | null
          movimentacao_criada_ids: string[] | null
          platform: string | null
          rejeitada_at: string | null
          rejeitada_by: string | null
          status: string
          updated_at: string | null
        }
        Insert: {
          app_version?: string | null
          aprovada_at?: string | null
          aprovada_by?: string | null
          categorias: Json
          categorias_editadas?: Json | null
          created_at?: string | null
          dados_lote_editado?: Json | null
          dados_lote_proposto: Json
          dados_movimentacao: Json
          dispositivo_id?: string | null
          fazenda_id: string
          id?: string
          lote_criado_id?: string | null
          lote_origem_id: string
          lote_origem_nome: string
          motivo_rejeicao?: string | null
          movimentacao_criada_ids?: string[] | null
          platform?: string | null
          rejeitada_at?: string | null
          rejeitada_by?: string | null
          status?: string
          updated_at?: string | null
        }
        Update: {
          app_version?: string | null
          aprovada_at?: string | null
          aprovada_by?: string | null
          categorias?: Json
          categorias_editadas?: Json | null
          created_at?: string | null
          dados_lote_editado?: Json | null
          dados_lote_proposto?: Json
          dados_movimentacao?: Json
          dispositivo_id?: string | null
          fazenda_id?: string
          id?: string
          lote_criado_id?: string | null
          lote_origem_id?: string
          lote_origem_nome?: string
          motivo_rejeicao?: string | null
          movimentacao_criada_ids?: string[] | null
          platform?: string | null
          rejeitada_at?: string | null
          rejeitada_by?: string | null
          status?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "solicitacoes_novo_lote_aprovada_by_fkey"
            columns: ["aprovada_by"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "solicitacoes_novo_lote_fazenda_id_fkey"
            columns: ["fazenda_id"]
            isOneToOne: false
            referencedRelation: "fazendas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "solicitacoes_novo_lote_lote_criado_id_fkey"
            columns: ["lote_criado_id"]
            isOneToOne: false
            referencedRelation: "lotes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "solicitacoes_novo_lote_lote_origem_id_fkey"
            columns: ["lote_origem_id"]
            isOneToOne: false
            referencedRelation: "lotes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "solicitacoes_novo_lote_rejeitada_by_fkey"
            columns: ["rejeitada_by"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      sync_queue: {
        Row: {
          created_at: string | null
          dispositivo_id: string | null
          erro: string | null
          fazenda_id: string
          id: string
          operacao: string
          prioridade: string | null
          processado_at: string | null
          registro_id: string
          retry_count: number | null
          tabela: string
        }
        Insert: {
          created_at?: string | null
          dispositivo_id?: string | null
          erro?: string | null
          fazenda_id: string
          id?: string
          operacao: string
          prioridade?: string | null
          processado_at?: string | null
          registro_id: string
          retry_count?: number | null
          tabela: string
        }
        Update: {
          created_at?: string | null
          dispositivo_id?: string | null
          erro?: string | null
          fazenda_id?: string
          id?: string
          operacao?: string
          prioridade?: string | null
          processado_at?: string | null
          registro_id?: string
          retry_count?: number | null
          tabela?: string
        }
        Relationships: [
          {
            foreignKeyName: "sync_queue_dispositivo_id_fkey"
            columns: ["dispositivo_id"]
            isOneToOne: false
            referencedRelation: "dispositivos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sync_queue_fazenda_id_fkey"
            columns: ["fazenda_id"]
            isOneToOne: false
            referencedRelation: "fazendas"
            referencedColumns: ["id"]
          },
        ]
      }
      system_health_samples: {
        Row: {
          active_connections: number
          active_queries_count: number
          active_sessions_1h: number
          active_users_1h: number
          avg_active_query_ms: number
          cache_hit_ratio: number
          db_size_bytes: number
          id: number
          max_active_query_ms: number
          per_fazenda: Json
          sampled_at: string
          total_connections: number
          xact_commit: number
          xact_rollback: number
          xact_total: number
        }
        Insert: {
          active_connections: number
          active_queries_count?: number
          active_sessions_1h: number
          active_users_1h: number
          avg_active_query_ms?: number
          cache_hit_ratio: number
          db_size_bytes: number
          id?: never
          max_active_query_ms?: number
          per_fazenda?: Json
          sampled_at?: string
          total_connections: number
          xact_commit: number
          xact_rollback: number
          xact_total: number
        }
        Update: {
          active_connections?: number
          active_queries_count?: number
          active_sessions_1h?: number
          active_users_1h?: number
          avg_active_query_ms?: number
          cache_hit_ratio?: number
          db_size_bytes?: number
          id?: never
          max_active_query_ms?: number
          per_fazenda?: Json
          sampled_at?: string
          total_connections?: number
          xact_commit?: number
          xact_rollback?: number
          xact_total?: number
        }
        Relationships: []
      }
      tanques_combustivel: {
        Row: {
          ativo: boolean | null
          capacidade_maxima_l: number
          created_at: string | null
          custo_medio_l: number
          deleted_at: string | null
          fazenda_id: string
          id: string
          limite_alerta_l: number
          nome: string
          saldo_atual_l: number
          tipo_combustivel: string
          updated_at: string | null
        }
        Insert: {
          ativo?: boolean | null
          capacidade_maxima_l: number
          created_at?: string | null
          custo_medio_l?: number
          deleted_at?: string | null
          fazenda_id: string
          id?: string
          limite_alerta_l?: number
          nome: string
          saldo_atual_l?: number
          tipo_combustivel: string
          updated_at?: string | null
        }
        Update: {
          ativo?: boolean | null
          capacidade_maxima_l?: number
          created_at?: string | null
          custo_medio_l?: number
          deleted_at?: string | null
          fazenda_id?: string
          id?: string
          limite_alerta_l?: number
          nome?: string
          saldo_atual_l?: number
          tipo_combustivel?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tanques_combustivel_fazenda_id_fkey"
            columns: ["fazenda_id"]
            isOneToOne: false
            referencedRelation: "fazendas"
            referencedColumns: ["id"]
          },
        ]
      }
      tratamentos: {
        Row: {
          ativo: boolean | null
          created_at: string | null
          fazenda_id: string
          id: string
          nome: string
          updated_at: string | null
        }
        Insert: {
          ativo?: boolean | null
          created_at?: string | null
          fazenda_id: string
          id?: string
          nome: string
          updated_at?: string | null
        }
        Update: {
          ativo?: boolean | null
          created_at?: string | null
          fazenda_id?: string
          id?: string
          nome?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      usuario_fazenda: {
        Row: {
          ativo: boolean | null
          created_at: string | null
          fazenda_id: string
          id: string
          papel: string
          updated_at: string | null
          usuario_id: string
        }
        Insert: {
          ativo?: boolean | null
          created_at?: string | null
          fazenda_id: string
          id?: string
          papel: string
          updated_at?: string | null
          usuario_id: string
        }
        Update: {
          ativo?: boolean | null
          created_at?: string | null
          fazenda_id?: string
          id?: string
          papel?: string
          updated_at?: string | null
          usuario_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "usuario_fazenda_fazenda_id_fkey"
            columns: ["fazenda_id"]
            isOneToOne: false
            referencedRelation: "fazendas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "usuario_fazenda_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      usuarios: {
        Row: {
          ativo: boolean | null
          auth_id: string | null
          created_at: string | null
          email: string
          id: string
          nome: string
          papel: string | null
          telefone: string | null
          ultimo_acesso: string | null
          updated_at: string | null
        }
        Insert: {
          ativo?: boolean | null
          auth_id?: string | null
          created_at?: string | null
          email: string
          id?: string
          nome: string
          papel?: string | null
          telefone?: string | null
          ultimo_acesso?: string | null
          updated_at?: string | null
        }
        Update: {
          ativo?: boolean | null
          auth_id?: string | null
          created_at?: string | null
          email?: string
          id?: string
          nome?: string
          papel?: string | null
          telefone?: string | null
          ultimo_acesso?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      vagoes: {
        Row: {
          ativo: boolean
          capacidade_kg: number | null
          created_at: string
          deleted_at: string | null
          fazenda_id: string
          id: string
          marca: string
          modelo: string
          nome: string | null
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          capacidade_kg?: number | null
          created_at?: string
          deleted_at?: string | null
          fazenda_id: string
          id?: string
          marca: string
          modelo: string
          nome?: string | null
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          capacidade_kg?: number | null
          created_at?: string
          deleted_at?: string | null
          fazenda_id?: string
          id?: string
          marca?: string
          modelo?: string
          nome?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "vagoes_fazenda_id_fkey"
            columns: ["fazenda_id"]
            isOneToOne: false
            referencedRelation: "fazendas"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      itens_almoxarifado_pwa: {
        Row: {
          ativo: boolean | null
          classificacao: string | null
          controla_estoque: boolean | null
          estoque_atual: number | null
          fazenda_id: string | null
          id: string | null
          nome: string | null
          unidade: string | null
        }
        Insert: {
          ativo?: boolean | null
          classificacao?: string | null
          controla_estoque?: boolean | null
          estoque_atual?: number | null
          fazenda_id?: string | null
          id?: string | null
          nome?: string | null
          unidade?: string | null
        }
        Update: {
          ativo?: boolean | null
          classificacao?: string | null
          controla_estoque?: boolean | null
          estoque_atual?: number | null
          fazenda_id?: string | null
          id?: string | null
          nome?: string | null
          unidade?: string | null
        }
        Relationships: []
      }
      itens_cantina_pwa: {
        Row: {
          ativo: boolean | null
          classificacao: string | null
          controla_estoque: boolean | null
          estoque_atual: number | null
          fazenda_id: string | null
          id: string | null
          nome: string | null
          unidade_medida: string | null
        }
        Insert: {
          ativo?: boolean | null
          classificacao?: string | null
          controla_estoque?: boolean | null
          estoque_atual?: number | null
          fazenda_id?: string | null
          id?: string | null
          nome?: string | null
          unidade_medida?: string | null
        }
        Update: {
          ativo?: boolean | null
          classificacao?: string | null
          controla_estoque?: boolean | null
          estoque_atual?: number | null
          fazenda_id?: string | null
          id?: string | null
          nome?: string | null
          unidade_medida?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "itens_cantina_fazenda_id_fkey"
            columns: ["fazenda_id"]
            isOneToOne: false
            referencedRelation: "fazendas"
            referencedColumns: ["id"]
          },
        ]
      }
      v_funcionarios_com_setores: {
        Row: {
          ativo: boolean | null
          cargo: string | null
          deleted_at: string | null
          fazenda_id: string | null
          funcionario_id: string | null
          nome: string | null
          setor_ids: string[] | null
          setor_nomes: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "funcionarios_fazenda_id_fkey"
            columns: ["fazenda_id"]
            isOneToOne: false
            referencedRelation: "fazendas"
            referencedColumns: ["id"]
          },
        ]
      }
      v_historico_ocupacao_modulo: {
        Row: {
          cabecas_entrada: number | null
          cabecas_saida: number | null
          data_hora_entrada: string | null
          data_hora_saida: string | null
          desvio_tempo_ocupacao_percent: number | null
          historico_id: string | null
          lote_id: string | null
          lote_nome: string | null
          meta_intervalo_ocupacao_dias: number | null
          modulo_id: string | null
          modulo_nome: string | null
          periodo_ocupacao_dias: number | null
          periodo_ocupacao_horas: number | null
          peso_vivo_medio_entrada_kg: number | null
          peso_vivo_medio_saida_kg: number | null
          taxa_lotacao_ua_ha: number | null
        }
        Relationships: [
          {
            foreignKeyName: "lote_modulo_historico_lote_id_fkey"
            columns: ["lote_id"]
            isOneToOne: false
            referencedRelation: "lotes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lote_modulo_historico_modulo_id_fkey"
            columns: ["modulo_id"]
            isOneToOne: false
            referencedRelation: "modulos_pastos"
            referencedColumns: ["id"]
          },
        ]
      }
      v_historico_ocupacao_pasto: {
        Row: {
          cabecas_entrada: number | null
          cabecas_saida: number | null
          data_hora_entrada: string | null
          data_hora_saida: string | null
          desvio_tempo_ocupacao_percent: number | null
          historico_id: string | null
          lote_id: string | null
          lote_nome: string | null
          meta_intervalo_ocupacao_dias: number | null
          modulo_id: string | null
          modulo_nome: string | null
          pasto_id: string | null
          pasto_nome: string | null
          periodo_ocupacao_dias: number | null
          periodo_ocupacao_horas: number | null
          peso_vivo_medio_entrada_kg: number | null
          peso_vivo_medio_saida_kg: number | null
          taxa_lotacao_ua_ha: number | null
        }
        Relationships: [
          {
            foreignKeyName: "lote_pasto_historico_lote_id_fkey"
            columns: ["lote_id"]
            isOneToOne: false
            referencedRelation: "lotes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lote_pasto_historico_modulo_id_fkey"
            columns: ["modulo_id"]
            isOneToOne: false
            referencedRelation: "modulos_pastos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lote_pasto_historico_pasto_id_fkey"
            columns: ["pasto_id"]
            isOneToOne: false
            referencedRelation: "pastos"
            referencedColumns: ["id"]
          },
        ]
      }
      v_lote_modulo_ocupacao_atual: {
        Row: {
          cabecas_atual: number | null
          cabecas_entrada: number | null
          data_hora_entrada: string | null
          desvio_percentual_atual: number | null
          dias_acima_meta: number | null
          historico_id: string | null
          lote_id: string | null
          lote_nome: string | null
          meta_excedida: boolean | null
          meta_intervalo_ocupacao_dias: number | null
          modulo_id: string | null
          modulo_nome: string | null
          periodo_ocupacao_dias: number | null
          periodo_ocupacao_horas: number | null
          peso_vivo_medio_atual_kg: number | null
          peso_vivo_medio_entrada_kg: number | null
          taxa_lotacao_ua_ha: number | null
        }
        Relationships: [
          {
            foreignKeyName: "lote_modulo_historico_lote_id_fkey"
            columns: ["lote_id"]
            isOneToOne: false
            referencedRelation: "lotes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lote_modulo_historico_modulo_id_fkey"
            columns: ["modulo_id"]
            isOneToOne: false
            referencedRelation: "modulos_pastos"
            referencedColumns: ["id"]
          },
        ]
      }
      v_lote_pasto_ocupacao_atual: {
        Row: {
          cabecas_atual: number | null
          cabecas_entrada: number | null
          data_hora_entrada: string | null
          desvio_percentual_atual: number | null
          dias_acima_meta: number | null
          historico_id: string | null
          lote_id: string | null
          lote_nome: string | null
          meta_excedida: boolean | null
          meta_intervalo_ocupacao_dias: number | null
          modulo_id: string | null
          modulo_nome: string | null
          pasto_id: string | null
          pasto_nome: string | null
          periodo_ocupacao_dias: number | null
          periodo_ocupacao_horas: number | null
          peso_vivo_medio_atual_kg: number | null
          peso_vivo_medio_entrada_kg: number | null
          taxa_lotacao_ua_ha: number | null
        }
        Relationships: [
          {
            foreignKeyName: "lote_pasto_historico_lote_id_fkey"
            columns: ["lote_id"]
            isOneToOne: false
            referencedRelation: "lotes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lote_pasto_historico_modulo_id_fkey"
            columns: ["modulo_id"]
            isOneToOne: false
            referencedRelation: "modulos_pastos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lote_pasto_historico_pasto_id_fkey"
            columns: ["pasto_id"]
            isOneToOne: false
            referencedRelation: "pastos"
            referencedColumns: ["id"]
          },
        ]
      }
      v_notificacoes_pendentes_ocupacao: {
        Row: {
          acao_label: string | null
          acao_url: string | null
          created_at: string | null
          deleted_at: string | null
          fazenda_id: string | null
          id: string | null
          lida: boolean | null
          mensagem: string | null
          tipo: string | null
          tipo_ocupacao: string | null
          titulo: string | null
          updated_at: string | null
          usuario_id: string | null
        }
        Insert: {
          acao_label?: string | null
          acao_url?: string | null
          created_at?: string | null
          deleted_at?: string | null
          fazenda_id?: string | null
          id?: string | null
          lida?: boolean | null
          mensagem?: string | null
          tipo?: string | null
          tipo_ocupacao?: never
          titulo?: string | null
          updated_at?: string | null
          usuario_id?: string | null
        }
        Update: {
          acao_label?: string | null
          acao_url?: string | null
          created_at?: string | null
          deleted_at?: string | null
          fazenda_id?: string | null
          id?: string | null
          lida?: boolean | null
          mensagem?: string | null
          tipo?: string | null
          tipo_ocupacao?: never
          titulo?: string | null
          updated_at?: string | null
          usuario_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notificacoes_fazenda_id_fkey"
            columns: ["fazenda_id"]
            isOneToOne: false
            referencedRelation: "fazendas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notificacoes_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      v_registros_unificado: {
        Row: {
          caderneta: string | null
          created_at: string | null
          data: string | null
          deleted_at: string | null
          fazenda_id: string | null
          id: string | null
          nome_usuario: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      _pgr_articulationpoints: {
        Args: { edges_sql: string }
        Returns: Record<string, unknown>[]
      }
      _pgr_astar:
        | {
            Args: {
              combinations_sql: string
              directed?: boolean
              edges_sql: string
              epsilon?: number
              factor?: number
              heuristic?: number
              only_cost?: boolean
            }
            Returns: Record<string, unknown>[]
          }
        | {
            Args: {
              directed?: boolean
              edges_sql: string
              end_vids: unknown
              epsilon?: number
              factor?: number
              heuristic?: number
              normal?: boolean
              only_cost?: boolean
              start_vids: unknown
            }
            Returns: Record<string, unknown>[]
          }
      _pgr_bellmanford:
        | {
            Args: {
              combinations_sql: string
              directed: boolean
              edges_sql: string
              only_cost: boolean
            }
            Returns: Record<string, unknown>[]
          }
        | {
            Args: {
              directed: boolean
              edges_sql: string
              from_vids: unknown
              only_cost: boolean
              to_vids: unknown
            }
            Returns: Record<string, unknown>[]
          }
      _pgr_biconnectedcomponents: {
        Args: { edges_sql: string }
        Returns: Record<string, unknown>[]
      }
      _pgr_binarybreadthfirstsearch:
        | {
            Args: {
              combinations_sql: string
              directed?: boolean
              edges_sql: string
            }
            Returns: Record<string, unknown>[]
          }
        | {
            Args: {
              directed?: boolean
              edges_sql: string
              from_vids: unknown
              to_vids: unknown
            }
            Returns: Record<string, unknown>[]
          }
      _pgr_bipartite: {
        Args: { edges_sql: string }
        Returns: Record<string, unknown>[]
      }
      _pgr_boost_version: { Args: never; Returns: string }
      _pgr_breadthfirstsearch: {
        Args: {
          directed: boolean
          edges_sql: string
          from_vids: unknown
          max_depth: number
        }
        Returns: Record<string, unknown>[]
      }
      _pgr_bridges: {
        Args: { edges_sql: string }
        Returns: Record<string, unknown>[]
      }
      _pgr_build_type: { Args: never; Returns: string }
      _pgr_checkquery: { Args: { "": string }; Returns: string }
      _pgr_checkverttab: {
        Args: {
          columnsarr: string[]
          fnname?: string
          reporterrs?: number
          vertname: string
        }
        Returns: Record<string, unknown>
      }
      _pgr_chinesepostman: {
        Args: { edges_sql: string; only_cost: boolean }
        Returns: Record<string, unknown>[]
      }
      _pgr_compilation_date: { Args: never; Returns: string }
      _pgr_compiler_version: { Args: never; Returns: string }
      _pgr_connectedcomponents: {
        Args: { edges_sql: string }
        Returns: Record<string, unknown>[]
      }
      _pgr_contraction: {
        Args: {
          contraction_order: number[]
          directed?: boolean
          edges_sql: string
          forbidden_vertices?: number[]
          max_cycles?: number
        }
        Returns: Record<string, unknown>[]
      }
      _pgr_createindex:
        | {
            Args: {
              colname: string
              fnname?: string
              indext: string
              reporterrs?: number
              sname: string
              tname: string
            }
            Returns: undefined
          }
        | {
            Args: {
              colname: string
              fnname?: string
              indext: string
              reporterrs?: number
              tabname: string
            }
            Returns: undefined
          }
      _pgr_cuthillmckeeordering: {
        Args: { "": string }
        Returns: Record<string, unknown>[]
      }
      _pgr_depthfirstsearch: {
        Args: {
          directed: boolean
          edges_sql: string
          max_depth: number
          root_vids: unknown
        }
        Returns: Record<string, unknown>[]
      }
      _pgr_dijkstra:
        | {
            Args: {
              combinations_sql: string
              directed?: boolean
              edges_sql: string
              normal?: boolean
              only_cost?: boolean
            }
            Returns: Record<string, unknown>[]
          }
        | {
            Args: {
              combinations_sql: string
              directed: boolean
              edges_sql: string
              global: boolean
              n_goals: number
              only_cost: boolean
            }
            Returns: Record<string, unknown>[]
          }
        | {
            Args: {
              directed?: boolean
              edges_sql: string
              end_vids: unknown
              n_goals?: number
              normal?: boolean
              only_cost?: boolean
              start_vids: unknown
            }
            Returns: Record<string, unknown>[]
          }
        | {
            Args: {
              directed: boolean
              edges_sql: string
              end_vids: unknown
              global: boolean
              n_goals: number
              normal: boolean
              only_cost: boolean
              start_vids: unknown
            }
            Returns: Record<string, unknown>[]
          }
      _pgr_dijkstravia: {
        Args: {
          directed: boolean
          edges_sql: string
          strict: boolean
          u_turn_on_edge: boolean
          via_vids: unknown
        }
        Returns: Record<string, unknown>[]
      }
      _pgr_drivingdistance: {
        Args: {
          directed?: boolean
          distance: number
          edges_sql: string
          equicost?: boolean
          start_vids: unknown
        }
        Returns: Record<string, unknown>[]
      }
      _pgr_edgecoloring: {
        Args: { edges_sql: string }
        Returns: Record<string, unknown>[]
      }
      _pgr_edwardmoore:
        | {
            Args: {
              combinations_sql: string
              directed?: boolean
              edges_sql: string
            }
            Returns: Record<string, unknown>[]
          }
        | {
            Args: {
              directed?: boolean
              edges_sql: string
              from_vids: unknown
              to_vids: unknown
            }
            Returns: Record<string, unknown>[]
          }
      _pgr_endpoint: { Args: { g: unknown }; Returns: unknown }
      _pgr_floydwarshall: {
        Args: { directed: boolean; edges_sql: string }
        Returns: Record<string, unknown>[]
      }
      _pgr_get_statement: { Args: { o_sql: string }; Returns: string }
      _pgr_getcolumnname:
        | {
            Args: {
              col: string
              fnname?: string
              reporterrs?: number
              sname: string
              tname: string
            }
            Returns: string
          }
        | {
            Args: {
              col: string
              fnname?: string
              reporterrs?: number
              tab: string
            }
            Returns: string
          }
      _pgr_getcolumntype:
        | {
            Args: {
              cname: string
              fnname?: string
              reporterrs?: number
              sname: string
              tname: string
            }
            Returns: string
          }
        | {
            Args: {
              col: string
              fnname?: string
              reporterrs?: number
              tab: string
            }
            Returns: string
          }
      _pgr_gettablename: {
        Args: { fnname?: string; reporterrs?: number; tab: string }
        Returns: Record<string, unknown>
      }
      _pgr_git_hash: { Args: never; Returns: string }
      _pgr_hawickcircuits: {
        Args: { "": string }
        Returns: Record<string, unknown>[]
      }
      _pgr_iscolumnindexed:
        | {
            Args: {
              cname: string
              fnname?: string
              reporterrs?: number
              sname: string
              tname: string
            }
            Returns: boolean
          }
        | {
            Args: {
              col: string
              fnname?: string
              reporterrs?: number
              tab: string
            }
            Returns: boolean
          }
      _pgr_iscolumnintable: {
        Args: { col: string; tab: string }
        Returns: boolean
      }
      _pgr_isplanar: { Args: { "": string }; Returns: boolean }
      _pgr_johnson: {
        Args: { directed: boolean; edges_sql: string }
        Returns: Record<string, unknown>[]
      }
      _pgr_ksp: {
        Args: {
          directed: boolean
          edges_sql: string
          end_vid: number
          heap_paths: boolean
          k: number
          start_vid: number
        }
        Returns: Record<string, unknown>[]
      }
      _pgr_lengauertarjandominatortree: {
        Args: { edges_sql: string; root_vid: number }
        Returns: Record<string, unknown>[]
      }
      _pgr_lib_version: { Args: never; Returns: string }
      _pgr_linegraphfull: {
        Args: { "": string }
        Returns: Record<string, unknown>[]
      }
      _pgr_makeconnected: {
        Args: { "": string }
        Returns: Record<string, unknown>[]
      }
      _pgr_maxcardinalitymatch: {
        Args: { directed: boolean; edges_sql: string }
        Returns: Record<string, unknown>[]
      }
      _pgr_maxflow:
        | {
            Args: {
              algorithm?: number
              combinations_sql: string
              edges_sql: string
              only_flow?: boolean
            }
            Returns: Record<string, unknown>[]
          }
        | {
            Args: {
              algorithm?: number
              edges_sql: string
              only_flow?: boolean
              sources: unknown
              targets: unknown
            }
            Returns: Record<string, unknown>[]
          }
      _pgr_maxflowmincost:
        | {
            Args: {
              combinations_sql: string
              edges_sql: string
              only_cost?: boolean
            }
            Returns: Record<string, unknown>[]
          }
        | {
            Args: {
              edges_sql: string
              only_cost?: boolean
              sources: unknown
              targets: unknown
            }
            Returns: Record<string, unknown>[]
          }
      _pgr_msg: {
        Args: { fnname: string; msg?: string; msgkind: number }
        Returns: undefined
      }
      _pgr_onerror: {
        Args: {
          errcond: boolean
          fnname: string
          hinto?: string
          msgerr: string
          msgok?: string
          reporterrs: number
        }
        Returns: undefined
      }
      _pgr_operating_system: { Args: never; Returns: string }
      _pgr_parameter_check: {
        Args: { big?: boolean; fn: string; sql: string }
        Returns: boolean
      }
      _pgr_pgsql_version: { Args: never; Returns: string }
      _pgr_pointtoid: {
        Args: {
          point: unknown
          srid: number
          tolerance: number
          vertname: string
        }
        Returns: number
      }
      _pgr_quote_ident: { Args: { idname: string }; Returns: string }
      _pgr_sequentialvertexcoloring: {
        Args: { edges_sql: string }
        Returns: Record<string, unknown>[]
      }
      _pgr_startpoint: { Args: { g: unknown }; Returns: unknown }
      _pgr_stoerwagner: {
        Args: { edges_sql: string }
        Returns: Record<string, unknown>[]
      }
      _pgr_strongcomponents: {
        Args: { edges_sql: string }
        Returns: Record<string, unknown>[]
      }
      _pgr_topologicalsort: {
        Args: { edges_sql: string }
        Returns: Record<string, unknown>[]
      }
      _pgr_transitiveclosure: {
        Args: { edges_sql: string }
        Returns: Record<string, unknown>[]
      }
      _pgr_trsp: {
        Args: {
          directed: boolean
          has_reverse_cost: boolean
          source_eid: number
          source_pos: number
          sql: string
          target_eid: number
          target_pos: number
          turn_restrict_sql?: string
        }
        Returns: Record<string, unknown>[]
      }
      _pgr_trspviavertices: {
        Args: {
          directed: boolean
          has_rcost: boolean
          sql: string
          turn_restrict_sql?: string
          vids: number[]
        }
        Returns: Record<string, unknown>[]
      }
      _pgr_tsp: {
        Args: {
          cooling_factor?: number
          end_id?: number
          final_temperature?: number
          initial_temperature?: number
          matrix_row_sql: string
          max_changes_per_temperature?: number
          max_consecutive_non_changes?: number
          max_processing_time?: number
          randomize?: boolean
          start_id?: number
          tries_per_temperature?: number
        }
        Returns: Record<string, unknown>[]
      }
      _pgr_tspeuclidean: {
        Args: {
          cooling_factor?: number
          coordinates_sql: string
          end_id?: number
          final_temperature?: number
          initial_temperature?: number
          max_changes_per_temperature?: number
          max_consecutive_non_changes?: number
          max_processing_time?: number
          randomize?: boolean
          start_id?: number
          tries_per_temperature?: number
        }
        Returns: Record<string, unknown>[]
      }
      _pgr_versionless: { Args: { v1: string; v2: string }; Returns: boolean }
      _pgr_withpoints:
        | {
            Args: {
              combinations_sql: string
              details: boolean
              directed: boolean
              driving_side: string
              edges_sql: string
              only_cost?: boolean
              points_sql: string
            }
            Returns: Record<string, unknown>[]
          }
        | {
            Args: {
              details: boolean
              directed: boolean
              driving_side: string
              edges_sql: string
              end_pids: unknown
              normal?: boolean
              only_cost?: boolean
              points_sql: string
              start_pids: unknown
            }
            Returns: Record<string, unknown>[]
          }
      _pgr_withpointsdd: {
        Args: {
          details?: boolean
          directed?: boolean
          distance: number
          driving_side?: string
          edges_sql: string
          equicost?: boolean
          points_sql: string
          start_pid: unknown
        }
        Returns: Record<string, unknown>[]
      }
      _pgr_withpointsksp: {
        Args: {
          details: boolean
          directed: boolean
          driving_side: string
          edges_sql: string
          end_pid: number
          heap_paths: boolean
          k: number
          points_sql: string
          start_pid: number
        }
        Returns: Record<string, unknown>[]
      }
      _pgr_withpointsvia: {
        Args: {
          directed?: boolean
          fraction: number[]
          sql: string
          via_edges: number[]
        }
        Returns: Record<string, unknown>[]
      }
      aprovar_solicitacao_novo_lote: {
        Args: {
          p_categorias_editadas: Json
          p_dados_lote_editado: Json
          p_solicitacao_id: string
          p_usuario_id: string
        }
        Returns: Json
      }
      atualizar_cotacao_dolar: { Args: never; Returns: Json }
      atualizar_estrada: {
        Args: {
          p_estrada_id: string
          p_geometria_geojson?: string
          p_nome?: string
        }
        Returns: boolean
      }
      atualizar_peso_entrada_por_nascimento: {
        Args: { p_forcar_atualizacao?: boolean; p_limite_atualizacao?: number }
        Returns: {
          detalhes_atualizacoes: string[]
          total_atualizados: number
          total_processados: number
        }[]
      }
      atualizar_pesos_em_lote: {
        Args: {
          p_forcar_todos?: boolean
          p_limite_atualizacao?: number
          p_tolerancia_diferenca?: number
        }
        Returns: {
          detalhes_atualizacoes: string[]
          total_atualizados: number
          total_ja_atualizados: number
          total_processados: number
          total_sem_peso: number
        }[]
      }
      atualizar_ponto: {
        Args: {
          p_geometria_geojson?: string
          p_nome?: string
          p_ponto_id: string
          p_tipo?: string
        }
        Returns: boolean
      }
      autenticar_peao_app: { Args: { p_acesso_id: string }; Returns: Json }
      calcular_cabecas_lote: { Args: { p_lote_id: string }; Returns: number }
      calcular_peso_medio_lote: { Args: { p_lote_id: string }; Returns: number }
      calcular_peso_vivo_atual_individual: {
        Args: { p_forcar_atualizacao?: boolean; p_individuo_id: string }
        Returns: {
          categoria: string
          data_nascimento: string
          dias_decorridos: number
          diferenca: number
          gmd_kg_dia: number
          identificacao: string
          individuo_id: string
          peso_atual: number
          peso_base_kg: number
          peso_calculado: number
          status_atualizacao: string
        }[]
      }
      calcular_sync_status_individuo: {
        Args: {
          p_categoria: string
          p_data_nascimento: string
          p_id_brinco: string
          p_id_chip: string
          p_id_manejo: string
          p_id_provisorio: string
          p_origem: string
          p_peso_nascimento: number
          p_raca: string
          p_sexo: string
          p_status: string
          p_sync_status_atual: string
        }
        Returns: string
      }
      calcular_taxa_lotacao_modulo: {
        Args: { p_modulo_id: string }
        Returns: number
      }
      calcular_taxa_lotacao_pasto: {
        Args: { p_lote_id: string; p_pasto_id: string }
        Returns: number
      }
      calculate_quant_atual: {
        Args: { p_categoria: string; p_lote_id: string }
        Returns: number
      }
      cancelar_os_venda: {
        Args: { p_motivo?: string; p_os_id: string; p_usuario_id?: string }
        Returns: Json
      }
      cleanup_audit_log: { Args: never; Returns: undefined }
      compute_classificacao_matriz: {
        Args: { p_individuo_id: string }
        Returns: string
      }
      corrigir_peso_categoria: {
        Args: {
          p_data_pesagem: string
          p_lote_categoria_id: string
          p_motivo?: string
          p_peso_novo_kg_cab: number
          p_usuario_id?: string
        }
        Returns: undefined
      }
      criar_item_almoxarifado_pwa: {
        Args: {
          p_classificacao: string
          p_fazenda_id: string
          p_id: string
          p_nome: string
          p_unidade: string
        }
        Returns: {
          ativo: boolean | null
          classificacao: string
          controla_estoque: boolean
          created_at: string | null
          custo_total_estoque: number
          custo_unitario: number
          deleted_at: string | null
          estoque_atual: number
          estoque_minimo: number
          fazenda_id: string
          id: string
          nome: string
          unidade: string
          updated_at: string | null
        }
        SetofOptions: {
          from: "*"
          to: "itens_almoxarifado"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      criar_item_cantina_pwa: {
        Args: {
          p_classificacao: string
          p_fazenda_id: string
          p_id: string
          p_nome: string
          p_unidade_medida: string
        }
        Returns: {
          ativo: boolean | null
          classificacao: string
          controla_estoque: boolean
          created_at: string | null
          custo_total_estoque: number
          custo_unitario: number
          deleted_at: string | null
          estoque_atual: number
          estoque_minimo: number
          fazenda_id: string
          id: string
          nome: string
          unidade_medida: string
          updated_at: string | null
        }
        SetofOptions: {
          from: "*"
          to: "itens_cantina"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      criar_snapshot_entrada: {
        Args: {
          p_lote_categoria_id: string
          p_motivo?: string
          p_plano_id: string
        }
        Returns: undefined
      }
      current_user_has_access: { Args: never; Returns: boolean }
      detectar_gaps_estradas: {
        Args: { p_fazenda_id: string; p_tolerancia_m?: number }
        Returns: {
          estrada_id: string
          estrada_nome: string
          extremidade: string
          ponto: Json
        }[]
      }
      editar_registro_leitura_cocho: {
        Args: {
          p_campos: Json
          p_fazenda_id: string
          p_id: string
          p_usuario_email: string
          p_usuario_id: string
        }
        Returns: Json
      }
      editar_registro_oferta_trato: {
        Args: {
          p_campos: Json
          p_fazenda_id: string
          p_id: string
          p_usuario_email: string
          p_usuario_id: string
        }
        Returns: Json
      }
      editar_registro_suplementacao: {
        Args: {
          p_campos: Json
          p_fazenda_id: string
          p_id: string
          p_usuario_email: string
          p_usuario_id: string
        }
        Returns: Json
      }
      encerrar_plano_lote: { Args: { p_lote_id: string }; Returns: undefined }
      encerrar_plano_nutricional: {
        Args: { p_lote_categoria_id: string }
        Returns: undefined
      }
      encontrar_pasto_por_ponto: {
        Args: { p_fazenda_id: string; p_ponto_geojson: string }
        Returns: {
          id: string
          nome: string
        }[]
      }
      encontrar_rota: {
        Args: {
          p_destino_geojson: string
          p_fazenda_id: string
          p_origem_geojson: string
          p_tolerancia_m?: number
        }
        Returns: {
          distancia_m: number
          encontrou: boolean
          rota: Json
        }[]
      }
      encontrar_rota_multi: {
        Args: {
          p_destinos_geojson: string
          p_fazenda_id: string
          p_origem_geojson: string
          p_tolerancia_m?: number
        }
        Returns: {
          distancia_m: number
          encontrou: boolean
          ordem_visita: Json
          rota: Json
        }[]
      }
      end_impersonation_session: {
        Args: { p_session_id: string }
        Returns: undefined
      }
      estornar_baixa_os: {
        Args: { p_os_id: string; p_usuario_id?: string }
        Returns: Json
      }
      excluir_registro_leitura_cocho: {
        Args: {
          p_fazenda_id: string
          p_id: string
          p_usuario_email: string
          p_usuario_id: string
        }
        Returns: Json
      }
      excluir_registro_oferta_trato: {
        Args: {
          p_fazenda_id: string
          p_id: string
          p_usuario_email: string
          p_usuario_id: string
        }
        Returns: Json
      }
      excluir_registro_suplementacao: {
        Args: {
          p_fazenda_id: string
          p_id: string
          p_usuario_email: string
          p_usuario_id: string
        }
        Returns: Json
      }
      expandir_premix_componentes: {
        Args: {
          p_insumo_id: string
          p_profundidade?: number
          p_quantidade: number
        }
        Returns: {
          insumo_id: string
          quantidade: number
        }[]
      }
      fechar_os_venda: {
        Args: {
          p_data_credito?: string
          p_os_id: string
          p_usuario_id?: string
          p_valor_acerto?: number
        }
        Returns: Json
      }
      fn_atualizar_status_atividades_automatico: {
        Args: never
        Returns: undefined
      }
      gerar_notificacao_ocupacao: {
        Args: {
          p_acao_url?: string
          p_desvio_percentual: number
          p_dias_ocupacao: number
          p_fazenda_id: string
          p_lote_id: string
          p_lote_nome: string
          p_meta_dias: number
          p_modulo_id: string
          p_modulo_nome: string
          p_pasto_id: string
          p_pasto_nome: string
          p_tipo: string
        }
        Returns: undefined
      }
      gerar_notificacoes_recategorizacao: {
        Args: { p_fazenda_id: string; p_usuario_id: string }
        Returns: number
      }
      get_admin_evolution: {
        Args: { start_date: string }
        Returns: {
          fazendas: number
          individuos: number
          month: string
          usuarios: number
        }[]
      }
      get_atividades_funcionario: {
        Args: { p_fazenda_id: string; p_funcionario_id: string }
        Returns: {
          atividade_id: string
          atrasada: boolean
          data_fim: string
          data_inicio: string
          descricao: string
          detalhamento: string
          fim_at: string
          foto_url: string
          gps_accuracy: number
          id: string
          inicio_at: string
          justificada_at: string
          justificativa: string
          latitude: number
          local: string
          longitude: number
          nao_prevista: boolean
          prioridade: number
          setor_nome: string
          status: string
          status_individual: string
          tempo_gasto_segundos: number
          titulo: string
        }[]
      }
      get_audit_log: {
        Args: {
          p_data_fim?: string
          p_data_inicio?: string
          p_fazenda_id?: string
          p_limite?: number
          p_offset?: number
          p_operacao?: string
          p_tabela?: string
          p_usuario_id?: string
        }
        Returns: Json
      }
      get_bebedouros_com_geometria: {
        Args: { p_fazenda_id: string }
        Returns: {
          capacidade: number
          geometria_geojson: string
          id: string
          nome: string
        }[]
      }
      get_bebedouros_permitidos_relatorio: {
        Args: { p_token: string }
        Returns: {
          bebedouro_id: string
        }[]
      }
      get_bebedouros_permitidos_relatorio_fazenda: {
        Args: { p_fazenda_id: string }
        Returns: {
          bebedouro_id: string
        }[]
      }
      get_controller_email_fazenda_grupo: {
        Args: { p_fazenda_destino_id: string; p_fazenda_origem_id: string }
        Returns: string
      }
      get_currais_com_geometria: {
        Args: { p_fazenda_id: string }
        Returns: {
          geometria: Json
          id: string
          lote_id: string
          nome: string
        }[]
      }
      get_dados_relatorio_abastecimento: {
        Args: { p_data_fim?: string; p_data_inicio?: string; p_token: string }
        Returns: Json
      }
      get_dados_relatorio_abastecimento_fazenda: {
        Args: {
          p_data_fim: string
          p_data_inicio: string
          p_fazenda_id: string
        }
        Returns: Json
      }
      get_dados_relatorio_consumo: {
        Args: { p_data_fim?: string; p_data_inicio?: string; p_token: string }
        Returns: Json
      }
      get_dados_relatorio_consumo_fazenda: {
        Args: {
          p_data_fim: string
          p_data_inicio: string
          p_fazenda_id: string
        }
        Returns: Json
      }
      get_dados_relatorio_morte: {
        Args: { p_data_fim?: string; p_data_inicio?: string; p_token: string }
        Returns: Json
      }
      get_dados_relatorio_morte_fazenda: {
        Args: {
          p_data_fim: string
          p_data_inicio: string
          p_fazenda_id: string
        }
        Returns: Json
      }
      get_dados_relatorio_tratos: {
        Args: { p_data_fim?: string; p_data_inicio?: string; p_token: string }
        Returns: Json
      }
      get_dashboard_stats: { Args: { p_fazenda_id: string }; Returns: Json }
      get_descendentes_individuo: {
        Args: { p_individuo_id: string }
        Returns: {
          descendente_id: string
          profundidade: number
        }[]
      }
      get_detalhes_curral_mapa: {
        Args: { p_curral_id: string }
        Returns: {
          categorias: Json
          comprimento_m: number
          curral_id: string
          curral_nome: string
          formulacao_nome: string
          largura_m: number
          lote_cabecas: number
          lote_id: string
          lote_nome: string
          lote_peso_medio_kg: number
          lote_raca: string
          lote_sexo: string
          metros_cocho_m: number
        }[]
      }
      get_detalhes_pasto_mapa: {
        Args: { p_pasto_id: string }
        Returns: {
          area_total_ha: number
          area_util_ha: number
          categorias: Json
          especie: string
          fonte_agua_principal: string
          lote_cabecas: number
          lote_id: string
          lote_nome: string
          lote_peso_medio_kg: number
          lote_raca: string
          lote_sexo: string
          metragem_cocho_m: number
          modulo_nome: string
          pasto_id: string
          pasto_nome: string
          setor: string
          tipo: string
        }[]
      }
      get_farm_usage_metrics: { Args: never; Returns: Json }
      get_gado_stats: { Args: { p_fazenda_id: string }; Returns: Json }
      get_ia_monitoramento: { Args: never; Returns: Json }
      get_imprevistos_recentes_by_fazenda: {
        Args: { p_data_inicio: string; p_fazenda_id: string }
        Returns: {
          atividade_funcionario_id: string
          atividade_id: string
          atividade_titulo: string
          created_at: string
          descricao: string
          funcionario_id: string
          funcionario_nome: string
          id: string
          impacto_minutos: number
          ocorrido_at: string
          tipo: string
        }[]
      }
      get_itens_pendentes_devolucao: {
        Args: { p_fazenda_id: string; p_quem_pegou?: string }
        Returns: {
          item_id: string
          item_nome: string
          prazo_devolucao: string
          quantidade_pendente: number
          quem_pegou: string
          retirada_id: string
          retirada_item_index: number
          unidade: string
        }[]
      }
      get_lote_por_curral: {
        Args: { p_curral_id: string }
        Returns: {
          cabecas_atual: number
          id: string
          nome: string
          peso_medio_atual_kg: number
          raca: string
          sexo: string
        }[]
      }
      get_lote_por_pasto: {
        Args: { p_pasto_id: string }
        Returns: {
          cabecas_atual: number
          id: string
          nome: string
          peso_medio_atual_kg: number
          raca: string
          sexo: string
        }[]
      }
      get_lotes_para_relatorio: {
        Args: { p_fazenda_id: string }
        Returns: Json
      }
      get_pastos_com_geometria: {
        Args: { p_fazenda_id: string }
        Returns: {
          area_total_ha: number
          area_util_ha: number
          ativo: boolean
          especie: string
          fonte_agua_principal: string
          geometria_geojson: string
          id: string
          metragem_cocho_m: number
          modulo_nome: string
          nome: string
          possui_deposito: boolean
          setor: string
          tipo: string
        }[]
      }
      get_peao_fazenda_id: { Args: never; Returns: string }
      get_rastreio_cadernetas: {
        Args: {
          p_data_fim?: string
          p_data_inicio?: string
          p_fazenda_id: string
        }
        Returns: {
          caderneta: string
          dias_ativos: number
          nome_usuario: string
          primeiro_registro: string
          registros_ativos: number
          registros_deletados: number
          total_registros: number
          ultimo_registro: string
        }[]
      }
      get_rastreio_cadernetas_detalhe: {
        Args: {
          p_data_fim?: string
          p_data_inicio?: string
          p_fazenda_id: string
          p_nome_usuario?: string
        }
        Returns: {
          ativos: number
          caderneta: string
          deletados: number
          dia: string
          nome_usuario: string
          total: number
        }[]
      }
      get_rastreio_usuarios: {
        Args: {
          p_data_fim?: string
          p_data_inicio?: string
          p_fazenda_id: string
        }
        Returns: {
          cadernetas_usadas: number
          dias_ativos: number
          nome_usuario: string
          primeiro_registro: string
          total_registros: number
          ultimo_dia_ativo: string
          ultimo_registro: string
        }[]
      }
      get_recent_activities: { Args: { p_fazenda_id: string }; Returns: Json }
      get_registros_atividades: {
        Args: { periodo?: string }
        Returns: {
          caderneta: string
          fazenda_id: string
          fazenda_nome: string
          periodo_inicio: string
          quantidade: number
        }[]
      }
      get_relatorio_consumo:
        | {
            Args: {
              p_data_fim?: string
              p_data_inicio?: string
              p_fazenda_id_param?: string
              p_token?: string
            }
            Returns: Json
          }
        | {
            Args: {
              p_data_fim?: string
              p_data_inicio?: string
              p_token: string
            }
            Returns: Json
          }
      get_relatorio_lote_ciclo_vida: {
        Args: { p_fazenda_id: string; p_lote_id: string; p_secoes?: string[] }
        Returns: Json
      }
      get_sessoes_abertas_by_fazenda: {
        Args: { p_fazenda_id: string }
        Returns: {
          atividade_funcionario_id: string
          atividade_id: string
          atividade_titulo: string
          created_at: string
          duracao_segundos: number
          fim_at: string
          funcionario_id: string
          funcionario_nome: string
          id: string
          inicio_at: string
          motivo_pausa: string
          trabalhada: boolean
        }[]
      }
      get_system_health: { Args: never; Returns: Json }
      iniciar_plano_lote: {
        Args: { p_lote_id: string; p_plano_id?: string; p_retroativo?: boolean }
        Returns: undefined
      }
      inserir_movimentacao_estoque: {
        Args: {
          p_custo_unitario?: number
          p_data?: string
          p_fazenda_id: string
          p_item_id: string
          p_item_tipo: string
          p_local_id?: string
          p_observacao?: string
          p_origem?: string
          p_quantidade: number
          p_registro_origem_id?: string
          p_tipo_movimentacao: string
          p_valor_total?: number
        }
        Returns: undefined
      }
      is_admin_user: { Args: never; Returns: boolean }
      is_super_admin: { Args: never; Returns: boolean }
      lancar_tratos_folha: { Args: { p_registros: Json }; Returns: number }
      listar_individuos_para_atualizacao_peso: {
        Args: never
        Returns: {
          categoria: string
          data_nascimento: string
          dias_decorridos: number
          diferenca: number
          estrategia_nutricional: string
          gmd_kg_dia: number
          identificacao: string
          individuo_id: string
          peso_atual: number
          peso_base_kg: number
          peso_calculado: number
          sexo: string
          status_atualizacao: string
        }[]
      }
      migrar_plano_lote: {
        Args: {
          p_lote_id: string
          p_motivo?: string
          p_plano_destino_id: string
        }
        Returns: undefined
      }
      migrar_plano_nutricional: {
        Args: {
          p_lote_categoria_id: string
          p_motivo?: string
          p_plano_destino_id?: string
        }
        Returns: undefined
      }
      notificar_individuo_incompleto: {
        Args: {
          p_fazenda_id: string
          p_id_brinco_cria: string
          p_id_chip_cria: string
          p_id_provisorio_cria: string
          p_individuo_id: string
        }
        Returns: undefined
      }
      notificar_individuos_incompletos_antigos: {
        Args: never
        Returns: undefined
      }
      notificar_proximidade_desmama: { Args: never; Returns: undefined }
      obter_execucoes_rotina: {
        Args: {
          p_caderneta_id?: string
          p_data_fim?: string
          p_data_inicio?: string
          p_fazenda_id: string
          p_funcionario_id?: string
          p_limit?: number
          p_offset?: number
          p_status?: string
        }
        Returns: {
          caderneta_id: string
          concluido: boolean
          data: string
          fazenda_id: string
          funcionario_id: string
          funcionario_nome: string
          horario_programado: string
          id: string
          observacao: string
          primeiro_acesso: string
          primeiro_acesso_local: string
          primeiro_registro: string
          primeiro_registro_local: string
          rotina_id: string
          status: string
          total: number
        }[]
      }
      pgr_articulationpoints: { Args: { "": string }; Returns: number[] }
      pgr_biconnectedcomponents: {
        Args: { "": string }
        Returns: Record<string, unknown>[]
      }
      pgr_bipartite: {
        Args: { "": string }
        Returns: Record<string, unknown>[]
      }
      pgr_bridges: { Args: { "": string }; Returns: number[] }
      pgr_chinesepostman: {
        Args: { "": string }
        Returns: Record<string, unknown>[]
      }
      pgr_chinesepostmancost: { Args: { "": string }; Returns: number }
      pgr_connectedcomponents: {
        Args: { "": string }
        Returns: Record<string, unknown>[]
      }
      pgr_cuthillmckeeordering: {
        Args: { "": string }
        Returns: Record<string, unknown>[]
      }
      pgr_edgecoloring: {
        Args: { "": string }
        Returns: Record<string, unknown>[]
      }
      pgr_full_version: { Args: never; Returns: Record<string, unknown> }
      pgr_hawickcircuits: {
        Args: { "": string }
        Returns: Record<string, unknown>[]
      }
      pgr_isplanar: { Args: { "": string }; Returns: boolean }
      pgr_kruskal: { Args: { "": string }; Returns: Record<string, unknown>[] }
      pgr_linegraphfull: {
        Args: { "": string }
        Returns: Record<string, unknown>[]
      }
      pgr_makeconnected: {
        Args: { "": string }
        Returns: Record<string, unknown>[]
      }
      pgr_maxcardinalitymatch: { Args: { "": string }; Returns: number[] }
      pgr_prim: { Args: { "": string }; Returns: Record<string, unknown>[] }
      pgr_sequentialvertexcoloring: {
        Args: { "": string }
        Returns: Record<string, unknown>[]
      }
      pgr_stoerwagner: {
        Args: { "": string }
        Returns: Record<string, unknown>[]
      }
      pgr_strongcomponents: {
        Args: { "": string }
        Returns: Record<string, unknown>[]
      }
      pgr_topologicalsort: {
        Args: { "": string }
        Returns: Record<string, unknown>[]
      }
      pgr_transitiveclosure: {
        Args: { "": string }
        Returns: Record<string, unknown>[]
      }
      pgr_version: { Args: never; Returns: string }
      recalc_consumo_series: {
        Args: { p_fazenda_id: string; p_formulacao: string; p_lote_id: string }
        Returns: undefined
      }
      recalcular_consumo_por_formulacao: {
        Args: { p_fazenda_id: string; p_formulacao_nome: string }
        Returns: undefined
      }
      recalcular_custo_medio_item: {
        Args: { p_fazenda_id: string; p_item_id: string; p_item_tipo: string }
        Returns: undefined
      }
      recalcular_custo_medio_tanque: {
        Args: { p_tanque_id: string }
        Returns: undefined
      }
      recalcular_estoque_almoxarifado: {
        Args: { p_fazenda_id: string; p_item_id: string }
        Returns: undefined
      }
      recalcular_estoque_cantina: {
        Args: { p_fazenda_id: string; p_item_id: string }
        Returns: undefined
      }
      recalcular_formulacao: {
        Args: { p_formulacao_id: string }
        Returns: undefined
      }
      recalcular_metricas_suplementacao: {
        Args: { p_fazenda_id?: string }
        Returns: {
          animais_elegiveis: number
          consumo_30dias_kg_mn: number
          consumo_30dias_kg_ms: number
          consumo_30dias_pct_pv: number
          consumo_geral_kg_mn: number
          consumo_geral_kg_ms: number
          consumo_geral_pct_pv: number
          custo_medio_reais_cab_dia: number
          peso_vivo_medio: number
          registro_id: string
        }[]
      }
      recalcular_peso_vivo_lote: {
        Args: { p_ajuste_manual?: boolean; p_lote_id: string }
        Returns: undefined
      }
      recalcular_pesos_suplementacao_historico: {
        Args: { p_fazenda_id?: string; p_lote_id?: string }
        Returns: {
          data_registro: string
          formulacao_nome: string
          lote_id: string
          peso_anterior: number
          peso_novo: number
          plano_usado: string
          registro_id: string
        }[]
      }
      recalculate_all_quant_atual: { Args: never; Returns: undefined }
      recategorizar_lote_categoria: {
        Args: {
          p_categoria_destino: string
          p_lote_categoria_origem_id: string
          p_manter_formulacao?: boolean
          p_motivo?: string
          p_nova_formulacao_id?: string
          p_usuario_id?: string
        }
        Returns: string
      }
      reconstruir_topologia_estradas: {
        Args: { p_fazenda_id: string; p_tolerancia_m?: number }
        Returns: boolean
      }
      registrar_push_subscription: {
        Args: {
          p_dispositivo_id: string
          p_endpoint: string
          p_fazenda_id: string
          p_funcionario_id?: string
          p_keys_auth: string
          p_keys_p256dh: string
        }
        Returns: {
          created_at: string
          dispositivo_id: string
          endpoint: string
          fazenda_id: string
          funcionario_id: string | null
          id: string
          keys_auth: string
          keys_p256dh: string
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "push_subscriptions"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      rejeitar_solicitacao_novo_lote: {
        Args: {
          p_motivo: string
          p_solicitacao_id: string
          p_usuario_id: string
        }
        Returns: Json
      }
      remover_estrada: { Args: { p_estrada_id: string }; Returns: boolean }
      remover_geometria_bebedouro: {
        Args: { p_bebedouro_id: string }
        Returns: boolean
      }
      remover_geometria_curral: {
        Args: { p_curral_id: string }
        Returns: boolean
      }
      remover_geometria_pasto: {
        Args: { p_pasto_id: string }
        Returns: boolean
      }
      remover_geometrias_lote: {
        Args: { p_pasto_ids: string[]; p_remover_bebedouros?: boolean }
        Returns: {
          bebedouros_removidos: number
          pastos_removidos: number
        }[]
      }
      remover_ponto: { Args: { p_ponto_id: string }; Returns: boolean }
      remover_push_subscription: {
        Args: { p_dispositivo_id: string; p_endpoint: string }
        Returns: undefined
      }
      reprocessar_devolucoes_almoxarifado: {
        Args: {
          p_fazenda_id: string
          p_item_id: string
          p_quem_pegou: string
          p_retirada_id: string
        }
        Returns: undefined
      }
      resumo_execucoes_rotina: {
        Args: {
          p_caderneta_id?: string
          p_data_fim?: string
          p_data_inicio?: string
          p_fazenda_id: string
          p_funcionario_id?: string
        }
        Returns: {
          antecipadas: number
          atrasadas: number
          data: string
          dispensadas: number
          nao_executadas: number
          no_horario: number
          programadas: number
        }[]
      }
      saldo_devolvivel_agregado: {
        Args: {
          p_excluir_mov?: string
          p_fazenda_id: string
          p_item_id: string
          p_quem_pegou: string
        }
        Returns: number
      }
      saldo_devolvivel_vinculo: {
        Args: {
          p_excluir_mov?: string
          p_fazenda_id: string
          p_item_id: string
          p_retirada_id: string
          p_retirada_item_index: number
        }
        Returns: number
      }
      salvar_estrada: {
        Args: {
          p_fazenda_id: string
          p_geometria_geojson: string
          p_nome: string
        }
        Returns: string
      }
      salvar_geometria_bebedouro: {
        Args: { p_bebedouro_id: string; p_geometria_geojson: string }
        Returns: boolean
      }
      salvar_geometria_curral: {
        Args: { p_curral_id: string; p_geometria_geojson: string }
        Returns: boolean
      }
      salvar_geometria_pasto: {
        Args: { p_geometria_geojson: string; p_pasto_id: string }
        Returns: boolean
      }
      salvar_notificacoes_config: {
        Args: {
          p_fazenda_id: string
          p_recategorizacao_ativo: boolean
          p_threshold_recategorizacao: number
          p_tratos_ativo?: boolean
        }
        Returns: {
          created_at: string | null
          fazenda_id: string
          id: string
          recategorizacao_ativo: boolean
          threshold_recategorizacao: number
          tratos_ativo: boolean
          updated_at: string | null
        }
        SetofOptions: {
          from: "*"
          to: "notificacoes_config"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      salvar_ponto: {
        Args: {
          p_fazenda_id: string
          p_geometria_geojson: string
          p_nome: string
          p_tipo: string
        }
        Returns: string
      }
      sample_system_health: { Args: never; Returns: undefined }
      set_audit_context:
        | {
            Args: {
              p_impersonated_by?: string
              p_is_impersonation?: boolean
              p_user_email?: string
              p_user_id?: string
              p_user_nome?: string
            }
            Returns: undefined
          }
        | {
            Args: {
              p_impersonated_by?: string
              p_ip_address?: string
              p_is_impersonation?: boolean
              p_origin_page?: string
              p_source_app?: string
              p_user_agent?: string
              p_user_email?: string
              p_user_id?: string
              p_user_nome?: string
            }
            Returns: undefined
          }
      sincronizar_historico_pasto_lote_edit: {
        Args: {
          p_lote_id: string
          p_pasto_id_anterior: string
          p_pasto_id_novo: string
        }
        Returns: undefined
      }
      soft_delete_record: {
        Args: { p_id: string; p_schema: string; p_table: string }
        Returns: undefined
      }
      transferir_lote_entre_fazendas: {
        Args: {
          p_categorias: Json
          p_fazenda_destino_id: string
          p_lote_origem_id: string
          p_nome_usuario?: string
        }
        Returns: Json
      }
      unaccent: { Args: { "": string }; Returns: string }
      update_classificacao_matriz: {
        Args: { p_individuo_id: string }
        Returns: undefined
      }
      update_dados_lotes: { Args: never; Returns: undefined }
      update_pesos_individuos: { Args: never; Returns: undefined }
      update_quant_atual: {
        Args: { p_categoria: string; p_lote_id: string }
        Returns: undefined
      }
      update_quant_atual_with_data: {
        Args: {
          p_categoria: string
          p_lote_id: string
          p_raca?: string
          p_sexo?: string
        }
        Returns: undefined
      }
      user_has_fazenda_access: {
        Args: { p_fazenda_id: string }
        Returns: boolean
      }
      user_has_fazenda_access_with_papel: {
        Args: { p_fazenda_id: string; p_papel: string }
        Returns: boolean
      }
      user_has_programacao_access: {
        Args: { p_programacao_id: string }
        Returns: boolean
      }
      validar_conectividade_estradas: {
        Args: { p_fazenda_id: string; p_tolerancia_m?: number }
        Returns: {
          distancia_m: number
          estrada_id: string
          estrada_nome: string
          extremidade: string
          ponto: Json
          proxima_estrada_id: string
          proxima_estrada_nome: string
        }[]
      }
      verificar_ocupacoes_acima_meta: { Args: never; Returns: undefined }
    }
    Enums: {
      maquina_veiculo_categoria:
        | "Trator"
        | "Colheitadeira"
        | "Caminhao"
        | "Carro"
        | "Motocicleta"
        | "Pulverizador"
        | "Adubadeira"
        | "Semeadora"
        | "Grade"
        | "Subsolador"
        | "Plaina"
        | "Rocadeira"
        | "Guincho"
        | "Outro"
      maquina_veiculo_status: "Ativo" | "Inativo" | "Manutencao"
      maquina_veiculo_tipo: "Maquina" | "Veiculo"
      medicamento_tipo:
        | "Antibiotico"
        | "Vermifugo"
        | "Carrapaticida"
        | "Vacina"
        | "Anti_inflamatorio"
        | "Analgesico"
        | "Hormonio"
        | "Vitamina_Mineral"
        | "Probiotico"
        | "Anti_stress"
        | "Coccidiostatico"
        | "Fluido_oral"
        | "Outro"
      tipo_movimentacao_motivo:
        | "Consumo"
        | "Abate"
        | "Saída"
        | "Entrada"
        | "Entrevero"
        | "Doação"
        | "Transferencia"
      tipo_movimentacao_subtipo:
        | "Enfermaria"
        | "Apartação"
        | "Refugo de Cocho"
        | "Compras"
        | "Venda"
        | "Saida"
        | "Entrada"
        | "Novo Lote"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      maquina_veiculo_categoria: [
        "Trator",
        "Colheitadeira",
        "Caminhao",
        "Carro",
        "Motocicleta",
        "Pulverizador",
        "Adubadeira",
        "Semeadora",
        "Grade",
        "Subsolador",
        "Plaina",
        "Rocadeira",
        "Guincho",
        "Outro",
      ],
      maquina_veiculo_status: ["Ativo", "Inativo", "Manutencao"],
      maquina_veiculo_tipo: ["Maquina", "Veiculo"],
      medicamento_tipo: [
        "Antibiotico",
        "Vermifugo",
        "Carrapaticida",
        "Vacina",
        "Anti_inflamatorio",
        "Analgesico",
        "Hormonio",
        "Vitamina_Mineral",
        "Probiotico",
        "Anti_stress",
        "Coccidiostatico",
        "Fluido_oral",
        "Outro",
      ],
      tipo_movimentacao_motivo: [
        "Consumo",
        "Abate",
        "Saída",
        "Entrada",
        "Entrevero",
        "Doação",
        "Transferencia",
      ],
      tipo_movimentacao_subtipo: [
        "Enfermaria",
        "Apartação",
        "Refugo de Cocho",
        "Compras",
        "Venda",
        "Saida",
        "Entrada",
        "Novo Lote",
      ],
    },
  },
} as const
