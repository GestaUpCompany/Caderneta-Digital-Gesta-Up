import { Router, Request, Response } from 'express'
import { appendRow, updateRow, getRows, validateConnection } from '../services/googleSheetsService'
import { logger } from '../utils/logger'

export const sheetsRouter = Router()

const SHEET_NAMES: Record<string, string> = {
  maternidade: 'Maternidade Cria',
  pastagens: 'Troca de Pastos',
  rodeio: 'Rodeio Gado',
  suplementacao: 'Suplementação',
  bebedouros: 'Bebedouros',
  movimentacao: 'Movimentação',
}

sheetsRouter.post('/validate', async (req: Request, res: Response) => {
  const { planilhaUrl } = req.body
  if (!planilhaUrl) {
    return res.status(400).json({ error: 'Link da planilha é obrigatório' })
  }
  const valid = await validateConnection(planilhaUrl)
  if (valid) {
    return res.json({ success: true, message: 'Conexão com planilha validada' })
  }
  return res.status(400).json({ success: false, error: 'Não foi possível conectar à planilha' })
})

sheetsRouter.post('/:caderneta', async (req: Request, res: Response) => {
  const { caderneta } = req.params
  const { planilhaUrl, values, id } = req.body

  const sheetName = SHEET_NAMES[caderneta]
  if (!sheetName) {
    return res.status(404).json({ error: `Caderneta '${caderneta}' não encontrada` })
  }

  if (!planilhaUrl || !values) {
    return res.status(400).json({ error: 'planilhaUrl e values são obrigatórios' })
  }

  try {
    const valuesWithId = id ? [id, ...values] : values
    const rowNumber = await appendRow(planilhaUrl, sheetName, valuesWithId)
    logger.info(`Registro adicionado em ${caderneta}, linha ${rowNumber}`)
    return res.json({ success: true, rowNumber })
  } catch (error) {
    logger.error(`Erro ao adicionar registro em ${caderneta}: ${error}`)
    return res.status(500).json({ error: 'Erro ao salvar na planilha' })
  }
})

sheetsRouter.put('/:caderneta/:rowNumber', async (req: Request, res: Response) => {
  const { caderneta, rowNumber } = req.params
  const { planilhaUrl, values } = req.body

  const sheetName = SHEET_NAMES[caderneta]
  if (!sheetName) {
    return res.status(404).json({ error: `Caderneta '${caderneta}' não encontrada` })
  }

  if (!planilhaUrl || !values) {
    return res.status(400).json({ error: 'planilhaUrl e values são obrigatórios' })
  }

  try {
    await updateRow(planilhaUrl, sheetName, parseInt(rowNumber), values)
    logger.info(`Registro atualizado em ${caderneta}, linha ${rowNumber}`)
    return res.json({ success: true })
  } catch (error) {
    logger.error(`Erro ao atualizar registro em ${caderneta}: ${error}`)
    return res.status(500).json({ error: 'Erro ao atualizar na planilha' })
  }
})

sheetsRouter.get('/:caderneta', async (req: Request, res: Response) => {
  const { caderneta } = req.params
  const { planilhaUrl } = req.query as { planilhaUrl: string }

  const sheetName = SHEET_NAMES[caderneta]
  if (!sheetName) {
    return res.status(404).json({ error: `Caderneta '${caderneta}' não encontrada` })
  }

  if (!planilhaUrl) {
    return res.status(400).json({ error: 'planilhaUrl é obrigatório' })
  }

  try {
    const rows = await getRows(planilhaUrl, sheetName)
    return res.json({ success: true, rows })
  } catch (error) {
    logger.error(`Erro ao buscar registros de ${caderneta}: ${error}`)
    return res.status(500).json({ error: 'Erro ao buscar dados da planilha' })
  }
})
