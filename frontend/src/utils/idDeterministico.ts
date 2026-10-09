/**
 * UUID derivado de um texto (SHA-1, formato v5). O mesmo texto sempre gera o mesmo UUID, o que torna
 * idempotente a gravação de registros auxiliares no sync (ex.: histórico de limpeza do bebedouro, que
 * não tem chave única por registro): reenviar o mesmo registro regrava a mesma linha.
 */
export async function uuidDeterministico(texto: string): Promise<string> {
  const bytes = new Uint8Array(await crypto.subtle.digest('SHA-1', new TextEncoder().encode(texto)))
  const hex = Array.from(bytes.slice(0, 16), (b) => b.toString(16).padStart(2, '0')).join('')
  const variante = ((parseInt(hex.slice(16, 18), 16) & 0x3f) | 0x80).toString(16).padStart(2, '0')
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-5${hex.slice(13, 16)}-${variante}${hex.slice(18, 20)}-${hex.slice(20, 32)}`
}
