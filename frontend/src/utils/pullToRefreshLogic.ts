// Lógica pura do gesto de puxar para atualizar (testável sem DOM)

export const PTR_LIMIAR_PX = 60 // deslocamento visual (já com resistência)
export const PTR_MAX_PX = 100
const PTR_RESISTENCIA = 0.5

/** Converte o arrasto bruto em deslocamento visual, com resistência e teto. */
export function calcularDistanciaPuxada(deltaY: number): number {
  if (deltaY <= 0) return 0
  return Math.min(PTR_MAX_PX, deltaY * PTR_RESISTENCIA)
}

export function atingiuLimiar(distancia: number): boolean {
  return distancia >= PTR_LIMIAR_PX
}

export type MotivoRefresh = 'offline' | 'modo-teste' | 'sem-fazenda'

export interface EntradaDecisao {
  online: boolean
  testModeAtivo: boolean
  fazendaId: string | null | undefined
}

/** Decide se o refresh pode rodar; devolve o motivo do bloqueio quando não puder. */
export function motivoBloqueioRefresh(e: EntradaDecisao): MotivoRefresh | null {
  if (!e.fazendaId) return 'sem-fazenda'
  if (e.testModeAtivo) return 'modo-teste'
  if (!e.online) return 'offline'
  return null
}
