/**
 * Caderneta de Reprodução: cobertura, inseminação, diagnóstico de gestação e aborto, sempre de fêmeas cadastradas.
 * Uma sessão (um registro local) vale para várias fêmeas, o que serve ao diagnóstico em grupo no curral. Só registra:
 * não altera contagem, peso nem categoria. O status (prenha, coberta, vazia...) é derivado no servidor
 * (v_status_reprodutivo); aqui ele só aparece como aviso. O servidor recebe uma linha por fêmea (eventos_reprodutivos).
 */
import { dataBRparaIso } from './manejoCurral'

export const TIPOS_EVENTO = ['Cobertura', 'Inseminação', 'Diagnóstico de gestação', 'Aborto'] as const
export type TipoEvento = (typeof TIPOS_EVENTO)[number]
export const METODOS_DIAGNOSTICO = ['Palpação', 'Ultrassom', 'Outro'] as const
export const RESULTADOS_DIAGNOSTICO = ['Prenha', 'Vazia', 'Inconclusivo'] as const
export type ResultadoDiagnostico = (typeof RESULTADOS_DIAGNOSTICO)[number]

export interface LinhaReproducao {
  uid: string
  individuoId: string
  /** brinco, chip, manejo ou provisório, para mostrar na lista */
  rotulo: string
  /** só diagnóstico */
  resultado: '' | ResultadoDiagnostico
  /** só diagnóstico com resultado Prenha; dias de gestação, opcional */
  idadeGestacaoDias: string
}

export interface FormReproducao {
  data: string
  tipo: TipoEvento
  touroNome: string
  semenPartida: string
  tecnico: string
  metodo: '' | (typeof METODOS_DIAGNOSTICO)[number]
  estacaoId: string
  estacaoNome: string
  observacao: string
  linhas: LinhaReproducao[]
}

export function formVazioReproducao(hoje: string): FormReproducao {
  return {
    data: hoje,
    tipo: 'Diagnóstico de gestação',
    touroNome: '',
    semenPartida: '',
    tecnico: '',
    metodo: '',
    estacaoId: '',
    estacaoNome: '',
    observacao: '',
    linhas: [],
  }
}

export function novaLinhaReproducao(uid: string, individuoId: string, rotulo: string): LinhaReproducao {
  return { uid, individuoId, rotulo, resultado: '', idadeGestacaoDias: '' }
}

const vazioParaNulo = (t: string | null | undefined): string | null => (String(t ?? '').trim() === '' ? null : String(t).trim())

const inteiro = (t: string): number | null => {
  if (String(t ?? '').trim() === '') return null
  const n = Number(t)
  return Number.isInteger(n) ? n : NaN
}

/** Erros em texto, na ordem em que o peão preenche. Lista vazia = pode salvar. */
export function errosReproducao(form: FormReproducao, hojeBR: string): { field: string; message: string }[] {
  const erros: { field: string; message: string }[] = []
  const iso = dataBRparaIso(form.data)
  const hojeIso = dataBRparaIso(hojeBR)
  if (!iso) erros.push({ field: 'data', message: 'Data inválida. Use DD/MM/AAAA' })
  else if (hojeIso && iso > hojeIso) erros.push({ field: 'data', message: 'A data do evento não pode ser futura' })

  const linhas = form.linhas ?? []
  if (linhas.length === 0) {
    erros.push({ field: 'linhas', message: 'Adicione ao menos uma fêmea' })
    return erros
  }
  const vistos = new Set<string>()
  for (const l of linhas) {
    if (!l.individuoId) {
      erros.push({ field: 'linhas', message: 'Só fêmeas cadastradas entram na reprodução. Cadastre o animal antes' })
      break
    }
    if (vistos.has(l.individuoId)) {
      erros.push({ field: 'linhas', message: `A fêmea ${l.rotulo || ''} está repetida na lista`.replace('  ', ' ') })
      break
    }
    vistos.add(l.individuoId)
  }

  if (form.tipo === 'Diagnóstico de gestação') {
    const semResultado = linhas.filter((l) => !l.resultado).length
    if (semResultado > 0) {
      erros.push({ field: 'resultado', message: semResultado === 1 ? 'Falta o resultado de 1 fêmea' : `Faltam os resultados de ${semResultado} fêmeas` })
    }
    for (const l of linhas) {
      if (l.resultado !== 'Prenha') continue
      const n = inteiro(l.idadeGestacaoDias)
      if (n !== null && (Number.isNaN(n) || n < 0 || n > 300)) {
        erros.push({ field: 'idadeGestacaoDias', message: `Dias de gestação de ${l.rotulo || 'uma fêmea'}: inteiro de 0 a 300` })
        break
      }
    }
  }
  return erros
}

