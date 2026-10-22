import { store } from '../store/store'
import { getRegistro, getAllRegistros, updateRegistro } from './indexedDB'
import { enqueueRegistro } from './syncService'
import { reescalarInsumos } from '../utils/reescalarInsumos'
import { normalizarNumero } from '../utils/formatNumber'

/**
 * Corrige o total carregado (totalProduzido) de uma produção do vagão e reescala
 * os insumos na mesma proporção. Tudo vai ao IndexedDB como 'pending' e entra na
 * syncQueue como 'update'; o trigger do banco ajusta a baixa de estoque.
 */
export async function editarTotalFabrica(registroId: string, novoTotal: number): Promise<void> {
  if (!Number.isFinite(novoTotal) || novoTotal <= 0) {
    throw new Error('Informe um total maior que zero.')
  }

  const pai = await getRegistro('fabrica-confinamento', registroId)
  if (!pai) throw new Error('Registro não encontrado no dispositivo.')

  // Modo teste: registros reais não podem ser tocados
  if (store.getState().config.testModeAtivo && pai.isTestRecord !== true) {
    throw new Error('Modo teste ativo: não é possível editar registros reais.')
  }

  const totalAntigo = normalizarNumero(pai.totalProduzido as string | number) ?? 0
  const filhos = (await getAllRegistros('fabrica-confinamento-insumos')).filter(
    (f) => f.deletedAt !== true && (f.registroId === pai.id || (pai.supabaseId && f.registroId === pai.supabaseId))
  )

  const novosKg = reescalarInsumos(
    filhos.map((f) => normalizarNumero(f.kgProduzido as string | number) ?? 0),
    totalAntigo,
    novoTotal
  )

  const agora = new Date().toISOString()
  const naoEnfileirar = pai.isTestRecord === true

  await updateRegistro('fabrica-confinamento', pai.id, {
    totalProduzido: novoTotal,
    syncStatus: 'pending',
    lastModified: agora,
  })
  if (!naoEnfileirar) await enqueueRegistro('fabrica-confinamento', pai.id, pai.supabaseId ? 'update' : 'create')

  for (let i = 0; i < filhos.length; i++) {
    if (novosKg[i] === normalizarNumero(filhos[i].kgProduzido as string | number)) continue
    await updateRegistro('fabrica-confinamento-insumos', filhos[i].id, {
      kgProduzido: novosKg[i],
      syncStatus: 'pending',
      lastModified: agora,
    })
    if (!naoEnfileirar) {
      await enqueueRegistro('fabrica-confinamento-insumos', filhos[i].id, filhos[i].supabaseId ? 'update' : 'create')
    }
  }
}
