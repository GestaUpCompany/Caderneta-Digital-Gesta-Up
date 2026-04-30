import { Request, Response, NextFunction } from 'express'
import Joi from 'joi'
import { logger } from '../utils/logger'

const schemas: Record<string, Joi.ObjectSchema> = {
  maternidade: Joi.object({
    data: Joi.string().pattern(/^\d{2}\/\d{2}\/\d{4}$/).required(),
    pasto: Joi.string().required(),
    pesoCria: Joi.number().min(0).max(100).allow(null),
    numeroCria: Joi.string().required(),
    tratamento: Joi.string().valid('Colostro', 'Antibiótico', 'Vitaminas', 'Soro', 'Outros').required(),
    tipoParto: Joi.string().valid('Normal', 'Auxiliado', 'Cesárea', 'Aborto').required(),
    sexo: Joi.string().valid('Macho', 'Fêmea').required(),
    raca: Joi.string().valid('Nelore', 'Angus', 'Leiteiro', 'Outros').required(),
    numeroMae: Joi.string().required(),
    categoriaMae: Joi.string().valid('Nulípara', 'Primípara', 'Multípara', 'Leiteira').required(),
  }),

  pastagens: Joi.object({
    data: Joi.string().pattern(/^\d{2}\/\d{2}\/\d{4}$/).required(),
    manejador: Joi.string().required(),
    numeroLote: Joi.string().required(),
    pastoSaida: Joi.string().required(),
    avaliacaoSaida: Joi.number().integer().min(1).max(5).required(),
    tempoOcupacao: Joi.string().allow(''),
    pastoEntrada: Joi.string().required(),
    avaliacaoEntrada: Joi.number().integer().min(1).max(5).required(),
    tempoVedacao: Joi.string().allow(''),
    vaca: Joi.number().min(0).default(0),
    touro: Joi.number().min(0).default(0),
    boiGordo: Joi.number().min(0).default(0),
    boiMagro: Joi.number().min(0).default(0),
    garrote: Joi.number().min(0).default(0),
    bezerro: Joi.number().min(0).default(0),
    novilha: Joi.number().min(0).default(0),
    tropa: Joi.number().min(0).default(0),
    outros: Joi.number().min(0).default(0),
    escoreGado: Joi.number().integer().min(1).max(5).allow(null),
  }),

  rodeio: Joi.object({
    data: Joi.string().pattern(/^\d{2}\/\d{2}\/\d{4}$/).required(),
    pasto: Joi.string().required(),
    numeroLote: Joi.string().required(),
    vaca: Joi.number().min(0).default(0),
    touro: Joi.number().min(0).default(0),
    boiGordo: Joi.number().min(0).default(0),
    boiMagro: Joi.number().min(0).default(0),
    garrote: Joi.number().min(0).default(0),
    bezerro: Joi.number().min(0).default(0),
    novilha: Joi.number().min(0).default(0),
    tropa: Joi.number().min(0).default(0),
    outros: Joi.number().min(0).default(0),
    totalCabecas: Joi.number().min(0).required(),
    escoreGadoIdeal: Joi.string().valid('S', 'N').required(),
    escoreGadoIdealObs: Joi.string().allow(''),
    aguaBoaBebedouro: Joi.string().valid('S', 'N').required(),
    aguaBoaBebedouroObs: Joi.string().allow(''),
    pastagemAdequada: Joi.string().valid('S', 'N').required(),
    pastagemAdequadaObs: Joi.string().allow(''),
    animaisDoentes: Joi.string().valid('S', 'N').required(),
    animaisDoentesObs: Joi.string().allow(''),
    cercasCochos: Joi.string().valid('S', 'N').required(),
    cercasCochosObs: Joi.string().allow(''),
    carrapatosMoscas: Joi.string().valid('S', 'N').required(),
    carrapatosMoscasObs: Joi.string().allow(''),
    animaisEntreverados: Joi.string().valid('S', 'N').required(),
    animaisEntreveradosObs: Joi.string().allow(''),
    animalMorto: Joi.string().valid('S', 'N').required(),
    animalMortoObs: Joi.string().allow(''),
    escoreFezes: Joi.number().integer().min(1).max(5).required(),
    equipe: Joi.number().integer().min(1).max(5).required(),
  }),

  suplementacao: Joi.object({
    data: Joi.string().pattern(/^\d{2}\/\d{2}\/\d{4}$/).required(),
    tratador: Joi.string().required(),
    pasto: Joi.string().required(),
    numeroLote: Joi.string().required(),
    produto: Joi.string().required(),
    creepKg: Joi.string().allow(''),
    leituraCocho: Joi.number().integer().min(-1).max(3).required(),
    kgCocho: Joi.number().min(0).default(0),
    kgDeposito: Joi.number().min(0).default(0),
    categorias: Joi.array().items(Joi.string()).min(1).required(),
  }),

  bebedouros: Joi.object({
    data: Joi.string().pattern(/^\d{2}\/\d{2}\/\d{4}$/).required(),
    responsavel: Joi.string().required(),
    pasto: Joi.string().required(),
    numeroLote: Joi.string().required(),
    categoria: Joi.string().required(),
    leituraBebedouro: Joi.number().integer().min(1).max(3).required(),
    numeroBebedouro: Joi.string().allow(''),
    observacao: Joi.string().allow(''),
  }),

  movimentacao: Joi.object({
    data: Joi.string().pattern(/^\d{2}\/\d{2}\/\d{4}$/).required(),
    loteOrigem: Joi.string().required(),
    loteDestino: Joi.string().required(),
    numeroCabecas: Joi.number().integer().min(1).required(),
    pesoMedio: Joi.number().min(0).allow(null),
    categoria: Joi.string().required(),
    motivoMovimentacao: Joi.string().valid('Morte', 'Consumo', 'Transferência', 'Abate', 'Entrada', 'Entreverado').required(),
    brincoChip: Joi.string().allow(''),
    causaObservacao: Joi.string().allow(''),
  }),
}

export function validateCaderneta(caderneta: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    const schema = schemas[caderneta]
    if (!schema) {
      return res.status(400).json({ error: `Caderneta '${caderneta}' não suportada para validação` })
    }

    const { error } = schema.validate(req.body.values || req.body, { abortEarly: false })
    
    if (error) {
      const errors = error.details.map((d) => ({
        field: d.path.join('.'),
        message: d.message,
      }))
      logger.warn(`Validação falhou para ${caderneta}: ${JSON.stringify(errors)}`)
      return res.status(400).json({ error: 'Dados inválidos', errors })
    }

    next()
  }
}

export function validateSyncRequest(req: Request, res: Response, next: NextFunction) {
  const schema = Joi.object({
    planilhaUrl: Joi.string().uri().required(),
    registros: Joi.array().items(Joi.object({
      id: Joi.string().required(),
      caderneta: Joi.string().valid('maternidade', 'pastagens', 'rodeio', 'suplementacao', 'bebedouros', 'movimentacao').required(),
      operacao: Joi.string().valid('create', 'update', 'delete').required(),
      dados: Joi.object().required(),
    })).min(1).required(),
  })

  const { error } = schema.validate(req.body)
  
  if (error) {
    logger.warn(`Validação de sync falhou: ${error.message}`)
    return res.status(400).json({ error: 'Requisição de sincronização inválida' })
  }

  next()
}
