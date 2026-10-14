// Cores e iniciais dos avatares de funcionário (mesmo padrão do Abastecimento)
export const AVATAR_CORES = ['#64748b', '#a0845c', '#6b9e78', '#8b7ec8', '#5b8fa8', '#b06f6f', '#7a9e5c', '#a87f4f']

export const iniciais = (nome: string): string => {
  const partes = nome.trim().split(/\s+/)
  return ((partes[0]?.[0] ?? '') + (partes.length > 1 ? partes[partes.length - 1][0] : '')).toUpperCase()
}

export const primeiroNome = (nome: string): string => nome.trim().split(/\s+/)[0] || nome
