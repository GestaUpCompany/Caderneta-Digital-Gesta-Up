import { store } from '../store/store'
import { getRegistro, getAllRegistros, updateRegistro } from './indexedDB'
import { enqueueRegistro } from './syncService'
import { getInsumosByFormulacaoFromCacheOnly } from './cadastroCache'
import { distribuirNoInsumo } from '../utils/reescalarInsumos'
import { normalizarNumero } from '../utils/formatNumber'
import type { Registro } from '../types/cadernetas'

export interface InsumoCarregado {
  insumoId: string
  nome: string
  kg: number
}

const num = (v: unknown): number => normalizarNumero(v as string | number | null | undefined) ?? 0
const arredonda2 = (v: number): number => Math.round(v * 100) / 100

// Linhas de insumo do registro: o filho aponta para o id local do pai ou, depois do sync, para o supabaseId
async function filhosDoRegistro(pai: Registro): Promise<Registro[]> {
  const todos = await getAllRegistros('fabrica-confinamento-insumos')
  return todos.filter(
    (f) => f.deletedAt !== true && (f.registroId === pai.id || (!!pai.supabaseId && f.registroId === pai.supabaseId))
  )
}

/** Kg carregado por insumo (soma das cargas do trato), na ordem de carregar. */
export async function listarInsumosCarregados(registroId: string): Promise<InsumoCarregado[]> {
  const pai = await getRegistro('fabrica-confinamento', registroId)
  if (!pai) return []

  const filhos = await filhosDoRegistro(pai)
  const formulados = pai.formulacaoId ? await getInsumosByFormulacaoFromCacheOnly(pai.formulacaoId as string) : []
  const nomePorId = new Map<string, string>(formulados.map((i: any) => [i.insumo_id, i.nome]))

  const grupos = new Map<string, { kg: number; ordem: number }>()
  for (const f of filhos) {
    const id = f.insumoId as string
    const atual = grupos.get(id) ?? { kg: 0, ordem: num(f.ordem) }
    atual.kg += num(f.kgProduzido)
    atual.ordem = Math.min(atual.ordem, num(f.ordem))
    grupos.set(id, atual)
  }

  return [...grupos.entries()]
    .sort((a, b) => a[1].ordem - b[1].ordem)
    .map(([insumoId, g], i) => ({ insumoId, nome: nomePorId.get(insumoId) ?? `Insumo ${i + 1}`, kg: arredonda2(g.kg) }))
}

/**
 * Corrige o kg carregado por insumo de uma produção do vagão. O total do registro (o que o vagão carregou)
 * acompanha a variação dos insumos editados, preservando qualquer diferença que já havia entre total e soma.
 * Tudo vai ao IndexedDB como 'pending' e entra na syncQueue; o trigger do banco ajusta a baixa de estoque.
 */
export async function editarInsumosFabrica(registroId: string, novosKg: Record<string, number>): Promise<void> {
  if (Object.values(novosKg).some((kg) => !Number.isFinite(kg) || kg < 0)) {
    throw new Error('Os kg dos insumos não podem ser negativos.')
  }

  const pai = await getRegistro('fabrica-confinamento', registroId)
  if (!pai) throw new Error('Registro não encontrado no dispositivo.')

  // Modo teste: registros reais não podem ser tocados
  if (store.getState().config.testModeAtivo && pai.isTestRecord !== true) {
    throw new Error('Modo teste ativo: não é possível editar registros reais.')
  }

  const antes = await listarInsumosCarregados(registroId)
  const filhos = await filhosDoRegistro(pai)
  const agora = new Date().toISOString()
  const enfileirar = pai.isTestRecord !== true

  // Valida o total antes de gravar qualquer linha, para não deixar edição pela metade
  const variacao = antes.reduce((acc, i) => {
    const novoKg = novosKg[i.insumoId]
    return novoKg === undefined ? acc : acc + (arredonda2(novoKg) - i.kg)
  }, 0)
  const novoTotal = arredonda2(num(pai.totalProduzido) + variacao)
  if (novoTotal <= 0) throw new Error('O total carregado precisa ser maior que zero.')

  for (const insumo of antes) {
    const novoKg = novosKg[insumo.insumoId]
    if (novoKg === undefined || arredonda2(novoKg) === insumo.kg) continue

    const linhas = filhos.filter((f) => f.insumoId === insumo.insumoId)
    const kgNovos = distribuirNoInsumo(linhas.map((l) => num(l.kgProduzido)), novoKg)
    for (let i = 0; i < linhas.length; i++) {
      if (kgNovos[i] === num(linhas[i].kgProduzido)) continue
      await updateRegistro('fabrica-confinamento-insumos', linhas[i].id, {
        kgProduzido: kgNovos[i],
        syncStatus: 'pending',
        lastModified: agora,
      })
      if (enfileirar) {
        await enqueueRegistro('fabrica-confinamento-insumos', linhas[i].id, linhas[i].supabaseId ? 'update' : 'create')
      }
    }
  }

  // Resumo por insumo do texto compartilhável acompanha os novos kg
  const resumo = Array.isArray(pai.insumosResumo)
    ? (pai.insumosResumo as { nome: string; previsto: number; produzido: number }[]).map((r) => {
        const alvo = antes.find((i) => i.nome === r.nome)
        const kg = alvo ? novosKg[alvo.insumoId] : undefined
        return kg === undefined ? r : { ...r, produzido: arredonda2(kg) }
      })
    : pai.insumosResumo

  await updateRegistro('fabrica-confinamento', pai.id, {
    totalProduzido: novoTotal,
    insumosResumo: resumo,
    syncStatus: 'pending',
    lastModified: agora,
  })
  if (enfileirar) await enqueueRegistro('fabrica-confinamento', pai.id, pai.supabaseId ? 'update' : 'create')
}
