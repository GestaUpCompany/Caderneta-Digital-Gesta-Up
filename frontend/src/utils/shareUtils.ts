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
      'data',
      'tratador',
      'pasto',
      'numeroLote',
      'produto',
      'creepKg',
      'leituraCocho',
      'kgCocho',
      'kgDeposito',
      'categorias'
    ]
    
    ordemSuplementacao.forEach(key => {
      const value = registro[key]
      if (value !== null && value !== undefined && value !== '') {
        let label = LABELS_BY_CADERNETA[caderneta]?.[key] || key.toUpperCase()
        const valorFormatado = formatFieldValue(key, value)
        texto += `*${label}:* ${valorFormatado}\n`
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
      'animaisEntreverados',
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
    camposNormais.forEach(([key, value]) => {
      let label = LABELS_BY_CADERNETA[caderneta]?.[key] || key.toUpperCase()
      const valorFormatado = formatFieldValue(key, value)
      
      // Para enfermaria, verificar se há observação associada
      if (caderneta === 'enfermaria' && key.endsWith('Obs')) {
        return // Já tratado abaixo
      }
      
      texto += `*${label}:* ${valorFormatado}\n`
      
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
