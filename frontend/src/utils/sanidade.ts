/**
 * Caderneta de Sanidade: aplicação de vacina, vermífugo ou tratamento em um animal ou em um lote.
 * Só registra: não mexe em contagem, peso nem movimentação. A carência avisa ("em carência até X") e nunca bloqueia.
 * O servidor (tabela aplicacoes_sanitarias) tem snapshot do produto e calcula liberação de abate e próxima dose.
 */
import { dataBRparaIso } from './manejoCurral'

export const TIPOS_APLICACAO = ['Vacinação', 'Vermifugação', 'Tratamento', 'Preventivo', 'Outro'] as const
export type TipoAplicacao = (typeof TIPOS_APLICACAO)[number]
export type AlvoAplicacao = 'animal' | 'lote'

export interface FormSanidade {
  data: string
  tipo: TipoAplicacao
  alvo: AlvoAplicacao
  /** animal */
  individuoId: string
  idManejo: string
  brinco: string
  chip: string
  /** lote (alvo lote) ou lote do animal (informativo) */
  loteId: string
  loteNome: string
  categoria: string
  numeroCabecas: string
  /** produto: do catálogo ('' = digitado) */
  medicamentoId: string
  medicamentoNome: string
  principioAtivo: string
  dose: string
  via: string
  loteProduto: string
  /** DD/MM/AAAA ou '' */
  validadeProduto: string
  carenciaDias: string
  intervaloDias: string
  diagnostico: string
  observacao: string
}

export interface MedicamentoCatalogo {
  id: string
  nome_comercial: string
  principio_ativo?: string | null
  dose_recomendada?: string | null
  carencia_abate_dias?: number | null
  intervalo_reaplicacao_dias?: number | null
}

export function formVazioSanidade(hoje: string): FormSanidade {
  return {
    data: hoje,
    tipo: 'Vacinação',
    alvo: 'animal',
    individuoId: '',
    idManejo: '',
    brinco: '',
    chip: '',
    loteId: '',
    loteNome: '',
    categoria: '',
    numeroCabecas: '',
    medicamentoId: '',
    medicamentoNome: '',
    principioAtivo: '',
    dose: '',
    via: '',
    loteProduto: '',
    validadeProduto: '',
    carenciaDias: '',
    intervaloDias: '',
    diagnostico: '',
    observacao: '',
  }
}

/** Escolher o produto do catálogo preenche nome, princípio, dose, carência e intervalo (o peão pode ajustar). */
export function aplicarMedicamentoNoForm(form: FormSanidade, med: MedicamentoCatalogo | null): FormSanidade {
  if (!med) return { ...form, medicamentoId: '' }
  return {
    ...form,
    medicamentoId: med.id,
    medicamentoNome: med.nome_comercial,
    principioAtivo: med.principio_ativo ?? '',
    dose: form.dose.trim() !== '' ? form.dose : (med.dose_recomendada ?? ''),
    carenciaDias: med.carencia_abate_dias != null ? String(med.carencia_abate_dias) : '',
    intervaloDias: med.intervalo_reaplicacao_dias != null ? String(med.intervalo_reaplicacao_dias) : '',
  }
}

const inteiro = (t: string): number | null => {
  if (String(t ?? '').trim() === '') return null
  const n = Number(t)
  return Number.isInteger(n) ? n : NaN
}

const vazioParaNulo = (t: string | null | undefined): string | null => (String(t ?? '').trim() === '' ? null : String(t).trim())

/** Erros em texto, na ordem em que o peão preenche. Lista vazia = pode salvar. */
export function errosSanidade(form: FormSanidade, hojeBR: string): { field: string; message: string }[] {
  const erros: { field: string; message: string }[] = []
  const iso = dataBRparaIso(form.data)
  const hojeIso = dataBRparaIso(hojeBR)
  if (!iso) erros.push({ field: 'data', message: 'Data inválida. Use DD/MM/AAAA' })
  else if (hojeIso && iso > hojeIso) erros.push({ field: 'data', message: 'A data da aplicação não pode ser futura' })

  if (form.alvo === 'animal') {
    if (!form.individuoId) {
      erros.push({
        field: 'individuoId',
        message: 'Escolha um animal cadastrado. Para animal que não está no cadastro, aplique no lote',
      })
    }
  } else {
    if (!form.loteId) erros.push({ field: 'loteId', message: 'Escolha o lote' })
    const n = inteiro(form.numeroCabecas)
    if (n === null || Number.isNaN(n) || n < 1) erros.push({ field: 'numeroCabecas', message: 'Informe quantas cabeças receberam' })
  }

  if (form.medicamentoNome.trim() === '') erros.push({ field: 'medicamentoNome', message: 'Informe o produto aplicado' })
  const carencia = inteiro(form.carenciaDias)
  if (carencia !== null && (Number.isNaN(carencia) || carencia < 0)) erros.push({ field: 'carenciaDias', message: 'Carência: número inteiro de dias' })
  const intervalo = inteiro(form.intervaloDias)
  if (intervalo !== null && (Number.isNaN(intervalo) || intervalo < 1)) erros.push({ field: 'intervaloDias', message: 'Intervalo: número inteiro de dias, 1 ou mais' })
  if (form.validadeProduto.trim() !== '') {
    const v = dataBRparaIso(form.validadeProduto)
    if (!v) erros.push({ field: 'validadeProduto', message: 'Validade inválida. Use DD/MM/AAAA' })
    else if (iso && v < iso) erros.push({ field: 'validadeProduto', message: 'O produto estava vencido na data da aplicação' })
  }
  return erros
}

