import { LABELS_BY_CADERNETA } from '../config/labelConfig'
import { CADERNETAS } from './constants'

export interface Registro {
  id: string
  data: string
  [key: string]: unknown
}

const formatFieldValue = (key: string, value: unknown): string => {
  if (value === null || value === undefined || value === '') return '—'
  if (key === 'pesoCria' && value !== null && value !== undefined && value !== '') {
    return `${String(value)} kg`
  }
  const valueStr = String(value)
  if (valueStr === 'S') return 'Sim'
  if (valueStr === 'N') return 'Não'
  if (key === 'categorias' && Array.isArray(value)) {
    return value.join(', ')
  }
  return valueStr
}

export const formatarRegistroComoTexto = (registro: Registro, caderneta: string): string => {
  // Obter nome da caderneta
  const cadernetaInfo = CADERNETAS.find(c => c.id === caderneta)
  const cadernetaNome = cadernetaInfo?.label || caderneta.toUpperCase()

  // Obter horário atual
  const agora = new Date()
  const horas = String(agora.getHours()).padStart(2, '0')
  const minutos = String(agora.getMinutes()).padStart(2, '0')
  const horario = `${horas}:${minutos}`

  let texto = `📋 ${cadernetaNome}\n`
  texto += `📅 Data: ${String(registro.data)} às ${horario}\n\n`

  // Separar campos normais, animais tratados e categorias
  const camposNormais: [string, unknown][] = []
  const camposAposPesoMedio: [string, unknown][] = []
  const camposMovimentacaoEspeciais: [string, unknown][] = []
  const animaisTratados: Map<number, { id: string; tratamentos: string }> = new Map()
  const categoriasAnimais: string[] = []

  Object.entries(registro).forEach(([key, value]) => {
    if (
      key !== 'id' &&
      key !== 'data' &&
      key !== 'syncStatus' &&
      key !== 'version' &&
      key !== 'lastModified' &&
      key !== 'googleRowId' &&
      key !== 'categoriasMarcadas' &&
      value !== null &&
      value !== undefined &&
      value !== ''
    ) {
      // Ignorar campo data duplicado no rodeio
      if (caderneta === 'rodeio' && key === 'data') {
        return
      }
      // Filtrar categorias de gado com valor zero no rodeio
      if (caderneta === 'rodeio' && ['vaca', 'touro', 'bezerro', 'boi', 'garrote', 'novilha'].includes(key)) {
        const numValue = Number(value)
        if (numValue === 0) {
          return // Não incluir campos com valor zero
        }
      }
      // Filtrar categorias de gado com valor zero nas pastagens
      if (caderneta === 'pastagens' && ['vaca', 'touro', 'boiGordo', 'boiMagro', 'garrote', 'bezerro', 'novilha', 'tropa', 'outros'].includes(key)) {
        const numValue = Number(value)
        if (numValue === 0) {
          return // Não incluir campos com valor zero
        }
      }
      // Filtrar kgCocho com valor zero na suplementação
      if (caderneta === 'suplementacao' && key === 'kgCocho') {
        const numValue = Number(value)
        if (numValue === 0) {
          return // Não incluir kgCocho com valor zero
        }
      }
      // Filtrar kgDeposito com valor zero na suplementação
      if (caderneta === 'suplementacao' && key === 'kgDeposito') {
        const numValue = Number(value)
        if (numValue === 0) {
          return // Não incluir kgDeposito com valor zero
        }
      }
      // Filtrar campos de observação na enfermaria (serão agrupados com o campo principal)
      if (caderneta === 'enfermaria' && key.endsWith('Obs')) {
        return // Não incluir campos de observação separadamente
      }
      if (caderneta === 'movimentacao') {
        // Campos de categoria individual
        if (['vaca', 'touro', 'boiGordo', 'boiMagro', 'garrote', 'bezerro', 'novilha', 'tropa'].includes(key)) {
          if (value === 'S') {
            const labelMap: Record<string, string> = {
              vaca: 'VACA',
              touro: 'TOURO',
              boiGordo: 'BOI GORDO',
              boiMagro: 'BOI MAGRO',
              garrote: 'GARROTE',
              bezerro: 'BEZERRO',
              novilha: 'NOVILHA',
              tropa: 'TROPA',
            }
            categoriasAnimais.push(labelMap[key])
          }
        } else if (key === 'outraCategoria') {
          if (value) {
            categoriasAnimais.push(String(value))
          }
        } else if (key === 'brincoChip') {
          camposNormais.push([key, value])
        } else {
          const match = key.match(/^animal(\d+)(Id|Tratamentos)$/)
          if (match) {
            const num = parseInt(match[1])
            const tipo = match[2]
            if (!animaisTratados.has(num)) {
              animaisTratados.set(num, { id: '', tratamentos: '' })
            }
            const animal = animaisTratados.get(num)!
            if (tipo === 'Id') {
              animal.id = String(value)
            } else {
              animal.tratamentos = String(value)
            }
          } else {
            // Todos os outros campos vão para camposNormais
            camposNormais.push([key, value])
          }
        }
      } else {
        const match = key.match(/^animal(\d+)(Id|Tratamentos)$/)
        if (match) {
          const num = parseInt(match[1])
          const tipo = match[2]
          if (!animaisTratados.has(num)) {
            animaisTratados.set(num, { id: '', tratamentos: '' })
          }
          const animal = animaisTratados.get(num)!
          if (tipo === 'Id') {
            animal.id = String(value)
          } else {
            animal.tratamentos = String(value)
          }
        } else {
          camposNormais.push([key, value])
        }
      }
    }
  })

  // Adicionar campos normais com labels em itálico
  if (caderneta === 'movimentacao') {
    // Para movimentação, usar ordem específica dos formulários
    const ordemMovimentacao = [
      'data',
      'loteOrigem',
      'brincoChip',
      'numeroCabecas',
      'pesoMedio',
      'categoria',
      'motivoMovimentacao',
      'causaObservacao',
      'loteDestino'
    ]
    
    ordemMovimentacao.forEach(key => {
      const value = registro[key]
      if (value !== null && value !== undefined && value !== '') {
        let label = LABELS_BY_CADERNETA[caderneta]?.[key] || key.toUpperCase()
        const valorFormatado = formatFieldValue(key, value)
        texto += `*${label}:* ${valorFormatado}\n`
      }
    })
  } else if (caderneta === 'bebedouros') {
    // Para bebedouros, usar ordem específica dos formulários
    const ordemBebedouros = [
      'data',
      'responsavel',
      'pasto',
      'numeroLote',
      'categoria',
      'numeroBebedouro',
      'leituraBebedouro',
      'observacao'
    ]
    
    ordemBebedouros.forEach(key => {
      const value = registro[key]
      if (value !== null && value !== undefined && value !== '') {
        let label = LABELS_BY_CADERNETA[caderneta]?.[key] || key.toUpperCase()
        const valorFormatado = formatFieldValue(key, value)
        texto += `*${label}:* ${valorFormatado}\n`
      }
    })
  } else if (caderneta === 'suplementacao') {
    // Para suplementacao, usar ordem específica dos formulários
    const ordemSuplementacao = [
      'tratador',
      'pasto',
      'numeroLote',
      'produto',
      'creepKg',
      'leituraCocho',
      'kgCocho',
      'kgDeposito',
      'categorias',
      'escoreFezes'
    ]
    
    ordemSuplementacao.forEach(key => {
      const value = registro[key]
      if (value !== null && value !== undefined && value !== '') {
        let label = LABELS_BY_CADERNETA[caderneta]?.[key] || key.toUpperCase()
        const valorFormatado = formatFieldValue(key, value)
        texto += `*${label}:* ${valorFormatado}\n`
      }
    })

    // Adicionar checklist após categorias
    const checklistPerguntas = [
      { campo: 'limpezaCocho', label: 'LIMPEZA DE COCHO?' },
      { campo: 'cochosCondicoes', label: 'OS COCHOS ESTÃO EM BOAS CONDIÇÕES?' },
      { campo: 'aterroAcessoIdeal', label: 'ATERRO / ACESSO DE COCHO ESTÁ IDEAL?' },
      { campo: 'espacamentoCochoCmCab', label: 'ESPAÇAMENTO DO COCHO' },
      { campo: 'depositoCondicoes', label: 'DEPÓSITO ESTÁ EM BOAS CONDIÇÕES?' },
      { campo: 'estoqueDepositio', label: 'TEM ESTOQUE NO DEPÓSITO?' },
    ]

    checklistPerguntas.forEach(({ campo, label }) => {
      if (campo === 'espacamentoCochoCmCab') {
        // Tratamento especial para espaçamento do cocho
        const valor = registro[campo]
        if (valor !== null && valor !== undefined && valor !== '') {
          texto += `*${label}:* ${valor} cm/cab\n`
          
          // Calcular se está ideal e diferença percentual
          const espacamentoNum = Number(valor)
          const ESPACAMENTO_IDEAL = 40
          const TOLERANCIA_PERCENTUAL = 5
          const diferenca = Math.abs(espacamentoNum - ESPACAMENTO_IDEAL)
          const diferencaPercentual = (diferenca / ESPACAMENTO_IDEAL) * 100
          const ideal = diferencaPercentual <= TOLERANCIA_PERCENTUAL
          const sinal = espacamentoNum >= ESPACAMENTO_IDEAL ? '+' : '-'
          
          texto += `*IDEAL?* ${ideal ? 'Sim' : 'Não'} (${sinal}${diferencaPercentual.toFixed(1)}%)\n`
        }
        
        // Adicionar observação do espaçamento
        const obsValue = registro.espacamentoCochoObs
        if (obsValue && obsValue !== '') {
          texto += `*OBSERVAÇÃO:* ${obsValue}\n`
        }
      } else {
        // Tratamento padrão para outras perguntas (Sim/Não)
        const valor = registro[campo]
        if (valor !== null && valor !== undefined && valor !== '') {
          const valorFormatado = valor === true ? 'Sim' : valor === false ? 'Não' : String(valor)
          texto += `*${label}:* ${valorFormatado}\n`
        }
        
        // Adicionar observação
        const obsField = `${campo}Obs`
        const obsValue = registro[obsField]
        if (obsValue && obsValue !== '') {
          texto += `*OBSERVAÇÃO:* ${obsValue}\n`
        }
      }
    })
  } else if (caderneta === 'rodeio') {
    // Para rodeio, usar ordem específica dos formulários
    const ordemRodeio = [
      'data',
      'pasto',
      'numeroLote',
      'vaca',
      'touro',
      'boiGordo',
      'boiMagro',
      'garrote',
      'bezerro',
      'novilha',
      'tropa',
      'outros',
      'totalCabecas',
      'escoreGadoIdeal',
      'aguaBoaBebedouro',
      'pastagemAdequada',
      'animaisDoentes',
      'cercasCochos',
      'carrapatosMoscas',
      'animaisEntrevero',
      'animalMorto',
      'escoreFezes',
      'equipe'
    ]
    
    ordemRodeio.forEach(key => {
      const value = registro[key]
      // Para campos numéricos (categorias), não incluir se for 0
      if (['vaca', 'touro', 'boiGordo', 'boiMagro', 'garrote', 'bezerro', 'novilha', 'tropa', 'outros'].includes(key)) {
        if (value !== null && value !== undefined && value !== '' && Number(value) > 0) {
          let label = LABELS_BY_CADERNETA[caderneta]?.[key] || key.toUpperCase()
          const valorFormatado = formatFieldValue(key, value)
          texto += `*${label}:* ${valorFormatado}\n`
        }
      } else if (value !== null && value !== undefined && value !== '') {
        let label = LABELS_BY_CADERNETA[caderneta]?.[key] || key.toUpperCase()
        const valorFormatado = formatFieldValue(key, value)
        texto += `*${label}:* ${valorFormatado}\n`
        
        // Adicionar quebra de linha após TOTAL CABEÇAS no rodeio
        if (caderneta === 'rodeio' && key === 'totalCabecas') {
          texto += `\n`
        }
      }
      
      // Adicionar observação imediatamente após o campo principal
      const obsField = `${key}Obs`
      if (registro[obsField] && registro[obsField] !== '') {
        const label = LABELS_BY_CADERNETA[caderneta]?.[key] || key.toUpperCase()
        texto += `*${label} - OBSERVAÇÃO:* ${registro[obsField]}\n`
      }
    })
  } else if (caderneta === 'enfermaria') {
    // Para enfermaria, usar ordem específica dos formulários
    const ordemEnfermaria = [
      'data',
      'pasto',
      'lote',
      'brincoChip',
      'categoria',
      'tratamento',
      'problemaCasco',
      'sintomasPneumonia',
      'picadoCobra',
      'incoordenacaoTremores',
      'febreAlta',
      'presencaSangue',
      'fraturas',
      'desordensDigestivas'
    ]
    
    ordemEnfermaria.forEach(key => {
      const value = registro[key]
      if (value !== null && value !== undefined && value !== '') {
        let label = LABELS_BY_CADERNETA[caderneta]?.[key] || key.toUpperCase()
        const valorFormatado = formatFieldValue(key, value)
        texto += `*${label}:* ${valorFormatado}\n`
      }
      
      // Adicionar observação imediatamente após o campo principal
      const obsField = `${key}Obs`
      if (registro[obsField] && registro[obsField] !== '') {
        const label = LABELS_BY_CADERNETA[caderneta]?.[key] || key.toUpperCase()
        texto += `*${label} - OBSERVAÇÃO:* ${registro[obsField]}\n`
      }
    })
  } else if (caderneta === 'entrada-insumos') {
    // Para entrada de insumos, usar ordem específica dos formulários
    const ordemEntradaInsumos = [
      'dataEntrada',
      'horario',
      'produto',
      'quantidade',
      'valorUnitario',
      'valorTotal',
      'notaFiscal',
      'fornecedor',
      'placa',
      'motorista',
      'responsavelRecebimento'
    ]
    
    ordemEntradaInsumos.forEach(key => {
      const value = registro[key]
      if (value !== null && value !== undefined && value !== '') {
        let label = LABELS_BY_CADERNETA[caderneta]?.[key] || key.toUpperCase()
        const valorFormatado = formatFieldValue(key, value)
        texto += `*${label}:* ${valorFormatado}\n`
      }
    })
  } else if (caderneta === 'saida-insumos') {
    // Para saída de insumos, usar ordem específica dos formulários
    const ordemSaidaInsumos = [
      'dataProducao',
      'dietaProduzida',
      'destinoProducao',
      'totalProduzido'
    ]
    
    ordemSaidaInsumos.forEach(key => {
      const value = registro[key]
      if (value !== null && value !== undefined && value !== '') {
        let label = LABELS_BY_CADERNETA[caderneta]?.[key] || key.toUpperCase()
        const valorFormatado = formatFieldValue(key, value)
        texto += `*${label}:* ${valorFormatado}\n`
      }
    })
    
    // Adicionar insumos utilizados
    if (registro.insumosQuantidades) {
      texto += '\n*INSUMOS UTILIZADOS (kg):*\n'
      Object.entries(registro.insumosQuantidades).forEach(([insumo, quantidade]) => {
        if (quantidade && parseFloat(String(quantidade)) > 0) {
          texto += `*${insumo}:* ${quantidade}\n`
        }
      })
    }
  } else {
    // Para pastagens, usar estrutura organizada
    if (caderneta === 'pastagens') {
      // Cabeçalho
      texto += `*MANEJADOR:* ${registro.manejador || '—'}\n\n`
      
      // Seção PASTO SAÍDA
      texto += `*PASTO SAÍDA*\n`
      texto += `*Nome:* ${registro.pastoSaida || '—'}\n`
      texto += `*Avaliação saída:* ${registro.avaliacaoSaida || '—'}\n`
      texto += `*Tempo de ocupação:* ${registro.tempoOcupacao || '—'}\n\n`
      
      // Seção PASTO ENTRADA
      texto += `*PASTO ENTRADA*\n`
      texto += `*Nome:* ${registro.pastoEntrada || '—'}\n`
      texto += `*Avaliação entrada:* ${registro.avaliacaoEntrada || '—'}\n`
      texto += `*Tempo de vedação:* ${registro.tempoVedacao || '—'}\n\n`
      
      // Seção LOTE E CATEGORIAS
      texto += `*LOTE:* ${registro.numeroLote || '—'}\n`
      
      // Adicionar categorias com valor > 0
      const categorias = ['vaca', 'touro', 'boiGordo', 'boiMagro', 'garrote', 'bezerro', 'novilha', 'tropa', 'outros']
      categorias.forEach(key => {
        const value = Number(registro[key]) || 0
        if (value > 0) {
          let label = LABELS_BY_CADERNETA[caderneta]?.[key] || key.toUpperCase()
          texto += `*${label}:* ${value}\n`
        }
      })
      
      // Escore do gado
      if (registro.escoreGado) {
        texto += `*ESCORE DO GADO:* ${registro.escoreGado}\n`
      }
      
    } else {
      // Para outras cadernetas, manter o fluxo normal
      camposNormais.forEach(([key, value]) => {
        let label = LABELS_BY_CADERNETA[caderneta]?.[key] || key.toUpperCase()
        const valorFormatado = formatFieldValue(key, value)
        
        // Para enfermaria, verificar se há observação associada
        if (caderneta === 'enfermaria' && key.endsWith('Obs')) {
          return // Já tratado abaixo
        }
        
        // Para pastagens, ignorar campos de detalhes dos pastos (já tratados acima)
        if (caderneta === 'pastagens' && [
          'pastoSaidaAreaUtil', 'pastoSaidaEspecie', 'pastoSaidaAlturaEntrada', 'pastoSaidaAlturaSaida',
          'pastoEntradaAreaUtil', 'pastoEntradaEspecie', 'pastoEntradaAlturaEntrada', 'pastoEntradaAlturaSaida',
          'pasto', 'avaliacao', 'manejador', 'numeroLote' // campos já tratados na estrutura organizada
        ].includes(key)) {
          return // Não incluir detalhes dos pastos no texto compartilhável
        }
        
        // Aplicar plural em categorias de animais no rodeio
        let labelFinal = label
        let valorFinal = valorFormatado
        if (caderneta === 'rodeio' && ['vaca', 'touro', 'bezerro', 'boiGordo', 'boiMagro', 'garrote', 'novilha', 'tropa', 'outros'].includes(key)) {
          const quantidade = Number(value) || 0
          if (quantidade > 1) {
            // Aplicar plural
            if (key === 'vaca') labelFinal = 'VACAS'
            else if (key === 'touro') labelFinal = 'TOUROS'
            else if (key === 'bezerro') labelFinal = 'BEZERROS(AS)'
            else if (key === 'boiGordo') labelFinal = 'BOIS GORDOS'
            else if (key === 'boiMagro') labelFinal = 'BOIS MAGROS'
            else if (key === 'garrote') labelFinal = 'GARROTES'
            else if (key === 'novilha') labelFinal = 'NOVILHAS'
            else if (key === 'tropa') labelFinal = 'TROPAS'
            else if (key === 'outros') labelFinal = 'OUTROS'
          } else if (quantidade === 1) {
            // Manter singular
            if (key === 'bezerro') labelFinal = 'BEZERRO(A)'
          }
        }
        
        // Converter valores Sim/Não para S/N (sem interrogações)
        if (caderneta === 'rodeio' && [
          'escoreGadoIdeal', 'aguaBoaBebedouro', 'pastagemAdequada', 'animaisDoentes', 
          'cercasCochos', 'carrapatosMoscas', 'animaisEntreverados', 'animalMorto'
        ].includes(key)) {
          if (valorFormatado === 'Sim') valorFinal = 'S'
          if (valorFormatado === 'Não') valorFinal = 'N'
        }
        
        texto += `*${labelFinal}:* ${valorFinal}\n`
        
        // Adicionar quebra de linha após TOTAL CABEÇAS no rodeio
        if (caderneta === 'rodeio' && key === 'totalCabecas') {
          texto += `\n`
        }
        
        // Para movimentação, adicionar campos especiais após loteOrigem
        if (caderneta === 'movimentacao' && key === 'loteOrigem' && camposMovimentacaoEspeciais.length > 0) {
          camposMovimentacaoEspeciais.forEach(([campoKey, campoValue]) => {
            let campoLabel = LABELS_BY_CADERNETA[caderneta]?.[campoKey] || campoKey.toUpperCase()
            const campoValorFormatado = formatFieldValue(campoKey, campoValue)
            texto += `*${campoLabel}:* ${campoValorFormatado}\n`
          })
        }
        
        // Para enfermaria, adicionar observação abaixo do campo principal
        if (caderneta === 'enfermaria' && !key.endsWith('Obs') && !key.startsWith('tratamento')) {
          const obsKey = `${key}Obs`
          const obsValue = registro[obsKey]
          if (obsValue && obsValue !== '' && obsValue !== null && obsValue !== undefined) {
            texto += `*OBSERVAÇÃO:* ${String(obsValue)}\n`
          }
        }
      })
    }
  }

  // Adicionar campos após peso médio (movimentação)
  camposAposPesoMedio.forEach(([key, value]) => {
    let label = LABELS_BY_CADERNETA[caderneta]?.[key] || key.toUpperCase()
    const valorFormatado = formatFieldValue(key, value)
    texto += `*${label}:* ${valorFormatado}\n`
  })

  // Adicionar animais tratados com estrutura especial
  if (animaisTratados.size > 0) {
    texto += '\n'
    animaisTratados.forEach(({ id, tratamentos }) => {
      texto += `*Animal ${id}*\n`
      texto += `*Tratamentos:* ${tratamentos}\n\n`
    })
  }

  // Adicionar aviso de divergência de cabeças para pastagens
  if (caderneta === 'pastagens') {
    // Calcular total informado (soma de todas as categorias)
    const totalInformado = ['vaca', 'touro', 'boiGordo', 'boiMagro', 'garrote', 'bezerro', 'novilha', 'tropa', 'outros'].reduce((total, key) => {
      const value = Number(registro[key]) || 0
      return total + value
    }, 0)
    
    // Calcular total do lote (n_cabecas + qtd_bezerros)
    const totalLote = (Number(registro.n_cabecas) || 0) + (Number(registro.qtd_bezerros) || 0)
    
    // Verificar se há divergência
    if (totalInformado > 0 && totalLote > 0 && totalInformado !== totalLote) {
      const diferenca = totalInformado - totalLote
      texto += `\n⚠️ Divergência n° cabeças: Total informado (${totalInformado}) ≠ Total lote (${totalLote})`
      texto += `\nDiferença: ${diferenca > 0 ? `+${diferenca}` : diferenca} animais`
    }
  }

  return texto
}

export const compartilharWhatsApp = async (texto: string) => {
  const textoCodificado = encodeURIComponent(texto)
  const url = `https://wa.me/?text=${textoCodificado}`

  if (navigator.share) {
    try {
      await navigator.share({
        title: 'Compartilhar Registro',
        text: texto,
      })
    } catch (err) {
      // Se o usuário cancelar ou falhar, abre o WhatsApp Web
      window.open(url, '_blank')
    }
  } else {
    window.open(url, '_blank')
  }
}
