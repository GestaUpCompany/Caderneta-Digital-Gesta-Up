/**
 * Identificadores de animal (manejo, brinco, chip). O banco guarda e compara sem espaços nas pontas e em maiúsculas
 * (índices únicos normalizados), então a busca no aparelho precisa fazer o mesmo: "ab-12" é o animal "AB-12".
 */
export interface IdentificadoresDoAnimal {
  id_manejo?: string | null
  id_brinco?: string | null
  id_chip?: string | null
  /** ID provisório da cria (antes do brinco definitivo) */
  id_provisorio_cria?: string | null
}

export const normalizarIdentificador = (v?: string | null): string => (v ?? '').trim().toUpperCase()

export interface IdentificadoresDigitados {
  manejo?: string
  brinco?: string
  chip?: string
}

/**
 * Acha na lista o animal que tem algum dos identificadores digitados, em qualquer um dos três campos
 * (o peão pode digitar o brinco no campo do manejo) e no ID provisório da cria. Ignora caixa e espaços; valor vazio não casa com nada.
 */
export function acharPorIdentificador<T extends IdentificadoresDoAnimal>(
  lista: T[],
  digitados: IdentificadoresDigitados
): T | undefined {
  const procurados = [digitados.manejo, digitados.brinco, digitados.chip].map(normalizarIdentificador).filter(Boolean)
  if (procurados.length === 0) return undefined
  return lista.find((a) => {
    const meus = [a.id_manejo, a.id_brinco, a.id_chip, a.id_provisorio_cria].map(normalizarIdentificador)
    return procurados.some((p) => meus.includes(p))
  })
}

export interface IdentificadorEmUso extends IdentificadoresDoAnimal {
  id: string
  status: string
}

export interface ConflitoComAnimalBaixado {
  campo: 'manejo' | 'brinco' | 'chip'
  valor: string
  status: string
}

/**
 * Identificador digitado que já pertence a um animal que não está mais Vivo (morto, vendido, abatido...). O banco não
 * libera o número quando o animal sai (a unicidade vale para qualquer animal não excluído), então o registro de um
 * animal novo com esse número seria recusado na sincronização. Compara campo a campo, como o banco.
 */
export function acharConflitoComAnimalBaixado(
  baixados: IdentificadorEmUso[],
  digitados: IdentificadoresDigitados
): ConflitoComAnimalBaixado | undefined {
  const campos: { campo: ConflitoComAnimalBaixado['campo']; chave: keyof IdentificadoresDoAnimal; valor?: string }[] = [
    { campo: 'manejo', chave: 'id_manejo', valor: digitados.manejo },
    { campo: 'brinco', chave: 'id_brinco', valor: digitados.brinco },
    { campo: 'chip', chave: 'id_chip', valor: digitados.chip },
  ]
  for (const c of campos) {
    const alvo = normalizarIdentificador(c.valor)
    if (!alvo) continue
    const achado = baixados.find((a) => normalizarIdentificador(a[c.chave]) === alvo)
    if (achado) return { campo: c.campo, valor: (c.valor ?? '').trim(), status: achado.status }
  }
  return undefined
}

export interface AnimalDaLista extends IdentificadoresDoAnimal {
  id: string
}

/** Junta as listas sem repetir animal (pelo id); a primeira lista tem prioridade, as demais só acrescentam. */
export function mesclarAnimais<T extends AnimalDaLista>(...listas: T[][]): T[] {
  const vistos = new Set<string>()
  const resultado: T[] = []
  for (const lista of listas) {
    for (const animal of lista) {
      if (vistos.has(animal.id)) continue
      vistos.add(animal.id)
      resultado.push(animal)
    }
  }
  return resultado
}
