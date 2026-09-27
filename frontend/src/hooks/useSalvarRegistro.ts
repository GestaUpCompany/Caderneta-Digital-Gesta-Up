import { useState, useCallback, useRef } from 'react'
import { useRegistroComExecucao } from './useRegistroComExecucao'

/**
 * Hook que encapsula o fluxo de salvamento de registros com:
 * - Guard síncrono por useRef (bloqueia duplo click antes do re-render)
 * - Integração com useRegistroComExecucao (modal de observação de atraso)
 * - Estado `salvando` para desabilitar/mostrar loading no botão
 *
 * O guard por ref é a proteção principal contra race condition:
 * dois clicks rápidos disparam handleSalvar duas vezes antes do
 * setSalvando(true) propagar e desabilitar o botão. O ref é
 * verificado e setado sincronamente na primeira linha, bloqueando
 * a segunda chamada no mesmo tick do event loop.
 *
 * O salvando (useState) permanece true enquanto o modal de atraso
 * está aberto, impedindo que o usuário clique SALVAR de novo e
 * dispare um segundo executarSalvamento em paralelo.
 */
export function useSalvarRegistro(cadernetaId: string) {
  const [salvando, setSalvando] = useState(false)
  const salvandoRef = useRef(false)
  const executarRef = useRef<(() => Promise<void>) | null>(null)

  const {
    showObservacaoModal,
    horariosModal,
    iniciarSalvamento,
    confirmarObservacao,
    cancelarObservacao,
  } = useRegistroComExecucao(cadernetaId)

  const salvar = useCallback(async (executar: () => Promise<void>) => {
    if (salvandoRef.current) return
    salvandoRef.current = true
    setSalvando(true)

    // Telemetria de execução nunca pode bloquear o registro: se
    // iniciarSalvamento falhar (ex.: sync de execução offline), segue
    // direto para o executar em vez de travar o guard.
    let podeContinuar = true
    try {
      podeContinuar = await iniciarSalvamento()
    } catch (err) {
      console.warn('[useSalvarRegistro] iniciarSalvamento falhou, seguindo com o salvamento:', err)
    }
    if (!podeContinuar) {
      // Modal de atraso abriu. Mantém ref=true e salvando=true
      // para bloquear novo click enquanto o modal está aberto.
      // Guarda executar para rodar quando o usuário confirmar.
      executarRef.current = executar
      return
    }

    try {
      await executar()
    } finally {
      salvandoRef.current = false
      setSalvando(false)
    }
  }, [iniciarSalvamento])

  const onConfirmarObservacao = useCallback(async (observacao: string) => {
    try {
      await confirmarObservacao(observacao)
    } catch (err) {
      console.warn('[useSalvarRegistro] confirmarObservacao falhou, seguindo com o salvamento:', err)
    }
    const executar = executarRef.current
    executarRef.current = null
    if (executar) {
      try {
        await executar()
      } finally {
        salvandoRef.current = false
        setSalvando(false)
      }
    } else {
      salvandoRef.current = false
      setSalvando(false)
    }
  }, [confirmarObservacao])

  const onCancelarObservacao = useCallback(() => {
    cancelarObservacao()
    executarRef.current = null
    salvandoRef.current = false
    setSalvando(false)
  }, [cancelarObservacao])

  return {
    salvando,
    salvar,
    showObservacaoModal,
    horariosModal,
    onConfirmarObservacao,
    onCancelarObservacao,
  }
}
