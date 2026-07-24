import { store } from '../store/store'
import { setConfig } from '../store/slices/configSlice'

/**
 * Atualiza persistentemente o nome do usuário nas configurações do app
 * quando o usuário seleciona seu nome em um searchable modal de uma caderneta.
 * Garante que lançamentos futuros (inclusive em telas sem modal) usem esse nome.
 */
export function atualizarNomeUsuarioConfig(nome: string): void {
  const nomeTrim = (nome || '').trim()
  if (!nomeTrim) return
  const configAtual = store.getState().config
  // Só despacha se o nome for diferente do atual
  if (configAtual.usuario !== nomeTrim) {
    store.dispatch(setConfig({ usuario: nomeTrim }))
  }
}
