// Compressao de foto: redimensiona para max 1280px e exporta como WebP
// (fallback JPEG) quality 0.7. Reduz fotos de ~3-5MB (12MP) para ~100-250KB
// sem comprometer legibilidade.

const MAX_DIMENSION = 1280
const PHOTO_QUALITY = 0.7

// WebP falha silenciosamente para PNG em browsers sem suporte: detectar
// uma vez olhando o mime real retornado.
const SUPPORTS_WEBP = (() => {
  try {
    const c = document.createElement('canvas')
    return c.toDataURL('image/webp', 0.5).startsWith('data:image/webp')
  } catch {
    return false
  }
})()

export const PHOTO_MIME = SUPPORTS_WEBP ? 'image/webp' : 'image/jpeg'
export const PHOTO_EXT = SUPPORTS_WEBP ? 'webp' : 'jpg'

// Detecta o formato pelo magic number do base64: JPEG comeca com /9j/,
// WebP (RIFF) com UklGR. Util para fotos antigas salvas como JPEG.
export function imageMimeFromBase64(base64: string): string {
  return base64.startsWith('UklGR') ? 'image/webp' : 'image/jpeg'
}

export function imageExtFromBase64(base64: string): string {
  return imageMimeFromBase64(base64) === 'image/webp' ? 'webp' : 'jpg'
}

// Data URL com o mime real para <img src>: fotos novas sao WebP, antigas JPEG.
export function base64ToDataUrl(base64: string): string {
  return `data:${imageMimeFromBase64(base64)};base64,${base64}`
}

export async function comprimirFoto(base64Data: string): Promise<string> {
  // Se ja veio sem o prefixo data:, adicionar para o Image.src (o mime do
  // prefixo nao importa para a decodificacao)
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

  const compressed = canvas.toDataURL(PHOTO_MIME, PHOTO_QUALITY)

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
