const RECENT_CADERNETAS_KEY = 'recentCadernetas'

export const getRecentCadernetas = (): string[] => {
  try {
    const stored = localStorage.getItem(RECENT_CADERNETAS_KEY)
    return stored ? JSON.parse(stored) : []
  } catch {
    return []
  }
}

export const addRecentCaderneta = (cadernetaId: string) => {
  const recent = getRecentCadernetas()
  const filtered = recent.filter(id => id !== cadernetaId)
  const updated = [cadernetaId, ...filtered].slice(0, 3)
  localStorage.setItem(RECENT_CADERNETAS_KEY, JSON.stringify(updated))
}