/** Texto curto do que falta (para o rodapé do formulário). */
export function pendenciaReproducao(form: FormReproducao, hojeBR: string): string {
  const e = errosReproducao(form, hojeBR)
  return e.length > 0 ? e[0].message : ''
}

/**
 * Linhas da tabela eventos_reprodutivos (uma por fêmea). O local_id junta a sessão e a linha, então reenviar não
 * duplica. evento_cobertura_id nunca é enviado: registros chegam fora de ordem e a view calcula o status pelas datas.
 */
export function reproducaoParaServidor(registro: Record<string, unknown>, fazendaId: string) {
  const r = registro as Partial<FormReproducao> & { id?: string; responsavel?: string; usuario?: string }
  const tipo = (r.tipo ?? 'Diagnóstico de gestação') as TipoEvento
  const ehCobertura = tipo === 'Cobertura' || tipo === 'Inseminação'
  const ehDiagnostico = tipo === 'Diagnóstico de gestação'
  const data = dataBRparaIso(r.data ?? '') ?? undefined
  return (r.linhas ?? []).map((l) => {
    const prenha = ehDiagnostico && l.resultado === 'Prenha'
    const idade = prenha ? inteiro(l.idadeGestacaoDias) : null
    return {
      fazenda_id: fazendaId,
      local_id: `${r.id}:${l.uid}`,
      individuo_id: l.individuoId,
      tipo,
      data,
      estacao_id: vazioParaNulo(r.estacaoId),
      touro_nome: ehCobertura ? vazioParaNulo(r.touroNome) : null,
      semen_partida: tipo === 'Inseminação' ? vazioParaNulo(r.semenPartida) : null,
      tecnico: ehCobertura ? vazioParaNulo(r.tecnico) : null,
      metodo_diagnostico: ehDiagnostico ? vazioParaNulo(r.metodo) : null,
      resultado: ehDiagnostico ? l.resultado || null : null,
      idade_gestacao_dias: idade === null || Number.isNaN(idade) ? null : idade,
      observacao: vazioParaNulo(r.observacao),
      responsavel: vazioParaNulo(r.usuario ?? r.responsavel),
      origem: 'pwa' as const,
    }
  })
}

// ---------- Status e estação (avisos) ----------

export interface StatusReprodutivoLinha {
  individuo_id: string
  status_reprodutivo: string
  ultima_cobertura_data: string | null
  previsao_parto: string | null
}

export interface EstacaoMonta {
  id: string
  nome: string
  data_inicio: string
  data_fim: string
}

/** Aviso (nunca bloqueio) quando o evento não combina com o status atual da fêmea. */
export function avisoDeStatus(tipo: TipoEvento, status: string | undefined): string {
  if (!status) return ''
  if ((tipo === 'Cobertura' || tipo === 'Inseminação') && status === 'Prenha') return 'Já consta como prenha'
  if (tipo === 'Aborto' && status !== 'Prenha' && status !== 'Coberta') return `Consta como ${status.toLowerCase()}, não como prenha ou coberta`
  return ''
}

/** Estação de monta que cobre a data (AAAA-MM-DD); se houver mais de uma, a que começou por último. */
export function estacaoDaData(estacoes: EstacaoMonta[], dataIso: string): EstacaoMonta | null {
  const dentro = estacoes.filter((e) => e.data_inicio <= dataIso && dataIso <= e.data_fim)
  if (dentro.length === 0) return null
  return dentro.sort((a, b) => b.data_inicio.localeCompare(a.data_inicio))[0]
}

/** Resumo do registro para lista e compartilhamento. */
export function resumirReproducao(r: Record<string, unknown>): string {
  const f = r as Partial<FormReproducao>
  const n = (f.linhas ?? []).length
  return `${f.tipo ?? 'Reprodução'}: ${n} ${n === 1 ? 'fêmea' : 'fêmeas'}`
}
