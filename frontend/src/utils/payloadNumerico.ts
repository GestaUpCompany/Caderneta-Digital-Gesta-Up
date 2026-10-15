/**
 * Última barreira antes do envio: garante que os campos numéricos do payload cabem na coluna do Supabase.
 * Sem isso, "12,5" virava NaN (null silencioso), decimal em coluna inteira dava 22P02 e valor gigante
 * estourava numeric(10,2) com 22003 — erros "definitivos" que deixavam o registro preso no aparelho.
 *
 * O mapa abaixo espelha o schema (information_schema) das tabelas que o PWA grava. Se uma coluna numérica
 * for criada ou alterada no Painel, atualizar aqui (ver CLAUDE.md, "Impacto cruzado").
 */
type TipoColuna = 'int' | 'livre' | { p: number; s: number }

const NUM = (p: number, s: number): TipoColuna => ({ p, s })

export const COLUNAS_NUMERICAS: Record<string, Record<string, TipoColuna>> = {
  atividade_funcionarios: { gps_accuracy: 'livre', latitude: 'livre', longitude: 'livre', tempo_gasto_segundos: 'int' },
  atividade_imprevistos: { impacto_minutos: 'int' },
  atividade_sessoes: { duracao_segundos: 'int' },
  atividades: { prioridade: 'int' },
  entrada_insumos_itens: { quantidade: 'livre', valor_total: 'livre', valor_unitario: 'livre' },
  movimentacoes_combustivel: { preco_por_litro: NUM(12, 4), quantidade_l: NUM(12, 3), valor_total: NUM(12, 2) },
  ordens_servico: {
    ano: 'int', mortes_transporte: 'int', preco_arroba: 'livre', quantidade_embarcada: 'int', quantidade_prevista: 'int',
    sequencial: 'int', valor_acerto: 'livre', valor_frete: 'livre', valor_total_previsto: 'livre',
  },
  os_recebimentos: { mortes: 'int', peso_medio_balancao: 'livre', peso_origem: 'livre', score_corporal: 'int' },
  registros_abastecimento: { odometro_horimetro: NUM(12, 3), total_abastecido: 'livre', total_bomba: NUM(12, 2) },
  registros_alimentacao: {
    numero_cafe_manha: 'int', numero_cozinheiras: 'int', numero_lanches: 'int', numero_refeicoes_almoco: 'int',
    numero_refeicoes_jantar: 'int', preco_unitario: NUM(10, 2), quantidade_marmitas: 'int',
  },
  registros_auditoria_5s: {
    nota_geral: 'int', percentual_conformidade: NUM(5, 2), total_conformes: 'int', total_itens: 'int', total_nao_conformes: 'int',
  },
  registros_bebedouros: { leitura_bebedouro: 'int' },
  registros_clima: { temperatura_media: 'livre', umidade_relativa: 'livre' },
  registros_curral: { escore_fezes: 'int', escore_gado: 'livre', numero_pessoas_manejo: 'int', total_animais: 'int' },
  registros_entrada_insumos: { quantidade: NUM(10, 2), valor_total: NUM(10, 2), valor_unitario: NUM(10, 2) },
  registros_fabrica_confinamento: { ordem_trato: 'int', total_previsto: NUM(14, 2), total_produzido: NUM(14, 2) },
  registros_fabrica_confinamento_insumos: { kg_previsto: NUM(14, 2), kg_produzido: NUM(14, 2), ordem: 'int' },
  registros_leitura_cocho: { leitura_cocho: 'int' },
  registros_limpeza: { numero_equipe: 'int' },
  registros_maternidade: { docilidade_matriz: 'int', peso_cria_kg: NUM(10, 2) },
  registros_morte: { escore: 'livre', gps_accuracy: 'livre', latitude: 'livre', longitude: 'livre', peso_vivo: 'int' },
  registros_movimentacao: { equipe: 'int', idade: 'int', numero_cabecas: 'int', peso_vivo_atual_kg: NUM(10, 2) },
  registros_oferta_trato: { kg_ofertado_real: 'livre', kg_planejado: 'livre', leitura_cocho_nota: 'int', ordem_trato: 'int' },
  registros_pastagens: {
    avaliacao_entrada: 'int', avaliacao_saida: 'int', bezerro: 'int', boi_magro: 'int', escore_fezes: 'int', escore_gado: 'livre',
    foto_entrada_gps_accuracy: 'livre', foto_entrada_latitude: 'livre', foto_entrada_longitude: 'livre',
    foto_saida_gps_accuracy: 'livre', foto_saida_latitude: 'livre', foto_saida_longitude: 'livre',
    garrote: 'int', novilha: 'int', numero_pessoas_manejo: 'int', pasto_entrada_area_util: 'livre', pasto_saida_area_util: 'livre',
    total_animais: 'int', touro: 'int', vaca: 'int',
  },
  registros_pesagem: {
    idade_dias: 'int', peso_kg: 'livre', tempo_medio_min_cab: 'livre', tempo_preenchimento_seg: 'livre', tempo_total_min: 'livre',
  },
  registros_problemas: { gps_accuracy: 'livre', latitude: 'livre', longitude: 'livre' },
  registros_rodeio: {
    bezerro: 'int', boi: 'int', equipe: 'int', escore_fezes: 'int', escore_gado: 'livre', garrote: 'int', novilha: 'int',
    total_cabecas: 'int', touro: 'int', vaca: 'int',
  },
  registros_saida_insumos: { total_produzido: NUM(10, 2) },
  registros_suplementacao: {
    consumo_medio_30dias_kg_mn: NUM(10, 6), consumo_medio_30dias_kg_ms: NUM(10, 6), consumo_medio_30dias_percent_pv: NUM(10, 6),
    consumo_medio_geral_kg_mn: NUM(10, 6), consumo_medio_geral_kg_ms: NUM(10, 6), consumo_medio_geral_percent_pv: NUM(10, 6),
    custo_medio_reais_cab_dia: NUM(10, 6), espacamento_cocho_cm_cab: 'livre', kg_cocho: NUM(10, 2), kg_deposito: NUM(10, 2),
    n_cabecas: 'int', peso_vivo_kg: NUM(10, 2), qtd_bezerros: 'int', qtd_sacos: 'livre',
  },
  saida_insumos_itens: { quantidade: 'livre' },
}