/** Texto curto do que falta (para o rodapé do formulário). */
export function pendenciaSanidade(form: FormSanidade, hojeBR: string): string {
  const e = errosSanidade(form, hojeBR)
  return e.length > 0 ? e[0].message : ''
}

/** Linha da tabela aplicacoes_sanitarias (a fazenda e o local_id entram no sync). Datas derivadas ficam com o servidor. */
export function sanidadeParaServidor(registro: Record<string, unknown>) {
  const r = registro as Partial<FormSanidade> & { responsavel?: string; usuario?: string }
  const ehAnimal = (r.alvo ?? 'animal') === 'animal'
  const cabecas = inteiro(String(r.numeroCabecas ?? ''))
  return {
    data: dataBRparaIso(r.data ?? '') ?? undefined,
    tipo: r.tipo || 'Outro',
    individuo_id: ehAnimal ? vazioParaNulo(r.individuoId) : null,
    lote_id: ehAnimal ? null : vazioParaNulo(r.loteId),
    categoria: ehAnimal ? null : vazioParaNulo(r.categoria),
    numero_cabecas: ehAnimal || cabecas === null || Number.isNaN(cabecas) ? null : cabecas,
    medicamento_id: vazioParaNulo(r.medicamentoId),
    medicamento_nome: String(r.medicamentoNome ?? '').trim(),
    principio_ativo: vazioParaNulo(r.principioAtivo),
    dose_aplicada: vazioParaNulo(r.dose),
    via_aplicacao: vazioParaNulo(r.via),
    lote_produto: vazioParaNulo(r.loteProduto),
    validade_produto: dataBRparaIso(r.validadeProduto ?? '') ?? null,
    carencia_abate_dias: (() => {
      const n = inteiro(String(r.carenciaDias ?? ''))
      return n === null || Number.isNaN(n) ? null : n
    })(),
    intervalo_reaplicacao_dias: (() => {
      const n = inteiro(String(r.intervaloDias ?? ''))
      return n === null || Number.isNaN(n) ? null : n
    })(),
    diagnostico: vazioParaNulo(r.diagnostico),
    observacao: vazioParaNulo(r.observacao),
    responsavel: vazioParaNulo(r.usuario ?? r.responsavel),
    origem: 'pwa' as const,
  }
}

// ---------- Carência (aviso) ----------

export interface CarenciaLinha {
  individuo_id: string | null
  lote_id: string | null
  categoria: string | null
  /** AAAA-MM-DD */
  liberacao_abate_em: string
  medicamento_nome: string
}

export interface CarenciaAtiva {
  liberadoEm: string
  medicamento: string
}

export function somarDias(isoData: string, dias: number): string {
  const d = new Date(`${isoData}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + dias)
  return d.toISOString().slice(0, 10)
}

/** Aplicações guardadas no aparelho (ainda não enviadas) viram linhas de carência, como as do servidor. */
export function carenciaDeRegistroLocal(registro: Record<string, unknown>): CarenciaLinha | null {
  const p = sanidadeParaServidor(registro)
  if (!p.data || p.carencia_abate_dias == null) return null
  if (!p.individuo_id && !p.lote_id) return null
  return {
    individuo_id: p.individuo_id,
    lote_id: p.lote_id,
    categoria: p.categoria,
    liberacao_abate_em: somarDias(p.data, p.carencia_abate_dias),
    medicamento_nome: p.medicamento_nome,
  }
}

const norm = (t: string | null | undefined) => String(t ?? '').trim().toLowerCase()

/**
 * Carência em vigor para o alvo escolhido (a mais distante), ou null.
 * Animal: aplicação própria, ou do lote dele (e da categoria dele, quando a aplicação informa categoria).
 * Lote: aplicação do lote (categoria vazia vale para todas; informada, só para a mesma).
 */
export function carenciaDoAlvo(
  linhas: CarenciaLinha[],
  alvo: { individuoId?: string; loteId?: string; categoria?: string },
  hojeIso: string
): CarenciaAtiva | null {
  let melhor: CarenciaLinha | null = null
  for (const l of linhas) {
    if (l.liberacao_abate_em <= hojeIso) continue
    const doAnimal = !!alvo.individuoId && l.individuo_id === alvo.individuoId
    const doLote =
      !l.individuo_id &&
      !!alvo.loteId &&
      l.lote_id === alvo.loteId &&
      (!l.categoria || !alvo.categoria || norm(l.categoria) === norm(alvo.categoria))
    if (!doAnimal && !doLote) continue
    if (!melhor || l.liberacao_abate_em > melhor.liberacao_abate_em) melhor = l
  }
  return melhor ? { liberadoEm: melhor.liberacao_abate_em, medicamento: melhor.medicamento_nome } : null
}

export function textoCarencia(c: CarenciaAtiva): string {
  return `Em carência até ${c.liberadoEm.split('-').reverse().join('/')} por ${c.medicamento}. Não destinar a abate ou venda para corte.`
}

/** Resumo do registro para lista e compartilhamento. */
export function resumirSanidade(r: Record<string, unknown>): string {
  const f = r as Partial<FormSanidade>
  const alvo =
    (f.alvo ?? 'animal') === 'animal'
      ? f.brinco || f.chip || f.idManejo || 'Animal'
      : `${f.loteNome || 'Lote'}${f.categoria ? ` (${f.categoria})` : ''}${f.numeroCabecas ? ` · ${f.numeroCabecas} cab.` : ''}`
  return `${alvo}: ${f.medicamentoNome ?? ''}`.trim()
}
