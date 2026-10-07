// Icone por palavra-chave para classificacoes/setores do almoxarifado (cadastro livre; fallback generico)

const normalizar = (s: string) =>
  s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')

// Icone por palavra-chave (o cadastro e livre; fallback generico)
export const iconePorNome = (nome: string): string => {
  const n = normalizar(nome)
  if (n.includes('pendente')) return '↩️'
  if (n.includes('ferrament')) return '🔧'
  if (n.includes('peca')) return '⚙️'
  if (n.includes('epi') || n.includes('seguranca')) return '🦺'
  if (n.includes('remed') || n.includes('medic') || n.includes('farmac')) return '💊'
  if (n.includes('cerca') || n.includes('arame') || n.includes('madeira')) return '🪵'
  if (n.includes('limpez') || n.includes('higien')) return '🧹'
  if (n.includes('gado') || n.includes('pecuar') || n.includes('rebanho')) return '🐄'
  if (n.includes('maquina') || n.includes('trator')) return '🚜'
  if (n.includes('fabrica') || n.includes('industri')) return '🏭'
  if (n.includes('eletric')) return '💡'
  if (n.includes('hidraul') || n.includes('agua')) return '💧'
  if (n.includes('combust') || n.includes('lubrif') || n.includes('oleo')) return '🛢️'
  if (n.includes('outro')) return '➕'
  return '📦'
}
