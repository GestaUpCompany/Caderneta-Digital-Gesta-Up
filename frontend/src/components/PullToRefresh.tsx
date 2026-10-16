import { useEffect, useRef, useState } from 'react'
import { executarRefresh } from '../services/refreshService'
import {
  calcularDistanciaPuxada,
  atingiuLimiar,
  PTR_LIMIAR_PX,
  type MotivoRefresh,
} from '../utils/pullToRefreshLogic'
import { formularioSujo, ehRotaFormulario } from '../utils/formularioSujo'

type Fase = 'ocioso' | 'puxando' | 'atualizando'

const MENSAGENS_BLOQUEIO: Record<MotivoRefresh, string> = {
  offline: 'Sem conexão. Os dados continuam salvos no aparelho.',
  'modo-teste': 'Modo teste ativo: atualização pausada.',
  'sem-fazenda': 'Fazenda não configurada.',
}

/** O toque começou num lugar onde o gesto não deve valer (modal, campo, área com scroll próprio). */
function toqueIgnorado(alvo: EventTarget | null): boolean {
  let el = alvo instanceof HTMLElement ? alvo : null
  while (el && el !== document.body) {
    if (el.dataset?.noPtr !== undefined || el.getAttribute('role') === 'dialog') return true
    const tag = el.tagName
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true
    const estilo = getComputedStyle(el)
    if (estilo.position === 'fixed') return true // modais e overlays
    const rolavel = /(auto|scroll)/.test(estilo.overflowY) && el.scrollHeight > el.clientHeight
    if (rolavel) return true
    el = el.parentElement
  }
  return false
}

/**
 * Puxar para atualizar global. Montado uma vez no App; cobre todas as telas
 * (a window é o elemento de scroll em todas elas).
 */
export default function PullToRefresh() {
  const [fase, setFase] = useState<Fase>('ocioso')
  const [distancia, setDistancia] = useState(0)
  const [aviso, setAviso] = useState<string | null>(null)
  const faseRef = useRef<Fase>('ocioso')
  const avisoTimer = useRef<ReturnType<typeof setTimeout>>()

  const mudarFase = (f: Fase) => {
    faseRef.current = f
    setFase(f)
  }

  useEffect(() => {
    let inicioY = 0
    let ativo = false
    let distanciaAtual = 0

    const mostrarAviso = (msg: string) => {
      setAviso(msg)
      clearTimeout(avisoTimer.current)
      avisoTimer.current = setTimeout(() => setAviso(null), 2500)
    }

    const onStart = (e: TouchEvent) => {
      if (faseRef.current === 'atualizando' || e.touches.length !== 1) return
      if (window.scrollY > 0 || toqueIgnorado(e.target)) return
      inicioY = e.touches[0].clientY
      ativo = true
      distanciaAtual = 0
    }

    const onMove = (e: TouchEvent) => {
      if (!ativo) return
      if (window.scrollY > 0) {
        ativo = false
        mudarFase('ocioso')
        setDistancia(0)
        return
      }
      const delta = e.touches[0].clientY - inicioY
      if (delta <= 0) return
      // Impede o pull-to-refresh nativo do navegador enquanto o gesto é nosso
      if (e.cancelable) e.preventDefault()
      distanciaAtual = calcularDistanciaPuxada(delta)
      setDistancia(distanciaAtual)
      if (faseRef.current !== 'puxando') mudarFase('puxando')
    }

    const onEnd = async () => {
      if (!ativo) return
      ativo = false
      if (!atingiuLimiar(distanciaAtual)) {
        mudarFase('ocioso')
        setDistancia(0)
        return
      }
      mudarFase('atualizando')
      setDistancia(PTR_LIMIAR_PX)
      try {
        const r = await executarRefresh()
        if (!r.ok && r.motivo) mostrarAviso(MENSAGENS_BLOQUEIO[r.motivo])
        else if (ehRotaFormulario(window.location.pathname) && formularioSujo())
          mostrarAviso('Cadastros atualizados. Salve ou limpe o formulário para ver os dados novos nesta tela.')
        else if (r.pendentes > 0) mostrarAviso(`Atualizado. ${r.pendentes} registro(s) ainda aguardando envio.`)
        else mostrarAviso('Atualizado')
      } catch {
        mostrarAviso('Não foi possível atualizar agora.')
      } finally {
        mudarFase('ocioso')
        setDistancia(0)
      }
    }

    document.addEventListener('touchstart', onStart, { passive: true })
    document.addEventListener('touchmove', onMove, { passive: false })
    document.addEventListener('touchend', onEnd)
    document.addEventListener('touchcancel', onEnd)
    return () => {
      document.removeEventListener('touchstart', onStart)
      document.removeEventListener('touchmove', onMove)
      document.removeEventListener('touchend', onEnd)
      document.removeEventListener('touchcancel', onEnd)
      clearTimeout(avisoTimer.current)
    }
  }, [])

  const pronto = atingiuLimiar(distancia)
  const visivel = fase !== 'ocioso' && distancia > 0

  return (
    <>
      <div
        aria-hidden={!visivel}
        className="pointer-events-none fixed inset-x-0 top-0 z-40 flex justify-center"
        style={{
          transform: `translateY(${visivel ? distancia - 40 : -48}px)`,
          transition: fase === 'puxando' ? 'none' : 'transform 200ms ease',
        }}
      >
        <div className="mt-2 flex h-9 items-center gap-2 rounded-full bg-white px-4 text-sm font-medium text-green-800 shadow-md">
          <span
            className={`inline-block h-4 w-4 rounded-full border-2 border-green-700 border-t-transparent ${
              fase === 'atualizando' ? 'animate-spin' : ''
            }`}
            style={fase === 'puxando' ? { transform: `rotate(${distancia * 4}deg)` } : undefined}
          />
          {fase === 'atualizando' ? 'Atualizando...' : pronto ? 'Solte para atualizar' : 'Puxe para atualizar'}
        </div>
      </div>
      {aviso && (
        <div
          role="status"
          className="pointer-events-none fixed inset-x-0 top-2 z-40 flex justify-center px-4"
        >
          <div className="rounded-full bg-gray-900/90 px-4 py-2 text-sm text-white shadow-md">{aviso}</div>
        </div>
      )}
    </>
  )
}
