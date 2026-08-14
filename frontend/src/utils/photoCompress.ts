// Compressao de foto: redimensiona para max 1280px e exporta como JPEG quality 0.6
// Reduz fotos de ~3-5MB (12MP) para ~200-400KB sem comprometer legibilidade

const MAX_DIMENSION = 1280
const JPEG_QUALITY = 0.6

export async function comprimirFoto(base64Data: string): Promise<string> {
  // Se ja veio sem o prefixo data:, adicionar para o Image.src
  const src = base64Data.startsWith('data:') ? base64Data : `data:image/jpeg;base64,${base64Data}`

  const img = new Image()
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve()
    img.onerror = () => reject(new Error('Falha ao carregar imagem para compressao'))
    img.src = src
  })

  let { width, height } = img

  // Redimensionar se exceder a dimensao maxima, mantendo aspecto
  if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
    if (width >= height) {
      height = Math.round((height * MAX_DIMENSION) / width)
      width = MAX_DIMENSION
    } else {
      width = Math.round((width * MAX_DIMENSION) / height)
      height = MAX_DIMENSION
    }
  }

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas 2D context nao disponivel')

  ctx.drawImage(img, 0, 0, width, height)

  // Exportar como JPEG comprimido
  const compressed = canvas.toDataURL('image/jpeg', JPEG_QUALITY)

  // Remover o prefixo data: para economizar espaco no IndexedDB
  const base64Only = compressed.split(',')[1]
  return base64Only
}

// Converter base64 puro para Blob para upload no Supabase Storage
export function base64ToBlob(base64: string, mimeType = 'image/jpeg'): Blob {
  const byteChars = atob(base64)
  const byteArrays: Uint8Array[] = []

  for (let offset = 0; offset < byteChars.length; offset += 512) {
    const slice = byteChars.slice(offset, offset + 512)
    const byteNumbers = new Array(slice.length)
    for (let i = 0; i < slice.length; i++) {
      byteNumbers[i] = slice.charCodeAt(i)
    }
    byteArrays.push(new Uint8Array(byteNumbers))
  }

  return new Blob(byteArrays, { type: mimeType })
}
