// Tipos do Relatório de Lote (Ciclo de Vida)
// Espelham o JSONB retornado pela RPC get_relatorio_lote_ciclo_vida no Supabase.
// Todas as seções são opcionais porque a RPC suporta lazy-load via p_secoes.

export interface CadastroLote {
  id: string
  nome: string
  raca: string | null
  sexo: string | null
  sistema_producao: string | null
  destino: string | null
  pasto_id: string | null
  pasto_nome: string | null
  pasto_area_ha: number | null
  modulo_id: string | null
  curral_nome: string | null
  produtor_rural: string | null
  propriedade_origem: string | null
  numero_contrato: string | null
  mes_competencia: string | null
  data_liberacao_sisbov: string | null
  periodo_liberacao_sisbov: string | null
  data_embarque_previsto: string | null
  data_embarque_prevista: string | null
  created_at: string | null
  ativo: boolean
  n_cabecas: number | null
  numero_cabecas: number | null
  qtd_bezerlos: number | null
  quantidade_bezerros: number | null
  peso_entrada_kg: number | null
  peso_entrada_kg_cab: number | null
  gmd: string | null
  data_pesagem: string | null
  data_meta: string | null
  peso_vivo_meta_kg: number | null
  peso_vivo_kg: number | null
  periodo: string | null
  idade: number | null
  idade_meses: number | null
  rc_inicial: number | null
  meta_intervalo_rodeio_dias: number | null
  data_proximo_rodeio: string | null
  preco_kg: number | null
  preco_cab: number | null
  preco_animal_kg: number | null
  preco_animal_cab: number | null
  categorias: string | null
  estrategia_nutricional: string | null
  custo_operacional_reais_cab_dia: number | null
}

export interface CategoriaAtiva {
  categoria: string
  quant_atual: number | null
  peso_vivo_atual_kg: number | null
  peso_entrada_kg: number | null
  gmd: string | null
  morte: number | null
  abate: number | null
  transf_entrada: number | null
  transf_saida: number | null
  data_meta_projetada: string | null
  dias_restantes_meta: number | null
}

export interface EstadoAtualLote {
  cabecas_totais: number
  categorias_ativas: CategoriaAtiva[]
  peso_medio_ponderado: number | null
}

export interface TransicaoCategoria {
  id: string
  data_transicao: string
  categoria_origem: string | null
  categoria_destino: string | null
  peso_na_transicao_kg: number | null
  motivo: string | null
  usuario_id: string | null
  snapshot_resumido: {
    peso_vivo_atual: number | null
    quant_atual: number | null
    formulacao_id: string | null
  } | null
}

export interface CategoriaEncerrada {
  id: string
  categoria: string
  quant_inicial: number | null
  quant_atual: number | null
  peso_entrada_kg: number | null
  peso_vivo_atual_kg: number | null
  data_inicio: string
  data_fim: string
  categoria_origem_id: string | null
}

export interface CronologiaCategorias {
  transicoes: TransicaoCategoria[]
  categorias_encerradas: CategoriaEncerrada[]
}

export interface SnapshotNutricional {
  duracao_dias: number | null
  ganho_peso_total_kg_cab: number | null
  gmd_realizado: number | null
  gmd_planejado: number | null
  producao_arroba_lote: number | null
  mortalidade_percent: number | null
  motivo_migracao: string | null
}

export interface PlanoNutricional {
  plano_id: string
  nome: string | null
  formulacao_id: string | null
  formulacao_nome: string | null
  periodo_dias: number | null
  peso_meta_kg: number | null
  data_inicio: string | null
  data_fim: string | null
  ativo: boolean
  snapshots: SnapshotNutricional[]
}

export interface OcupacaoHistorico {
  tipo: 'pasto'
  pasto_id: string | null
  pasto_nome: string | null
  area_util_ha: number | null
  data_entrada: string | null
  data_saida: string | null
  cabecas_entrada: number | null
  cabecas_saida: number | null
  peso_vivo_medio_entrada_kg: number | null
  peso_vivo_medio_saida_kg: number | null
  taxa_lotacao_ua_ha: number | null
  meta_intervalo_ocupacao_dias: number | null
  desvio_tempo_ocupacao_percent: number | null
}

