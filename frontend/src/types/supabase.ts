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
  public: {
    Tables: {
      audit_log: {
        Row: {
          acao: string
          criado_em: string | null
          dados_antigos: Json | null
          dados_novos: Json | null
          dispositivo_id: string | null
          fazenda_id: string
          id: string
          ip: string | null
          registro_id: string | null
          tabela: string | null
          user_agent: string | null
        }
        Insert: {
          acao: string
          criado_em?: string | null
          dados_antigos?: Json | null
          dados_novos?: Json | null
          dispositivo_id?: string | null
          fazenda_id: string
          id?: string
          ip?: string | null
          registro_id?: string | null
          tabela?: string | null
          user_agent?: string | null
        }
        Update: {
          acao?: string
          criado_em?: string | null
          dados_antigos?: Json | null
          dados_novos?: Json | null
          dispositivo_id?: string | null
          fazenda_id?: string
          id?: string
          ip?: string | null
          registro_id?: string | null
          tabela?: string | null
          user_agent?: string | null
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
      bebedouros: {
        Row: {
          ativo: boolean | null
          capacidade: number | null
          created_at: string | null
          data_ultima_limpeza: string | null
          fazenda_id: string
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
          fazenda_id: string
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
          fazenda_id?: string
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
            foreignKeyName: "causas_morte_fazenda_id_fkey"
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
          id: string
          insumo_id: string
          produto: string | null
          quantidade: number
          valor_total: number | null
          valor_unitario: number | null
        }
        Insert: {
          entrada_id: string
          id?: string
          insumo_id: string
          produto?: string | null
          quantidade: number
          valor_total?: number | null
          valor_unitario?: number | null
        }
        Update: {
          entrada_id?: string
          id?: string
          insumo_id?: string
          produto?: string | null
          quantidade?: number
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
            foreignKeyName: "execucoes_rotina_rotina_id_fkey"
            columns: ["rotina_id"]
            isOneToOne: false
            referencedRelation: "rotinas"
            referencedColumns: ["id"]
          },
        ]
      }
      fazendas: {
        Row: {
          acesso_id: string
          ativo: boolean | null
          cnpj: string | null
          controle_acesso_habilitado: boolean | null
          created_at: string | null
          email: string | null
          endereco: string | null
          id: string
          logo_url: string | null
          nome: string
          planilha_id: string | null
          telefone: string | null
          tolerancia_rotina_minutos: number | null
          timezone: string | null
          updated_at: string | null
        }
        Insert: {
          acesso_id: string
          ativo?: boolean | null
          cnpj?: string | null
          controle_acesso_habilitado?: boolean | null
          created_at?: string | null
          email?: string | null
          endereco?: string | null
          id?: string
          logo_url?: string | null
          nome: string
          planilha_id?: string | null
          telefone?: string | null
          tolerancia_rotina_minutos?: number | null
          timezone?: string | null
          updated_at?: string | null
        }
        Update: {
          acesso_id?: string
          ativo?: boolean | null
          cnpj?: string | null
          controle_acesso_habilitado?: boolean | null
          created_at?: string | null
          email?: string | null
          endereco?: string | null
          id?: string
          logo_url?: string | null
          nome?: string
          planilha_id?: string | null
          telefone?: string | null
          tolerancia_rotina_minutos?: number | null
          timezone?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      formulacoes: {
        Row: {
          ativo: boolean | null
          consumo_mn_kg_cab_dia: number | null
          consumo_ms_kg_cab_dia: number | null
          consumo_ms_percent_pv: number | null
          created_at: string | null
          custo_dieta_reais_cab_dia: number | null
          custo_mn_tonelada: number | null
          custo_ms_tonelada: number | null
          custo_total: number | null
          descricao: string | null
          fazenda_id: string
          gmd: number | null
          id: string
          insumos: Json | null
          meta_consumo_ms_percent_pv: number | null
          nome: string
          peso_vivo_medio: number | null
          sistema_producao: string | null
          teor_ms_dieta: number | null
          tipo: string | null
          updated_at: string | null
        }
        Insert: {
          ativo?: boolean | null
          consumo_mn_kg_cab_dia?: number | null
          consumo_ms_kg_cab_dia?: number | null
          consumo_ms_percent_pv?: number | null
          created_at?: string | null
          custo_dieta_reais_cab_dia?: number | null
          custo_mn_tonelada?: number | null
          custo_ms_tonelada?: number | null
          custo_total?: number | null
          descricao?: string | null
          fazenda_id: string
          gmd?: number | null
          id?: string
          insumos?: Json | null
          meta_consumo_ms_percent_pv?: number | null
          nome: string
          peso_vivo_medio?: number | null
          sistema_producao?: string | null
          teor_ms_dieta?: number | null
          tipo?: string | null
          updated_at?: string | null
        }
        Update: {
          ativo?: boolean | null
          consumo_mn_kg_cab_dia?: number | null
          consumo_ms_kg_cab_dia?: number | null
          consumo_ms_percent_pv?: number | null
          created_at?: string | null
          custo_dieta_reais_cab_dia?: number | null
          custo_mn_tonelada?: number | null
          custo_ms_tonelada?: number | null
          custo_total?: number | null
          descricao?: string | null
          fazenda_id?: string
          gmd?: number | null
          id?: string
          insumos?: Json | null
          meta_consumo_ms_percent_pv?: number | null
          nome?: string
          peso_vivo_medio?: number | null
          sistema_producao?: string | null
          teor_ms_dieta?: number | null
          tipo?: string | null
          updated_at?: string | null
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
      funcionarios: {
        Row: {
          acessa_app: boolean | null
          ativo: boolean | null
          cadernetas_permitidas: Json | null
          cargo: string | null
          cpf: string | null
          created_at: string | null
          fazenda_id: string
          id: string
          nome: string
          pin_hash: string | null
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
          fazenda_id: string
          id?: string
          nome: string
          pin_hash?: string | null
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
          fazenda_id?: string
          id?: string
          nome?: string
          pin_hash?: string | null
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
        ]
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
      implementos: {
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
          lote_atual: string | null
          mae: string | null
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
          lote_atual?: string | null
          mae?: string | null
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
          lote_atual?: string | null
          mae?: string | null
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
          created_at: string | null
          custo_total_estoque: number | null
          custo_unitario: number | null
          estoque_atual: number | null
          fazenda_id: string
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
          created_at?: string | null
          custo_total_estoque?: number | null
          custo_unitario?: number | null
          estoque_atual?: number | null
          fazenda_id: string
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
          created_at?: string | null
          custo_total_estoque?: number | null
          custo_unitario?: number | null
          estoque_atual?: number | null
          fazenda_id?: string
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
        ]
      }
      itens_almoxarifado: {
        Row: {
          ativo: boolean | null
          classificacao: string
          created_at: string | null
          fazenda_id: string
          id: string
          nome: string
          updated_at: string | null
        }
        Insert: {
          ativo?: boolean | null
          classificacao: string
          created_at?: string | null
          fazenda_id: string
          id?: string
          nome: string
          updated_at?: string | null
        }
        Update: {
          ativo?: boolean | null
          classificacao?: string
          created_at?: string | null
          fazenda_id?: string
          id?: string
          nome?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      itens_supermercado: {
        Row: {
          ativo: boolean | null
          created_at: string | null
          fazenda_id: string
          id: string
          nome: string
          unidade_medida: string
          updated_at: string | null
        }
        Insert: {
          ativo?: boolean | null
          created_at?: string | null
          fazenda_id: string
          id?: string
          nome: string
          unidade_medida: string
          updated_at?: string | null
        }
        Update: {
          ativo?: boolean | null
          created_at?: string | null
          fazenda_id?: string
          id?: string
          nome?: string
          unidade_medida?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "itens_supermercado_fazenda_id_fkey"
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
          caderneta: string
          created_at: string | null
          dispositivo_id: string | null
          error_code: string | null
          error_details: string | null
          error_message: string | null
          fazenda_id: string
          id: string
          operation: string
          payload: Json | null
          registro_id: string
          resolved_at: string | null
          resolved_by: string | null
          retry_count: number | null
        }
        Insert: {
          caderneta: string
          created_at?: string | null
          dispositivo_id?: string | null
          error_code?: string | null
          error_details?: string | null
          error_message?: string | null
          fazenda_id: string
          id?: string
          operation: string
          payload?: Json | null
          registro_id: string
          resolved_at?: string | null
          resolved_by?: string | null
          retry_count?: number | null
        }
        Update: {
          caderneta?: string
          created_at?: string | null
          dispositivo_id?: string | null
          error_code?: string | null
          error_details?: string | null
          error_message?: string | null
          fazenda_id?: string
          id?: string
          operation?: string
          payload?: Json | null
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
          data_meta_projetada: string | null
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
          data_meta_projetada?: string | null
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
          data_meta_projetada?: string | null
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
        ]
      }
      lote_historico: {
        Row: {
          categoria: string | null
          created_at: string | null
          data_movimentacao: string
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
          dias_restantes_meta: number | null
          estrategia_nutricional: string | null
          fazenda_id: string
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
          dias_restantes_meta?: number | null
          estrategia_nutricional?: string | null
          fazenda_id: string
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
          dias_restantes_meta?: number | null
          estrategia_nutricional?: string | null
          fazenda_id?: string
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
      maquinas_veiculos: {
        Row: {
          ano: number | null
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
      notificacoes: {
        Row: {
          acao_label: string | null
          acao_url: string | null
          created_at: string | null
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
      pluviometros: {
        Row: {
          ativo: boolean | null
          created_at: string | null
          fazenda_id: string
          id: string
          localizacao: string
          nome: string
          updated_at: string | null
        }
        Insert: {
          ativo?: boolean | null
          created_at?: string | null
          fazenda_id: string
          id?: string
          localizacao: string
          nome: string
          updated_at?: string | null
        }
        Update: {
          ativo?: boolean | null
          created_at?: string | null
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
          combustivel: string
          created_at: string
          data: string
          deleted_at: string | null
          dispositivo_id: string | null
          fazenda_id: string
          id: string
          maquina_veiculo: string
          maquina_veiculo_id: string | null
          nome_usuario: string | null
          observacao: string | null
          odometro_horimetro: string
          operador_motorista: string
          placa: string | null
          quem_abasteceu: string
          sync_status: string
          tipo_operacao: string
          tipo_operacao_outros: string | null
          total_abastecido: number
          updated_at: string
          version: number
        }
        Insert: {
          combustivel: string
          created_at?: string
          data: string
          deleted_at?: string | null
          dispositivo_id?: string | null
          fazenda_id: string
          id?: string
          maquina_veiculo: string
          maquina_veiculo_id?: string | null
          nome_usuario?: string | null
          observacao?: string | null
          odometro_horimetro: string
          operador_motorista: string
          placa?: string | null
          quem_abasteceu: string
          sync_status?: string
          tipo_operacao: string
          tipo_operacao_outros?: string | null
          total_abastecido: number
          updated_at?: string
          version?: number
        }
        Update: {
          combustivel?: string
          created_at?: string
          data?: string
          deleted_at?: string | null
          dispositivo_id?: string | null
          fazenda_id?: string
          id?: string
          maquina_veiculo?: string
          maquina_veiculo_id?: string | null
          nome_usuario?: string | null
          observacao?: string | null
          odometro_horimetro?: string
          operador_motorista?: string
          placa?: string | null
          quem_abasteceu?: string
          sync_status?: string
          tipo_operacao?: string
          tipo_operacao_outros?: string | null
          total_abastecido?: number
          updated_at?: string
          version?: number
        }
        Relationships: [
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
          nome_usuario: string | null
          observacao: string | null
          quem_entregou: string | null
          quem_pegou: string | null
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
          id?: string
          itens?: Json | null
          nome_usuario?: string | null
          observacao?: string | null
          quem_entregou?: string | null
          quem_pegou?: string | null
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
          id?: string
          itens?: Json | null
          nome_usuario?: string | null
          observacao?: string | null
          quem_entregou?: string | null
          quem_pegou?: string | null
          setor?: string | null
          sync_status?: string | null
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
      registros_cantina: {
        Row: {
          created_at: string | null
          data: string
          deleted_at: string | null
          dispositivo_id: string | null
          fazenda_id: string | null
          id: string
          itens: Json | null
          nome_outros: string | null
          nome_usuario: string | null
          numero_cafe_manha: number | null
          numero_cozinheiras: number | null
          numero_lanches: number | null
          numero_refeicoes_almoco: number | null
          numero_refeicoes_jantar: number | null
          observacao: string | null
          quantidade_outros: string | null
          quem_ajudou: string | null
          quem_cozinhou: string | null
          sync_status: string | null
          unidade_outros: string | null
          updated_at: string | null
          version: number | null
        }
        Insert: {
          created_at?: string | null
          data: string
          deleted_at?: string | null
          dispositivo_id?: string | null
          fazenda_id?: string | null
          id?: string
          itens?: Json | null
          nome_outros?: string | null
          nome_usuario?: string | null
          numero_cafe_manha?: number | null
          numero_cozinheiras?: number | null
          numero_lanches?: number | null
          numero_refeicoes_almoco?: number | null
          numero_refeicoes_jantar?: number | null
          observacao?: string | null
          quantidade_outros?: string | null
          quem_ajudou?: string | null
          quem_cozinhou?: string | null
          sync_status?: string | null
          unidade_outros?: string | null
          updated_at?: string | null
          version?: number | null
        }
        Update: {
          created_at?: string | null
          data?: string
          deleted_at?: string | null
          dispositivo_id?: string | null
          fazenda_id?: string | null
          id?: string
          itens?: Json | null
          nome_outros?: string | null
          nome_usuario?: string | null
          numero_cafe_manha?: number | null
          numero_cozinheiras?: number | null
          numero_lanches?: number | null
          numero_refeicoes_almoco?: number | null
          numero_refeicoes_jantar?: number | null
          observacao?: string | null
          quantidade_outros?: string | null
          quem_ajudou?: string | null
          quem_cozinhou?: string | null
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
      registros_clima: {
        Row: {
          created_at: string | null
          data: string
          deleted_at: string | null
          dispositivo_id: string | null
          fazenda_id: string
          id: string
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
          id: string
          idade: string | null
          lote: string | null
          lote_id: string | null
          medicamentos: Json | null
          nome_usuario: string | null
          pasto: string | null
          pasto_id: string | null
          raca: string | null
          sexo: string | null
          sync_status: string | null
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
          id?: string
          idade?: string | null
          lote?: string | null
          lote_id?: string | null
          medicamentos?: Json | null
          nome_usuario?: string | null
          pasto?: string | null
          pasto_id?: string | null
          raca?: string | null
          sexo?: string | null
          sync_status?: string | null
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
          id?: string
          idade?: string | null
          lote?: string | null
          lote_id?: string | null
          medicamentos?: Json | null
          nome_usuario?: string | null
          pasto?: string | null
          pasto_id?: string | null
          raca?: string | null
          sexo?: string | null
          sync_status?: string | null
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
      registros_leitura_cocho: {
        Row: {
          created_at: string | null
          data: string
          deleted_at: string | null
          dispositivo_id: string | null
          fazenda_id: string
          id: string
          leitura_cocho: number | null
          lote: string | null
          lote_id: string | null
          nome_usuario: string | null
          observacao: string | null
          pasto_curral: string | null
          pasto_id: string | null
          responsavel: string | null
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
          id?: string
          leitura_cocho?: number | null
          lote?: string | null
          lote_id?: string | null
          nome_usuario?: string | null
          observacao?: string | null
          pasto_curral?: string | null
          pasto_id?: string | null
          responsavel?: string | null
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
          id?: string
          leitura_cocho?: number | null
          lote?: string | null
          lote_id?: string | null
          nome_usuario?: string | null
          observacao?: string | null
          pasto_curral?: string | null
          pasto_id?: string | null
          responsavel?: string | null
          sync_status?: string | null
          updated_at?: string | null
          version?: number | null
        }
        Relationships: [
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
          hora_final: string | null
          hora_inicio: string | null
          id: string
          limpeza_realizada: Json | null
          local: string | null
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
          hora_final?: string | null
          hora_inicio?: string | null
          id?: string
          limpeza_realizada?: Json | null
          local?: string | null
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
          hora_final?: string | null
          hora_inicio?: string | null
          id?: string
          limpeza_realizada?: Json | null
          local?: string | null
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
          id: number
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
          id?: number
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
          id?: number
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
          created_at: string | null
          data: string
          deleted_at: string | null
          dispositivo_id: string | null
          docilidade_matriz: number | null
          escore_matriz: string | null
          fazenda_id: string
          id: string
          id_brinco_cria: string | null
          id_brinco_mae: string | null
          id_chip_cria: string | null
          id_chip_mae: string | null
          id_manejo_mae: string | null
          id_provisorio_cria: string | null
          individuo_id_cria: string | null
          individuo_id_mae: string | null
          lote: string | null
          lote_id: string | null
          nome_usuario: string | null
          observacao_parto: string | null
          pasto: string | null
          pasto_id: string | null
          peso_cria_kg: number | null
          raca: string | null
          sexo: string | null
          sync_status: string | null
          tipo_parto: Json | null
          tratamento: string | null
          updated_at: string | null
          version: number | null
        }
        Insert: {
          categoria_mae?: string | null
          created_at?: string | null
          data: string
          deleted_at?: string | null
          dispositivo_id?: string | null
          docilidade_matriz?: number | null
          escore_matriz?: string | null
          fazenda_id: string
          id?: string
          id_brinco_cria?: string | null
          id_brinco_mae?: string | null
          id_chip_cria?: string | null
          id_chip_mae?: string | null
          id_manejo_mae?: string | null
          id_provisorio_cria?: string | null
          individuo_id_cria?: string | null
          individuo_id_mae?: string | null
          lote?: string | null
          lote_id?: string | null
          nome_usuario?: string | null
          observacao_parto?: string | null
          pasto?: string | null
          pasto_id?: string | null
          peso_cria_kg?: number | null
          raca?: string | null
          sexo?: string | null
          sync_status?: string | null
          tipo_parto?: Json | null
          tratamento?: string | null
          updated_at?: string | null
          version?: number | null
        }
        Update: {
          categoria_mae?: string | null
          created_at?: string | null
          data?: string
          deleted_at?: string | null
          dispositivo_id?: string | null
          docilidade_matriz?: number | null
          escore_matriz?: string | null
          fazenda_id?: string
          id?: string
          id_brinco_cria?: string | null
          id_brinco_mae?: string | null
          id_chip_cria?: string | null
          id_chip_mae?: string | null
          id_manejo_mae?: string | null
          id_provisorio_cria?: string | null
          individuo_id_cria?: string | null
          individuo_id_mae?: string | null
          lote?: string | null
          lote_id?: string | null
          nome_usuario?: string | null
          observacao_parto?: string | null
          pasto?: string | null
          pasto_id?: string | null
          peso_cria_kg?: number | null
          raca?: string | null
          sexo?: string | null
          sync_status?: string | null
          tipo_parto?: Json | null
          tratamento?: string | null
          updated_at?: string | null
          version?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "registros_maternidade_dispositivo_id_fkey"
            columns: ["dispositivo_id"]
            isOneToOne: false
            referencedRelation: "dispositivos"
            referencedColumns: ["id"]
          },
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
          id: string
          idade: string | null
          lote: string | null
          lote_id: string | null
          nome_usuario: string | null
          nutricao_anterior: string | null
          nutricao_atual: string | null
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
          id?: string
          idade?: string | null
          lote?: string | null
          lote_id?: string | null
          nome_usuario?: string | null
          nutricao_anterior?: string | null
          nutricao_atual?: string | null
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
          id?: string
          idade?: string | null
          lote?: string | null
          lote_id?: string | null
          nome_usuario?: string | null
          nutricao_anterior?: string | null
          nutricao_atual?: string | null
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
          fazenda_id: string
          id: string
          lote_destino_id: string | null
          lote_origem: string | null
          lote_origem_id: string | null
          motivo_movimentacao:
            | Database["public"]["Enums"]["tipo_movimentacao_motivo"]
            | null
          nome_usuario: string | null
          numero_cabecas: number | null
          peso_vivo_atual_kg: number | null
          responsavel: string | null
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
          fazenda_id: string
          id?: string
          lote_destino_id?: string | null
          lote_origem?: string | null
          lote_origem_id?: string | null
          motivo_movimentacao?:
            | Database["public"]["Enums"]["tipo_movimentacao_motivo"]
            | null
          nome_usuario?: string | null
          numero_cabecas?: number | null
          peso_vivo_atual_kg?: number | null
          responsavel?: string | null
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
          fazenda_id?: string
          id?: string
          lote_destino_id?: string | null
          lote_origem?: string | null
          lote_origem_id?: string | null
          motivo_movimentacao?:
            | Database["public"]["Enums"]["tipo_movimentacao_motivo"]
            | null
          nome_usuario?: string | null
          numero_cabecas?: number | null
          peso_vivo_atual_kg?: number | null
          responsavel?: string | null
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
            foreignKeyName: "registros_movimentacao_dispositivo_id_fkey"
            columns: ["dispositivo_id"]
            isOneToOne: false
            referencedRelation: "dispositivos"
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
          implemento_utilizado: string
          maquina_veiculo_id: string | null
          nome_usuario: string | null
          observacao: string | null
          odometro_horimetro_final: string
          odometro_horimetro_inicial: string
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
          implemento_utilizado: string
          maquina_veiculo_id?: string | null
          nome_usuario?: string | null
          observacao?: string | null
          odometro_horimetro_final: string
          odometro_horimetro_inicial: string
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
          implemento_utilizado?: string
          maquina_veiculo_id?: string | null
          nome_usuario?: string | null
          observacao?: string | null
          odometro_horimetro_final?: string
          odometro_horimetro_inicial?: string
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
          id: string
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
          id?: string
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
          id?: string
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
          gado_contado: string | null
          garrote: number | null
          id: string
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
          gado_contado?: string | null
          garrote?: number | null
          id?: string
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
          gado_contado?: string | null
          garrote?: number | null
          id?: string
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
          id: string
          insumo_id: string | null
          insumos_quantidades: Json | null
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
          id?: string
          insumo_id?: string | null
          insumos_quantidades?: Json | null
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
          id?: string
          insumo_id?: string | null
          insumos_quantidades?: Json | null
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
          created_at: string | null
          data: string
          deleted_at: string | null
          dispositivo_id: string | null
          escore_fezes: string | null
          espacamento_cocho_cm_cab: number | null
          espacamento_cocho_detalhes: Json | null
          espacamento_cocho_ideal: Json | null
          espacamento_cocho_obs: string | null
          fazenda_id: string
          formulacao: string | null
          id: string
          kg_cocho: number | null
          kg_deposito: number | null
          leitura: string | null
          lote: string | null
          lote_id: string | null
          nome_usuario: string | null
          pasto: string | null
          pasto_id: string | null
          sync_status: string | null
          tratador: string | null
          updated_at: string | null
          version: number | null
        }
        Insert: {
          categorias?: string | null
          checklist?: Json | null
          created_at?: string | null
          data: string
          deleted_at?: string | null
          dispositivo_id?: string | null
          escore_fezes?: string | null
          espacamento_cocho_cm_cab?: number | null
          espacamento_cocho_detalhes?: Json | null
          espacamento_cocho_ideal?: Json | null
          espacamento_cocho_obs?: string | null
          fazenda_id: string
          formulacao?: string | null
          id?: string
          kg_cocho?: number | null
          kg_deposito?: number | null
          leitura?: string | null
          lote?: string | null
          lote_id?: string | null
          nome_usuario?: string | null
          pasto?: string | null
          pasto_id?: string | null
          sync_status?: string | null
          tratador?: string | null
          updated_at?: string | null
          version?: number | null
        }
        Update: {
          categorias?: string | null
          checklist?: Json | null
          created_at?: string | null
          data?: string
          deleted_at?: string | null
          dispositivo_id?: string | null
          escore_fezes?: string | null
          espacamento_cocho_cm_cab?: number | null
          espacamento_cocho_detalhes?: Json | null
          espacamento_cocho_ideal?: Json | null
          espacamento_cocho_obs?: string | null
          fazenda_id?: string
          formulacao?: string | null
          id?: string
          kg_cocho?: number | null
          kg_deposito?: number | null
          leitura?: string | null
          lote?: string | null
          lote_id?: string | null
          nome_usuario?: string | null
          pasto?: string | null
          pasto_id?: string | null
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
          horario: string | null
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
          horario?: string | null
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
          horario?: string | null
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
        ]
      }
      saida_insumos_itens: {
        Row: {
          id: string
          insumo_id: string
          quantidade: number
          saida_id: string
        }
        Insert: {
          id?: string
          insumo_id: string
          quantidade: number
          saida_id: string
        }
        Update: {
          id?: string
          insumo_id?: string
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
    }
    Views: {
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
    }
    Functions: {
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
      compute_classificacao_matriz: {
        Args: { p_individuo_id: string }
        Returns: string
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
      get_admin_evolution: {
        Args: { start_date: string }
        Returns: {
          fazendas: number
          individuos: number
          month: string
          usuarios: number
        }[]
      }
      get_descendentes_individuo: {
        Args: { p_individuo_id: string }
        Returns: {
          descendente_id: string
          profundidade: number
        }[]
      }
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
      recalculate_all_quant_atual: { Args: never; Returns: undefined }
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
        | "Sa├¡da"
        | "Entrada"
        | "Entrevero"
        | "Doa├º├úo"
      tipo_movimentacao_subtipo:
        | "Enfermaria"
        | "Aparta├º├úo"
        | "Refugo de Cocho"
        | "Compras"
        | "Venda"
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
        "Sa├¡da",
        "Entrada",
        "Entrevero",
        "Doa├º├úo",
      ],
      tipo_movimentacao_subtipo: [
        "Enfermaria",
        "Aparta├º├úo",
        "Refugo de Cocho",
        "Compras",
        "Venda",
      ],
    },
  },
} as const
