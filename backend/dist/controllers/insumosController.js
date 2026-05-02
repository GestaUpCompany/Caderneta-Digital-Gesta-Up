"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.insumosRouter = void 0;
const express_1 = require("express");
const googleSheetsService_1 = require("../services/googleSheetsService");
const logger_1 = require("../utils/logger");
exports.insumosRouter = (0, express_1.Router)();
exports.insumosRouter.post('/cadastro', async (req, res) => {
    const { insumosSheetUrl } = req.body;
    if (!insumosSheetUrl) {
        return res.status(400).json({ error: 'insumosSheetUrl é obrigatório' });
    }
    try {
        const rows = await (0, googleSheetsService_1.getRows)(insumosSheetUrl, 'Administrativo');
        return res.json({ success: true, rows });
    }
    catch (error) {
        logger_1.logger.error(`Erro ao ler cadastro de insumos: ${error}`);
        return res.status(500).json({ error: 'Erro ao ler cadastro de insumos' });
    }
});
exports.insumosRouter.post('/pastos', async (req, res) => {
    const { insumosSheetUrl } = req.body;
    if (!insumosSheetUrl) {
        return res.status(400).json({ error: 'insumosSheetUrl é obrigatório' });
    }
    try {
        const rows = await (0, googleSheetsService_1.getRows)(insumosSheetUrl, 'Pasto');
        // Extrair apenas a primeira coluna (PASTO)
        const pastos = rows.map(row => row[0]).filter((val) => val !== null && val !== undefined && val !== '');
        return res.json({ success: true, pastos });
    }
    catch (error) {
        logger_1.logger.error(`Erro ao ler pastos: ${error}`);
        return res.status(500).json({ error: 'Erro ao ler pastos' });
    }
});
exports.insumosRouter.post('/pastos-completos', async (req, res) => {
    const { insumosSheetUrl } = req.body;
    if (!insumosSheetUrl) {
        return res.status(400).json({ error: 'insumosSheetUrl é obrigatório' });
    }
    try {
        const rows = await (0, googleSheetsService_1.getRows)(insumosSheetUrl, 'Pasto');
        // Retornar pastos com detalhes em uma única requisição
        const pastosComDetalhes = {};
        for (const row of rows) {
            const pasto = String(row[0] || '');
            if (!pasto || pasto === '' || pasto === null || pasto === undefined)
                continue;
            pastosComDetalhes[pasto] = {
                pasto: String(row[0] || ''),
                areaUtil: String(row[1] || ''),
                especie: String(row[2] || ''),
                alturaEntrada: String(row[3] || ''),
                alturaSaida: String(row[4] || ''),
            };
        }
        const pastos = Object.keys(pastosComDetalhes);
        return res.json({ success: true, pastos, pastosDetalhes: pastosComDetalhes });
    }
    catch (error) {
        logger_1.logger.error(`Erro ao ler pastos completos: ${error}`);
        return res.status(500).json({ error: 'Erro ao ler pastos completos' });
    }
});
exports.insumosRouter.post('/pasto-detalhes', async (req, res) => {
    const { insumosSheetUrl, pasto } = req.body;
    if (!insumosSheetUrl || !pasto) {
        return res.status(400).json({ error: 'insumosSheetUrl e pasto são obrigatórios' });
    }
    try {
        const rows = await (0, googleSheetsService_1.getRows)(insumosSheetUrl, 'Pasto');
        // Encontrar a linha do pasto especificado
        const pastoRow = rows.find(row => row[0] === pasto);
        if (!pastoRow) {
            return res.status(404).json({ error: 'Pasto não encontrado' });
        }
        // Retornar todas as colunas: PASTO, ÁREA ÚTIL (ha), ESPÉCIE, ALTURA ENTRADA (cm), ALTURA SAÍDA (cm)
        const detalhes = {
            pasto: pastoRow[0] || '',
            areaUtil: pastoRow[1] || '',
            especie: pastoRow[2] || '',
            alturaEntrada: pastoRow[3] || '',
            alturaSaida: pastoRow[4] || '',
        };
        return res.json({ success: true, detalhes });
    }
    catch (error) {
        logger_1.logger.error(`Erro ao ler detalhes do pasto: ${error}`);
        return res.status(500).json({ error: 'Erro ao ler detalhes do pasto' });
    }
});
exports.insumosRouter.post('/lotes', async (req, res) => {
    const { insumosSheetUrl } = req.body;
    if (!insumosSheetUrl) {
        return res.status(400).json({ error: 'insumosSheetUrl é obrigatório' });
    }
    try {
        const rows = await (0, googleSheetsService_1.getRows)(insumosSheetUrl, 'Lote');
        // Extrair apenas a primeira coluna (LOTE)
        const lotes = rows.map(row => row[0]).filter((val) => val !== null && val !== undefined && val !== '');
        return res.json({ success: true, lotes });
    }
    catch (error) {
        logger_1.logger.error(`Erro ao ler lotes: ${error}`);
        return res.status(500).json({ error: 'Erro ao ler lotes' });
    }
});
exports.insumosRouter.post('/lotes-completos', async (req, res) => {
    const { insumosSheetUrl } = req.body;
    if (!insumosSheetUrl) {
        return res.status(400).json({ error: 'insumosSheetUrl é obrigatório' });
    }
    try {
        const rows = await (0, googleSheetsService_1.getRows)(insumosSheetUrl, 'Lote');
        // Retornar lotes com detalhes em uma única requisição
        const lotesComDetalhes = {};
        for (const row of rows) {
            const lote = String(row[0] || '');
            if (!lote || lote === '' || lote === null || lote === undefined)
                continue;
            lotesComDetalhes[lote] = {
                lote: String(row[0] || ''),
                nCabecas: String(row[1] || ''),
                categorias: String(row[2] || ''),
                pesoVivo: String(row[3] || ''),
                qtdBezerros: String(row[4] || ''),
            };
        }
        const lotes = Object.keys(lotesComDetalhes);
        return res.json({ success: true, lotes, lotesDetalhes: lotesComDetalhes });
    }
    catch (error) {
        logger_1.logger.error(`Erro ao ler lotes completos: ${error}`);
        return res.status(500).json({ error: 'Erro ao ler lotes completos' });
    }
});
exports.insumosRouter.post('/lote-detalhes', async (req, res) => {
    const { insumosSheetUrl, lote } = req.body;
    if (!insumosSheetUrl || !lote) {
        return res.status(400).json({ error: 'insumosSheetUrl e lote são obrigatórios' });
    }
    try {
        const rows = await (0, googleSheetsService_1.getRows)(insumosSheetUrl, 'Lote');
        // Encontrar a linha do lote especificado
        const loteRow = rows.find(row => row[0] === lote);
        if (!loteRow) {
            return res.status(404).json({ error: 'Lote não encontrado' });
        }
        // Retornar todas as colunas: LOTE, N° CABEÇAS, CATEGORIAS, PESO VIVO (kg), QTD. BEZERROS
        const detalhes = {
            lote: loteRow[0] || '',
            nCabecas: loteRow[1] || '',
            categorias: loteRow[2] || '',
            pesoVivo: loteRow[3] || '',
            qtdBezerros: loteRow[4] || '',
        };
        return res.json({ success: true, detalhes });
    }
    catch (error) {
        logger_1.logger.error(`Erro ao ler detalhes do lote: ${error}`);
        return res.status(500).json({ error: 'Erro ao ler detalhes do lote' });
    }
});
exports.insumosRouter.post('/suplementacao', async (req, res) => {
    const { insumosSheetUrl } = req.body;
    if (!insumosSheetUrl) {
        return res.status(400).json({ error: 'insumosSheetUrl é obrigatório' });
    }
    try {
        const rows = await (0, googleSheetsService_1.getRows)(insumosSheetUrl, 'Suplementação');
        // Extrair as 5 colunas: MINERAL, PROTEINADO, RACAO, INSUMOS, DIETAS
        const mineral = rows.map(row => row[0]).filter((val) => val !== null && val !== undefined && val !== '');
        const proteinado = rows.map(row => row[1]).filter((val) => val !== null && val !== undefined && val !== '');
        const racao = rows.map(row => row[2]).filter((val) => val !== null && val !== undefined && val !== '');
        const insumos = rows.map(row => row[3]).filter((val) => val !== null && val !== undefined && val !== '');
        const dietas = rows.map(row => row[4]).filter((val) => val !== null && val !== undefined && val !== '');
        return res.json({ success: true, mineral, proteinado, racao, insumos, dietas });
    }
    catch (error) {
        logger_1.logger.error(`Erro ao ler suplementação: ${error}`);
        return res.status(500).json({ error: 'Erro ao ler suplementação' });
    }
});
exports.insumosRouter.post('/entrada', async (req, res) => {
    const { insumosSheetUrl, values } = req.body;
    if (!insumosSheetUrl || !values) {
        return res.status(400).json({ error: 'insumosSheetUrl e values são obrigatórios' });
    }
    try {
        const nextId = await (0, googleSheetsService_1.getNextId)(insumosSheetUrl, 'Entrada');
        const valuesWithId = [nextId, ...values];
        const rowNumber = await (0, googleSheetsService_1.appendRow)(insumosSheetUrl, 'Entrada', valuesWithId);
        logger_1.logger.info(`Entrada de insumos salva na linha ${rowNumber} com ID ${nextId}`);
        // Atualizar estoque do insumo após salvar entrada
        // O produto está na posição 2 do array values (índice 2)
        const produto = values[2];
        if (produto) {
            try {
                const rowNumber = await (0, googleSheetsService_1.findRowByInsumo)(insumosSheetUrl, 'Estoque', produto);
                if (rowNumber) {
                    const estoqueCalculado = await (0, googleSheetsService_1.calcularEstoque)(insumosSheetUrl, produto);
                    await (0, googleSheetsService_1.updateRow)(insumosSheetUrl, 'Estoque', rowNumber, [
                        estoqueCalculado.dataInicial,
                        new Date().toLocaleDateString('pt-BR'),
                        produto,
                        estoqueCalculado.qtdEntrada,
                        estoqueCalculado.qtdSaida,
                        estoqueCalculado.estoque,
                        estoqueCalculado.previsao,
                    ]);
                    logger_1.logger.info(`Estoque atualizado automaticamente para insumo "${produto}" após entrada`);
                }
            }
            catch (error) {
                logger_1.logger.warn(`Não foi possível atualizar estoque para "${produto}" após entrada: ${error}`);
                // Não falhar a entrada se o estoque não puder ser atualizado
            }
        }
        return res.json({ success: true, rowNumber, id: nextId });
    }
    catch (error) {
        logger_1.logger.error(`Erro ao salvar entrada de insumos: ${error}`);
        return res.status(500).json({ error: 'Erro ao salvar entrada de insumos' });
    }
});
exports.insumosRouter.post('/producao', async (req, res) => {
    const { insumosSheetUrl, values, insumosUsados } = req.body;
    if (!insumosSheetUrl || !values) {
        return res.status(400).json({ error: 'insumosSheetUrl e values são obrigatórios' });
    }
    try {
        const nextId = await (0, googleSheetsService_1.getNextId)(insumosSheetUrl, 'Saída');
        const valuesWithId = [nextId, ...values];
        const rowNumber = await (0, googleSheetsService_1.appendRow)(insumosSheetUrl, 'Saída', valuesWithId);
        logger_1.logger.info(`Produção de insumos salva na linha ${rowNumber} com ID ${nextId}`);
        // Atualizar estoque de todos os insumos usados na produção
        // Os insumos usados são passados no corpo da requisição
        if (insumosUsados && Array.isArray(insumosUsados)) {
            for (const insumo of insumosUsados) {
                try {
                    const rowNumber = await (0, googleSheetsService_1.findRowByInsumo)(insumosSheetUrl, 'Estoque', insumo);
                    if (rowNumber) {
                        const estoqueCalculado = await (0, googleSheetsService_1.calcularEstoque)(insumosSheetUrl, insumo);
                        await (0, googleSheetsService_1.updateRow)(insumosSheetUrl, 'Estoque', rowNumber, [
                            estoqueCalculado.dataInicial,
                            new Date().toLocaleDateString('pt-BR'),
                            insumo,
                            estoqueCalculado.qtdEntrada,
                            estoqueCalculado.qtdSaida,
                            estoqueCalculado.estoque,
                            estoqueCalculado.previsao,
                        ]);
                        logger_1.logger.info(`Estoque atualizado automaticamente para insumo "${insumo}" após produção`);
                    }
                }
                catch (error) {
                    logger_1.logger.warn(`Não foi possível atualizar estoque para "${insumo}" após produção: ${error}`);
                }
            }
        }
        return res.json({ success: true, rowNumber, id: nextId });
    }
    catch (error) {
        logger_1.logger.error(`Erro ao salvar produção de insumos: ${error}`);
        return res.status(500).json({ error: 'Erro ao salvar produção de insumos' });
    }
});
exports.insumosRouter.post('/dieta-insumos', async (req, res) => {
    const { insumosSheetUrl, values } = req.body;
    if (!insumosSheetUrl || !values) {
        return res.status(400).json({ error: 'insumosSheetUrl e values são obrigatórios' });
    }
    try {
        const rowNumber = await (0, googleSheetsService_1.appendRow)(insumosSheetUrl, 'Dieta Insumos', values);
        logger_1.logger.info(`Relação dieta-insumos salva na linha ${rowNumber}`);
        return res.json({ success: true, rowNumber });
    }
    catch (error) {
        logger_1.logger.error(`Erro ao salvar relação dieta-insumos: ${error}`);
        return res.status(500).json({ error: 'Erro ao salvar relação dieta-insumos' });
    }
});
exports.insumosRouter.get('/estoque', async (req, res) => {
    const { insumosSheetUrl } = req.query;
    if (!insumosSheetUrl) {
        return res.status(400).json({ error: 'insumosSheetUrl é obrigatório' });
    }
    try {
        const rows = await (0, googleSheetsService_1.getRows)(insumosSheetUrl, 'Estoque');
        return res.json({ success: true, rows });
    }
    catch (error) {
        logger_1.logger.error(`Erro ao ler estoque: ${error}`);
        return res.status(500).json({ error: 'Erro ao ler estoque' });
    }
});
exports.insumosRouter.post('/estoque/inicializar', async (req, res) => {
    const { insumosSheetUrl, cadastroSheetUrl, estoquesIniciais } = req.body;
    if (!insumosSheetUrl || !cadastroSheetUrl) {
        return res.status(400).json({ error: 'insumosSheetUrl e cadastroSheetUrl são obrigatórios' });
    }
    try {
        // Ler insumos cadastrados (coluna 5 = INSUMOS) da planilha de cadastro
        const cadastroRows = await (0, googleSheetsService_1.getRows)(cadastroSheetUrl, 'Administrativo');
        const insumosCadastrados = cadastroRows.map((row) => row[5]).filter((val) => val);
        // Ler linhas existentes na aba Estoque
        const estoqueRows = await (0, googleSheetsService_1.getRows)(insumosSheetUrl, 'Estoque');
        const insumosComEstoque = estoqueRows.map((row) => row.length > 2 ? String(row[2]) : '').filter((val) => val);
        const linhasCriadas = [];
        const hoje = new Date().toLocaleDateString('pt-BR');
        for (const insumo of insumosCadastrados) {
            // Se já existe linha para este insumo, pular
            if (insumosComEstoque.includes(insumo)) {
                continue;
            }
            // Criar nova linha
            const estoqueInicial = estoquesIniciais?.[insumo] || 0;
            const values = [hoje, hoje, insumo, estoqueInicial, 0, estoqueInicial, estoqueInicial];
            const rowNumber = await (0, googleSheetsService_1.appendRow)(insumosSheetUrl, 'Estoque', values);
            linhasCriadas.push(insumo);
            logger_1.logger.info(`Linha de estoque criada para insumo "${insumo}" na linha ${rowNumber}`);
        }
        return res.json({ success: true, linhasCriadas, total: linhasCriadas.length });
    }
    catch (error) {
        logger_1.logger.error(`Erro ao inicializar estoque: ${error}`);
        return res.status(500).json({ error: 'Erro ao inicializar estoque' });
    }
});
exports.insumosRouter.post('/estoque/atualizar', async (req, res) => {
    const { insumosSheetUrl, insumoName } = req.body;
    if (!insumosSheetUrl || !insumoName) {
        return res.status(400).json({ error: 'insumosSheetUrl e insumoName são obrigatórios' });
    }
    try {
        // Calcular estoque atual
        const estoqueCalculado = await (0, googleSheetsService_1.calcularEstoque)(insumosSheetUrl, insumoName);
        // Encontrar linha do insumo na aba Estoque
        const rowNumber = await (0, googleSheetsService_1.findRowByInsumo)(insumosSheetUrl, 'Estoque', insumoName);
        if (!rowNumber) {
            return res.status(404).json({ error: `Insumo "${insumoName}" não encontrado na aba Estoque` });
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
        ];
        await (0, googleSheetsService_1.updateRow)(insumosSheetUrl, 'Estoque', rowNumber, values);
        logger_1.logger.info(`Estoque atualizado para insumo "${insumoName}" na linha ${rowNumber}`);
        return res.json({ success: true, values: estoqueCalculado });
    }
    catch (error) {
        logger_1.logger.error(`Erro ao atualizar estoque para insumo "${insumoName}": ${error}`);
        return res.status(500).json({ error: 'Erro ao atualizar estoque' });
    }
});