export interface MovimentacaoLote {
  id: string
  data: string
  tipo: 'entrada' | 'saida'
  lote_origem_id: string | null
  lote_origem_nome: string | null
  lote_destino_id: string | null
  lote_destino_nome: string | null
  numero_cabecas: number | null
  categoria: string | null
  motivo_movimentacao: string | null
  subtipo: string | null
  causa_observacao: string | null
  responsavel: string | null
  fazenda_destino_id: string | null
  fazenda_destino_nome: string | null
}

export interface MortalidadeLote {
  total: number
  linhas: {
    id: string
    data: string
    causa_morte: string | null
    categoria: string | null
    sexo: string | null
    raca: string | null
    peso_vivo: number | null
    brinco: string | null
    chip: string | null
    nutricao_atual: string | null
    nutricao_anterior: string | null
    nome_usuario: string | null
  }[]
}

export interface ReproducaoLote {
  total_partos: number
  linhas: {
    id: string
    data: string
    tipo_parto: string[] | null
    sexo_cria: string | null
    raca: string | null
    peso_cria_kg: number | null
    id_brinco_cria: string | null
    id_brinco_mae: string | null
    escore_matriz: string | null
    docilidade_matriz: number | null
    observacao_parto: string | null
    nome_usuario: string | null
  }[]
}

export interface ConsumoSuplementacao {
  id: string
  data: string
  formulacao: string | null
  leitura: string | null
  kg_cocho: number | null
  n_cabecas: number | null
  peso_vivo_kg: number | null
  consumo_medio_geral_percent_pv: number | null
  consumo_medio_geral_kg_ms: number | null
  custo_medio_reais_cab_dia: number | null
  escore_fezes: string | null
  tratador: string | null
}

export interface IndividuoLote {
  id: string
  id_manejo: string | null
  id_brinco: string | null
  id_chip: string | null
  sexo: string | null
  categoria: string | null
  raca: string | null
  data_nascimento: string | null
  peso_atual_kg: number | null
  peso_meta_kg: number | null
  data_entrada_fazenda: string | null
  pv_entrada_kg: number | null
  data_desmama: string | null
  peso_desmama_kg: number | null
  status: string | null
  numero_partos: number | null
}

export interface IndicadoresConsolidados {
  idade_lote_dias: number
  cabecas_atual: number
  peso_medio_atual_kg: number | null
  peso_entrada_medio_kg: number | null
  ganho_peso_total_kg_cab: number | null
  total_mortes: number
  total_saidas: number
  total_entradas: number
  total_partos: number
  total_consumo_registros: number
  total_pastos_ocupados: number
  total_transicoes_categoria: number
  ativo: boolean
}

export interface RelatorioLotePayload {
  success: boolean
  error?: string
  fazenda_id: string
  lote_id: string
  cadastro?: CadastroLote
  estado_atual?: EstadoAtualLote
  cronologia_categorias?: CronologiaCategorias
  historico_nutricional?: PlanoNutricional[]
  linha_tempo_ocupacao?: OcupacaoHistorico[]
  movimentacoes?: MovimentacaoLote[]
  mortalidade?: MortalidadeLote
  reproducao?: ReproducaoLote
  consumo_suplementacao?: ConsumoSuplementacao[]
  individuos?: IndividuoLote[]
  indicadores_consolidados?: IndicadoresConsolidados
}

export interface LoteRelatorioSimplificado {
  lote_id: string
  nome: string
  ativo: boolean
  n_cabecas: number
  categorias: string | null
  pasto_nome: string | null
  data_criacao: string
  tem_movimentacao: boolean
  tem_morte: boolean
  tem_consumo: boolean
}

// Nomes canônicos das seções (usados no parâmetro p_secoes da RPC)
export const SECOES_RELATORIO_LOTE = {
  CADASTRO: 'cadastro',
  ESTADO_ATUAL: 'estado_atual',
  CRONOLOGIA: 'cronologia_categorias',
  NUTRICIONAL: 'historico_nutricional',
  OCUPACAO: 'linha_tempo_ocupacao',
  MOVIMENTACOES: 'movimentacoes',
  MORTALIDADE: 'mortalidade',
  REPRODUCAO: 'reproducao',
  CONSUMO: 'consumo_suplementacao',
  INDIVIDUOS: 'individuos',
  INDICADORES: 'indicadores_consolidados',
} as const

// Seções carregadas na chamada inicial (lazy-load)
export const SECOES_INICIAIS = [
  SECOES_RELATORIO_LOTE.CADASTRO,
  SECOES_RELATORIO_LOTE.ESTADO_ATUAL,
  SECOES_RELATORIO_LOTE.INDICADORES,
] as const
