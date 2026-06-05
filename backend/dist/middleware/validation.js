"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateCaderneta = validateCaderneta;
const joi_1 = __importDefault(require("joi"));
const logger_1 = require("../utils/logger");
const schemas = {
    maternidade: joi_1.default.object({
        data: joi_1.default.string().pattern(/^\d{2}\/\d{2}\/\d{4}$/).required(),
        pasto: joi_1.default.string().required(),
        pesoCria: joi_1.default.number().min(0).max(100).allow(null),
        idProvisorioCria: joi_1.default.string().required(),
        idBrincoCria: joi_1.default.string().allow('', null),
        idChipCria: joi_1.default.string().allow('', null),
        tratamento: joi_1.default.string().required(),
        tipoParto: joi_1.default.string().valid('Normal', 'Auxiliado', 'Cesárea', 'Aborto').required(),
        sexo: joi_1.default.string().valid('Macho', 'Fêmea').required(),
        raca: joi_1.default.string().valid('Nelore', 'Angus', 'Leiteiro', 'Outros').required(),
        idBrincoMae: joi_1.default.string().required(),
        idChipMae: joi_1.default.string().allow('', null),
        categoriaMae: joi_1.default.string().valid('Nulípara', 'Primípara', 'Secundípara', 'Multípara').required(),
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
        diagnosticos: joi_1.default.object().default({}),
        escoreFezes: joi_1.default.number().integer().min(1).max(5).required(),
        equipe: joi_1.default.number().integer().min(1).max(5).required(),
    }),
    suplementacao: joi_1.default.object({
        data: joi_1.default.string().pattern(/^\d{2}\/\d{2}\/\d{4}$/).required(),
        tratador: joi_1.default.string().required(),
        pasto: joi_1.default.string().required(),
        numeroLote: joi_1.default.string().required(),
        produto: joi_1.default.string().required(),
        leituraCocho: joi_1.default.number().integer().min(-1).max(3).required(),
        kgCocho: joi_1.default.number().min(0).default(0),
        kgDeposito: joi_1.default.number().min(0).default(0),
        // Checklist fields
        limpezaCocho: joi_1.default.boolean().allow(null),
        limpezaCochoObs: joi_1.default.string().allow(''),
        cochosCondicoes: joi_1.default.boolean().allow(null),
        cochosCondicoesObs: joi_1.default.string().allow(''),
        aterroAcessoIdeal: joi_1.default.boolean().allow(null),
        aterroAcessoIdealObs: joi_1.default.string().allow(''),
        espacamentoCochoCmCab: joi_1.default.number().min(0).allow(null),
        espacamentoCochoObs: joi_1.default.string().allow(''),
        depositoCondicoes: joi_1.default.boolean().allow(null),
        depositoCondicoesObs: joi_1.default.string().allow(''),
        estoqueDepositio: joi_1.default.boolean().allow(null),
        estoqueDepositioObs: joi_1.default.string().allow(''),
    }),
    bebedouros: joi_1.default.object({
        data: joi_1.default.string().pattern(/^\d{2}\/\d{2}\/\d{4}$/).required(),
        responsavel: joi_1.default.string().required(),
        pasto: joi_1.default.string().required(),
        numeroLote: joi_1.default.string().required(),
        leituraBebedouro: joi_1.default.number().integer().min(1).max(3).required(),
        numeroBebedouro: joi_1.default.string().allow(''),
        observacao: joi_1.default.string().allow(''),
        // Checklist fields
        aguaSuficiente: joi_1.default.boolean().allow(null),
        aguaSuficienteObs: joi_1.default.string().allow(''),
        vazaoBebedouroIdeal: joi_1.default.boolean().allow(null),
        vazaoBebedouroIdealObs: joi_1.default.string().allow(''),
        aterroAcessoBebedouroIdeal: joi_1.default.boolean().allow(null),
        aterroAcessoBebedouroIdealObs: joi_1.default.string().allow(''),
        espacamentoBebedouroIdeal: joi_1.default.boolean().allow(null),
        espacamentoBebedouroIdealObs: joi_1.default.string().allow(''),
        boiaProtecaoBoasCondicoes: joi_1.default.boolean().allow(null),
        boiaProtecaoBoasCondicoesObs: joi_1.default.string().allow(''),
    }),
    enfermaria: joi_1.default.object({
        data: joi_1.default.string().pattern(/^\d{2}\/\d{2}\/\d{4}$/).required(),
        pasto: joi_1.default.string().required(),
        lote: joi_1.default.string().required(),
        brinco: joi_1.default.string().allow(''),
        chip: joi_1.default.string().allow(''),
        sexo: joi_1.default.string().valid('Macho', 'Fêmea').required(),
        raca: joi_1.default.string().valid('Nelore', 'Angus', 'Leiteiro', 'Anelorado', 'SRD', 'Outros').required(),
        idade: joi_1.default.string().allow(''),
        categoria: joi_1.default.string().required(),
        tratamento: joi_1.default.string().allow(''),
        observacaoTratamento: joi_1.default.string().allow(''),
        diagnosticos: joi_1.default.object().pattern(/\S/, joi_1.default.object({
            valor: joi_1.default.alternatives().try(joi_1.default.boolean(), joi_1.default.string().valid('S', 'N').allow(null), joi_1.default.valid(null)),
            observacao: joi_1.default.string().allow('', null)
        })).default({}),
        medicamentos: joi_1.default.array().items(joi_1.default.object({
            medicamentoId: joi_1.default.string().allow(''),
            tipo: joi_1.default.string().allow(''),
            nomeComercial: joi_1.default.string().allow(''),
            principioAtivo: joi_1.default.string().allow(''),
            doseRecomendada: joi_1.default.string().allow(''),
            doseAplicada: joi_1.default.string().allow(''),
        })).default([]),
    }),
    movimentacao: joi_1.default.object({
        data: joi_1.default.string().pattern(/^\d{2}\/\d{2}\/\d{4}$/).required(),
        loteOrigem: joi_1.default.string().when('motivoMovimentacao', {
            is: 'Doação',
            then: joi_1.default.string().allow('', null),
            otherwise: joi_1.default.string().required()
        }),
        destino: joi_1.default.string().when('motivoMovimentacao', {
            is: 'Doação',
            then: joi_1.default.string().allow('', null),
            otherwise: joi_1.default.string().required()
        }),
        numeroCabecas: joi_1.default.number().integer().min(1).when('motivoMovimentacao', {
            is: 'Doação',
            then: joi_1.default.number().allow(null, 0),
            otherwise: joi_1.default.number().integer().min(1).required()
        }),
        pesoMedio: joi_1.default.number().min(0).allow(null),
        categoria: joi_1.default.string().when('motivoMovimentacao', {
            is: 'Doação',
            then: joi_1.default.string().allow('', null),
            otherwise: joi_1.default.string().required()
        }),
        motivoMovimentacao: joi_1.default.string().valid('Morte', 'Consumo', 'Transferência', 'Abate', 'Entrada', 'Entrevero', 'Doação').required(),
        tipoSaida: joi_1.default.string().allow('', null),
        tipoEntrada: joi_1.default.string().allow('', null),
        tipoDestino: joi_1.default.string().allow('', null),
        brincoChip: joi_1.default.string().allow(''),
        causaObservacao: joi_1.default.string().allow(''),
    }),
    morte: joi_1.default.object({
        data: joi_1.default.string().pattern(/^\d{2}\/\d{2}\/\d{4}$/).required(),
        pasto: joi_1.default.string().required(),
        lote: joi_1.default.string().allow(''),
        brinco: joi_1.default.string().allow(''),
        chip: joi_1.default.string().allow(''),
        categoria: joi_1.default.string().required(),
        categoriaOutros: joi_1.default.string().allow(''),
        sexo: joi_1.default.string().valid('Macho', 'Fêmea').required(),
        raca: joi_1.default.string().valid('Nelore', 'Angus', 'Leiteiro', 'Anelorado', 'SRD', 'Outros').required(),
        racaOutros: joi_1.default.string().allow(''),
        idade: joi_1.default.string().allow(''),
        pesoVivo: joi_1.default.number().min(0).allow(null),
        causaMorte: joi_1.default.string().required(),
        causaMorteOutros: joi_1.default.string().allow(''),
        escore: joi_1.default.number().allow(null),
        nutricaoAtual: joi_1.default.string().allow('', null),
        nutricaoAnterior: joi_1.default.string().allow('', null),
        diagnosticos: joi_1.default.object().pattern(/\S/, joi_1.default.object({
            valor: joi_1.default.alternatives().try(joi_1.default.boolean(), joi_1.default.string().valid('S', 'N').allow(null), joi_1.default.valid(null)),
            observacao: joi_1.default.string().allow('', null)
        })).default({}),
    }),
    clima: joi_1.default.object({
        data: joi_1.default.string().pattern(/^\d{2}\/\d{2}\/\d{4}$/).required(),
        responsavel: joi_1.default.string().required(),
        temperaturaMedia: joi_1.default.number().min(-50).max(60).allow(null),
        umidadeRelativa: joi_1.default.number().min(0).max(100).allow(null),
        observacao: joi_1.default.string().allow(''),
        medicoes: joi_1.default.array().items(joi_1.default.object({
            pluviometro_id: joi_1.default.string().required(),
            pluviometro_nome: joi_1.default.string().required(),
            pluviometro_localizacao: joi_1.default.string().allow(''),
            medicao: joi_1.default.number().min(0).required(),
        })).allow(null).optional(),
    }),
    abastecimento: joi_1.default.object({
        data: joi_1.default.string().pattern(/^\d{2}\/\d{2}\/\d{4}$/).required(),
        quemAbasteceu: joi_1.default.string().required(),
        operadorMotorista: joi_1.default.string().required(),
        veiculoTrator: joi_1.default.string().required(),
        placa: joi_1.default.string().required(),
        hidrometroInicial: joi_1.default.number().min(0).required(),
        hidrometroFinal: joi_1.default.number().min(0).required(),
        totalAbastecido: joi_1.default.number().min(0).required(),
        combustivel: joi_1.default.string().valid('Álcool', 'Gasolina', 'Diesel S10', 'Diesel Comum').required(),
        odometro: joi_1.default.string().required(),
        tipoOperacao: joi_1.default.string().valid('Nutrição', 'Pulverização', 'Gradagem', 'Fertilização/Correção', 'Limpeza', 'Niveladora', 'Rodagem', 'Manutenção', 'Plantio', 'Esterco', 'Colheita', 'Compactação', 'Roçada', 'Serviços Gerais', 'Terraplanagem', 'Outros').required(),
        tipoOperacaoOutros: joi_1.default.string().allow(''),
        observacao: joi_1.default.string().allow(''),
    }),
    cantina: joi_1.default.object({
        data: joi_1.default.string().pattern(/^\d{2}\/\d{2}\/\d{4}$/).required(),
        numeroCozinheiras: joi_1.default.number().min(0).required(),
        quemCozinhou: joi_1.default.string().required(),
        quemAjudou: joi_1.default.string().allow(''),
        numeroCafeManha: joi_1.default.number().min(0).allow(''),
        numeroLanches: joi_1.default.number().min(0).allow(''),
        numeroRefeicoesAlmoco: joi_1.default.number().min(0).allow(''),
        numeroRefeicoesJantar: joi_1.default.number().min(0).allow(''),
        itens: joi_1.default.object().custom((value) => {
            if (!value || typeof value !== 'object') {
                throw new Error('Preencha pelo menos um item');
            }
            const valores = Object.values(value);
            const algumPreenchido = valores.some((v) => v !== null && v !== undefined && v !== '' && Number(v) > 0);
            if (!algumPreenchido) {
                throw new Error('Preencha pelo menos um item');
            }
            return value;
        }).default({}),
        nomeOutros: joi_1.default.string().allow(''),
        quantidadeOutros: joi_1.default.string().allow(''),
        unidadeOutros: joi_1.default.string().valid('kg', 'unid.', 'pct').allow(''),
        observacao: joi_1.default.string().allow(''),
    }),
    'manutencao-maquinas': joi_1.default.object({
        data: joi_1.default.string().pattern(/^\d{2}\/\d{2}\/\d{4}$/).required(),
        responsavelChecklist: joi_1.default.string().required(),
        operadorMotorista: joi_1.default.string().allow(''),
        veiculoTrator: joi_1.default.string().required(),
        placa: joi_1.default.string().allow(''),
        odometro: joi_1.default.string().allow(''),
        checklist: joi_1.default.object().pattern(/\S/, joi_1.default.object({
            valor: joi_1.default.alternatives().try(joi_1.default.boolean(), joi_1.default.string().valid('S', 'N').allow(null), joi_1.default.valid(null)),
            observacao: joi_1.default.string().allow('', null)
        })).default({}),
        observacao: joi_1.default.string().allow(''),
    }),
    'operacoes-maquinas': joi_1.default.object({
        data: joi_1.default.string().pattern(/^\d{2}\/\d{2}\/\d{4}$/).required(),
        maquinaVeiculo: joi_1.default.string().required(),
        maquinaVeiculoId: joi_1.default.string().allow('', null),
        implementoUtilizado: joi_1.default.string().allow('', null),
        horaInicial: joi_1.default.string().allow('', null),
        horaFinal: joi_1.default.string().allow('', null),
        totalHorasTrabalhadas: joi_1.default.string().allow('', null),
        odometroHorimetroInicial: joi_1.default.string().allow('', null),
        odometroHorimetroFinal: joi_1.default.string().allow('', null),
        totalOdometroHorimetro: joi_1.default.string().allow('', null),
        tipoOperacao: joi_1.default.string().allow('', null),
        insumoAplicado: joi_1.default.string().allow('', null),
        quantidadeTotalAplicada: joi_1.default.string().allow('', null),
        areaTrabalhada: joi_1.default.string().allow('', null),
        doseAplicada: joi_1.default.string().allow('', null),
        metaDiariaBatida: joi_1.default.string().allow('', null),
        metaDiariaBatidaObs: joi_1.default.string().allow('', null),
        algumImprevisto: joi_1.default.string().allow('', null),
        algumImprevistoObs: joi_1.default.string().allow('', null),
        observacao: joi_1.default.string().allow('', null),
    }),
    problemas: joi_1.default.object({
        data: joi_1.default.string().pattern(/^\d{2}\/\d{2}\/\d{4}$/).required(),
        setor: joi_1.default.string().valid('Gado', 'Máquinas', 'ADM', 'Fábrica', 'Manutenção', 'Terceirizado').required(),
        local: joi_1.default.string().required(),
        descricaoProblema: joi_1.default.string().required(),
        causaIdentificada: joi_1.default.string().valid('S', 'N').required(),
        causaIdentificadaObs: joi_1.default.string().allow(''),
        acaoCorretivaRealizada: joi_1.default.string().valid('S', 'N').required(),
        acaoCorretivaRealizadaObs: joi_1.default.string().allow(''),
        tipoOcorrencia: joi_1.default.string().valid('Única', 'Repetitiva').required(),
        tipoOcorrenciaObs: joi_1.default.string().allow(''),
        causaRaizIdentificada: joi_1.default.string().valid('S', 'N').required(),
        causaRaizIdentificadaObs: joi_1.default.string().allow(''),
        gravidadeImpacto: joi_1.default.string().valid('baixa', 'média', 'alta').required(),
        gravidadeImpactoObs: joi_1.default.string().allow(''),
        tipoProblema: joi_1.default.string().valid('Estrutural', 'Máquinas', 'Processos', 'Rebanho').required(),
        tipoProblemaObs: joi_1.default.string().allow(''),
        prioridade: joi_1.default.string().valid('baixa', 'média', 'alta').required(),
        setorResolve: joi_1.default.string().allow(''),
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
