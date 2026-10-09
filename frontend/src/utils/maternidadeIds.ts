/**
 * Identificação dos animais de um parto (mãe, mães adotivas e crias).
 *
 * O banco tem índice único por fazenda para brinco, chip e manejo em `individuos`. Uma cria com o mesmo brinco
 * (ou chip) da mãe, da mãe adotiva ou da outra cria faz o servidor recusar o registro inteiro (23505) e o parto
 * nunca chega ao banco. Aqui o problema é barrado antes de salvar, com a mensagem apontando o campo.
 */

export interface ConflitoId {
  field: string
  message: string
}

export interface OpcoesConflito {
  /** 1ª cria viva (tem identificação) */
  cria1Viva: boolean
  /** 2ª cria viva (gêmeos) */
  cria2Viva: boolean
  guacho1: boolean
  guacho2: boolean
}

const norm = (v: unknown): string => String(v ?? '').trim().toLowerCase()

/** Dois valores contam como o mesmo ID quando ambos têm texto e são iguais sem diferenciar caixa/espaços. */
export const mesmoId = (a: unknown, b: unknown): boolean => {
  const x = norm(a)
  return x !== '' && x === norm(b)
}

type Campos = Record<string, unknown>

/**
 * Compara as identificações dentro do próprio formulário. Campos lidos (todos opcionais):
 * idBrincoCria/idChipCria, idBrincoCria2/idChipCria2, idBrincoMae/idChipMae,
 * idBrincoMaeAdotiva/idChipMaeAdotiva e idBrincoMaeAdotiva2/idChipMaeAdotiva2.
 */
export function conflitosDeIdentificacao(f: Campos, op: OpcoesConflito): ConflitoId[] {
  const erros: ConflitoId[] = []

  const crias = [
    { sfx: '', viva: op.cria1Viva, nome: 'da cria', brinco: f.idBrincoCria, chip: f.idChipCria },
    { sfx: '2', viva: op.cria2Viva, nome: 'da 2ª cria', brinco: f.idBrincoCria2, chip: f.idChipCria2 },
  ]
  const outros = [
    { nome: 'da mãe', brinco: f.idBrincoMae, chip: f.idChipMae, ativo: true },
    { nome: 'da mãe adotiva', brinco: f.idBrincoMaeAdotiva, chip: f.idChipMaeAdotiva, ativo: op.guacho1 },
    { nome: 'da mãe adotiva da 2ª cria', brinco: f.idBrincoMaeAdotiva2, chip: f.idChipMaeAdotiva2, ativo: op.guacho2 },
  ]

  for (const cria of crias) {
    if (!cria.viva) continue
    for (const outro of outros) {
      if (!outro.ativo) continue
      if (mesmoId(cria.brinco, outro.brinco))
        erros.push({ field: `idBrincoCria${cria.sfx}`, message: `O brinco ${cria.nome} não pode ser igual ao brinco ${outro.nome}` })
      if (mesmoId(cria.chip, outro.chip))
        erros.push({ field: `idChipCria${cria.sfx}`, message: `O chip ${cria.nome} não pode ser igual ao chip ${outro.nome}` })
    }
  }

  if (op.cria1Viva && op.cria2Viva) {
    if (mesmoId(f.idBrincoCria, f.idBrincoCria2))
      erros.push({ field: 'idBrincoCria2', message: 'O brinco da 2ª cria não pode ser igual ao da 1ª cria' })
    if (mesmoId(f.idChipCria, f.idChipCria2))
      erros.push({ field: 'idChipCria2', message: 'O chip da 2ª cria não pode ser igual ao da 1ª cria' })
  }

  return erros
}

export interface AnimalConhecido {
  id?: string | null
  id_brinco?: string | null
  id_chip?: string | null
}

/**
 * Cria cujo brinco/chip já pertence a outro animal conhecido neste aparelho (lista de indivíduos do cache).
 * É uma checagem de melhor esforço: o cache pode não ter todos os animais, e o banco continua sendo a garantia.
 */
export function conflitosComRebanho(
  f: Campos,
  op: Pick<OpcoesConflito, 'cria1Viva' | 'cria2Viva'>,
  rebanho: AnimalConhecido[]
): ConflitoId[] {
  const erros: ConflitoId[] = []
  const crias = [
    { sfx: '', viva: op.cria1Viva, nome: 'da cria', brinco: f.idBrincoCria, chip: f.idChipCria },
    { sfx: '2', viva: op.cria2Viva, nome: 'da 2ª cria', brinco: f.idBrincoCria2, chip: f.idChipCria2 },
  ]
  for (const cria of crias) {
    if (!cria.viva) continue
    if (norm(cria.brinco) && rebanho.some((a) => mesmoId(a.id_brinco, cria.brinco)))
      erros.push({ field: `idBrincoCria${cria.sfx}`, message: `Já existe um animal com o brinco ${String(cria.brinco).trim()} nesta fazenda` })
    if (norm(cria.chip) && rebanho.some((a) => mesmoId(a.id_chip, cria.chip)))
      erros.push({ field: `idChipCria${cria.sfx}`, message: `Já existe um animal com o chip ${String(cria.chip).trim()} nesta fazenda` })
  }
  return erros
}
