/**
 * Tratamento/vacina na sessão de manejo de curral: um produto opcional, igual para todos os animais da sessão, com
 * exceção por linha ("não recebeu"). Só registra: o servidor (aplicar_manejo_curral) grava uma aplicação sanitária por
 * animal e não mexe em contagem nem peso. Reaproveita a validação e a conversão da Sanidade para não divergir dela.
 */
import { aplicarMedicamentoNoForm, errosSanidade, formVazioSanidade, sanidadeParaServidor, type FormSanidade, type MedicamentoCatalogo, type TipoAplicacao } from './sanidade'

export interface TratamentoSessao {
  tipo: TipoAplicacao
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
}

export function tratamentoVazio(): TratamentoSessao {
  return {
    tipo: 'Vacinação',
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
  }
}

/** A sessão tem tratamento quando há produto informado. */
export function temTratamento(t: TratamentoSessao | null | undefined): boolean {
  return !!t && String(t.medicamentoNome ?? '').trim() !== ''
}

// A validação da Sanidade exige alvo e animal; aqui só interessam os campos do produto.
const comoSanidade = (t: TratamentoSessao, dataBR: string): FormSanidade => ({
  ...formVazioSanidade(dataBR),
  alvo: 'animal',
  individuoId: 'sessao',
  tipo: t.tipo,
  medicamentoId: t.medicamentoId,
  medicamentoNome: t.medicamentoNome,
  principioAtivo: t.principioAtivo,
  dose: t.dose,
  via: t.via,
  loteProduto: t.loteProduto,
  validadeProduto: t.validadeProduto,
  carenciaDias: t.carenciaDias,
  intervaloDias: t.intervaloDias,
  diagnostico: t.diagnostico,
})

/** Erros do tratamento (vazio se a sessão não tem tratamento). `dataBR` é a data da sessão. */
export function errosTratamento(t: TratamentoSessao | null | undefined, dataBR: string): { field: string; message: string }[] {
  if (!t || !temTratamento(t)) return []
  return errosSanidade(comoSanidade(t, dataBR), dataBR).filter((e) => e.field !== 'data')
}

export function aplicarMedicamentoNoTratamento(t: TratamentoSessao, med: MedicamentoCatalogo | null): TratamentoSessao {
  const f = aplicarMedicamentoNoForm(comoSanidade(t, ''), med)
  return {
    ...t,
    medicamentoId: f.medicamentoId,
    medicamentoNome: f.medicamentoNome,
    principioAtivo: f.principioAtivo,
    dose: f.dose,
    carenciaDias: f.carenciaDias,
    intervaloDias: f.intervaloDias,
  }
}

/** Colunas tratamento_* de sessoes_manejo_curral. Sem tratamento, tudo nulo. */
export function tratamentoParaServidor(t: TratamentoSessao | null | undefined, dataBR: string) {
  if (!t || !temTratamento(t)) {
    return {
      tratamento_tipo: null,
      tratamento_medicamento_id: null,
      tratamento_produto_nome: null,
      tratamento_principio_ativo: null,
      tratamento_dose: null,
      tratamento_via: null,
      tratamento_lote_produto: null,
      tratamento_validade: null,
      tratamento_carencia_dias: null,
      tratamento_intervalo_dias: null,
      tratamento_diagnostico: null,
    }
  }
  const p = sanidadeParaServidor(comoSanidade(t, dataBR) as unknown as Record<string, unknown>)
  return {
    tratamento_tipo: p.tipo,
    tratamento_medicamento_id: p.medicamento_id,
    tratamento_produto_nome: p.medicamento_nome,
    tratamento_principio_ativo: p.principio_ativo,
    tratamento_dose: p.dose_aplicada,
    tratamento_via: p.via_aplicacao,
    tratamento_lote_produto: p.lote_produto,
    tratamento_validade: p.validade_produto,
    tratamento_carencia_dias: p.carencia_abate_dias,
    tratamento_intervalo_dias: p.intervalo_reaplicacao_dias,
    tratamento_diagnostico: p.diagnostico,
  }
}

/** Quantos animais da lista recebem o tratamento (os marcados "não recebeu" ficam de fora). */
export function contarTratados(linhas: { semTratamento?: boolean }[]): number {
  return linhas.filter((l) => !l.semTratamento).length
}
