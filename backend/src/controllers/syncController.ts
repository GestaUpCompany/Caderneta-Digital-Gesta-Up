import { Router, Request, Response } from 'express'
import { appendRow, updateRow, extractSpreadsheetId } from '../services/googleSheetsService'
import { validateSyncRequest } from '../middleware/validation'
import { logger } from '../utils/logger'

export const syncRouter = Router()

const SHEET_NAMES: Record<string, string> = {
  maternidade: 'Maternidade Cria',
  pastagens: 'Troca de Pastos',
  rodeio: 'Rodeio Gado',
  suplementacao: 'Suplementação',
  bebedouros: 'Bebedouros',
  movimentacao: 'Movimentação',
}

interface SyncResult {
  id: string
  success: boolean
  googleRowId?: number
  error?: string
}

async function processBatch(
  planilhaUrl: string,
  registros: Array<{ id: string; caderneta: string; operacao: string; dados: Record<string, unknown> }>
): Promise<SyncResult[]> {
  const results: SyncResult[] = []

  for (const registro of registros) {
    try {
      const sheetName = SHEET_NAMES[registro.caderneta]
      if (!sheetName) {
        results.push({ id: registro.id, success: false, error: 'Caderneta não encontrada' })
        continue
      }

      const values = [registro.id, ...Object.values(registro.dados)] as (string | number | null)[]

      if (registro.operacao === 'create') {
        const rowNumber = await appendRow(planilhaUrl, sheetName, values)
        results.push({ id: registro.id, success: true, googleRowId: rowNumber })
        logger.info(`Sync create: ${registro.caderneta}, linha ${rowNumber}`)
      } else if (registro.operacao === 'update' && registro.dados.googleRowId) {
        await updateRow(planilhaUrl, sheetName, Number(registro.dados.googleRowId), values)
        results.push({ id: registro.id, success: true, googleRowId: Number(registro.dados.googleRowId) })
        logger.info(`Sync update: ${registro.caderneta}, linha ${registro.dados.googleRowId}`)
      } else {
        results.push({ id: registro.id, success: false, error: 'Operação não suportada' })
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Erro desconhecido'
      results.push({ id: registro.id, success: false, error: errorMsg })
      logger.error(`Sync erro ${registro.id}: ${errorMsg}`)
    }
  }

  return results
}

syncRouter.post('/batch', validateSyncRequest, async (req: Request, res: Response) => {
  const { planilhaUrl, registros } = req.body

  try {
    const results = await processBatch(planilhaUrl, registros)
    const sucessos = results.filter((r) => r.success).length
    const falhas = results.filter((r) => !r.success).length

    logger.info(`Sincronização batch: ${sucessos} sucessos, ${falhas} falhas`)

    return res.json({
      success: falhas === 0,
      summary: { total: registros.length, sucessos, falhas },
      results,
    })
  } catch (error) {
    logger.error(`Erro no sync batch: ${error}`)
    return res.status(500).json({ error: 'Erro ao processar sincronização' })
  }
})

syncRouter.post('/validate-connection', async (req: Request, res: Response) => {
  const { planilhaUrl } = req.body

  if (!planilhaUrl) {
    return res.status(400).json({ error: 'planilhaUrl é obrigatório' })
  }

  try {
    extractSpreadsheetId(planilhaUrl)
    return res.json({ success: true, message: 'URL válida' })
  } catch (error) {
    return res.status(400).json({ success: false, error: 'URL da planilha inválida' })
  }
})
