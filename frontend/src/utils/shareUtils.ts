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
        } else if (['motivoMovimentacao', 'brincoChip', 'causaObservacao'].includes(key)) {
          camposAposPesoMedio.push([key, value])
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
  camposNormais.forEach(([key, value]) => {
    let label = LABELS_BY_CADERNETA[caderneta]?.[key] || key.toUpperCase()
    const valorFormatado = formatFieldValue(key, value)
    texto += `*${label}:* ${valorFormatado}\n`
  })

  // Adicionar categorias dos animais (movimentação)
  if (caderneta === 'movimentacao' && categoriasAnimais.length > 0) {
    texto += `*Categorias dos Animais:* ${categoriasAnimais.join(', ')}\n`
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
