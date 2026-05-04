/**
 * Sistema de eventos simples para comunicação entre componentes
 * Usado para notificar quando o cache de cadastro é atualizado
 */

type EventCallback = (data?: any) => void

class EventBus {
  private events: Record<string, EventCallback[]> = {}

  on(event: string, callback: EventCallback): () => void {
    if (!this.events[event]) {
      this.events[event] = []
    }
    this.events[event].push(callback)

    // Retorna função para remover listener
    return () => {
      this.off(event, callback)
    }
  }

  off(event: string, callback: EventCallback): void {
    if (!this.events[event]) return
    this.events[event] = this.events[event].filter(cb => cb !== callback)
  }

  emit(event: string, data?: any): void {
    if (!this.events[event]) return
    this.events[event].forEach(callback => callback(data))
  }
}

// Singleton
export const eventBus = new EventBus()

// Eventos disponíveis
export const CADASTRO_CACHE_UPDATED = 'cadastro_cache_updated'
