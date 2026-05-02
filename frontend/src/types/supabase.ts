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
      fazendas: {
        Row: {
          acesso_id: string
          ativo: boolean | null
          cnpj: string | null
          created_at: string | null
          email: string | null
          endereco: string | null
          id: string
          logo_url: string | null
          nome: string
          planilha_id: string | null
          telefone: string | null
          updated_at: string | null
        }
        Insert: {
          acesso_id: string
          ativo?: boolean | null
          cnpj?: string | null
          created_at?: string | null
          email?: string | null
          endereco?: string | null
          id?: string
          logo_url?: string | null
          nome: string
          planilha_id?: string | null
          telefone?: string | null
          updated_at?: string | null
        }
        Update: {
          acesso_id?: string
          ativo?: boolean | null
          cnpj?: string | null
          created_at?: string | null
          email?: string | null
          endereco?: string | null
          id?: string
          logo_url?: string | null
          nome?: string
          planilha_id?: string | null
          telefone?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      funcionarios: {
        Row: {
          ativo: boolean | null
          cargo: string | null
          cpf: string | null
          created_at: string | null
          fazenda_id: string
          id: string
          nome: string
          telefone: string | null
          updated_at: string | null
        }
        Insert: {
          ativo?: boolean | null
          cargo?: string | null
          cpf?: string | null
          created_at?: string | null
          fazenda_id: string
          id?: string
          nome: string
          telefone?: string | null
          updated_at?: string | null
        }
        Update: {
          ativo?: boolean | null
          cargo?: string | null
          cpf?: string | null
          created_at?: string | null
          fazenda_id?: string
          id?: string
          nome?: string
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
      insumos: {
        Row: {
          ativo: boolean | null
          created_at: string | null
          estoque_atual: number | null
          fazenda_id: string
          id: string
          nome: string
          tipo: string | null
          unidade: string | null
          updated_at: string | null
        }
        Insert: {
          ativo?: boolean | null
          created_at?: string | null
          estoque_atual?: number | null
          fazenda_id: string
          id?: string
          nome: string
          tipo?: string | null
          unidade?: string | null
          updated_at?: string | null
        }
        Update: {
          ativo?: boolean | null
          created_at?: string | null
          estoque_atual?: number | null
          fazenda_id?: string
          id?: string
          nome?: string
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
      lotes: {
        Row: {
          ativo: boolean | null
          categorias: string | null
          created_at: string | null
          fazenda_id: string
          id: string
          n_cabecas: number | null
          nome: string
          peso_vivo_kg: number | null
          qtd_bezerros: number | null
          updated_at: string | null
        }
        Insert: {
          ativo?: boolean | null
          categorias?: string | null
          created_at?: string | null
          fazenda_id: string
          id?: string
          n_cabecas?: number | null
          nome: string
          peso_vivo_kg?: number | null
          qtd_bezerros?: number | null
          updated_at?: string | null
        }
        Update: {
          ativo?: boolean | null
          categorias?: string | null
          created_at?: string | null
          fazenda_id?: string
          id?: string
          n_cabecas?: number | null
          nome?: string
          peso_vivo_kg?: number | null
          qtd_bezerros?: number | null
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
        ]
      }
      pastos: {
        Row: {
          altura_entrada_cm: number | null
          altura_saida_cm: number | null
          area_util_ha: number | null
          ativo: boolean | null
          created_at: string | null
          especie: string | null
          fazenda_id: string
          id: string
          nome: string
          updated_at: string | null
        }
        Insert: {
          altura_entrada_cm?: number | null
          altura_saida_cm?: number | null
          area_util_ha?: number | null
          ativo?: boolean | null
          created_at?: string | null
          especie?: string | null
          fazenda_id: string
          id?: string
          nome: string
          updated_at?: string | null
        }
        Update: {
          altura_entrada_cm?: number | null
          altura_saida_cm?: number | null
          area_util_ha?: number | null
          ativo?: boolean | null
          created_at?: string | null
          especie?: string | null
          fazenda_id?: string
          id?: string
          nome?: string
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
        ]
      }
      registros_bebedouros: {
        Row: {
          categoria: string | null
          created_at: string | null
          data: string
          deleted_at: string | null
          dispositivo_id: string | null
          fazenda_id: string
          gado: string | null
          google_row_id: number | null
          id: string
          leitura_bebedouro: number | null
          lote_id: string | null
          nome_usuario: string | null
          numero_bebedouro: string | null
          observacao: string | null
          pasto_id: string | null
          responsavel: string | null
          sync_status: string | null
          updated_at: string | null
          version: number | null
        }
        Insert: {
          categoria?: string | null
          created_at?: string | null
          data: string
          deleted_at?: string | null
          dispositivo_id?: string | null
          fazenda_id: string
          gado?: string | null
          google_row_id?: number | null
          id?: string
          leitura_bebedouro?: number | null
          lote_id?: string | null
          nome_usuario?: string | null
          numero_bebedouro?: string | null
          observacao?: string | null
          pasto_id?: string | null
          responsavel?: string | null
          sync_status?: string | null
          updated_at?: string | null
          version?: number | null
        }
        Update: {
          categoria?: string | null
          created_at?: string | null
          data?: string
          deleted_at?: string | null
          dispositivo_id?: string | null
          fazenda_id?: string
          gado?: string | null
          google_row_id?: number | null
          id?: string
          leitura_bebedouro?: number | null
          lote_id?: string | null
          nome_usuario?: string | null
          numero_bebedouro?: string | null
          observacao?: string | null
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
      registros_enfermaria: {
        Row: {
          brinco_chip: string | null
          categoria: string | null
          created_at: string | null
          data: string
          deleted_at: string | null
          desordens_digestivas: boolean | null
          desordens_digestivas_obs: string | null
          dispositivo_id: string | null
          fazenda_id: string
          febre_alta: boolean | null
          febre_alta_obs: string | null
          fraturas: boolean | null
          fraturas_obs: string | null
          google_row_id: number | null
          id: string
          incoordenacao_tremores: boolean | null
          incoordenacao_tremores_obs: string | null
          lote_id: string | null
          nome_usuario: string | null
          pasto_id: string | null
          picado_cobra: boolean | null
          picado_cobra_obs: string | null
          presenca_sangue: boolean | null
          presenca_sangue_obs: string | null
          problema_casco: boolean | null
          problema_casco_obs: string | null
          sintomas_pneumonia: boolean | null
          sintomas_pneumonia_obs: string | null
          sync_status: string | null
          tratamento: string | null
          tratamento_outros: string | null
          updated_at: string | null
          version: number | null
        }
        Insert: {
          brinco_chip?: string | null
          categoria?: string | null
          created_at?: string | null
          data: string
          deleted_at?: string | null
          desordens_digestivas?: boolean | null
          desordens_digestivas_obs?: string | null
          dispositivo_id?: string | null
          fazenda_id: string
          febre_alta?: boolean | null
          febre_alta_obs?: string | null
          fraturas?: boolean | null
          fraturas_obs?: string | null
          google_row_id?: number | null
          id?: string
          incoordenacao_tremores?: boolean | null
          incoordenacao_tremores_obs?: string | null
          lote_id?: string | null
          nome_usuario?: string | null
          pasto_id?: string | null
          picado_cobra?: boolean | null
          picado_cobra_obs?: string | null
          presenca_sangue?: boolean | null
          presenca_sangue_obs?: string | null
          problema_casco?: boolean | null
          problema_casco_obs?: string | null
          sintomas_pneumonia?: boolean | null
          sintomas_pneumonia_obs?: string | null
          sync_status?: string | null
          tratamento?: string | null
          tratamento_outros?: string | null
          updated_at?: string | null
          version?: number | null
        }
        Update: {
          brinco_chip?: string | null
          categoria?: string | null
          created_at?: string | null
          data?: string
          deleted_at?: string | null
          desordens_digestivas?: boolean | null
          desordens_digestivas_obs?: string | null
          dispositivo_id?: string | null
          fazenda_id?: string
          febre_alta?: boolean | null
          febre_alta_obs?: string | null
          fraturas?: boolean | null
          fraturas_obs?: string | null
          google_row_id?: number | null
          id?: string
          incoordenacao_tremores?: boolean | null
          incoordenacao_tremores_obs?: string | null
          lote_id?: string | null
          nome_usuario?: string | null
          pasto_id?: string | null
          picado_cobra?: boolean | null
          picado_cobra_obs?: string | null
          presenca_sangue?: boolean | null
          presenca_sangue_obs?: string | null
          problema_casco?: boolean | null
          problema_casco_obs?: string | null
          sintomas_pneumonia?: boolean | null
          sintomas_pneumonia_obs?: string | null
          sync_status?: string | null
          tratamento?: string | null
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
          google_row_id: number | null
          horario: string | null
          id: string
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
          google_row_id?: number | null
          horario?: string | null
          id?: string
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
          google_row_id?: number | null
          horario?: string | null
          id?: string
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
        ]
      }
      registros_maternidade: {
        Row: {
          categoria_mae: string | null
          created_at: string | null
          data: string
          deleted_at: string | null
          dispositivo_id: string | null
          fazenda_id: string
          google_row_id: number | null
          id: string
          lote_id: string | null
          nome_usuario: string | null
          numero_cria: string | null
          numero_mae: string | null
          pasto_id: string | null
          peso_cria_kg: number | null
          raca: string | null
          sexo: string | null
          sync_status: string | null
          tipo_parto: string | null
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
          fazenda_id: string
          google_row_id?: number | null
          id?: string
          lote_id?: string | null
          nome_usuario?: string | null
          numero_cria?: string | null
          numero_mae?: string | null
          pasto_id?: string | null
          peso_cria_kg?: number | null
          raca?: string | null
          sexo?: string | null
          sync_status?: string | null
          tipo_parto?: string | null
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
          fazenda_id?: string
          google_row_id?: number | null
          id?: string
          lote_id?: string | null
          nome_usuario?: string | null
          numero_cria?: string | null
          numero_mae?: string | null
          pasto_id?: string | null
          peso_cria_kg?: number | null
          raca?: string | null
          sexo?: string | null
          sync_status?: string | null
          tipo_parto?: string | null
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
      registros_movimentacao: {
        Row: {
          bezerro: boolean | null
          boi_gordo: boolean | null
          boi_magro: boolean | null
          brinco_chip: string | null
          causa_observacao: string | null
          created_at: string | null
          data: string
          deleted_at: string | null
          dispositivo_id: string | null
          fazenda_id: string
          garrote: boolean | null
          google_row_id: number | null
          id: string
          lote_destino_id: string | null
          lote_origem_id: string | null
          motivo_movimentacao: string | null
          nome_usuario: string | null
          novilha: boolean | null
          numero_cabecas: number | null
          outros: boolean | null
          peso_medio_kg: number | null
          sync_status: string | null
          touro: boolean | null
          tropa: boolean | null
          updated_at: string | null
          vaca: boolean | null
          version: number | null
        }
        Insert: {
          bezerro?: boolean | null
          boi_gordo?: boolean | null
          boi_magro?: boolean | null
          brinco_chip?: string | null
          causa_observacao?: string | null
          created_at?: string | null
          data: string
          deleted_at?: string | null
          dispositivo_id?: string | null
          fazenda_id: string
          garrote?: boolean | null
          google_row_id?: number | null
          id?: string
          lote_destino_id?: string | null
          lote_origem_id?: string | null
          motivo_movimentacao?: string | null
          nome_usuario?: string | null
          novilha?: boolean | null
          numero_cabecas?: number | null
          outros?: boolean | null
          peso_medio_kg?: number | null
          sync_status?: string | null
          touro?: boolean | null
          tropa?: boolean | null
          updated_at?: string | null
          vaca?: boolean | null
          version?: number | null
        }
        Update: {
          bezerro?: boolean | null
          boi_gordo?: boolean | null
          boi_magro?: boolean | null
          brinco_chip?: string | null
          causa_observacao?: string | null
          created_at?: string | null
          data?: string
          deleted_at?: string | null
          dispositivo_id?: string | null
          fazenda_id?: string
          garrote?: boolean | null
          google_row_id?: number | null
          id?: string
          lote_destino_id?: string | null
          lote_origem_id?: string | null
          motivo_movimentacao?: string | null
          nome_usuario?: string | null
          novilha?: boolean | null
          numero_cabecas?: number | null
          outros?: boolean | null
          peso_medio_kg?: number | null
          sync_status?: string | null
          touro?: boolean | null
          tropa?: boolean | null
          updated_at?: string | null
          vaca?: boolean | null
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
      registros_pastagens: {
        Row: {
          avaliacao_entrada: number | null
          avaliacao_saida: number | null
          bezerro: number | null
          boi_magro: number | null
          created_at: string | null
          data: string
          deleted_at: string | null
          dispositivo_id: string | null
          fazenda_id: string
          garrote: number | null
          google_row_id: number | null
          id: string
          lote_id: string | null
          manejador: string | null
          nome_usuario: string | null
          novilha: number | null
          pasto_entrada_id: string | null
          pasto_saida_id: string | null
          sync_status: string | null
          touro: number | null
          updated_at: string | null
          vaca: number | null
          version: number | null
        }
        Insert: {
          avaliacao_entrada?: number | null
          avaliacao_saida?: number | null
          bezerro?: number | null
          boi_magro?: number | null
          created_at?: string | null
          data: string
          deleted_at?: string | null
          dispositivo_id?: string | null
          fazenda_id: string
          garrote?: number | null
          google_row_id?: number | null
          id?: string
          lote_id?: string | null
          manejador?: string | null
          nome_usuario?: string | null
          novilha?: number | null
          pasto_entrada_id?: string | null
          pasto_saida_id?: string | null
          sync_status?: string | null
          touro?: number | null
          updated_at?: string | null
          vaca?: number | null
          version?: number | null
        }
        Update: {
          avaliacao_entrada?: number | null
          avaliacao_saida?: number | null
          bezerro?: number | null
          boi_magro?: number | null
          created_at?: string | null
          data?: string
          deleted_at?: string | null
          dispositivo_id?: string | null
          fazenda_id?: string
          garrote?: number | null
          google_row_id?: number | null
          id?: string
          lote_id?: string | null
          manejador?: string | null
          nome_usuario?: string | null
          novilha?: number | null
          pasto_entrada_id?: string | null
          pasto_saida_id?: string | null
          sync_status?: string | null
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
      registros_rodeio: {
        Row: {
          agua_boa_bebedouro: boolean | null
          agua_boa_bebedouro_obs: string | null
          animais_doentes: boolean | null
          animais_doentes_obs: string | null
          animais_entrevero: boolean | null
          animais_entrevero_obs: string | null
          animais_tratados: number | null
          animal_morto: boolean | null
          animal_morto_obs: string | null
          bezerro: number | null
          boi: number | null
          carrapatos_moscas: boolean | null
          carrapatos_moscas_obs: string | null
          cercas_cochos: boolean | null
          cercas_cochos_obs: string | null
          created_at: string | null
          data: string
          deleted_at: string | null
          dispositivo_id: string | null
          equipe: number | null
          escore_fezes: number | null
          escore_gado_ideal: boolean | null
          escore_gado_ideal_obs: string | null
          fazenda_id: string
          garrote: number | null
          google_row_id: number | null
          id: string
          lote_id: string | null
          nome_usuario: string | null
          novilha: number | null
          pastagem_adequada: boolean | null
          pastagem_adequada_obs: string | null
          pasto_id: string | null
          procedimentos: string[] | null
          sync_status: string | null
          total_cabecas: number | null
          touro: number | null
          updated_at: string | null
          vaca: number | null
          version: number | null
        }
        Insert: {
          agua_boa_bebedouro?: boolean | null
          agua_boa_bebedouro_obs?: string | null
          animais_doentes?: boolean | null
          animais_doentes_obs?: string | null
          animais_entrevero?: boolean | null
          animais_entrevero_obs?: string | null
          animais_tratados?: number | null
          animal_morto?: boolean | null
          animal_morto_obs?: string | null
          bezerro?: number | null
          boi?: number | null
          carrapatos_moscas?: boolean | null
          carrapatos_moscas_obs?: string | null
          cercas_cochos?: boolean | null
          cercas_cochos_obs?: string | null
          created_at?: string | null
          data: string
          deleted_at?: string | null
          dispositivo_id?: string | null
          equipe?: number | null
          escore_fezes?: number | null
          escore_gado_ideal?: boolean | null
          escore_gado_ideal_obs?: string | null
          fazenda_id: string
          garrote?: number | null
          google_row_id?: number | null
          id?: string
          lote_id?: string | null
          nome_usuario?: string | null
          novilha?: number | null
          pastagem_adequada?: boolean | null
          pastagem_adequada_obs?: string | null
          pasto_id?: string | null
          procedimentos?: string[] | null
          sync_status?: string | null
          total_cabecas?: number | null
          touro?: number | null
          updated_at?: string | null
          vaca?: number | null
          version?: number | null
        }
        Update: {
          agua_boa_bebedouro?: boolean | null
          agua_boa_bebedouro_obs?: string | null
          animais_doentes?: boolean | null
          animais_doentes_obs?: string | null
          animais_entrevero?: boolean | null
          animais_entrevero_obs?: string | null
          animais_tratados?: number | null
          animal_morto?: boolean | null
          animal_morto_obs?: string | null
          bezerro?: number | null
          boi?: number | null
          carrapatos_moscas?: boolean | null
          carrapatos_moscas_obs?: string | null
          cercas_cochos?: boolean | null
          cercas_cochos_obs?: string | null
          created_at?: string | null
          data?: string
          deleted_at?: string | null
          dispositivo_id?: string | null
          equipe?: number | null
          escore_fezes?: number | null
          escore_gado_ideal?: boolean | null
          escore_gado_ideal_obs?: string | null
          fazenda_id?: string
          garrote?: number | null
          google_row_id?: number | null
          id?: string
          lote_id?: string | null
          nome_usuario?: string | null
          novilha?: number | null
          pastagem_adequada?: boolean | null
          pastagem_adequada_obs?: string | null
          pasto_id?: string | null
          procedimentos?: string[] | null
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
          google_row_id: number | null
          id: string
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
          google_row_id?: number | null
          id?: string
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
          google_row_id?: number | null
          id?: string
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
        ]
      }
      registros_suplementacao: {
        Row: {
          bezerro: boolean | null
          boi: boolean | null
          created_at: string | null
          creep: number | null
          data: string
          deleted_at: string | null
          dispositivo_id: string | null
          fazenda_id: string
          gado: string | null
          garrote: boolean | null
          google_row_id: number | null
          id: string
          kg_cocho: number | null
          kg_deposito: number | null
          leitura: number | null
          lote_id: string | null
          nome_usuario: string | null
          novilha: boolean | null
          pasto_id: string | null
          produto: string | null
          sacos: number | null
          sync_status: string | null
          touro: boolean | null
          tratador: string | null
          updated_at: string | null
          vaca: boolean | null
          version: number | null
        }
        Insert: {
          bezerro?: boolean | null
          boi?: boolean | null
          created_at?: string | null
          creep?: number | null
          data: string
          deleted_at?: string | null
          dispositivo_id?: string | null
          fazenda_id: string
          gado?: string | null
          garrote?: boolean | null
          google_row_id?: number | null
          id?: string
          kg_cocho?: number | null
          kg_deposito?: number | null
          leitura?: number | null
          lote_id?: string | null
          nome_usuario?: string | null
          novilha?: boolean | null
          pasto_id?: string | null
          produto?: string | null
          sacos?: number | null
          sync_status?: string | null
          touro?: boolean | null
          tratador?: string | null
          updated_at?: string | null
          vaca?: boolean | null
          version?: number | null
        }
        Update: {
          bezerro?: boolean | null
          boi?: boolean | null
          created_at?: string | null
          creep?: number | null
          data?: string
          deleted_at?: string | null
          dispositivo_id?: string | null
          fazenda_id?: string
          gado?: string | null
          garrote?: boolean | null
          google_row_id?: number | null
          id?: string
          kg_cocho?: number | null
          kg_deposito?: number | null
          leitura?: number | null
          lote_id?: string | null
          nome_usuario?: string | null
          novilha?: boolean | null
          pasto_id?: string | null
          produto?: string | null
          sacos?: number | null
          sync_status?: string | null
          touro?: boolean | null
          tratador?: string | null
          updated_at?: string | null
          vaca?: boolean | null
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
      usuario_fazenda: {
        Row: {
          ativo: boolean | null
          created_at: string | null
          fazenda_id: string
          id: string
          papel: string
          usuario_id: string
        }
        Insert: {
          ativo?: boolean | null
          created_at?: string | null
          fazenda_id: string
          id?: string
          papel: string
          usuario_id: string
        }
        Update: {
          ativo?: boolean | null
          created_at?: string | null
          fazenda_id?: string
          id?: string
          papel?: string
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
          created_at: string | null
          email: string
          id: string
          nome: string
          telefone: string | null
          updated_at: string | null
        }
        Insert: {
          ativo?: boolean | null
          created_at?: string | null
          email: string
          id?: string
          nome: string
          telefone?: string | null
          updated_at?: string | null
        }
        Update: {
          ativo?: boolean | null
          created_at?: string | null
          email?: string
          id?: string
          nome?: string
          telefone?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const

