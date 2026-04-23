import { Router, Request, Response } from 'express'
import { validateFarm, getRows, appendRow, getNextId } from '../services/googleSheetsService'
import { logger } from '../utils/logger'

export const insumosRouter = Router()

insumosRouter.post('/cadastro', async (req: Request, res: Response) => {
  const { insumosSheetUrl } = req.body
  if (!insumosSheetUrl) {
    return res.status(400).json({ error: 'insumosSheetUrl é obrigatório' })
  }
  try {
    const rows = await getRows(insumosSheetUrl, 'Cadastro')
    return res.json({ success: true, rows })
  } catch (error) {
    logger.error(`Erro ao ler cadastro de insumos: ${error}`)
    return res.status(500).json({ error: 'Erro ao ler cadastro de insumos' })
  }
})

insumosRouter.post('/entrada', async (req: Request, res: Response) => {
  const { insumosSheetUrl, values } = req.body
  if (!insumosSheetUrl || !values) {
    return res.status(400).json({ error: 'insumosSheetUrl e values são obrigatórios' })
  }
  try {
    const nextId = await getNextId(insumosSheetUrl, 'Entrada')
    const valuesWithId = [nextId, ...values]
    const rowNumber = await appendRow(insumosSheetUrl, 'Entrada', valuesWithId)
    logger.info(`Entrada de insumos salva na linha ${rowNumber} com ID ${nextId}`)
    return res.json({ success: true, rowNumber, id: nextId })
  } catch (error) {
    logger.error(`Erro ao salvar entrada de insumos: ${error}`)
    return res.status(500).json({ error: 'Erro ao salvar entrada de insumos' })
  }
})

insumosRouter.post('/producao', async (req: Request, res: Response) => {
  const { insumosSheetUrl, values } = req.body
  if (!insumosSheetUrl || !values) {
    return res.status(400).json({ error: 'insumosSheetUrl e values são obrigatórios' })
  }
  try {
    const nextId = await getNextId(insumosSheetUrl, 'Saída')
    const valuesWithId = [nextId, ...values]
    const rowNumber = await appendRow(insumosSheetUrl, 'Saída', valuesWithId)
    logger.info(`Produção de insumos salva na linha ${rowNumber} com ID ${nextId}`)
    return res.json({ success: true, rowNumber, id: nextId })
  } catch (error) {
    logger.error(`Erro ao salvar produção de insumos: ${error}`)
    return res.status(500).json({ error: 'Erro ao salvar produção de insumos' })
  }
})

insumosRouter.post('/dieta-insumos', async (req: Request, res: Response) => {
  const { insumosSheetUrl, values } = req.body
  if (!insumosSheetUrl || !values) {
    return res.status(400).json({ error: 'insumosSheetUrl e values são obrigatórios' })
  }
  try {
    const rowNumber = await appendRow(insumosSheetUrl, 'Dieta Insumos', values)
    logger.info(`Relação dieta-insumos salva na linha ${rowNumber}`)
    return res.json({ success: true, rowNumber })
  } catch (error) {
    logger.error(`Erro ao salvar relação dieta-insumos: ${error}`)
    return res.status(500).json({ error: 'Erro ao salvar relação dieta-insumos' })
  }
})
