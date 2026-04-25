import { Router, Request, Response } from 'express'
import { getRows, appendRow, getNextId, updateRow, findRowByInsumo, calcularEstoque } from '../services/googleSheetsService'
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

    // Atualizar estoque do insumo após salvar entrada
    // O produto está na posição 2 do array values (índice 2)
    const produto = values[2] as string
    if (produto) {
      try {
        const rowNumber = await findRowByInsumo(insumosSheetUrl, 'Estoque', produto)
        if (rowNumber) {
          const estoqueCalculado = await calcularEstoque(insumosSheetUrl, produto)
          await updateRow(insumosSheetUrl, 'Estoque', rowNumber, [
            estoqueCalculado.dataInicial,
            new Date().toLocaleDateString('pt-BR'),
            produto,
            estoqueCalculado.qtdEntrada,
            estoqueCalculado.qtdSaida,
            estoqueCalculado.estoque,
            estoqueCalculado.previsao,
          ])
          logger.info(`Estoque atualizado automaticamente para insumo "${produto}" após entrada`)
        }
      } catch (error) {
        logger.warn(`Não foi possível atualizar estoque para "${produto}" após entrada: ${error}`)
        // Não falhar a entrada se o estoque não puder ser atualizado
      }
    }

    return res.json({ success: true, rowNumber, id: nextId })
  } catch (error) {
    logger.error(`Erro ao salvar entrada de insumos: ${error}`)
    return res.status(500).json({ error: 'Erro ao salvar entrada de insumos' })
  }
})

insumosRouter.post('/producao', async (req: Request, res: Response) => {
  const { insumosSheetUrl, values, insumosUsados } = req.body
  if (!insumosSheetUrl || !values) {
    return res.status(400).json({ error: 'insumosSheetUrl e values são obrigatórios' })
  }
  try {
    const nextId = await getNextId(insumosSheetUrl, 'Saída')
    const valuesWithId = [nextId, ...values]
    const rowNumber = await appendRow(insumosSheetUrl, 'Saída', valuesWithId)
    logger.info(`Produção de insumos salva na linha ${rowNumber} com ID ${nextId}`)

    // Atualizar estoque de todos os insumos usados na produção
    // Os insumos usados são passados no corpo da requisição
    if (insumosUsados && Array.isArray(insumosUsados)) {
      for (const insumo of insumosUsados) {
        try {
          const rowNumber = await findRowByInsumo(insumosSheetUrl, 'Estoque', insumo)
          if (rowNumber) {
            const estoqueCalculado = await calcularEstoque(insumosSheetUrl, insumo)
            await updateRow(insumosSheetUrl, 'Estoque', rowNumber, [
              estoqueCalculado.dataInicial,
              new Date().toLocaleDateString('pt-BR'),
              insumo,
              estoqueCalculado.qtdEntrada,
              estoqueCalculado.qtdSaida,
              estoqueCalculado.estoque,
              estoqueCalculado.previsao,
            ])
            logger.info(`Estoque atualizado automaticamente para insumo "${insumo}" após produção`)
          }
        } catch (error) {
          logger.warn(`Não foi possível atualizar estoque para "${insumo}" após produção: ${error}`)
        }
      }
    }

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

insumosRouter.get('/estoque', async (req: Request, res: Response) => {
  const { insumosSheetUrl } = req.query
  if (!insumosSheetUrl) {
    return res.status(400).json({ error: 'insumosSheetUrl é obrigatório' })
  }
  try {
    const rows = await getRows(insumosSheetUrl as string, 'Estoque')
    return res.json({ success: true, rows })
  } catch (error) {
    logger.error(`Erro ao ler estoque: ${error}`)
    return res.status(500).json({ error: 'Erro ao ler estoque' })
  }
})

insumosRouter.post('/estoque/inicializar', async (req: Request, res: Response) => {
  const { insumosSheetUrl, cadastroSheetUrl, estoquesIniciais } = req.body
  if (!insumosSheetUrl || !cadastroSheetUrl) {
    return res.status(400).json({ error: 'insumosSheetUrl e cadastroSheetUrl são obrigatórios' })
  }
  try {
    // Ler insumos cadastrados (coluna 5 = INSUMOS) da planilha de cadastro
    const cadastroRows = await getRows(cadastroSheetUrl, 'Cadastro')
    const insumosCadastrados = cadastroRows.map((row) => row[5]).filter((val) => val) as string[]

    // Ler linhas existentes na aba Estoque
    const estoqueRows = await getRows(insumosSheetUrl, 'Estoque')
    const insumosComEstoque = estoqueRows.map((row) => row.length > 2 ? String(row[2]) : '').filter((val) => val) as string[]

    const linhasCriadas: string[] = []
    const hoje = new Date().toLocaleDateString('pt-BR')

    for (const insumo of insumosCadastrados) {
      // Se já existe linha para este insumo, pular
      if (insumosComEstoque.includes(insumo)) {
        continue
      }

      // Criar nova linha
      const estoqueInicial = estoquesIniciais?.[insumo] || 0
      const values = [hoje, hoje, insumo, estoqueInicial, 0, estoqueInicial, estoqueInicial]
      const rowNumber = await appendRow(insumosSheetUrl, 'Estoque', values)
      linhasCriadas.push(insumo)
      logger.info(`Linha de estoque criada para insumo "${insumo}" na linha ${rowNumber}`)
    }

    return res.json({ success: true, linhasCriadas, total: linhasCriadas.length })
  } catch (error) {
    logger.error(`Erro ao inicializar estoque: ${error}`)
    return res.status(500).json({ error: 'Erro ao inicializar estoque' })
  }
})

insumosRouter.post('/estoque/atualizar', async (req: Request, res: Response) => {
  const { insumosSheetUrl, insumoName } = req.body
  if (!insumosSheetUrl || !insumoName) {
    return res.status(400).json({ error: 'insumosSheetUrl e insumoName são obrigatórios' })
  }
  try {
    // Calcular estoque atual
    const estoqueCalculado = await calcularEstoque(insumosSheetUrl, insumoName)

    // Encontrar linha do insumo na aba Estoque
    const rowNumber = await findRowByInsumo(insumosSheetUrl, 'Estoque', insumoName)

    if (!rowNumber) {
      return res.status(404).json({ error: `Insumo "${insumoName}" não encontrado na aba Estoque` })
    }

    // Atualizar linha
    const values = [
      estoqueCalculado.dataInicial,
      estoqueCalculado.dataFinal,
      insumoName,
      estoqueCalculado.qtdEntrada,
      estoqueCalculado.qtdSaida,
      estoqueCalculado.estoque,
      estoqueCalculado.previsao,
    ]

    await updateRow(insumosSheetUrl, 'Estoque', rowNumber, values)
    logger.info(`Estoque atualizado para insumo "${insumoName}" na linha ${rowNumber}`)

    return res.json({ success: true, values: estoqueCalculado })
  } catch (error) {
    logger.error(`Erro ao atualizar estoque para insumo "${insumoName}": ${error}`)
    return res.status(500).json({ error: 'Erro ao atualizar estoque' })
  }
})
