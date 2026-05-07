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
  if (key === 'pesoVivo' && value !== null && value !== undefined && value !== '') {
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

  let texto = `📋 ${cadernetaNome}\n`
  // registro.data já contém data e hora, formatar com "às" antes do horário
  const dataStr = String(registro.data)
  // Se já contém horário, inserir "às" antes dele
  const dataFormatada = dataStr.replace(/(\d{2}:\d{2})$/, 'às $1')
  texto += `📅 Data: ${dataFormatada}\n\n`

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
      // Filtrar campos que não devem aparecer no texto compartilhável do rodeio
      if (caderneta === 'rodeio' && ['n_cabecas', 'qtd_bezerros'].includes(key)) {
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
      // Filtrar campos de observação na morte (serão agrupados com o campo principal)
      if (caderneta === 'morte' && key.endsWith('Obs')) {
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
    // Seção: ORIGEM
    texto += `ORIGEM\n`
    if (registro.loteOrigem) {
      texto += `LOTE ORIGEM: ${registro.loteOrigem}\n`
    }
    if (registro.brinco) {
      texto += `BRINCO: ${registro.brinco}\n`
    }
    if (registro.chip) {
      texto += `CHIP: ${registro.chip}\n`
    }
    texto += `\n`

    // Seção: QUANTIFICAÇÃO
    texto += `QUANTIFICAÇÃO\n`
    if (registro.numeroCabecas) {
      texto += `NÚMERO CABEÇAS: ${registro.numeroCabecas}\n`
    }
    if (registro.pesoMedio) {
      texto += `PESO MÉDIO: ${registro.pesoMedio}\n`
    }
    if (registro.categoria) {
      texto += `CATEGORIA: ${registro.categoria}\n`
    }
    texto += `\n`

    // Seção: MOVIMENTAÇÃO
    texto += `MOVIMENTAÇÃO\n`
    if (registro.motivoMovimentacao) {
      texto += `MOTIVO: ${registro.motivoMovimentacao}\n`
    }
    // Mostrar sub-tipo se for Saída ou Entrada
    if (registro.motivoMovimentacao === 'Saída' && registro.tipoSaida) {
      texto += `TIPO: ${registro.tipoSaida}\n`
    }
    if (registro.motivoMovimentacao === 'Entrada' && registro.tipoEntrada) {
      texto += `TIPO: ${registro.tipoEntrada}\n`
    }
    if (registro.loteDestino) {
      texto += `DESTINO: ${registro.loteDestino}\n`
    }
    if (registro.causaObservacao) {
      texto += `CAUSA/OBSERVAÇÃO: ${registro.causaObservacao}\n`
    }
  } else if (caderneta === 'bebedouros') {
    // Para bebedouros, usar estrutura organizada por seções
    
    // Seção: Informações Básicas
    texto += `*RESPONSÁVEL:* ${registro.responsavel || '—'}\n`
    texto += `*PASTO:* ${registro.pasto || '—'}\n`
    texto += `*NÚMERO LOTE:* ${registro.numeroLote || '—'}\n`
    texto += `*CATEGORIA:* ${registro.categoria || '—'}\n\n`
    
    // Seção: Inspeção Atual
    if (registro.numeroBebedouro) {
      texto += `*INSPEÇÃO ATUAL*\n`
      texto += `*NÚMERO BEBEDOURO:* ${registro.numeroBebedouro}\n`
    }
    if (registro.leituraBebedouro !== null && registro.leituraBebedouro !== undefined) {
      texto += `*LEITURA BEBEDOURO:* ${registro.leituraBebedouro}\n`
    }
    if (registro.observacao && registro.observacao !== '') {
      texto += `*OBSERVAÇÃO:* ${registro.observacao}\n`
    }
    
    // Checklist fields
    const checklistBebedouros = [
      { campo: 'aguaSuficiente', label: 'ÁGUA SUFICIENTE' },
      { campo: 'vazaoBebedouroIdeal', label: 'VAZÃO BEBEDOURO IDEAL' },
      { campo: 'aterroAcessoBebedouroIdeal', label: 'ATERRO / ACESSO BEBEDOURO IDEAL' },
      { campo: 'espacamentoBebedouroIdeal', label: 'ESPAÇAMENTO BEBEDOURO IDEAL' },
      { campo: 'boiaProtecaoBoasCondicoes', label: 'BÓIA E PROTEÇÃO EM BOAS CONDIÇÕES' },
    ]
    
    // Verificar se há algum campo do checklist preenchido
    const temChecklistBebedouros = checklistBebedouros.some(({ campo }) => {
      return registro[campo] === true || registro[campo] === false
    })
    
    if (temChecklistBebedouros) {
      texto += `\n*CHECKLIST*\n`
      checklistBebedouros.forEach(({ campo, label }) => {
        const valor = registro[campo]
        if (valor === true || valor === false) {
          const valorFormatado = valor ? 'Sim' : 'Não'
          texto += `*${label}:* ${valorFormatado}\n`
        }
        
        // Adicionar observação
        const obsField = `${campo}Obs`
        const obsValue = registro[obsField]
        if (obsValue && obsValue !== '') {
          texto += `*OBSERVAÇÃO:* ${obsValue}\n`
        }
      })
    }
    
    // Seção: Histórico de Limpeza
    if (registro.tempoDesdeLimpeza || registro.intervaloMedioLimpezas || registro.metaIntervaloLimpeza) {
      texto += `\n*HISTÓRICO DE LIMPEZA*\n`
      if (registro.tempoDesdeLimpeza) {
        texto += `*TEMPO DESDE ÚLTIMA LIMPEZA:* ${registro.tempoDesdeLimpeza}\n`
      }
      if (registro.intervaloMedioLimpezas) {
        texto += `*INTERVALO MÉDIO DE LIMPEZAS:* ${registro.intervaloMedioLimpezas}\n`
      }
      if (registro.metaIntervaloLimpeza) {
        texto += `*META DE INTERVALO:* ${registro.metaIntervaloLimpeza}\n`
      }
    }
  } else if (caderneta === 'abastecimento') {
    texto += `*QUEM ABASTECEU:* ${registro.quemAbasteceu || '—'}\n`
    texto += `*OPERADOR MOTORISTA:* ${registro.operadorMotorista || '—'}\n`
    texto += `*VEÍCULO TRATOR:* ${registro.veiculoTrator || '—'}\n`
    texto += `*PLACA:* ${registro.placa || '—'}\n`
    texto += `*HIDRÔMETRO INICIAL:* ${registro.hidrometroInicial || '—'}\n`
    texto += `*HIDRÔMETRO FINAL:* ${registro.hidrometroFinal || '—'}\n`
    texto += `*TOTAL ABASTECIDO:* ${registro.totalAbastecido || '—'}\n`
    texto += `*COMBUSTÍVEL:* ${registro.combustivel || '—'}\n`
    texto += `*ODÔMETRO:* ${registro.odometro || '—'}\n`
    texto += `*TIPO DE OPERAÇÃO:* ${registro.tipoOperacao || '—'}\n`
    if (registro.observacao && registro.observacao !== '') {
      texto += `*OBSERVAÇÃO:* ${registro.observacao}\n`
    }
  } else if (caderneta === 'suplementacao') {
    // Para suplementacao, usar estrutura organizada por seções
    
    // Seção: Informações Básicas
    texto += `*TRATADOR:* ${registro.tratador || '—'}\n`
    texto += `*PASTO:* ${registro.pasto || '—'}\n`
    texto += `*N° LOTE:* ${registro.numeroLote || '—'}\n`
    texto += `*SUPLEMENTO:* ${registro.produto || '—'}\n\n`
    
    // Seção: Categorias
    if (registro.categorias && Array.isArray(registro.categorias) && registro.categorias.length > 0) {
      texto += `*CATEGORIAS:* ${registro.categorias.join(', ')}\n\n`
    }
    
    // Seção: Leituras e Quantidades
    if (registro.leituraCocho !== null && registro.leituraCocho !== undefined && registro.leituraCocho !== '') {
      texto += `*LEITURA COCHO:* ${registro.leituraCocho}\n`
    }
    if (registro.kgCocho !== null && registro.kgCocho !== undefined && registro.kgCocho !== 0) {
      texto += `*SUPLEMENTO COCHO (KG):* ${registro.kgCocho}\n`
    }
    if (registro.kgDeposito !== null && registro.kgDeposito !== undefined && registro.kgDeposito !== 0) {
      texto += `*SUPLEMENTO DEPÓSITO (KG):* ${registro.kgDeposito}\n`
    }
    if (registro.escoreFezes !== null && registro.escoreFezes !== undefined && registro.escoreFezes !== '') {
      texto += `*ESCORE FEZES:* ${registro.escoreFezes}\n`
    }
    
    // Seção: Checklist Cochos
    const checklistCochos = [
      { campo: 'limpezaCocho', label: 'LIMPEZA DE COCHO' },
      { campo: 'cochosCondicoes', label: 'COCHOS EM BOAS CONDIÇÕES' },
      { campo: 'aterroAcessoIdeal', label: 'ATERRO / ACESSO DE COCHO' },
      { campo: 'espacamentoCochoCmCab', label: 'ESPAÇAMENTO DO COCHO' },
    ]
    
    // Verificar se há algum campo do checklist de cochos preenchido
    const temChecklistCochos = checklistCochos.some(({ campo }) => {
      if (campo === 'espacamentoCochoCmCab') {
        return registro[campo] !== null && registro[campo] !== undefined && registro[campo] !== ''
      }
      return registro[campo] === true || registro[campo] === false
    })
    
    if (temChecklistCochos) {
      texto += `\n*CHECKLIST COCHOS*\n`
      
      checklistCochos.forEach(({ campo, label }) => {
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
          if (valor === true || valor === false) {
            const valorFormatado = valor ? 'Sim' : 'Não'
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
    }
    
    // Seção: Checklist Depósito
    const checklistDeposito = [
      { campo: 'depositoCondicoes', label: 'DEPÓSITO EM BOAS CONDIÇÕES' },
      { campo: 'estoqueDepositio', label: 'TEM ESTOQUE NO DEPÓSITO' },
    ]
    
    // Verificar se há algum campo do checklist de depósito preenchido
    const temChecklistDeposito = checklistDeposito.some(({ campo }) => {
      return registro[campo] === true || registro[campo] === false
    })
    
    if (temChecklistDeposito) {
      texto += `\n*CHECKLIST DEPÓSITO*\n`
      
      checklistDeposito.forEach(({ campo, label }) => {
        const valor = registro[campo]
        if (valor === true || valor === false) {
          const valorFormatado = valor ? 'Sim' : 'Não'
          texto += `*${label}:* ${valorFormatado}\n`
        }
        
        // Adicionar observação
        const obsField = `${campo}Obs`
        const obsValue = registro[obsField]
        if (obsValue && obsValue !== '') {
          texto += `*OBSERVAÇÃO:* ${obsValue}\n`
        }
      })
    }
  } else if (caderneta === 'enfermaria') {
    // Para enfermaria, usar ordem específica dos formulários
    const ordemEnfermaria = [
      'pasto',
      'lote',
      'brinco',
      'chip',
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
  } else if (caderneta === 'morte') {
    // Para morte, usar ordem específica dos formulários
    const ordemMorte = [
      'pasto',
      'lote',
      'brinco',
      'chip',
      'categoria',
      'categoriaOutros',
      'sexo',
      'raca',
      'idade',
      'pesoVivo',
      'causaMorte',
      'secrecaoOrificios',
      'sintomasPneumonia',
      'inchaco',
      'incoordenacaoTremores',
      'apatiaFraqueza',
      'presencaSangue',
      'desordensDigestivas'
    ]
    
    ordemMorte.forEach(key => {
      const value = registro[key]
      
      // Tratar categoriaOutros apenas se categoria for Outros
      if (key === 'categoriaOutros') {
        if (registro.categoria === 'Outros' && value !== null && value !== undefined && value !== '') {
          let label = LABELS_BY_CADERNETA[caderneta]?.[key] || key.toUpperCase()
          texto += `*${label}:* ${value}\n`
        }
        return
      }
      
      if (['secrecaoOrificios', 'sintomasPneumonia', 'inchaco', 'incoordenacaoTremores', 'apatiaFraqueza', 'presencaSangue', 'desordensDigestivas'].includes(key)) {
        // Para campos booleanos de diagnóstico, sempre incluir mostrando Sim/Não
        let label = LABELS_BY_CADERNETA[caderneta]?.[key] || key.toUpperCase()
        const valorFormatado = value === true || value === 'S' ? 'Sim' : 'Não'
        texto += `*${label}:* ${valorFormatado}\n`
        
        // Adicionar observação imediatamente após o campo principal (apenas texto OBSERVAÇÃO)
        const obsField = `${key}Obs`
        if (registro[obsField] && registro[obsField] !== '') {
          texto += `*OBSERVAÇÃO:* ${registro[obsField]}\n`
        }
      } else if (value !== null && value !== undefined && value !== '') {
        let label = LABELS_BY_CADERNETA[caderneta]?.[key] || key.toUpperCase()
        const valorFormatado = formatFieldValue(key, value)
        texto += `*${label}:* ${valorFormatado}\n`
        
        // Adicionar quebra de linha após chip e categoria
        if (key === 'chip' || key === 'categoria') {
          texto += `\n`
        }
        
        // Adicionar quebra de linha após causa da morte
        if (key === 'causaMorte') {
          texto += `\n`
        }
      }
    })
  } else if (caderneta === 'clima') {
    // Para clima, usar ordem específica
    const ordemClima = ['responsavel', 'temperaturaMedia']
    
    ordemClima.forEach(key => {
      const value = registro[key]
      if (value !== null && value !== undefined && value !== '') {
        let label = LABELS_BY_CADERNETA[caderneta]?.[key] || key.toUpperCase()
        const valorFormatado = formatFieldValue(key, value)
        texto += `*${label}:* ${valorFormatado}\n`
      }
    })

    // Adicionar medições de pluviômetros
    if (registro.medicoes && Array.isArray(registro.medicoes)) {
      texto += `\n`
      registro.medicoes.forEach((m: any) => {
        if (m.medicao !== null && m.medicao !== undefined && m.medicao !== '') {
          const nome = m.pluviometro_nome || m.pluviometroNome || 'Pluviômetro'
          const localizacao = m.pluviometro_localizacao || m.pluviometroLocalizacao
          texto += `*${nome}${localizacao ? ` (${localizacao})` : ''}:* ${m.medicao} mm\n`
        }
      })
    }

    // Adicionar observação no final
    if (registro.observacao && registro.observacao !== '') {
      texto += `\n*OBSERVAÇÃO:* ${registro.observacao}\n`
    }
  } else if (caderneta === 'rodeio') {
    // Para rodeio, usar ordem específica dos formulários
    const ordemRodeio = [
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
      'equipe',
      'escoreGado'
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
      } else if (['escoreGadoIdeal', 'aguaBoaBebedouro', 'pastagemAdequada', 'animaisDoentes', 'cercasCochos', 'carrapatosMoscas', 'animaisEntreverados', 'animalMorto'].includes(key)) {
        // Para campos booleanos de avaliação, sempre incluir mostrando Sim/Não
        let label = LABELS_BY_CADERNETA[caderneta]?.[key] || key.toUpperCase()
        const valorFormatado = value === true ? 'Sim' : (value === false ? 'Não' : formatFieldValue(key, value))
        texto += `*${label}:* ${valorFormatado}\n`
        
        // Adicionar observação imediatamente após o campo principal (apenas texto OBSERVAÇÃO)
        const obsField = `${key}Obs`
        if (registro[obsField] && registro[obsField] !== '') {
          texto += `*OBSERVAÇÃO:* ${registro[obsField]}\n`
        }
      } else if (value !== null && value !== undefined && value !== '') {
        let label = LABELS_BY_CADERNETA[caderneta]?.[key] || key.toUpperCase()
        const valorFormatado = formatFieldValue(key, value)
        texto += `*${label}:* ${valorFormatado}\n`
        
        // Adicionar quebra de linha após totalCabecas
        if (key === 'totalCabecas') {
          texto += `\n`
        }
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
    } else if (caderneta === 'maternidade') {
      // Seção: INFORMAÇÕES BÁSICAS
      texto += `INFORMAÇÕES BÁSICAS\n`
      if (registro.pasto) {
        texto += `PASTO: ${registro.pasto}\n`
      }
      if (registro.lote) {
        texto += `LOTE: ${registro.lote}\n`
      }
      texto += `\n`

      // Seção: DADOS DA CRIA
      texto += `DADOS DA CRIA\n`
      if (registro.pesoCria) {
        texto += `PESO CRIA: ${registro.pesoCria} kg\n`
      }
      if (registro.numeroCria) {
        texto += `NÚMERO CRIA: ${registro.numeroCria}\n`
      }
      if (registro.sexo) {
        texto += `SEXO: ${registro.sexo}\n`
      }
      if (registro.raca) {
        texto += `RAÇA: ${registro.raca}\n`
      }
      texto += `\n`

      // Seção: PARTO
      texto += `PARTO\n`
      if (registro.tipoParto) {
        texto += `TIPO DE PARTO: ${registro.tipoParto}\n`
      }
      if (registro.tratamento) {
        texto += `TRATAMENTO: ${registro.tratamento}\n`
      }
      texto += `\n`

      // Seção: MÃE
      texto += `MÃE\n`
      if (registro.numeroMae) {
        texto += `NÚMERO MÃE: ${registro.numeroMae}\n`
      }
      if (registro.categoriaMae) {
        texto += `CATEGORIA MÃE: ${registro.categoriaMae}\n`
      }
      if (registro.escoreMatriz) {
        texto += `ESCORE MATRIZ: ${registro.escoreMatriz}\n`
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
        
        // Para rodeio, ignorar campos já tratados na ordem específica
        if (caderneta === 'rodeio') {
          return // Já tratado na ordem específica acima
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
      texto += `\n${diferenca > 0 ? `Excedeu ${diferenca} animais do total do lote` : `Faltam ${Math.abs(diferenca)} animais para completar o lote`}`
    }
  }

  // Adicionar aviso de divergência de cabeças para rodeio
  if (caderneta === 'rodeio') {
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
      texto += `\n${diferenca > 0 ? `Excedeu ${diferenca} animais do total do lote` : `Faltam ${Math.abs(diferenca)} animais para completar o lote`}`
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
