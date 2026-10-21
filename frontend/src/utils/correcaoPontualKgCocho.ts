import { getAllRegistros, saveRegistro } from '../services/indexedDB'

// Correção pontual (remover no próximo release): o registro de suplementação de 14/10/2026 do Lote 9
// (fazenda d3965505-74d5-4af7-9858-f773d2e8aab3) foi digitado com 104530000 kg no cocho. O servidor já foi
// corrigido para 1045, mas a cópia local dos aparelhos manteve o valor errado e poluía o histórico de consumo.
const CHAVE_EXECUTADO = 'correcao-kg-cocho-lote9-20261014'
const KG_ERRADO = 104530000
const KG_CERTO = 1045
const SUPABASE_ID = '133c20c0-5768-43ca-95d2-117e165f4140'

export async function corrigirKgCochoDigitadoErrado(): Promise<void> {
  try {
    if (localStorage.getItem(CHAVE_EXECUTADO)) return

    const registros = await getAllRegistros('suplementacao')
    for (const r of registros) {
      const idConfere = !r.supabaseId || r.supabaseId === SUPABASE_ID
      if (idConfere && Number(r.kgCocho) === KG_ERRADO) {
        // Mantém syncStatus e lastModified: o servidor já tem o valor certo e não deve haver novo envio.
        await saveRegistro('suplementacao', { ...r, kgCocho: KG_CERTO })
      }
    }

    localStorage.setItem(CHAVE_EXECUTADO, '1')
  } catch (error) {
    console.error('Erro na correção pontual de kgCocho:', error)
  }
}
