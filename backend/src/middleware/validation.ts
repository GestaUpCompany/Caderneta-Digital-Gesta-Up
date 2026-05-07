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
    // Checklist fields
    limpezaCocho: Joi.boolean().allow(null),
    limpezaCochoObs: Joi.string().allow(''),
    cochosCondicoes: Joi.boolean().allow(null),
    cochosCondicoesObs: Joi.string().allow(''),
    aterroAcessoIdeal: Joi.boolean().allow(null),
    aterroAcessoIdealObs: Joi.string().allow(''),
    espacamentoCochoCmCab: Joi.number().min(0).allow(null),
    espacamentoCochoObs: Joi.string().allow(''),
    depositoCondicoes: Joi.boolean().allow(null),
    depositoCondicoesObs: Joi.string().allow(''),
    estoqueDepositio: Joi.boolean().allow(null),
    estoqueDepositioObs: Joi.string().allow(''),
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
    // Checklist fields
    aguaSuficiente: Joi.boolean().allow(null),
    aguaSuficienteObs: Joi.string().allow(''),
    vazaoBebedouroIdeal: Joi.boolean().allow(null),
    vazaoBebedouroIdealObs: Joi.string().allow(''),
    aterroAcessoBebedouroIdeal: Joi.boolean().allow(null),
    aterroAcessoBebedouroIdealObs: Joi.string().allow(''),
    espacamentoBebedouroIdeal: Joi.boolean().allow(null),
    espacamentoBebedouroIdealObs: Joi.string().allow(''),
    boiaProtecaoBoasCondicoes: Joi.boolean().allow(null),
    boiaProtecaoBoasCondicoesObs: Joi.string().allow(''),
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

  morte: Joi.object({
    data: Joi.string().pattern(/^\d{2}\/\d{2}\/\d{4}$/).required(),
    pasto: Joi.string().required(),
    lote: Joi.string().allow(''),
    brinco: Joi.string().allow(''),
    chip: Joi.string().allow(''),
    categoria: Joi.string().required(),
    categoriaOutros: Joi.string().allow(''),
    sexo: Joi.string().valid('Macho', 'Fêmea').required(),
    raca: Joi.string().valid('Nelore', 'Angus', 'Leiteiro', 'Anelorado', 'SRD', 'Outros').required(),
    racaOutros: Joi.string().allow(''),
    idade: Joi.string().allow(''),
    pesoVivo: Joi.number().min(0).allow(null),
    causaMorte: Joi.string().required(),
    causaMorteOutros: Joi.string().allow(''),
    secrecaoOrificios: Joi.string().valid('S', 'N').required(),
    secrecaoOrificiosObs: Joi.string().allow(''),
    sintomasPneumonia: Joi.string().valid('S', 'N').required(),
    sintomasPneumoniaObs: Joi.string().allow(''),
    inchaco: Joi.string().valid('S', 'N').required(),
    inchacoObs: Joi.string().allow(''),
    incoordenacaoTremores: Joi.string().valid('S', 'N').required(),
    incoordenacaoTremoresObs: Joi.string().allow(''),
    apatiaFraqueza: Joi.string().valid('S', 'N').required(),
    apatiaFraquezaObs: Joi.string().allow(''),
    presencaSangue: Joi.string().valid('S', 'N').required(),
    presencaSangueObs: Joi.string().allow(''),
    desordensDigestivas: Joi.string().valid('S', 'N').required(),
    desordensDigestivasObs: Joi.string().allow(''),
  }),
  clima: Joi.object({
    data: Joi.string().pattern(/^\d{2}\/\d{2}\/\d{4}$/).required(),
    responsavel: Joi.string().required(),
    temperaturaMedia: Joi.number().min(-50).max(60).allow(null),
    observacao: Joi.string().allow(''),
    medicoes: Joi.array().items(Joi.object({
      pluviometro_id: Joi.string().required(),
      pluviometro_nome: Joi.string().required(),
      pluviometro_localizacao: Joi.string().allow(''),
      medicao: Joi.number().min(0).required(),
    })).allow(null).optional(),
  }),

  abastecimento: Joi.object({
    data: Joi.string().pattern(/^\d{2}\/\d{2}\/\d{4}$/).required(),
    quemAbasteceu: Joi.string().required(),
    operadorMotorista: Joi.string().required(),
    veiculoTrator: Joi.string().required(),
    placa: Joi.string().required(),
    hidrometroInicial: Joi.number().min(0).required(),
    hidrometroFinal: Joi.number().min(0).required(),
    totalAbastecido: Joi.number().min(0).required(),
    combustivel: Joi.string().valid('Álcool', 'Gasolina', 'Diesel S10', 'Diesel Comum').required(),
    odometro: Joi.string().required(),
    tipoOperacao: Joi.string().valid('Nutrição', 'Pulverização', 'Gradagem', 'Fertilização/Correção', 'Limpeza', 'Niveladora', 'Rodagem', 'Manutenção', 'Plantio', 'Esterco', 'Colheita', 'Compactação', 'Roçada', 'Serviços Gerais', 'Terraplanagem').required(),
    observacao: Joi.string().allow(''),
  }),

  cantina: Joi.object({
    data: Joi.string().pattern(/^\d{2}\/\d{2}\/\d{4}$/).required(),
    numeroCozinheiras: Joi.number().min(0).required(),
    quemCozinhou: Joi.string().required(),
    quemAjudou: Joi.string().allow(''),
    numeroCafeManha: Joi.number().min(0).allow(''),
    numeroLanches: Joi.number().min(0).allow(''),
    numeroRefeicoesAlmoco: Joi.number().min(0).allow(''),
    numeroRefeicoesJantar: Joi.number().min(0).allow(''),
    itens: Joi.object().custom((value) => {
      if (!value || typeof value !== 'object') {
        throw new Error('Preencha pelo menos um item')
      }
      const valores = Object.values(value)
      const algumPreenchido = valores.some(
        (v: any) => v !== null && v !== undefined && v !== '' && Number(v) > 0
      )
      if (!algumPreenchido) {
        throw new Error('Preencha pelo menos um item')
      }
      return value
    }).required(),
    observacao: Joi.string().allow(''),
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
      caderneta: Joi.string().valid('maternidade', 'pastagens', 'rodeio', 'suplementacao', 'bebedouros', 'movimentacao', 'morte', 'clima', 'abastecimento', 'cantina').required(),
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
