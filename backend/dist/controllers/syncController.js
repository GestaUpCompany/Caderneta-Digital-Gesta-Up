"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.syncRouter = void 0;
const express_1 = require("express");
const googleSheetsService_1 = require("../services/googleSheetsService");
const validation_1 = require("../middleware/validation");
const logger_1 = require("../utils/logger");
exports.syncRouter = (0, express_1.Router)();
const SHEET_NAMES = {
    maternidade: 'Maternidade Cria',
    pastagens: 'Troca de Pastos',
    rodeio: 'Rodeio Gado',
    suplementacao: 'Suplementação',
    bebedouros: 'Bebedouros',
    movimentacao: 'Movimentação',
    enfermaria: 'Enfermaria',
};
async function processBatch(planilhaUrl, registros) {
    const results = [];
    for (const registro of registros) {
        try {
            const sheetName = SHEET_NAMES[registro.caderneta];
            if (!sheetName) {
                results.push({ id: registro.id, success: false, error: 'Caderneta não encontrada' });
                continue;
            }
            const values = [registro.id, ...Object.values(registro.dados)];
            if (registro.operacao === 'create') {
                const rowNumber = await (0, googleSheetsService_1.appendRow)(planilhaUrl, sheetName, values);
                results.push({ id: registro.id, success: true, googleRowId: rowNumber });
                logger_1.logger.info(`Sync create: ${registro.caderneta}, linha ${rowNumber}`);
            }
            else if (registro.operacao === 'update' && registro.dados.googleRowId) {
                await (0, googleSheetsService_1.updateRow)(planilhaUrl, sheetName, Number(registro.dados.googleRowId), values);
                results.push({ id: registro.id, success: true, googleRowId: Number(registro.dados.googleRowId) });
                logger_1.logger.info(`Sync update: ${registro.caderneta}, linha ${registro.dados.googleRowId}`);
            }
            else {
                results.push({ id: registro.id, success: false, error: 'Operação não suportada' });
            }
        }
        catch (error) {
            const errorMsg = error instanceof Error ? error.message : 'Erro desconhecido';
            results.push({ id: registro.id, success: false, error: errorMsg });
            logger_1.logger.error(`Sync erro ${registro.id}: ${errorMsg}`);
        }
    }
    return results;
}
exports.syncRouter.post('/batch', validation_1.validateSyncRequest, async (req, res) => {
    const { planilhaUrl, registros } = req.body;
    try {
        const results = await processBatch(planilhaUrl, registros);
        const sucessos = results.filter((r) => r.success).length;
        const falhas = results.filter((r) => !r.success).length;
        logger_1.logger.info(`Sincronização batch: ${sucessos} sucessos, ${falhas} falhas`);
        return res.json({
            success: falhas === 0,
            summary: { total: registros.length, sucessos, falhas },
            results,
        });
    }
    catch (error) {
        logger_1.logger.error(`Erro no sync batch: ${error}`);
        return res.status(500).json({ error: 'Erro ao processar sincronização' });
    }
});
exports.syncRouter.post('/validate-connection', async (req, res) => {
    const { planilhaUrl } = req.body;
    if (!planilhaUrl) {
        return res.status(400).json({ error: 'planilhaUrl é obrigatório' });
    }
    try {
        (0, googleSheetsService_1.extractSpreadsheetId)(planilhaUrl);
        return res.json({ success: true, message: 'URL válida' });
    }
    catch (error) {
        return res.status(400).json({ success: false, error: 'URL da planilha inválida' });
    }
});