/** Valor que não cabe na coluna do banco: nunca chega ao servidor. Mensagem pensada para quem lê a lista de erros. */
export class ValorForaDaFaixaError extends Error {
  code = '22003'
  constructor(public coluna: string, public valor: number, public limite?: number) {
    super(
      limite !== undefined
        ? `Valor ${valor} inválido para "${coluna}" (máximo ${limite}). Corrija o registro e reenvie.`
        : `Valor "${valor}" inválido para "${coluna}". Corrija o registro e reenvie.`
    )
    this.name = 'ValorForaDaFaixaError'
  }
}

/**
 * Número a partir do que o peão digitou. Aceita vírgula decimal ("12,5") e "1.234,5" (ponto de milhar só quando
 * há vírgula). Sem vírgula, o texto é lido como o JavaScript lê ("1.500" = 1,5), igual ao comportamento anterior.
 * Devolve NaN quando não é número (quem chama decide: `|| 0`, null, etc.).
 */
export function paraNumero(valor: unknown): number {
  if (typeof valor === 'number') return valor
  if (typeof valor === 'boolean') return Number(valor)
  if (typeof valor !== 'string') return NaN
  const texto = valor.trim()
  if (texto === '') return NaN
  return Number(texto.includes(',') ? texto.replace(/\./g, '').replace(',', '.') : texto)
}

function converter(coluna: string, valor: unknown, tipo: TipoColuna): unknown {
  if (valor === null || valor === undefined || valor === '') return null
  if (typeof valor !== 'string' && typeof valor !== 'number') return valor

  const numero = paraNumero(valor)
  // Texto que não é número (ou NaN/Infinity): null em vez de enviar lixo
  if (!Number.isFinite(numero)) return null

  if (tipo === 'livre') return numero
  if (tipo === 'int') {
    const inteiro = Math.round(numero)
    if (Math.abs(inteiro) > 2_147_483_647) throw new ValorForaDaFaixaError(coluna, inteiro, 2_147_483_647)
    return inteiro
  }

  const fator = 10 ** tipo.s
  const arredondado = Math.round(numero * fator) / fator
  const limite = 10 ** (tipo.p - tipo.s)
  if (Math.abs(arredondado) >= limite) throw new ValorForaDaFaixaError(coluna, arredondado, limite - 1 / fator)
  return arredondado
}

/**
 * Devolve o payload com os campos numéricos conhecidos convertidos para o que o banco aceita.
 * Campos ausentes, nulos e de tabelas fora do mapa passam intactos.
 */
export function sanitizarPayloadNumerico<T extends Record<string, any>>(tabela: string | undefined, dados: T): T {
  const colunas = tabela ? COLUNAS_NUMERICAS[tabela] : undefined
  if (!colunas || !dados || typeof dados !== 'object') return dados

  const saida: Record<string, any> = { ...dados }
  for (const [coluna, tipo] of Object.entries(colunas)) {
    if (coluna in saida) saida[coluna] = converter(coluna, saida[coluna], tipo)
  }
  return saida as T
}
