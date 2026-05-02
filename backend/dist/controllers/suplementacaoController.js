"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.suplementacaoRouter = void 0;
const express_1 = require("express");
const googleSheetsService_1 = require("../services/googleSheetsService");
const logger_1 = require("../utils/logger");
exports.suplementacaoRouter = (0, express_1.Router)();
exports.suplementacaoRouter.get('/subtipos', async (req, res) => {
    const { fazenda, tipo, cadastroSheetUrl } = req.query;
    if (!tipo || !cadastroSheetUrl) {
        return res.status(400).json({ success: false, error: 'tipo e cadastroSheetUrl são obrigatórios' });
    }
    try {
        const subtipos = await (0, googleSheetsService_1.getSubtiposDaFazenda)(cadastroSheetUrl, fazenda || '', tipo);
        return res.json({ success: true, subtipos });
    }
    catch (error) {
        logger_1.logger.error(`Erro ao buscar subtipos: ${error}`);
        return res.status(500).json({ success: false, error: 'Erro ao buscar subtipos' });
    }
});
