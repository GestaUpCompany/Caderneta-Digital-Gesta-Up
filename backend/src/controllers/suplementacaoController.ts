import { Router, Request, Response } from 'express'
import { getSubtiposDaFazenda, extractSpreadsheetId } from '../services/googleSheetsService'
import { logger } from '../utils/logger'

export const suplementacaoRouter = Router()

suplementacaoRouter.get('/subtipos', async (req: Request, res: Response) => {
  const { fazenda, tipo, cadastroSheetUrl } = req.query as { fazenda?: string; tipo?: string; cadastroSheetUrl?: string }

  if (!tipo || !cadastroSheetUrl) {
    return res.status(400).json({ success: false, error: 'tipo e cadastroSheetUrl são obrigatórios' })
  }

  try {
    const subtipos = await getSubtiposDaFazenda(cadastroSheetUrl, fazenda || '', tipo)
    return res.json({ success: true, subtipos })
  } catch (error) {
    logger.error(`Erro ao buscar subtipos: ${error}`)
    return res.status(500).json({ success: false, error: 'Erro ao buscar subtipos' })
  }
})
