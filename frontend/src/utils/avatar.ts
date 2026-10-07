// Avatar de iniciais usado nos seletores de pessoas das cadernetas.

const CORES_AVATAR = [
  'bg-amber-100 text-amber-800',
  'bg-sky-100 text-sky-800',
  'bg-emerald-100 text-emerald-800',
  'bg-violet-100 text-violet-800',
  'bg-rose-100 text-rose-800',
  'bg-orange-100 text-orange-800',
]

export const iniciais = (nome: string): string => {
  const partes = nome.trim().split(/\s+/)
  return ((partes[0]?.[0] || '') + (partes.length > 1 ? partes[partes.length - 1][0] : partes[0]?.[1] || '')).toUpperCase()
}

/** Classes de cor estaveis por nome (mesma pessoa, mesma cor) */
export const corAvatar = (nome: string): string =>
  CORES_AVATAR[[...nome].reduce((acc, c) => acc + c.charCodeAt(0), 0) % CORES_AVATAR.length]
