import type { AnimalDaLista } from './identificadores'

export interface AnimalPendente extends AnimalDaLista {
  id_provisorio_cria: string | null
  sexo: string
  raca: string
  categoria: string
  classificacao_matriz: string | null
  numero_partos: number | null
  status: string
  data_nascimento: string | null
  lote_atual: string | null
  idade_era: string | null
  id_manejo: string | null
  id_brinco: string | null
  id_chip: string | null
}

const texto = (v: unknown): string | null => (typeof v === 'string' && v.trim() !== '' ? v : null)

/**
 * Animais que um registro ainda não sincronizado vai criar (`novosIndividuos` da maternidade: mãe, mãe adotiva e crias).
 * Entram na lista de busca para que um segundo registro offline encontre o mesmo animal em vez de cadastrá-lo de novo.
 * Só da fazenda informada, só Vivos, sem repetir o id.
 */
export function extrairAnimaisPendentes(registros: unknown[], fazendaId: string): AnimalPendente[] {
  const vistos = new Set<string>()
  const animais: AnimalPendente[] = []
  for (const registro of registros) {
    const novos = (registro as { novosIndividuos?: unknown[] } | null)?.novosIndividuos
    if (!Array.isArray(novos)) continue
    for (const bruto of novos) {
      const n = bruto as Record<string, unknown> | null
      const id = texto(n?.id)
      if (!n || !id || vistos.has(id)) continue
      if (n.fazenda_id && n.fazenda_id !== fazendaId) continue
      if (n.status && n.status !== 'Vivo') continue
      vistos.add(id)
      animais.push({
        id,
        id_manejo: texto(n.id_manejo),
        id_brinco: texto(n.id_brinco),
        id_chip: texto(n.id_chip),
        id_provisorio_cria: texto(n.id_provisorio_cria),
        sexo: texto(n.sexo) ?? '',
        raca: texto(n.raca) ?? '',
        categoria: texto(n.categoria) ?? '',
        classificacao_matriz: texto(n.classificacao_matriz),
        numero_partos: typeof n.numero_partos === 'number' ? n.numero_partos : null,
        status: 'Vivo',
        data_nascimento: texto(n.data_nascimento),
        lote_atual: texto(n.lote_atual),
        idade_era: texto(n.idade_era),
      })
    }
  }
  return animais
}
