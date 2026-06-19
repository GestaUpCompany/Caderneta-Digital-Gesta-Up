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
      dietas: {
        Row: {
          ativo: boolean | null
          consumo_diario_kg: number | null
          created_at: string | null
          custo_diario_animal: number | null
          custo_total: number | null
          descricao: string | null
          fazenda_id: string
          id: string
          insumos: Json | null
          nome: string
          tipo: string | null
          updated_at: string | null
        }
        Insert: {
          ativo?: boolean | null
          consumo_diario_kg?: number | null
          created_at?: string | null
          custo_diario_animal?: number | null
          custo_total?: number | null
          descricao?: string | null
          fazenda_id: string
          id?: string
          insumos?: Json | null
          nome: string
          tipo?: string | null
          updated_at?: string | null
        }
        Update: {
          ativo?: boolean | null
          consumo_diario_kg?: number | null
          created_at?: string | null
          custo_diario_animal?: number | null
          custo_total?: number | null
          descricao?: string | null
          fazenda_id?: string
          id?: string
          insumos?: Json | null
          nome?: string
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
      fornecedores: {
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
      insumos: {
        Row: {
          ativo: boolean | null
          created_at: string | null
          custo_total_estoque: number | null
          custo_unitario: number | null
          espacamento_ideal_cocho: number | null
          estoque_atual: number | null
          fabricante: string | null
          fazenda_id: string
          fornecedor: string | null
          id: string
          marca: string | null
          nome: string
          tipo: string | null
          unidade: string | null
          updated_at: string | null
        }
        Insert: {
          ativo?: boolean | null
          created_at?: string | null
          custo_total_estoque?: number | null
          custo_unitario?: number | null
          espacamento_ideal_cocho?: number | null
          estoque_atual?: number | null
          fabricante?: string | null
          fazenda_id: string
          fornecedor?: string | null
          id?: string
          marca?: string | null
          nome: string
          tipo?: string | null
          unidade?: string | null
          updated_at?: string | null
        }
        Update: {
          ativo?: boolean | null
          created_at?: string | null
          custo_total_estoque?: number | null
          custo_unitario?: number | null
          espacamento_ideal_cocho?: number | null
          estoque_atual?: number | null
          fabricante?: string | null
          fazenda_id?: string
          fornecedor?: string | null
          id?: string
          marca?: string | null
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
        Relationships: [
          {
            foreignKeyName: "itens_almoxarifado_fazenda_id_fkey"
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
        Relationships: [
          {
            foreignKeyName: "implementos_fazenda_id_fkey"
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
        Relationships: [
          {
            foreignKeyName: "tratamentos_fazenda_id_fkey"
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
      lote_categorias: {
        Row: {
          abate: number | null
          ativo: boolean | null
          categoria: string
          consumo: number | null
          created_at: string | null
          custo_operacional: number | null
          data_meta: string | null
          data_pesagem: string | null
          dias_restantes_meta: number | null
          estrategia_nutricional: string | null
          gmd: string | null
          id: string
          idade: number | null
          lote_id: string
          morte: number | null
          periodo: number | null
          peso_entrada: number | null
          peso_entrada_arrobas: number | null
          peso_vivo_kg: number | null
          peso_vivo_meta_kg: number | null
          preco_animal_cab: number | null
          preco_animal_kg: number | null
          qtd_bezerros: number | null
          quant_atual: number | null
          quant_inicial: number | null
          raca: string | null
          rc_inicial: number | null
          sexo: string | null
          transf_entrada: number | null
          transf_saida: number | null
          updated_at: string | null
        }
        Insert: {
          abate?: number | null
          ativo?: boolean | null
          categoria: string
          consumo?: number | null
          created_at?: string | null
          custo_operacional?: number | null
          data_meta?: string | null
          data_pesagem?: string | null
          dias_restantes_meta?: number | null
          estrategia_nutricional?: string | null
          gmd?: string | null
          id?: string
          idade?: number | null
          lote_id: string
          morte?: number | null
          periodo?: number | null
          peso_entrada?: number | null
          peso_entrada_arrobas?: number | null
          peso_vivo_kg?: number | null
          peso_vivo_meta_kg?: number | null
          preco_animal_cab?: number | null
          preco_animal_kg?: number | null
          qtd_bezerros?: number | null
          quant_atual?: number | null
          quant_inicial?: number | null
          raca?: string | null
          rc_inicial?: number | null
          sexo?: string | null
          transf_entrada?: number | null
          transf_saida?: number | null
          updated_at?: string | null
        }
        Update: {
          abate?: number | null
          ativo?: boolean | null
          categoria?: string
          consumo?: number | null
          created_at?: string | null
          custo_operacional?: number | null
          data_meta?: string | null
          data_pesagem?: string | null
          dias_restantes_meta?: number | null
          estrategia_nutricional?: string | null
          gmd?: string | null
          id?: string
          idade?: number | null
          lote_id?: string
          morte?: number | null
          periodo?: number | null
          peso_entrada?: number | null
          peso_entrada_arrobas?: number | null
          peso_vivo_kg?: number | null
          peso_vivo_meta_kg?: number | null
          preco_animal_cab?: number | null
          preco_animal_kg?: number | null
          qtd_bezerros?: number | null
          quant_atual?: number | null
          quant_inicial?: number | null
          raca?: string | null
          rc_inicial?: number | null
          sexo?: string | null
          transf_entrada?: number | null
          transf_saida?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lote_categorias_lote_id_fkey"
            columns: ["lote_id"]
            isOneToOne: false
            referencedRelation: "lotes"
            referencedColumns: ["id"]
          },
        ]
      }
      lote_pasto_historico: {
        Row: {
          created_at: string | null
          data_final: string | null
          data_inicial: string
          id: string
          lote_id: string | null
          pasto_id: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          data_final?: string | null
          data_inicial?: string
          id?: string
          lote_id?: string | null
          pasto_id?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          data_final?: string | null
          data_inicial?: string
          id?: string
          lote_id?: string | null
          pasto_id?: string | null
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
          custo_operacional: number | null
          data_embarque_prevista: string | null
          data_embarque_previsto: string | null
          data_liberacao_sisbov: string | null
          data_meta: string | null
          data_pesagem: string | null
          dias_restantes_meta: number | null
          estrategia_nutricional: string | null
          fazenda_id: string
          gmd: string | null
          id: string
          idade: number | null
          idade_meses: number | null
          mes_competencia: string | null
          meta_intervalo_rodeio_dias: number | null
          n_cabecas: number | null
          data_proximo_rodeio: string | null
          nome: string
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
          fazenda_id: string
          gmd?: string | null
          id?: string
          idade?: number | null
          idade_meses?: number | null
          mes_competencia?: string | null
          meta_intervalo_rodeio_dias?: number | null
          n_cabecas?: number | null
          data_proximo_rodeio?: string | null
          nome: string
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
          fazenda_id?: string
          gmd?: string | null
          id?: string
          idade?: number | null
          idade_meses?: number | null
          mes_competencia?: string | null
          meta_intervalo_rodeio_dias?: number | null
          n_cabecas?: number | null
          data_proximo_rodeio?: string | null
          nome?: string
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
        Relationships: [
          {
            foreignKeyName: "lotes_fazenda_id_fkey"
            columns: ["fazenda_id"]
            isOneToOne: false
            referencedRelation: "fazendas"
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
          ativo: boolean | null
          capacidade: number | null
          categoria: string
          created_at: string | null
          custo_hora: number | null
          custo_km: number | null
          data_proxima_manutencao: string | null
          data_ultima_manutencao: string | null
          deleted_at: string | null
          fazenda_id: string
          horimetro: number | null
          id: string
          modelo: string | null
          nome: string
          observacoes: string | null
          operador_padrao: string | null
          placa: string | null
          quilometragem: number | null
          status: string
          tipo: string
          tipo_combustivel: string | null
          updated_at: string | null
        }
        Insert: {
          ano?: number | null
          ativo?: boolean | null
          capacidade?: number | null
          categoria: string
          created_at?: string | null
          custo_hora?: number | null
          custo_km?: number | null
          data_proxima_manutencao?: string | null
          data_ultima_manutencao?: string | null
          deleted_at?: string | null
          fazenda_id: string
          horimetro?: number | null
          id?: string
          modelo?: string | null
          nome: string
          observacoes?: string | null
          operador_padrao?: string | null
          placa?: string | null
          quilometragem?: number | null
          status?: string
          tipo: string
          tipo_combustivel?: string | null
          updated_at?: string | null
        }
        Update: {
          ano?: number | null
          ativo?: boolean | null
          capacidade?: number | null
          categoria?: string
          created_at?: string | null
          custo_hora?: number | null
          custo_km?: number | null
          data_proxima_manutencao?: string | null
          data_ultima_manutencao?: string | null
          deleted_at?: string | null
          fazenda_id?: string
          horimetro?: number | null
          id?: string
          modelo?: string | null
          nome?: string
          observacoes?: string | null
          operador_padrao?: string | null
          placa?: string | null
          quilometragem?: number | null
          status?: string
          tipo?: string
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
          principio_ativo: string
          tipo: string
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
          principio_ativo: string
          tipo: string
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
          principio_ativo?: string
          tipo?: string
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
          area_util_ha: number | null
          area_util_porcentagem: number | null
          ativo: boolean | null
          created_at: string | null
          especie: string | null
          fazenda_id: string
          id: string
          kg_deposito: number | null
          metragem_cocho_m: number | null
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
          area_util_ha?: number | null
          area_util_porcentagem?: number | null
          ativo?: boolean | null
          created_at?: string | null
          especie?: string | null
          fazenda_id: string
          id?: string
          kg_deposito?: number | null
          metragem_cocho_m?: number | null
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
          area_util_ha?: number | null
          area_util_porcentagem?: number | null
          ativo?: boolean | null
          created_at?: string | null
          especie?: string | null
          fazenda_id?: string
          id?: string
          kg_deposito?: number | null
          metragem_cocho_m?: number | null
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
          google_row_id: number | null
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
          google_row_id?: number | null
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
          google_row_id?: number | null
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
        Relationships: []
      }
      registros_bebedouros: {
        Row: {
          agua_suficiente: boolean | null
          agua_suficiente_obs: string | null
          aterro_acesso_bebedouro_ideal: boolean | null
          aterro_acesso_bebedouro_ideal_obs: string | null
          boia_protecao_boas_condicoes: boolean | null
          boia_protecao_boas_condicoes_obs: string | null
          created_at: string | null
          data: string
          deleted_at: string | null
          dispositivo_id: string | null
          espacamento_bebedouro_ideal: boolean | null
          espacamento_bebedouro_ideal_obs: string | null
          fazenda_id: string
          gado: string | null
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
          vazao_bebedouro_ideal: boolean | null
          vazao_bebedouro_ideal_obs: string | null
          version: number | null
        }
        Insert: {
          agua_suficiente?: boolean | null
          agua_suficiente_obs?: string | null
          aterro_acesso_bebedouro_ideal?: boolean | null
          aterro_acesso_bebedouro_ideal_obs?: string | null
          boia_protecao_boas_condicoes?: boolean | null
          boia_protecao_boas_condicoes_obs?: string | null
          created_at?: string | null
          data: string
          deleted_at?: string | null
          dispositivo_id?: string | null
          espacamento_bebedouro_ideal?: boolean | null
          espacamento_bebedouro_ideal_obs?: string | null
          fazenda_id: string
          gado?: string | null
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
          vazao_bebedouro_ideal?: boolean | null
          vazao_bebedouro_ideal_obs?: string | null
          version?: number | null
        }
        Update: {
          agua_suficiente?: boolean | null
          agua_suficiente_obs?: string | null
          aterro_acesso_bebedouro_ideal?: boolean | null
          aterro_acesso_bebedouro_ideal_obs?: string | null
          boia_protecao_boas_condicoes?: boolean | null
          boia_protecao_boas_condicoes_obs?: string | null
          created_at?: string | null
          data?: string
          deleted_at?: string | null
          dispositivo_id?: string | null
          espacamento_bebedouro_ideal?: boolean | null
          espacamento_bebedouro_ideal_obs?: string | null
          fazenda_id?: string
          gado?: string | null
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
          vazao_bebedouro_ideal?: boolean | null
          vazao_bebedouro_ideal_obs?: string | null
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
        Relationships: []
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
        Relationships: []
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
          id_provisorio_cria: string | null
          lote: string | null
          lote_id: string | null
          nome_usuario: string | null
          observacao_parto: string | null
          pasto: string | null
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
          id_provisorio_cria?: string | null
          lote?: string | null
          lote_id?: string | null
          nome_usuario?: string | null
          observacao_parto?: string | null
          pasto?: string | null
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
          id_provisorio_cria?: string | null
          lote?: string | null
          lote_id?: string | null
          nome_usuario?: string | null
          observacao_parto?: string | null
          pasto?: string | null
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
            foreignKeyName: "registros_maternidade_lote_id_fkey"
            columns: ["lote_id"]
            isOneToOne: false
            referencedRelation: "lotes"
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
          algum_imprevisto: string | null
          algum_imprevisto_obs: string | null
          area_trabalhada: string | null
          created_at: string
          data: string
          deleted_at: string | null
          dispositivo_id: string | null
          dose_aplicada: string | null
          fazenda_id: string
          hora_final: string | null
          hora_inicial: string | null
          id: string
          implemento_utilizado: string
          insumo_aplicado: string | null
          maquina_veiculo_id: string | null
          meta_diaria_batida: string | null
          meta_diaria_batida_obs: string | null
          nome_usuario: string | null
          observacao: string | null
          odometro_final: string
          odometro_inicial: string
          quantidade_total_aplicada: string | null
          sync_status: string
          tipo_operacao: string
          total_odometro: string | null
          updated_at: string
          veiculo_trator: string
          version: number
        }
        Insert: {
          algum_imprevisto?: string | null
          algum_imprevisto_obs?: string | null
          area_trabalhada?: string | null
          created_at?: string
          data: string
          deleted_at?: string | null
          dispositivo_id?: string | null
          dose_aplicada?: string | null
          fazenda_id: string
          hora_final?: string | null
          hora_inicial?: string | null
          id?: string
          implemento_utilizado: string
          insumo_aplicado?: string | null
          maquina_veiculo_id?: string | null
          meta_diaria_batida?: string | null
          meta_diaria_batida_obs?: string | null
          nome_usuario?: string | null
          observacao?: string | null
          odometro_final: string
          odometro_inicial: string
          quantidade_total_aplicada?: string | null
          sync_status?: string
          tipo_operacao: string
          total_odometro?: string | null
          updated_at?: string
          veiculo_trator: string
          version?: number
        }
        Update: {
          algum_imprevisto?: string | null
          algum_imprevisto_obs?: string | null
          area_trabalhada?: string | null
          created_at?: string
          data?: string
          deleted_at?: string | null
          dispositivo_id?: string | null
          dose_aplicada?: string | null
          fazenda_id?: string
          hora_final?: string | null
          hora_inicial?: string | null
          id?: string
          implemento_utilizado?: string
          insumo_aplicado?: string | null
          maquina_veiculo_id?: string | null
          meta_diaria_batida?: string | null
          meta_diaria_batida_obs?: string | null
          nome_usuario?: string | null
          observacao?: string | null
          odometro_final?: string
          odometro_inicial?: string
          quantidade_total_aplicada?: string | null
          sync_status?: string
          tipo_operacao?: string
          total_odometro?: string | null
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
          avaliacao_saida: number | null
          bezerro: number | null
          boi_magro: number | null
          created_at: string | null
          data: string
          deleted_at: string | null
          dispositivo_id: string | null
          escore_gado: number | null
          fazenda_id: string
          gado_contado: string | null
          garrote: number | null
          id: string
          lote: string | null
          manejador: string | null
          nome_usuario: string | null
          novilha: number | null
          pasto_entrada: string | null
          pasto_entrada_area_util: string | null
          pasto_entrada_especie: string | null
          pasto_saida: string | null
          pasto_saida_area_util: string | null
          pasto_saida_especie: string | null
          sync_status: string | null
          total_animais: number | null
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
          escore_gado?: number | null
          fazenda_id: string
          gado_contado?: string | null
          garrote?: number | null
          id?: string
          lote?: string | null
          manejador?: string | null
          nome_usuario?: string | null
          novilha?: number | null
          pasto_entrada?: string | null
          pasto_entrada_area_util?: string | null
          pasto_entrada_especie?: string | null
          pasto_saida?: string | null
          pasto_saida_area_util?: string | null
          pasto_saida_especie?: string | null
          sync_status?: string | null
          total_animais?: number | null
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
          escore_gado?: number | null
          fazenda_id?: string
          gado_contado?: string | null
          garrote?: number | null
          id?: string
          lote?: string | null
          manejador?: string | null
          nome_usuario?: string | null
          novilha?: number | null
          pasto_entrada?: string | null
          pasto_entrada_area_util?: string | null
          pasto_entrada_especie?: string | null
          pasto_saida?: string | null
          pasto_saida_area_util?: string | null
          pasto_saida_especie?: string | null
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
          escore_fezes: string | null
          escore_gado: number | null
          fazenda_id: string
          gado_contado: string | null
          garrote: number | null
          id: string
          lote_id: string | null
          lote: string | null
          nome_usuario: string | null
          pasto_id: string | null
          novilha: number | null
          pasto: string | null
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
          escore_fezes?: string | null
          escore_gado?: number | null
          fazenda_id: string
          gado_contado?: string | null
          garrote?: number | null
          id?: string
          lote_id?: string | null
          lote?: string | null
          nome_usuario?: string | null
          novilha?: number | null
          pasto_id?: string | null
          pasto?: string | null
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
          escore_fezes?: string | null
          escore_gado?: number | null
          fazenda_id?: string
          gado_contado?: string | null
          garrote?: number | null
          id?: string
          lote_id?: string | null
          lote?: string | null
          nome_usuario?: string | null
          novilha?: number | null
          pasto_id?: string | null
          pasto?: string | null
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
          aterro_acesso_ideal: boolean | null
          aterro_acesso_ideal_obs: string | null
          categorias: string | null
          cochos_condicoes: boolean | null
          cochos_condicoes_obs: string | null
          created_at: string | null
          data: string
          deleted_at: string | null
          deposito_condicoes: boolean | null
          deposito_condicoes_obs: string | null
          dispositivo_id: string | null
          escore_fezes: string | null
          espacamento_cocho_cm_cab: number | null
          espacamento_cocho_detalhes: Json | null
          espacamento_cocho_ideal: boolean | null
          espacamento_cocho_ideal_obs: string | null
          espacamento_cocho_obs: string | null
          espacamento_cocho_adequado: boolean | null
          espacamento_cocho_adequado_obs: string | null
          fazenda_id: string
          id: string
          kg_cocho: number | null
          kg_deposito: number | null
          leitura: string | null
          limpeza_cocho: boolean | null
          limpeza_cocho_obs: string | null
          lote: string | null
          lote_id: string | null
          nome_usuario: string | null
          pasto: string | null
          pasto_id: string | null
          formulacao: string | null
          sync_status: string | null
          tratador: string | null
          updated_at: string | null
          version: number | null
        }
        Insert: {
          aterro_acesso_ideal?: boolean | null
          aterro_acesso_ideal_obs?: string | null
          categorias?: string | null
          cochos_condicoes?: boolean | null
          cochos_condicoes_obs?: string | null
          created_at?: string | null
          data: string
          deleted_at?: string | null
          deposito_condicoes?: boolean | null
          deposito_condicoes_obs?: string | null
          dispositivo_id?: string | null
          escore_fezes?: string | null
          espacamento_cocho_cm_cab?: number | null
          espacamento_cocho_detalhes?: Json | null
          espacamento_cocho_ideal?: boolean | null
          espacamento_cocho_ideal_obs?: string | null
          espacamento_cocho_obs?: string | null
          espacamento_cocho_adequado?: boolean | null
          espacamento_cocho_adequado_obs?: string | null
          fazenda_id: string
          id?: string
          kg_cocho?: number | null
          kg_deposito?: number | null
          leitura?: string | null
          limpeza_cocho?: boolean | null
          limpeza_cocho_obs?: string | null
          lote?: string | null
          lote_id?: string | null
          nome_usuario?: string | null
          pasto?: string | null
          pasto_id?: string | null
          formulacao?: string | null
          sync_status?: string | null
          tratador?: string | null
          updated_at?: string | null
          version?: number | null
        }
        Update: {
          aterro_acesso_ideal?: boolean | null
          aterro_acesso_ideal_obs?: string | null
          categorias?: string | null
          cochos_condicoes?: boolean | null
          cochos_condicoes_obs?: string | null
          created_at?: string | null
          data?: string
          deleted_at?: string | null
          deposito_condicoes?: boolean | null
          deposito_condicoes_obs?: string | null
          dispositivo_id?: string | null
          escore_fezes?: string | null
          espacamento_cocho_cm_cab?: number | null
          espacamento_cocho_detalhes?: Json | null
          espacamento_cocho_ideal?: boolean | null
          espacamento_cocho_ideal_obs?: string | null
          espacamento_cocho_obs?: string | null
          espacamento_cocho_adequado?: boolean | null
          espacamento_cocho_adequado_obs?: string | null
          fazenda_id?: string
          id?: string
          kg_cocho?: number | null
          kg_deposito?: number | null
          leitura?: string | null
          limpeza_cocho?: boolean | null
          limpeza_cocho_obs?: string | null
          lote?: string | null
          lote_id?: string | null
          nome_usuario?: string | null
          pasto?: string | null
          pasto_id?: string | null
          formulacao?: string | null
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
          updated_at?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      calculate_quant_atual: {
        Args: { p_categoria: string; p_lote_id: string }
        Returns: number
      }
      recalculate_all_quant_atual: { Args: never; Returns: undefined }
      update_dados_lotes: { Args: never; Returns: undefined }
    }
    Enums: {
      tipo_movimentacao_subtipo: "Enfermaria" | "Apartação" | "Refugo de Cocho" | "Compras"
      tipo_movimentacao_motivo:
        | "Consumo"
        | "Abate"
        | "Saída"
        | "Entrada"
        | "Entrevero"
        | "Doação"
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
      tipo_movimentacao_subtipo: ["Enfermaria", "Apartação", "Refugo de Cocho", "Compras"],
      tipo_movimentacao_motivo: [
        "Consumo",
        "Abate",
        "Saída",
        "Entrada",
        "Entrevero",
        "Doação",
      ],
    },
  },
} as const
