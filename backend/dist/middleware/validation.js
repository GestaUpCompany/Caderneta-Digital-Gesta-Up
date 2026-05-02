"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateCaderneta = validateCaderneta;
exports.validateSyncRequest = validateSyncRequest;
const joi_1 = __importDefault(require("joi"));
const logger_1 = require("../utils/logger");
const schemas = {
    maternidade: joi_1.default.object({
        data: joi_1.default.string().pattern(/^\d{2}\/\d{2}\/\d{4}$/).required(),
        pasto: joi_1.default.string().required(),
        pesoCria: joi_1.default.number().min(0).max(100).allow(null),
        numeroCria: joi_1.default.string().required(),
        tratamento: joi_1.default.string().valid('Colostro', 'Antibiótico', 'Vitaminas', 'Soro', 'Outros').required(),
        tipoParto: joi_1.default.string().valid('Normal', 'Auxiliado', 'Cesárea', 'Aborto').required(),
        sexo: joi_1.default.string().valid('Macho', 'Fêmea').required(),
        raca: joi_1.default.string().valid('Nelore', 'Angus', 'Leiteiro', 'Outros').required(),
        numeroMae: joi_1.default.string().required(),
        categoriaMae: joi_1.default.string().valid('Nulípara', 'Primípara', 'Multípara', 'Leiteira').required(),
    }),
    pastagens: joi_1.default.object({
        data: joi_1.default.string().pattern(/^\d{2}\/\d{2}\/\d{4}$/).required(),
        manejador: joi_1.default.string().required(),
        numeroLote: joi_1.default.string().required(),
        pastoSaida: joi_1.default.string().required(),
        avaliacaoSaida: joi_1.default.number().integer().min(1).max(5).required(),
        tempoOcupacao: joi_1.default.string().allow(''),
        pastoEntrada: joi_1.default.string().required(),
        avaliacaoEntrada: joi_1.default.number().integer().min(1).max(5).required(),
        tempoVedacao: joi_1.default.string().allow(''),
        vaca: joi_1.default.number().min(0).default(0),
        touro: joi_1.default.number().min(0).default(0),
        boiGordo: joi_1.default.number().min(0).default(0),
        boiMagro: joi_1.default.number().min(0).default(0),
        garrote: joi_1.default.number().min(0).default(0),
        bezerro: joi_1.default.number().min(0).default(0),
        novilha: joi_1.default.number().min(0).default(0),
        tropa: joi_1.default.number().min(0).default(0),
        outros: joi_1.default.number().min(0).default(0),
        escoreGado: joi_1.default.number().integer().min(1).max(5).allow(null),
    }),
    rodeio: joi_1.default.object({
        data: joi_1.default.string().pattern(/^\d{2}\/\d{2}\/\d{4}$/).required(),
        pasto: joi_1.default.string().required(),
        numeroLote: joi_1.default.string().required(),
        vaca: joi_1.default.number().min(0).default(0),
        touro: joi_1.default.number().min(0).default(0),
        boiGordo: joi_1.default.number().min(0).default(0),
        boiMagro: joi_1.default.number().min(0).default(0),
        garrote: joi_1.default.number().min(0).default(0),
        bezerro: joi_1.default.number().min(0).default(0),
        novilha: joi_1.default.number().min(0).default(0),
        tropa: joi_1.default.number().min(0).default(0),
        outros: joi_1.default.number().min(0).default(0),
        totalCabecas: joi_1.default.number().min(0).required(),
        escoreGadoIdeal: joi_1.default.string().valid('S', 'N').required(),
        escoreGadoIdealObs: joi_1.default.string().allow(''),
        aguaBoaBebedouro: joi_1.default.string().valid('S', 'N').required(),
        aguaBoaBebedouroObs: joi_1.default.string().allow(''),
        pastagemAdequada: joi_1.default.string().valid('S', 'N').required(),
        pastagemAdequadaObs: joi_1.default.string().allow(''),
        animaisDoentes: joi_1.default.string().valid('S', 'N').required(),
        animaisDoentesObs: joi_1.default.string().allow(''),
        cercasCochos: joi_1.default.string().valid('S', 'N').required(),
        cercasCochosObs: joi_1.default.string().allow(''),
        carrapatosMoscas: joi_1.default.string().valid('S', 'N').required(),
        carrapatosMoscasObs: joi_1.default.string().allow(''),
        animaisEntreverados: joi_1.default.string().valid('S', 'N').required(),
        animaisEntreveradosObs: joi_1.default.string().allow(''),
        animalMorto: joi_1.default.string().valid('S', 'N').required(),
        animalMortoObs: joi_1.default.string().allow(''),
        escoreFezes: joi_1.default.number().integer().min(1).max(5).required(),
        equipe: joi_1.default.number().integer().min(1).max(5).required(),
    }),
    suplementacao: joi_1.default.object({
        data: joi_1.default.string().pattern(/^\d{2}\/\d{2}\/\d{4}$/).required(),
        tratador: joi_1.default.string().required(),
        pasto: joi_1.default.string().required(),
        numeroLote: joi_1.default.string().required(),
        produto: joi_1.default.string().required(),
        creepKg: joi_1.default.string().allow(''),
        leituraCocho: joi_1.default.number().integer().min(-1).max(3).required(),
        kgCocho: joi_1.default.number().min(0).default(0),
        kgDeposito: joi_1.default.number().min(0).default(0),
        categorias: joi_1.default.array().items(joi_1.default.string()).min(1).required(),
    }),
    bebedouros: joi_1.default.object({
        data: joi_1.default.string().pattern(/^\d{2}\/\d{2}\/\d{4}$/).required(),
        responsavel: joi_1.default.string().required(),
        pasto: joi_1.default.string().required(),
        numeroLote: joi_1.default.string().required(),
        categoria: joi_1.default.string().required(),
        leituraBebedouro: joi_1.default.number().integer().min(1).max(3).required(),
        numeroBebedouro: joi_1.default.string().allow(''),
        observacao: joi_1.default.string().allow(''),
    }),
    movimentacao: joi_1.default.object({
        data: joi_1.default.string().pattern(/^\d{2}\/\d{2}\/\d{4}$/).required(),
        loteOrigem: joi_1.default.string().required(),
        loteDestino: joi_1.default.string().required(),
        numeroCabecas: joi_1.default.number().integer().min(1).required(),
        pesoMedio: joi_1.default.number().min(0).allow(null),
        categoria: joi_1.default.string().required(),
        motivoMovimentacao: joi_1.default.string().valid('Morte', 'Consumo', 'Transferência', 'Abate', 'Entrada', 'Entreverado').required(),
        brincoChip: joi_1.default.string().allow(''),
        causaObservacao: joi_1.default.string().allow(''),
    }),
};
function validateCaderneta(caderneta) {
    return (req, res, next) => {
        const schema = schemas[caderneta];
        if (!schema) {
            return res.status(400).json({ error: `Caderneta '${caderneta}' não suportada para validação` });
        }
        const { error } = schema.validate(req.body.values || req.body, { abortEarly: false });
        if (error) {
            const errors = error.details.map((d) => ({
                field: d.path.join('.'),
                message: d.message,
            }));
            logger_1.logger.warn(`Validação falhou para ${caderneta}: ${JSON.stringify(errors)}`);
            return res.status(400).json({ error: 'Dados inválidos', errors });
        }
        next();
    };
}
function validateSyncRequest(req, res, next) {
    const schema = joi_1.default.object({
        planilhaUrl: joi_1.default.string().uri().required(),
        registros: joi_1.default.array().items(joi_1.default.object({
            id: joi_1.default.string().required(),
            caderneta: joi_1.default.string().valid('maternidade', 'pastagens', 'rodeio', 'suplementacao', 'bebedouros', 'movimentacao').required(),
            operacao: joi_1.default.string().valid('create', 'update', 'delete').required(),
            dados: joi_1.default.object().required(),
        })).min(1).required(),
    });
    const { error } = schema.validate(req.body);
    if (error) {
        logger_1.logger.warn(`Validação de sync falhou: ${error.message}`);
        return res.status(400).json({ error: 'Requisição de sincronização inválida' });
    }
    next();
}
