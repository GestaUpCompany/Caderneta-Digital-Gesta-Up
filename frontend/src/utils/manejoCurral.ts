/**
 * Manejo de curral: sessão em que vários animais são identificados (provisório → brinco/chip definitivo, ou troca)
 * e designados a um lote de destino. Nada aqui altera contagem ou peso de lote: o servidor (RPC aplicar_manejo_curral)
 * atualiza a identificação e transforma a mudança de lote em pendência para o gestor confirmar.
 */
export type MotivoTroca = '' | 'definitivo' | 'perdido' | 'trocado'

export interface LinhaManejo {
  uid: string
  /** animal já cadastrado (id do servidor ou criado offline); vazio = o servidor procura pelo identificador lido */
  individuoId: string | null
  /** o que o peão digitou/leu para achar o animal (manejo, brinco, chip ou ID provisório) */
  identificadorLido: string
  /** campos digitados no seletor de animal (só da tela; o servidor recebe identificadorLido) */
  lidoManejo: string
  lidoBrinco: string
  lidoChip: string
  /** ID provisório do animal encontrado, guardado para o histórico da troca */
  idProvisorioAnterior: string
  idBrincoNovo: string
  idChipNovo: string
  idManejoNovo: string
  motivoTroca: MotivoTroca
  /** peso do animal no manejo; fica só na linha, nunca alimenta o peso do lote */
  pesoKg: string
  loteDestinoId: string
  loteDestinoNome: string
  /** só para animal novo (sem individuoId) */
  sexo: '' | 'Macho' | 'Fêmea'
  categoria: string
  raca: string
  observacao: string
}

export function novaLinha(uid: string): LinhaManejo {
  return {
    uid,
    individuoId: null,
    identificadorLido: '',
    lidoManejo: '',
    lidoBrinco: '',
    lidoChip: '',
    idProvisorioAnterior: '',
    idBrincoNovo: '',
    idChipNovo: '',
    idManejoNovo: '',
    motivoTroca: '',
    pesoKg: '',
    loteDestinoId: '',
    loteDestinoNome: '',
    sexo: '',
    categoria: '',
    raca: '',
    observacao: '',
  }
}

const preenchido = (v: string | null | undefined) => !!v && v.trim() !== ''

/** Linha sem nenhuma informação útil (nem animal, nem identificação nova, nem lote, nem peso). */
export function linhaVazia(l: LinhaManejo): boolean {
  return !(
    l.individuoId ||
    preenchido(l.identificadorLido) ||
    preenchido(l.idBrincoNovo) ||
    preenchido(l.idChipNovo) ||
    preenchido(l.idManejoNovo) ||
    preenchido(l.loteDestinoId) ||
    preenchido(l.pesoKg)
  )
}

/** Animal que não foi encontrado: o servidor cadastra um novo, e para isso precisa destes dados. */
export function faltaParaAnimalNovo(l: LinhaManejo): string[] {
  if (l.individuoId) return []
  const faltas: string[] = []
  if (!preenchido(l.idBrincoNovo) && !preenchido(l.idChipNovo) && !preenchido(l.idManejoNovo) && !preenchido(l.identificadorLido)) {
    faltas.push('identificação')
  }
  if (!l.loteDestinoId) faltas.push('lote')
  if (!l.categoria) faltas.push('categoria')
  if (!l.sexo) faltas.push('sexo')
  if (!preenchido(l.raca)) faltas.push('raça')
  return faltas
}

export function resumirLinha(l: LinhaManejo): string {
  const partes: string[] = []
  partes.push(l.identificadorLido || l.idProvisorioAnterior || l.idBrincoNovo || l.idChipNovo || l.idManejoNovo || 'Animal sem ID')
  const novos = [l.idBrincoNovo && `brinco ${l.idBrincoNovo}`, l.idChipNovo && `chip ${l.idChipNovo}`, l.idManejoNovo && `manejo ${l.idManejoNovo}`].filter(Boolean)
  if (novos.length) partes.push(`→ ${novos.join(', ')}`)
  if (l.loteDestinoNome) partes.push(`· lote ${l.loteDestinoNome}`)
  if (preenchido(l.pesoKg)) partes.push(`· ${l.pesoKg} kg`)
  return partes.join(' ')
}

const texto = (v: string | null | undefined): string | null => (preenchido(v) ? (v as string).trim() : null)

/** Converte "DD/MM/AAAA" (ou "DD/MM/AAAA HH:MM") em "AAAA-MM-DD"; null se inválida. */
export function dataBRparaIso(dataBR: string | null | undefined): string | null {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})/.exec(dataBR ?? '')
  return m ? `${m[3]}-${m[2]}-${m[1]}` : null
}

const numero = (v: string): number | null => {
  const n = Number(String(v ?? '').trim().replace(',', '.'))
  return Number.isFinite(n) && n > 0 ? n : null
}

/** Linhas no formato da tabela registros_manejo_curral (sem os campos de processamento, que são do servidor). */
export function linhasParaServidor(
  linhas: LinhaManejo[],
  sessaoId: string,
  fazendaId: string
): Record<string, unknown>[] {
  return linhas
    .filter((l) => !linhaVazia(l))
    .map((l, i) => ({
      id: l.uid,
      local_id: l.uid,
      fazenda_id: fazendaId,
      sessao_id: sessaoId,
      ordem: i + 1,
      individuo_id: l.individuoId || null,
      identificador_lido: texto(l.identificadorLido),
      id_provisorio_anterior: texto(l.idProvisorioAnterior),
      id_brinco_novo: texto(l.idBrincoNovo),
      id_chip_novo: texto(l.idChipNovo),
      id_manejo_novo: texto(l.idManejoNovo),
      motivo_troca: l.motivoTroca || null,
      peso_kg: numero(l.pesoKg),
      lote_destino_id: l.loteDestinoId || null,
      sexo: l.individuoId ? null : texto(l.sexo),
      categoria: l.individuoId ? null : texto(l.categoria),
      raca: l.individuoId ? null : texto(l.raca),
      observacao: texto(l.observacao),
    }))
}
