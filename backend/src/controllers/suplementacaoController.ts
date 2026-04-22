import { Router, Request, Response } from 'express'
import { getSubtiposDaFazenda, getPastosELotesDaFazenda, extractSpreadsheetId } from '../services/googleSheetsService'
import { logger } from '../utils/logger'

export const suplementacaoRouter = Router()

const DATABASE_URL = 'https://docs.google.com/spreadsheets/d/1HSq-3ihaSnVGIEPBCMdhYjCmFfwyWAQM7zFrkCuGxts/edit'

suplementacaoRouter.get('/subtipos', async (req: Request, res: Response) => {
  const { fazenda, tipo } = req.query as { fazenda?: string; tipo?: string }

  if (!fazenda || !tipo) {
    return res.status(400).json({ success: false, error: 'fazenda e tipo são obrigatórios' })
  }

  try {
    const subtipos = await getSubtiposDaFazenda(DATABASE_URL, fazenda, tipo)
    return res.json({ success: true, subtipos })
  } catch (error) {
    logger.error(`Erro ao buscar subtipos: ${error}`)
    return res.status(500).json({ success: false, error: 'Erro ao buscar subtipos' })
  }
})

suplementacaoRouter.get('/pastos-lotes', async (req: Request, res: Response) => {
  const { fazenda } = req.query as { fazenda?: string }

  if (!fazenda) {
    return res.status(400).json({ success: false, error: 'fazenda é obrigatório' })
  }

  try {
    const result = await getPastosELotesDaFazenda(DATABASE_URL, fazenda)
    return res.json({ success: true, ...result })
  } catch (error) {
    logger.error(`Erro ao buscar pastos e lotes: ${error}`)
    return res.status(500).json({ success: false, error: 'Erro ao buscar pastos e lotes' })
  }
})
