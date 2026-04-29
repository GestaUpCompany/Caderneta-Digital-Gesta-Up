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
    const rows = await getRows(insumosSheetUrl, 'Administrativo')
    return res.json({ success: true, rows })
  } catch (error) {
    logger.error(`Erro ao ler cadastro de insumos: ${error}`)
    return res.status(500).json({ error: 'Erro ao ler cadastro de insumos' })
  }
})

insumosRouter.post('/pastos', async (req: Request, res: Response) => {
  const { insumosSheetUrl } = req.body
  if (!insumosSheetUrl) {
    return res.status(400).json({ error: 'insumosSheetUrl é obrigatório' })
  }
  try {
    const rows = await getRows(insumosSheetUrl, 'Pasto')
    // Extrair apenas a primeira coluna (PASTO)
    const pastos = rows.map(row => row[0]).filter((val): val is string => val !== null && val !== undefined && val !== '')
    return res.json({ success: true, pastos })
  } catch (error) {
    logger.error(`Erro ao ler pastos: ${error}`)
    return res.status(500).json({ error: 'Erro ao ler pastos' })
  }
})

insumosRouter.post('/pasto-detalhes', async (req: Request, res: Response) => {
  const { insumosSheetUrl, pasto } = req.body
  if (!insumosSheetUrl || !pasto) {
    return res.status(400).json({ error: 'insumosSheetUrl e pasto são obrigatórios' })
  }
  try {
    const rows = await getRows(insumosSheetUrl, 'Pasto')
    // Encontrar a linha do pasto especificado
    const pastoRow = rows.find(row => row[0] === pasto)
    if (!pastoRow) {
      return res.status(404).json({ error: 'Pasto não encontrado' })
    }
    // Retornar todas as colunas: PASTO, ÁREA ÚTIL (ha), ESPÉCIE, ALTURA ENTRADA (cm), ALTURA SAÍDA (cm)
    const detalhes = {
      pasto: pastoRow[0] || '',
      areaUtil: pastoRow[1] || '',
      especie: pastoRow[2] || '',
      alturaEntrada: pastoRow[3] || '',
      alturaSaida: pastoRow[4] || '',
    }
    return res.json({ success: true, detalhes })
  } catch (error) {
    logger.error(`Erro ao ler detalhes do pasto: ${error}`)
    return res.status(500).json({ error: 'Erro ao ler detalhes do pasto' })
  }
})

insumosRouter.post('/lotes', async (req: Request, res: Response) => {
  const { insumosSheetUrl } = req.body
  if (!insumosSheetUrl) {
    return res.status(400).json({ error: 'insumosSheetUrl é obrigatório' })
  }
  try {
    const rows = await getRows(insumosSheetUrl, 'Lote')
    // Extrair apenas a primeira coluna (LOTE)
    const lotes = rows.map(row => row[0]).filter((val): val is string => val !== null && val !== undefined && val !== '')
    return res.json({ success: true, lotes })
  } catch (error) {
    logger.error(`Erro ao ler lotes: ${error}`)
    return res.status(500).json({ error: 'Erro ao ler lotes' })
  }
})

insumosRouter.post('/lote-detalhes', async (req: Request, res: Response) => {
  const { insumosSheetUrl, lote } = req.body
  if (!insumosSheetUrl || !lote) {
    return res.status(400).json({ error: 'insumosSheetUrl e lote são obrigatórios' })
  }
  try {
    const rows = await getRows(insumosSheetUrl, 'Lote')
    // Encontrar a linha do lote especificado
    const loteRow = rows.find(row => row[0] === lote)
    if (!loteRow) {
      return res.status(404).json({ error: 'Lote não encontrado' })
    }
    // Retornar todas as colunas: LOTE, N° CABEÇAS, CATEGORIAS, PESO VIVO (kg), QTD. BEZERROS
    const detalhes = {
      lote: loteRow[0] || '',
      nCabecas: loteRow[1] || '',
      categorias: loteRow[2] || '',
      pesoVivo: loteRow[3] || '',
      qtdBezerros: loteRow[4] || '',
    }
    return res.json({ success: true, detalhes })
  } catch (error) {
    logger.error(`Erro ao ler detalhes do lote: ${error}`)
    return res.status(500).json({ error: 'Erro ao ler detalhes do lote' })
  }
})

insumosRouter.post('/suplementacao', async (req: Request, res: Response) => {
  const { insumosSheetUrl } = req.body
  if (!insumosSheetUrl) {
    return res.status(400).json({ error: 'insumosSheetUrl é obrigatório' })
  }
  try {
    const rows = await getRows(insumosSheetUrl, 'Suplementação')
    // Extrair as 5 colunas: MINERAL, PROTEINADO, RACAO, INSUMOS, DIETAS
    const mineral = rows.map(row => row[0]).filter((val): val is string => val !== null && val !== undefined && val !== '')
    const proteinado = rows.map(row => row[1]).filter((val): val is string => val !== null && val !== undefined && val !== '')
    const racao = rows.map(row => row[2]).filter((val): val is string => val !== null && val !== undefined && val !== '')
    const insumos = rows.map(row => row[3]).filter((val): val is string => val !== null && val !== undefined && val !== '')
    const dietas = rows.map(row => row[4]).filter((val): val is string => val !== null && val !== undefined && val !== '')
    return res.json({ success: true, mineral, proteinado, racao, insumos, dietas })
  } catch (error) {
    logger.error(`Erro ao ler suplementação: ${error}`)
    return res.status(500).json({ error: 'Erro ao ler suplementação' })
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
    const cadastroRows = await getRows(cadastroSheetUrl, 'Administrativo')
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
