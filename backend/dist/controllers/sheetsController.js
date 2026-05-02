"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sheetsRouter = void 0;
const express_1 = require("express");
const googleSheetsService_1 = require("../services/googleSheetsService");
const logger_1 = require("../utils/logger");
exports.sheetsRouter = (0, express_1.Router)();
const SHEET_NAMES = {
    maternidade: 'Maternidade Cria',
    pastagens: 'Troca de Pastos',
    rodeio: 'Rodeio Gado',
    suplementacao: 'Suplementação',
    bebedouros: 'Bebedouros',
    movimentacao: 'Movimentação',
    enfermaria: 'Enfermaria',
    'entrada-insumos': 'Entrada Insumos',
    'saida-insumos': 'Saída Insumos',
    'insumos-por-saida': 'Insumos por Saída',
};
exports.sheetsRouter.post('/validate', async (req, res) => {
    const { planilhaUrl } = req.body;
    if (!planilhaUrl) {
        return res.status(400).json({ error: 'Link da planilha é obrigatório' });
    }
    const valid = await (0, googleSheetsService_1.validateConnection)(planilhaUrl);
    if (valid) {
        return res.json({ success: true, message: 'Conexão com planilha validada' });
    }
    return res.status(400).json({ success: false, error: 'Não foi possível conectar à planilha' });
});
exports.sheetsRouter.post('/list-sheets', async (req, res) => {
    const { planilhaUrl } = req.body;
    if (!planilhaUrl) {
        return res.status(400).json({ error: 'Link da planilha é obrigatório' });
    }
    try {
        const sheets = await (0, googleSheetsService_1.listSheets)(planilhaUrl);
        return res.json({ success: true, sheets });
    }
    catch (error) {
        logger_1.logger.error(`Erro ao listar abas: ${error}`);
        return res.status(500).json({ error: 'Erro ao listar abas da planilha' });
    }
});
exports.sheetsRouter.post('/validate-farm', async (req, res) => {
    const { planilhaUrl, farmId, linkPosition } = req.body;
    if (!planilhaUrl || !farmId) {
        return res.status(400).json({ error: 'planilhaUrl e farmId são obrigatórios' });
    }
    try {
        const result = await (0, googleSheetsService_1.validateFarm)(planilhaUrl, farmId, linkPosition || 1);
        return res.json({ success: result.success, farmName: result.farmName, farmSheetUrl: result.farmSheetUrl });
    }
    catch (error) {
        logger_1.logger.error(`Erro ao validar fazenda: ${error}`);
        return res.status(500).json({ error: 'Erro ao validar fazenda' });
    }
});
exports.sheetsRouter.post('/:caderneta', async (req, res) => {
    const { caderneta } = req.params;
    const { planilhaUrl, values, id } = req.body;
    const sheetName = SHEET_NAMES[caderneta];
    if (!sheetName) {
        return res.status(404).json({ error: `Caderneta '${caderneta}' não encontrada` });
    }
    if (!planilhaUrl || !values) {
        return res.status(400).json({ error: 'planilhaUrl e values são obrigatórios' });
    }
    try {
        const valuesWithId = id ? [id, ...values] : values;
        const rowNumber = await (0, googleSheetsService_1.appendRow)(planilhaUrl, sheetName, valuesWithId);
        logger_1.logger.info(`Registro adicionado em ${caderneta}, linha ${rowNumber}`);
        return res.json({ success: true, rowNumber });
    }
    catch (error) {
        logger_1.logger.error(`Erro ao adicionar registro em ${caderneta}: ${error}`);
        return res.status(500).json({ error: 'Erro ao salvar na planilha' });
    }
});
exports.sheetsRouter.put('/:caderneta/:rowNumber', async (req, res) => {
    const { caderneta, rowNumber } = req.params;
    const { planilhaUrl, values } = req.body;
    const sheetName = SHEET_NAMES[caderneta];
    if (!sheetName) {
        return res.status(404).json({ error: `Caderneta '${caderneta}' não encontrada` });
    }
    if (!planilhaUrl || !values) {
        return res.status(400).json({ error: 'planilhaUrl e values são obrigatórios' });
    }
    try {
        await (0, googleSheetsService_1.updateRow)(planilhaUrl, sheetName, parseInt(rowNumber), values);
        logger_1.logger.info(`Registro atualizado em ${caderneta}, linha ${rowNumber}`);
        return res.json({ success: true });
    }
    catch (error) {
        logger_1.logger.error(`Erro ao atualizar registro em ${caderneta}: ${error}`);
        return res.status(500).json({ error: 'Erro ao atualizar na planilha' });
    }
});
exports.sheetsRouter.get('/:caderneta', async (req, res) => {
    const { caderneta } = req.params;
    const { planilhaUrl } = req.query;
    const sheetName = SHEET_NAMES[caderneta];
    if (!sheetName) {
        return res.status(404).json({ error: `Caderneta '${caderneta}' não encontrada` });
    }
    if (!planilhaUrl) {
        return res.status(400).json({ error: 'planilhaUrl é obrigatório' });
    }
    try {
        const rows = await (0, googleSheetsService_1.getRows)(planilhaUrl, sheetName);
        return res.json({ success: true, rows });
    }
    catch (error) {
        logger_1.logger.error(`Erro ao buscar registros de ${caderneta}: ${error}`);
        return res.status(500).json({ error: 'Erro ao buscar dados da planilha' });
    }
});
