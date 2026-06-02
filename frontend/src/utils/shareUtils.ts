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
  const camposAposPesoVivoAtual: [string, unknown][] = []
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
      // Filtrar campos de observação no rodeio (serão agrupados com o campo principal)
      if (caderneta === 'rodeio' && key.endsWith('Obs')) {
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
      texto += `LOTE ORIGEM: *${registro.loteOrigem}*\n`
    }
    if (registro.brinco) {
      texto += `BRINCO: *${registro.brinco}*\n`
    }
    if (registro.chip) {
      texto += `CHIP: *${registro.chip}*\n`
    }
    texto += `\n`

    // Seção: QUANTIFICAÇÃO
    texto += `QUANTIFICAÇÃO\n`
    if (registro.numeroCabecas) {
      texto += `NÚMERO CABEÇAS: *${registro.numeroCabecas}*\n`
    }
    if (registro.pesoVivoAtual) {
      texto += `PESO VIVO ATUAL (KG): *${registro.pesoVivoAtual}*\n`
    }
    if (registro.categoria) {
      texto += `CATEGORIA: *${registro.categoria}*\n`
    }
    texto += `\n`

    // Seção: MOVIMENTAÇÃO
    texto += `MOVIMENTAÇÃO\n`
    if (registro.motivoMovimentacao) {
      texto += `MOTIVO: *${registro.motivoMovimentacao}*\n`
    }
    // Mostrar sub-tipo se for Saída ou Entrada
    if (registro.motivoMovimentacao === 'Saída' && registro.tipoSaida) {
      texto += `TIPO: *${registro.tipoSaida}*\n`
    }
    if (registro.motivoMovimentacao === 'Entrada' && registro.tipoEntrada) {
      texto += `TIPO: *${registro.tipoEntrada}*\n`
    }
    if (registro.loteDestino) {
      texto += `DESTINO: *${registro.loteDestino}*\n`
    }
    if (registro.causaObservacao) {
      texto += `CAUSA/OBSERVAÇÃO: *${registro.causaObservacao}*\n`
    }
  } else if (caderneta === 'bebedouros') {
    // Para bebedouros, usar estrutura organizada por seções
    
    // Seção: Informações Básicas
    texto += `RESPONSÁVEL: *${registro.responsavel || '—'}*\n`
    texto += `PASTO: *${registro.pasto || '—'}*\n`
    texto += `NÚMERO LOTE: *${registro.numeroLote || '—'}*\n\n`
    
    // Seção: Inspeção Atual
    if (registro.numeroBebedouro) {
      texto += `INSPEÇÃO ATUAL\n`
      texto += `NÚMERO BEBEDOURO: *${registro.numeroBebedouro}*\n`
    }
    if (registro.leituraBebedouro !== null && registro.leituraBebedouro !== undefined) {
      texto += `LEITURA BEBEDOURO: *${registro.leituraBebedouro}*\n`
    }
    if (registro.observacao && registro.observacao !== '') {
      texto += `OBSERVAÇÃO: *${registro.observacao}*\n`
    }
    
    // Checklist fields
    const checklistBebedouros = [
      { campo: 'aguaSuficiente', label: 'QUANTIDADE DE ÁGUA ESTÁ ADEQUADA?' },
      { campo: 'vazaoBebedouroIdeal', label: 'VAZÃO DA BÓIA ESTÁ IDEAL?' },
      { campo: 'aterroAcessoBebedouroIdeal', label: 'ATERRO / ACESSO AO BEBEDOURO ESTÁ ADEQUADO?' },
      { campo: 'espacamentoBebedouroIdeal', label: 'ESPAÇAMENTO BEBEDOURO IDEAL' },
      { campo: 'boiaProtecaoBoasCondicoes', label: 'BÓIA E PROTEÇÃO DA BÓIA ESTÃO EM BOAS CONDIÇÕES?' },
    ]
    
    // Verificar se há algum campo do checklist preenchido
    const temChecklistBebedouros = checklistBebedouros.some(({ campo }) => {
      return registro[campo] === true || registro[campo] === false
    })
    
    if (temChecklistBebedouros) {
      texto += `\nCHECKLIST\n`
      checklistBebedouros.forEach(({ campo, label }) => {
        const valor = registro[campo]
        if (valor === true || valor === false) {
          const valorFormatado = valor ? 'Sim' : 'Não'
          texto += `${label}: *${valorFormatado}*\n`
        }
        
        // Adicionar observação
        const obsField = `${campo}Obs`
        const obsValue = registro[obsField]
        if (obsValue && obsValue !== '') {
          texto += `OBSERVAÇÃO: *${obsValue}*\n`
        }
      })
    }
    
    // Seção: Histórico de Limpeza
    if (registro.tempoDesdeLimpeza || registro.intervaloMedioLimpezas || registro.metaIntervaloLimpeza) {
      texto += `\nHISTÓRICO DE LIMPEZA\n`
      if (registro.tempoDesdeLimpeza) {
        texto += `TEMPO DESDE ÚLTIMA LIMPEZA: *${registro.tempoDesdeLimpeza}*\n`
      }
      if (registro.intervaloMedioLimpezas) {
        texto += `INTERVALO MÉDIO LIMPEZAS: *${registro.intervaloMedioLimpezas}*\n`
      }
      if (registro.metaIntervaloLimpeza) {
        texto += `META INTERVALO LIMPEZA: *${registro.metaIntervaloLimpeza}*\n`
      }
      // Status do intervalo
      if (registro.tempoDesdeLimpeza && registro.metaIntervaloLimpeza) {
        const tempoDesde = parseInt(String(registro.tempoDesdeLimpeza)) || 0
        const meta = parseInt(String(registro.metaIntervaloLimpeza)) || 0
        if (tempoDesde > meta) {
          texto += `STATUS INTERVALO: *Atrasado (${tempoDesde - meta} dias)*\n`
        } else {
          texto += `STATUS INTERVALO: *Dentro da meta*\n`
        }
      }
    }
    
    // Capacidade do bebedouro
    if (registro.capacidadeLitros) {
      texto += `\nCAPACIDADE: *${registro.capacidadeLitros} Litros*\n`
    }
  } else if (caderneta === 'abastecimento') {
    // Seção: Dados do Abastecimento
    texto += `DADOS DO ABASTECIMENTO\n`
    texto += `QUEM ABASTECEU: *${registro.quemAbasteceu || '—'}*\n`
    texto += `OPERADOR MOTORISTA: *${registro.operadorMotorista || '—'}*\n`
    texto += `MÁQUINA/VEÍCULO: *${registro.maquinaVeiculo || '—'}*\n`
    texto += `PLACA: *${registro.placa || '—'}*\n`
    texto += `TOTAL ABASTECIDO: *${registro.totalAbastecido || '—'} L*\n\n`
    
    // Seção: Combustível
    texto += `COMBUSTÍVEL\n`
    texto += `COMBUSTÍVEL: *${registro.combustivel || '—'}*\n`
    texto += `ODÔMETRO/HORÍMETRO: *${registro.odometro || '—'} km*\n`
    texto += `TIPO DE OPERAÇÃO: *${registro.tipoOperacao || '—'}*\n`
    if (registro.tipoOperacao === 'Outros' && registro.tipoOperacaoOutros) {
      texto += `ESPECIFICAR: *${registro.tipoOperacaoOutros}*\n`
    }
    if (registro.observacao) {
      texto += `\nOBSERVAÇÃO: *${registro.observacao}*\n`
    }
  } else if (caderneta === 'cantina') {
    // Seção: DADOS DA CANTINA
    texto += `DADOS DA CANTINA\n`
    texto += `N° COZINHEIRAS: *${registro.numeroCozinheiras || '—'}*\n`
    texto += `QUEM COZINHOU: *${registro.quemCozinhou || '—'}*\n`
    if (registro.quemAjudou && typeof registro.quemAjudou === 'string' && registro.quemAjudou.trim() !== '' && registro.quemAjudou !== '—') {
      texto += `QUEM AJUDOU: *${registro.quemAjudou}*\n`
    }
    texto += `\n`
    
    // Seção: QUANTIDADES
    texto += `QUANTIDADES\n`
    texto += `N° CAFÉ DA MANHÃ: *${registro.numeroCafeManha || '—'}*\n`
    texto += `N° LANCHES: *${registro.numeroLanches || '—'}*\n`
    texto += `N° REFEIÇÕES ALMOÇO: *${registro.numeroRefeicoesAlmoco || '—'}*\n`
    texto += `N° REFEIÇÕES JANTAR: *${registro.numeroRefeicoesJantar || '—'}*\n`
    
    // Seção: ITENS
    if (registro.itens && Object.keys(registro.itens).length > 0) {
      texto += `\nITENS\n`
      Object.entries(registro.itens).forEach(([key, value]) => {
        if (value && value !== '' && value !== '0') {
          const label = key.toUpperCase()
          // Para itens fixos, usar ITEM_UNITS do CantinaPage se disponível
          // Para simplicidade, vamos mostrar apenas o valor
          texto += `${label}: *${value}*\n`
        }
      })
    }
    
    // Seção: OUTROS
    if (registro.nomeOutros || registro.quantidadeOutros) {
      texto += `\nOUTROS\n`
      if (registro.nomeOutros) {
        texto += `NOME DO ITEM: *${registro.nomeOutros}*\n`
      }
      if (registro.quantidadeOutros) {
        const unidade = registro.unidadeOutros || ''
        texto += `QUANTIDADE: *${registro.quantidadeOutros}${unidade ? ' ' + unidade : ''}*\n`
      }
    }
    
    if (registro.observacao) {
      texto += `\nOBSERVAÇÃO: *${registro.observacao}*\n`
    }
  } else if (caderneta === 'limpeza') {
    // Seção: DADOS DA LIMPEZA
    texto += `N° da Equipe: *${registro.numeroEquipe || '—'}*\n`
    texto += `Setor: *${registro.setor || '—'}*\n`
    texto += `Local: *${registro.local || '—'}*\n`
    
    // Calcular duração se tiver hora início e fim
    if (registro.horaInicio && registro.horaFinal) {
      const inicio = String(registro.horaInicio)
      const fim = String(registro.horaFinal)
      texto += `Hora Início: *${inicio}*\n`
      texto += `Hora Final: *${fim}*`
      
      // Calcular duração
      const [h1, m1] = inicio.split(':').map(Number)
      const [h2, m2] = fim.split(':').map(Number)
      const minutosInicio = h1 * 60 + m1
      const minutosFim = h2 * 60 + m2
      let duracaoMinutos = minutosFim - minutosInicio
      
      // Se for negativo, assumiu que passou para o próximo dia
      if (duracaoMinutos < 0) {
        duracaoMinutos += 24 * 60
      }
      
      const horas = Math.floor(duracaoMinutos / 60)
      const minutos = duracaoMinutos % 60
      texto += ` (${horas}h${minutos > 0 ? minutos.toString().padStart(2, '0') : '00'})\n`
    } else {
      if (registro.horaInicio) {
        texto += `Hora Início: *${registro.horaInicio}*\n`
      }
      if (registro.horaFinal) {
        texto += `Hora Final: *${registro.horaFinal}*\n`
      }
      // Calcular e exibir tempo total
      if (registro.horaInicio && registro.horaFinal && typeof registro.horaInicio === 'string' && typeof registro.horaFinal === 'string') {
        const [startH, startM] = registro.horaInicio.split(':').map(Number)
        const [endH, endM] = registro.horaFinal.split(':').map(Number)
        const startMinutes = startH * 60 + startM
        const endMinutes = endH * 60 + endM
        const diffMinutes = endMinutes - startMinutes
        if (diffMinutes >= 0) {
          const hours = Math.floor(diffMinutes / 60)
          const minutes = diffMinutes % 60
          texto += `Tempo total: *${hours}h${minutes.toString().padStart(2, '0')}*\n`
        }
      }
    }
    
    // Seção: Tipos de Limpeza
    if (registro.limpezaRealizada && Array.isArray(registro.limpezaRealizada) && registro.limpezaRealizada.length > 0) {
      texto += `Tipos de Limpeza: *`

      // Mapear valores para labels
      const labelMap: Record<string, string> = {
        capina: 'Capina',
        grama: 'Grama',
        herbicida: 'Herbicida',
        aceiros: 'Aceiros',
        poda_arvores: 'Poda Árvores',
        lixo_recolhido: 'Lixo Recolhido',
        rocada: 'Roçada',
        lavagem: 'Lavagem',
        organizacao: 'Organização',
        polimento: 'Polimento',
      }

      const labels = registro.limpezaRealizada.map(valor => labelMap[valor] || valor)
      texto += `${labels.join(', ')}*\n`

      // Seção: Tarefas Realizadas
      if (registro.tarefas && typeof registro.tarefas === 'object') {
        texto += `\nTAREFAS REALIZADAS\n`
        registro.limpezaRealizada.forEach((limpeza: string) => {
          const tarefa = (registro.tarefas as any)[limpeza]
          const label = labelMap[limpeza] || limpeza
          if (tarefa && tarefa.trim() !== '') {
            texto += `${label}: *${tarefa}*\n`
          }
        })
      }
    }
    
    // Observação
    if (registro.observacao && registro.observacao !== '') {
      texto += `Observação: *${registro.observacao}*\n`
    }
  } else if (caderneta === 'operacoes-maquinas') {
    // Seção: Dados da Operação
    texto += `DADOS DA OPERAÇÃO\n`
    texto += `MÁQUINA/VEÍCULO: *${registro.maquinaVeiculo || '—'}*\n`
    texto += `IMPLEMENTO UTILIZADO: *${registro.implementoUtilizado || '—'}*\n`
    
    if (registro.horaInicial && registro.horaFinal) {
      texto += `HORÁRIO: *${registro.horaInicial} → ${registro.horaFinal}*\n`
    }
    
    if (registro.odometroInicial && registro.odometroFinal) {
      const total = registro.totalOdometro || '—'
      texto += `ODÔMETRO: *${registro.odometroInicial} km → ${registro.odometroFinal} km*\n`
      texto += `TOTAL ODÔMETRO: *${total} km*\n`
    }
    
    texto += `\n`
    
    // Seção: Tipo de Operação
    if (registro.tipoOperacao && typeof registro.tipoOperacao === 'string') {
      const tipoOperacaoLabel = registro.tipoOperacao.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())
      texto += `TIPO DE OPERAÇÃO: *${tipoOperacaoLabel}*\n\n`
    }
    
    // Seção: Detalhes da Aplicação
    if (registro.produtoAplicado || registro.quantidadeTotalAplicada || registro.areaTrabalhada || registro.doseAplicada) {
      texto += `DETALHES DA APLICAÇÃO\n`
      texto += `PRODUTO APLICADO: *${registro.produtoAplicado || '—'}*\n`
      texto += `QUANTIDADE TOTAL APLICADA: *${registro.quantidadeTotalAplicada || '—'}*\n`
      texto += `ÁREA TRABALHADA: *${registro.areaTrabalhada || '—'}*\n`
      texto += `DOSE APLICADA: *${registro.doseAplicada || '—'}*\n\n`
    }
    
    // Seção: Avaliação
    if (registro.metaDiariaBatida || registro.algumImprevisto) {
      texto += `AVALIAÇÃO\n`
      
      if (registro.metaDiariaBatida) {
        const metaLabel = registro.metaDiariaBatida === 'S' || registro.metaDiariaBatida === 'Sim' ? 'Sim' : 'Não'
        const metaObs = registro.metaDiariaBatidaObs ? ` (${registro.metaDiariaBatidaObs})` : ''
        texto += `META DIÁRIA BATIDA: *${metaLabel}${metaObs}*\n`
      }
      
      if (registro.algumImprevisto) {
        const imprevistoLabel = registro.algumImprevisto === 'S' || registro.algumImprevisto === 'Sim' ? 'Sim' : 'Não'
        const imprevistoObs = registro.algumImprevistoObs ? ` (${registro.algumImprevistoObs})` : ''
        texto += `ALGUM IMPREVISTO: *${imprevistoLabel}${imprevistoObs}*\n`
      }
      
      texto += `\n`
    }
    
    // Seção: Observação
    if (registro.observacao && registro.observacao !== '') {
      texto += `OBSERVAÇÃO\n`
      texto += `${registro.observacao}\n`
    }
  } else if (caderneta === 'suplementacao') {
    // Para suplementacao, usar estrutura organizada por seções
    
    // Seção: Informações Básicas
    texto += `TRATADOR: *${registro.tratador || '—'}*\n`
    texto += `PASTO: *${registro.pasto || '—'}*\n`
    texto += `N° LOTE: *${registro.numeroLote || '—'}*\n`
    texto += `SUPLEMENTO: *${registro.produto || '—'}*\n\n`
    
    // Seção: Categorias
    if (registro.categorias && Array.isArray(registro.categorias) && registro.categorias.length > 0) {
      texto += `CATEGORIAS: *${registro.categorias.join(', ')}*\n\n`
    }
    
    // Seção: Leituras e Quantidades
    if (registro.leituraCocho !== null && registro.leituraCocho !== undefined && registro.leituraCocho !== '') {
      texto += `LEITURA COCHO: *${registro.leituraCocho}*\n`
    }
    if (registro.kgCocho !== null && registro.kgCocho !== undefined && registro.kgCocho !== 0) {
      texto += `SUPLEMENTO COCHO (KG): *${registro.kgCocho}*\n`
    }
    if (registro.kgDeposito !== null && registro.kgDeposito !== undefined && registro.kgDeposito !== 0) {
      texto += `SUPLEMENTO DEPÓSITO (KG): *${registro.kgDeposito}*\n`
    }
    if (registro.escoreFezes !== null && registro.escoreFezes !== undefined && registro.escoreFezes !== '') {
      texto += `ESCORE FEZES: *${registro.escoreFezes}*\n`
    }
    
    // Seção: Espaçamento do Cocho
    if (registro.espacamentoCochoDetalhes) {
      const detalhes = registro.espacamentoCochoDetalhes as any
      texto += `\nESPAÇAMENTO DO COCHO\n`
      texto += `Espaçamento calculado: *${detalhes.espacamento_calculado_m_cab?.toFixed(2)} m/cab*\n`
      if (detalhes.espacamento_ideal_m_cab) {
        texto += `Espaçamento ideal: *${detalhes.espacamento_ideal_m_cab?.toFixed(2)} m/cab*\n`
        texto += `Desvio: *${detalhes.desvio_percentual?.toFixed(1)}%*\n`
      }
      texto += `Metragem cocho: *${detalhes.metragem_cocho_m}m*\n`
      texto += `Cabeças adultas: *${detalhes.cabecas_adultas}*\n`
    }
    
    // Seção: Checklist Cochos - sempre exibir todas as perguntas
    const checklistCochos = [
      { campo: 'limpezaCocho', label: 'LIMPEZA DE COCHO FOI REALIZADA?' },
      { campo: 'cochosCondicoes', label: 'COCHOS ESTÃO EM BOAS CONDIÇÕES?' },
      { campo: 'aterroAcessoIdeal', label: 'ATERRO / ACESSO DE COCHO' },
      // { campo: 'espacamentoCochoCmCab', label: 'ESPAÇAMENTO DO COCHO' }, // Temporariamente desabilitado
    ]
    
    texto += `\nCHECKLIST COCHOS\n`
    
    checklistCochos.forEach(({ campo, label }) => {
      const valor = registro[campo]
      if (valor === true || valor === false) {
        const valorFormatado = valor ? 'Sim' : 'Não'
        texto += `${label}: *${valorFormatado}*\n`
      }
      
      // Adicionar observação
      const obsField = `${campo}Obs`
      const obsValue = registro[obsField]
      if (obsValue && obsValue !== '') {
        texto += `OBSERVAÇÃO: *${obsValue}*\n`
      }
    })
    
    // Seção: Checklist Depósito - sempre exibir todas as perguntas
    const checklistDeposito = [
      { campo: 'depositoCondicoes', label: 'DEPÓSITO EM BOAS CONDIÇÕES' },
      { campo: 'estoqueDepositio', label: 'TEM ESTOQUE NO DEPÓSITO' },
    ]
    
    texto += `\nCHECKLIST DEPÓSITO\n`
    
    checklistDeposito.forEach(({ campo, label }) => {
      const valor = registro[campo]
      if (valor === true || valor === false) {
        const valorFormatado = valor ? 'Sim' : 'Não'
        texto += `${label}: *${valorFormatado}*\n`
      }
      
      // Adicionar observação
      const obsField = `${campo}Obs`
      const obsValue = registro[obsField]
      if (obsValue && obsValue !== '') {
        texto += `OBSERVAÇÃO: *${obsValue}*\n`
      }
    })
  } else if (caderneta === 'enfermaria') {
    // DADOS DO ANIMAL
    texto += 'DADOS DO ANIMAL:\n'
    
    const ordemDadosAnimal = [
      'pasto',
      'lote',
      'brinco',
      'chip',
      'sexo',
      'raca',
      'idade',
      'categoria',
    ]
    
    ordemDadosAnimal.forEach(key => {
      const value = registro[key]
      if (value !== null && value !== undefined && value !== '') {
        let label = LABELS_BY_CADERNETA[caderneta]?.[key] || key.toUpperCase()
        const valorFormatado = formatFieldValue(key, value)
        texto += `${label}: *${valorFormatado}*\n`
      }
    })

    // DIAGNÓSTICOS
    const ordemDiagnosticos = [
      'feridaCascos',
      'sintomasPneumonia',
      'picadoCobra',
      'incoordenacaoTremores',
      'febreAlta',
      'presencaSangue',
      'fraturas',
      'desordensDigestivas',
      'cegueira',
      'andarCambaleante',
      'bicheira',
      'animalInchado'
    ]

    // Separar diagnósticos positivos e negativos
    const diagnosticosPositivos: Array<{ key: string; label: string; valor: string; observacao?: string }> = []
    const diagnosticosNegativos: Array<{ key: string; label: string; valor: string; observacao?: string }> = []

    ordemDiagnosticos.forEach(key => {
      const data = (registro.diagnosticos as any)?.[key]
      if (data && data.valor !== null && data.valor !== undefined && data.valor !== '') {
        let label = LABELS_BY_CADERNETA[caderneta]?.[key] || key.toUpperCase()
        const valorFormatado = data.valor === 'S' || data.valor === true ? 'Sim' : 'Não'
        const diagnostico = { key, label, valor: valorFormatado, observacao: data.observacao }

        if (data.valor === 'S' || data.valor === true) {
          diagnosticosPositivos.push(diagnostico)
        } else {
          diagnosticosNegativos.push(diagnostico)
        }
      }
    })

    // Mostrar diagnósticos positivos
    if (diagnosticosPositivos.length > 0) {
      texto += '\nDIAGNÓSTICOS POSITIVOS:\n'
      diagnosticosPositivos.forEach(d => {
        texto += `${d.label}: *${d.valor}*\n`
        if (d.observacao && d.observacao !== '') {
          texto += `OBSERVAÇÃO: *${d.observacao}*\n`
        }
      })
    }

    // Mostrar diagnósticos negativos
    if (diagnosticosNegativos.length > 0) {
      texto += '\nDIAGNÓSTICOS NEGATIVOS:\n'
      diagnosticosNegativos.forEach(d => {
        texto += `${d.label}: *${d.valor}*\n`
        if (d.observacao && d.observacao !== '') {
          texto += `OBSERVAÇÃO: *${d.observacao}*\n`
        }
      })
    }

    // MEDICAMENTOS
    if (registro.medicamentos && Array.isArray(registro.medicamentos) && registro.medicamentos.length > 0) {
      texto += '\nMEDICAMENTOS\n'
      registro.medicamentos.forEach((med: any, index: number) => {
        texto += `${index + 1}. ${med.tipo} -\n`
        if (med.principioAtivo) {
          texto += `   Princípio ativo: ${med.principioAtivo}\n`
        }
        if (med.doseRecomendada) {
          texto += `   Dose recomendada: ${med.doseRecomendada}\n`
        }
        if (med.doseAplicada) {
          texto += `   Dose aplicada: ${med.doseAplicada}\n`
        }
        texto += '\n'
      })
    }

    // OBSERVAÇÃO GERAL
    if (registro.observacaoTratamento && registro.observacaoTratamento !== '') {
      texto += `\nOBSERVAÇÃO: *${registro.observacaoTratamento}*\n`
    }
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
      'escore',
      'nutricaoAtual',
      'nutricaoAnterior',
    ]
    
    ordemMorte.forEach(key => {
      const value = registro[key]
      
      // Tratar categoriaOutros apenas se categoria for Outros
      if (key === 'categoriaOutros') {
        if (registro.categoria === 'Outros' && value !== null && value !== undefined && value !== '') {
          let label = LABELS_BY_CADERNETA[caderneta]?.[key] || key.toUpperCase()
          texto += `${label}: *${value}*\n`
        }
        return
      }
      
      if (value !== null && value !== undefined && value !== '') {
        let label = LABELS_BY_CADERNETA[caderneta]?.[key] || key.toUpperCase()
        const valorFormatado = formatFieldValue(key, value)
        texto += `${label}: *${valorFormatado}*\n`
        
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

    // Iterar sobre diagnosticos na ordem específica
    const ordemDiagnosticos = [
      'secrecaoOrificios',
      'sintomasPneumonia',
      'inchaco',
      'incoordenacaoTremores',
      'apatiaFraqueza',
      'desordensDigestivas',
      'fraturas',
      'decomposicao',
      'doencasPrevias',
      'medicamentosRecentes',
      'morteSubita',
      'animalSozinho',
      'salivacaoExcessiva',
      'sinaisIntoxicacao',
      'carrapatosMoscas',
      'encontradoVivo',
      'medicado',
      'animalInchado',
      'animalBicheira',
    ]

    texto += 'DIAGNÓSTICOS:\n'
    
    ordemDiagnosticos.forEach(key => {
      const data = (registro.diagnosticos as any)?.[key]
      if (data && data.valor !== null && data.valor !== undefined && data.valor !== '') {
        let label = LABELS_BY_CADERNETA[caderneta]?.[key] || key.toUpperCase()
        const valorFormatado = data.valor === 'S' || data.valor === true ? 'Sim' : 'Não'
        texto += `${label}: *${valorFormatado}*\n`
        
        if (data.observacao && data.observacao !== '') {
          texto += `OBSERVAÇÃO: *${data.observacao}*\n`
        }
      }
    })
  } else if (caderneta === 'clima') {
    // Para clima, usar ordem específica
    const ordemClima = ['responsavel', 'temperaturaMedia', 'umidadeRelativa']
    
    ordemClima.forEach(key => {
      const value = registro[key]
      if (value !== null && value !== undefined && value !== '') {
        let label = LABELS_BY_CADERNETA[caderneta]?.[key] || key.toUpperCase()
        const valorFormatado = formatFieldValue(key, value)
        texto += `${label}: *${valorFormatado}*\n`
      }
    })

    // Adicionar medições de pluviômetros
    if (registro.medicoes && Array.isArray(registro.medicoes)) {
      texto += `\nPLUVIÔMETROS\n`
      registro.medicoes.forEach((m: any) => {
        if (m.medicao !== null && m.medicao !== undefined && m.medicao !== '') {
          const nome = m.pluviometro_nome || m.pluviometroNome || 'Pluviômetro'
          const localizacao = m.pluviometro_localizacao || m.pluviometroLocalizacao
          texto += `${nome}${localizacao ? ` (${localizacao})` : ''}: *${m.medicao} mm*\n`
        }
      })
    }

    // Adicionar observação no final
    if (registro.observacao && registro.observacao !== '') {
      texto += `\nOBSERVAÇÃO: *${registro.observacao}*\n`
    }
  } else if (caderneta === 'almoxarifado') {
    // Para almoxarifado, exibir quem entregou e quem pegou
    texto += `QUEM ENTREGOU: *${registro.quemEntregou || '—'}*\n`
    texto += `QUEM PEGOU: *${registro.quemPegou || '—'}*\n\n`

    // Mapear tipos de itens para labels legíveis
    const tipoItemLabelMap: Record<string, string> = {
      ferramenta: 'FERRAMENTA',
      medicamento: 'MEDICAMENTO',
      parafusos: 'PARAFUSOS',
      porcas: 'PORCAS',
      'barra rosca': 'BARRA ROSCA',
      inseticida: 'INSETICIDA',
      herbicida: 'HERBICIDA',
      fungicida: 'FUNGICIDA',
      vermífugo: 'VERMÍFUGO',
      filtro: 'FILTRO',
      'óleo lubrificante': 'ÓLEO LUBRIFICANTE',
      eletrodo: 'ELETRODO',
      cruzeta: 'CRUZETA',
      mancal: 'MANCAL',
      rolamento: 'ROLAMENTO',
      mangueira: 'MANGUEIRA',
      detergente: 'DETERGENTE',
      conexões: 'CONEXÕES',
      pregos: 'PREGOS',
      torneira: 'TORNEIRA',
      lâmpada: 'LÂMPADA',
      fios: 'FIOS',
      epi: 'EPI',
      calçados: 'CALÇADOS',
    }

    // Exibir itens
    if (registro.itens && Array.isArray(registro.itens) && registro.itens.length > 0) {
      texto += 'ITENS\n'
      registro.itens.forEach((item: any, index: number) => {
        const tipoLabel = tipoItemLabelMap[item.tipo] || item.tipo?.toUpperCase() || '—'
        texto += `${index + 1}. ${tipoLabel} - *${item.quantidade || '—'}*\n`

        // Classificação (se preenchida)
        if (item.tipoClassificacao && item.tipoClassificacao !== '') {
          texto += `   Classificação: *${item.tipoClassificacao}*\n`
        }

        // Setor
        if (item.setor && item.setor !== '') {
          texto += `   Setor: *${item.setor}*\n`
        }

        // Devolução
        if (item.necessitaDevolucao === 'S') {
          const prazoLabel = item.prazoDevolucao || '—'
          texto += `   Devolução: Sim (*${prazoLabel}*)\n`
        } else {
          texto += `   Devolução: Não\n`
        }

        // Quebra de linha após cada item
        texto += '\n'
      })
    }

    // Observação
    if (registro.observacao && registro.observacao !== '') {
      texto += `\nOBSERVAÇÃO: *${registro.observacao}*\n`
    }
  } else if (caderneta === 'rodeio') {
    // Para rodeio, usar ordem específica dos formulários
    const ordemRodeio = [
      'pasto',
      'numeroLote',
      'gadoContado',
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
      'escoreFezes',
      'equipe',
      'escoreGado'
    ]
    
    ordemRodeio.forEach(key => {
      const value = registro[key]
      
      // Handle gadoContado field
      if (key === 'gadoContado') {
        if (value && value !== '') {
          let label = LABELS_BY_CADERNETA[caderneta]?.[key] || key.toUpperCase()
          const valorFormatado = value === 'Sim' ? 'Sim' : 'Não'
          texto += `${label}: *${valorFormatado}*\n`
        }
        return
      }
      
      // Para campos numéricos (categorias), não incluir se for 0 ou se gadoContado !== 'Sim'
      if (['vaca', 'touro', 'boiGordo', 'boiMagro', 'garrote', 'bezerro', 'novilha', 'tropa', 'outros'].includes(key)) {
        // Only show categories if gadoContado is 'Sim'
        if (registro.gadoContado === 'Sim' && value !== null && value !== undefined && value !== '' && Number(value) > 0) {
          let label = LABELS_BY_CADERNETA[caderneta]?.[key] || key.toUpperCase()
          const valorFormatado = formatFieldValue(key, value)
          texto += `${label}: *${valorFormatado}*\n`
        }
      } else if (key === 'totalCabecas') {
        // Show totalCabecas based on gadoContado
        if (registro.gadoContado === 'Não') {
          // Show batch total when gado was not counted
          const totalLote = (Number(registro.n_cabecas) || 0) + (Number(registro.qtd_bezerros) || 0)
          if (totalLote > 0) {
            texto += `TOTAL: *${totalLote} animais*\n`
          }
        } else if (registro.gadoContado === 'Sim' && value !== null && value !== undefined && value !== '') {
          // Show counted total when gado was counted
          let label = LABELS_BY_CADERNETA[caderneta]?.[key] || key.toUpperCase()
          const valorFormatado = formatFieldValue(key, value)
          texto += `${label}: *${valorFormatado}*\n`
        }
        texto += `\n`
      } else if (key === 'equipe') {
        // Show equipe number and names
        if (value !== null && value !== undefined && value !== '') {
          let label = LABELS_BY_CADERNETA[caderneta]?.[key] || key.toUpperCase()
          const valorFormatado = formatFieldValue(key, value)
          texto += `${label}: *${valorFormatado}*\n`
          
          // Show team member names if available
          if (registro.equipeNomes && Array.isArray(registro.equipeNomes) && registro.equipeNomes.length > 0) {
            const nomesComValor = registro.equipeNomes.filter((n: string) => n && n.trim() !== '')
            if (nomesComValor.length > 0) {
              texto += `EQUIPE: *${nomesComValor.join(', ')}*\n`
            }
          }
        }
      } else if (value !== null && value !== undefined && value !== '') {
        let label = LABELS_BY_CADERNETA[caderneta]?.[key] || key.toUpperCase()
        const valorFormatado = formatFieldValue(key, value)
        texto += `${label}: *${valorFormatado}*\n`
      }
    })

    // Iterar sobre diagnosticos na ordem específica
    const ordemDiagnosticos = [
      'bebedourosCochos',
      'pastagensTaxaLotacao',
      'animaisMachucadosDoentesBichados',
      'cercasCochosPorteiras',
      'carrapatosMoscas',
      'animaisEntreverados',
      'animalMorto',
    ]

    texto += 'AVALIAÇÃO GERAL:\n'
    
    ordemDiagnosticos.forEach(key => {
      const data = (registro.diagnosticos as any)?.[key]
      if (data && data.valor !== null && data.valor !== undefined && data.valor !== '') {
        let label = LABELS_BY_CADERNETA[caderneta]?.[key] || key.toUpperCase()
        const valorFormatado = data.valor === 'S' || data.valor === true ? 'Sim' : 'Não'
        texto += `${label}: *${valorFormatado}*\n`
        
        // Only show observation when answer is 'N' (NÃO)
        if (data.observacao && data.observacao !== '' && data.valor === 'N') {
          texto += `OBSERVAÇÃO: *${data.observacao}*\n`
        }
      }
    })
  } else if (caderneta === 'entrada-insumos') {
    // Para entrada de insumos, usar ordem específica dos formulários
    const ordemEntradaInsumos = [
      'dataEntrada',
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
        texto += `${label}: *${valorFormatado}*\n`
      }
    })

    // Adicionar itens da entrada
    if (registro.itens && Array.isArray(registro.itens) && registro.itens.length > 0) {
      texto += `\nITENS DA ENTRADA\n`
      registro.itens.forEach((item: any, index: number) => {
        texto += `${index + 1}. ${item.produto || '—'}\n`
        if (item.quantidade) {
          texto += `   Quantidade: *${item.quantidade}*\n`
        }
        if (item.valorUnitario) {
          texto += `   Valor unitário: *R$ ${item.valorUnitario}*\n`
        }
        if (item.valorTotal) {
          texto += `   Valor total: *R$ ${item.valorTotal}*\n`
        }
        texto += `\n`
      })

      // Calcular e adicionar valor total dos insumos
      const valorTotalInsumos = registro.itens.reduce((total: number, item: any) => {
        const valor = parseFloat(item.valorTotal) || 0
        return total + valor
      }, 0)
      texto += `VALOR TOTAL: *R$ ${valorTotalInsumos.toFixed(2)}*\n`
    }
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
        texto += `${label}: *${valorFormatado}*\n`
      }
    })
    
    // Adicionar insumos utilizados
    if (registro.insumosQuantidades) {
      texto += '\nINSUMOS UTILIZADOS (kg)\n'
      Object.entries(registro.insumosQuantidades).forEach(([insumo, quantidade]) => {
        if (quantidade && parseFloat(String(quantidade)) > 0) {
          texto += `${insumo}: *${quantidade}*\n`
        }
      })
    }
  } else if (caderneta === 'manutencao-maquinas') {
    // Seção: Dados Principais
    texto += `RESPONSÁVEL CHECKLIST: *${registro.responsavelChecklist || '—'}*\n`
    texto += `OPERADOR/MOTORISTA: *${registro.operadorMotorista || '—'}*\n`
    texto += `MÁQUINA/VEÍCULO: *${registro.maquinaVeiculo || '—'}*\n`
    texto += `PLACA: *${registro.placa || '—'}*\n`
    texto += `ODÔMETRO/HORÍMETRO: *${registro.odometro || '—'}*\n\n`

    // Seção: Checklist
    const checklistPerguntas = [
      { campo: 'abastecimentoRealizado', label: 'ABASTECIMENTO REALIZADO?' },
      { campo: 'lavagemRealizada', label: 'LAVAGEM REALIZADA?' },
      { campo: 'vidrosPerfeitos', label: 'VIDROS ESTÃO PERFEITOS?' },
      { campo: 'freiosBons', label: 'FREIOS ESTÃO BONS?' },
      { campo: 'bateriaBoa', label: 'BATERIA ESTÁ BOA?' },
      { campo: 'conferiuEletrica', label: 'CONFERIU ELÉTRICA?' },
      { campo: 'maquinaEngraxada', label: 'MÁQUINA ENGRAXADA?' },
      { campo: 'nivelAguaIdeal', label: 'NÍVEL DE ÁGUA IDEAL?' },
      { campo: 'conferiuNivelOleo', label: 'CONFERIU NÍVEL DO ÓLEO?' },
      { campo: 'calibrouPneus', label: 'CALIBROU OS PNEUS?' },
      { campo: 'limpouRadiador', label: 'LIMPOU O RADIADOR?' },
      { campo: 'tapetesBons', label: 'TAPETES ESTÃO BONS?' },
      { campo: 'assentoBom', label: 'ASSENTO ESTÁ BOM?' },
    ]

    texto += `CHECKLIST\n`
    checklistPerguntas.forEach(({ campo, label }) => {
      const valor = (registro.checklist as any)?.[campo]?.valor
      const observacao = (registro.checklist as any)?.[campo]?.observacao
      if (valor === 'S' || valor === 'N') {
        const valorFormatado = valor === 'S' ? 'Sim' : 'Não'
        texto += `${label}: *${valorFormatado}*\n`
      }
      if (observacao && observacao !== '') {
        texto += `OBSERVAÇÃO: *${observacao}*\n`
      }
    })

    if (registro.observacao && registro.observacao !== '') {
      texto += `\nOBSERVAÇÃO: *${registro.observacao}*\n`
    }
  } else if (caderneta === 'problemas') {
    // Seção: Localização
    texto += `LOCALIZAÇÃO\n`
    texto += `SETOR: *${registro.setor || '—'}*\n`
    texto += `LOCAL: *${registro.local || '—'}*\n\n`

    // Seção: Descrição do Problema
    texto += `DESCRIÇÃO DO PROBLEMA\n`
    texto += `${registro.descricaoProblema || '—'}\n\n`

    // Seção: Análise
    texto += `ANÁLISE\n`
    if (registro.causaIdentificada) {
      const causaLabel = registro.causaIdentificada === 'S' ? 'Sim' : 'Não'
      texto += `CAUSA IDENTIFICADA: *${causaLabel}*\n`
    }
    if (registro.causaIdentificadaObs && registro.causaIdentificadaObs !== '') {
      texto += `OBSERVAÇÃO: *${registro.causaIdentificadaObs}*\n`
    }
    if (registro.acaoCorretivaRealizada) {
      const acaoLabel = registro.acaoCorretivaRealizada === 'S' ? 'Sim' : 'Não'
      texto += `AÇÃO CORRETIVA REALIZADA: *${acaoLabel}*\n`
    }
    if (registro.acaoCorretivaRealizadaObs && registro.acaoCorretivaRealizadaObs !== '') {
      texto += `OBSERVAÇÃO: *${registro.acaoCorretivaRealizadaObs}*\n`
    }
    texto += `\n`

    // Seção: Classificação
    texto += `CLASSIFICAÇÃO\n`
    if (registro.tipoOcorrencia) {
      texto += `TIPO DE OCORRÊNCIA: *${registro.tipoOcorrencia}*\n`
    }
    if (registro.tipoOcorrenciaObs && registro.tipoOcorrenciaObs !== '') {
      texto += `OBSERVAÇÃO: *${registro.tipoOcorrenciaObs}*\n`
    }
    if (registro.causaRaizIdentificada) {
      const raizLabel = registro.causaRaizIdentificada === 'S' ? 'Sim' : 'Não'
      texto += `CAUSA RAIZ IDENTIFICADA: *${raizLabel}*\n`
    }
    if (registro.causaRaizIdentificadaObs && registro.causaRaizIdentificadaObs !== '') {
      texto += `OBSERVAÇÃO: *${registro.causaRaizIdentificadaObs}*\n`
    }
    if (registro.gravidadeImpacto) {
      texto += `GRAVIDADE/IMPACTO: *${registro.gravidadeImpacto}*\n`
    }
    if (registro.gravidadeImpactoObs && registro.gravidadeImpactoObs !== '') {
      texto += `OBSERVAÇÃO: *${registro.gravidadeImpactoObs}*\n`
    }
    if (registro.tipoProblema) {
      texto += `TIPO DE PROBLEMA: *${registro.tipoProblema}*\n`
    }
    if (registro.tipoProblemaObs && registro.tipoProblemaObs !== '') {
      texto += `OBSERVAÇÃO: *${registro.tipoProblemaObs}*\n`
    }
    if (registro.prioridade) {
      texto += `PRIORIDADE: *${registro.prioridade}*\n`
    }
    if (registro.setorResolve) {
      texto += `SETOR QUE RESOLVE: *${registro.setorResolve}*\n`
    }
  } else {
    // Para pastagens, usar estrutura organizada
    if (caderneta === 'pastagens') {
      // Cabeçalho
      texto += `MANEJADOR: *${registro.manejador || '—'}*\n\n`

      // Seção PASTO SAÍDA
      texto += `PASTO SAÍDA\n`
      texto += `Nome: *${registro.pastoSaida || '—'}*\n`
      texto += `Área útil: *${registro.pastoSaidaAreaUtil || '—'}* ha\n`
      texto += `Espécie: *${registro.pastoSaidaEspecie || '—'}*\n`
      texto += `Avaliação saída: *${registro.avaliacaoSaida || '—'}*\n`
      texto += `Tempo de ocupação: *${registro.tempoOcupacao || '—'}*\n\n`

      // Seção PASTO ENTRADA
      texto += `PASTO ENTRADA\n`
      texto += `Nome: *${registro.pastoEntrada || '—'}*\n`
      texto += `Área útil: *${registro.pastoEntradaAreaUtil || '—'}* ha\n`
      texto += `Espécie: *${registro.pastoEntradaEspecie || '—'}*\n`
      texto += `Avaliação entrada: *${registro.avaliacaoEntrada || '—'}*\n`
      texto += `Tempo de vedação: *${registro.tempoVedacao || '—'}*\n\n`

      // Seção LOTE
      texto += `LOTE: *${registro.numeroLote || '—'}*\n\n`

      // Seção QUANTIDADE DE ANIMAIS
      texto += `QUANTIDADE DE ANIMAIS\n`
      
      // Mostrar se o gado foi contado
      if (registro.gadoContado) {
        texto += `GADO FOI CONTADO?: *${registro.gadoContado}*\n`
      }

      // Se foi contado, mostrar categorias individuais
      if (registro.gadoContado === 'Sim') {
        const categorias = ['vaca', 'touro', 'boiGordo', 'boiMagro', 'garrote', 'bezerro', 'novilha', 'tropa', 'outros']
        categorias.forEach(key => {
          const value = Number(registro[key]) || 0
          if (value > 0) {
            let label = LABELS_BY_CADERNETA[caderneta]?.[key] || key.toUpperCase()
            texto += `${label}: *${value}*\n`
          }
        })
      } else if (registro.gadoContado === 'Não') {
        // Se não foi contado, mostrar total do lote
        const totalLote = (Number(registro.n_cabecas) || 0) + (Number(registro.qtd_bezerros) || 0)
        texto += `CABEÇAS MANEJADAS: *${totalLote} animais*\n`
      }

      // Mostrar total sempre
      if (registro.totalAnimais) {
        texto += `TOTAL: *${registro.totalAnimais} animais*\n`
      }
      texto += `\n`

      // Escore do gado
      if (registro.escoreGado) {
        texto += `ESCORE DO GADO: *${registro.escoreGado}*\n`
      }
    } else if (caderneta === 'maternidade') {
      // Seção: INFORMAÇÕES BÁSICAS
      texto += `INFORMAÇÕES BÁSICAS\n`
      if (registro.pasto) {
        texto += `PASTO: *${registro.pasto}*\n`
      }
      if (registro.lote) {
        texto += `LOTE: *${registro.lote}*\n`
      }
      texto += `\n`

      // Seção: IDENTIFICAÇÃO DA MÃE
      texto += `IDENTIFICAÇÃO DA MÃE\n`
      if (registro.idBrincoMae) {
        texto += `ID BRINCO: *${registro.idBrincoMae}*\n`
      }
      if (registro.idChipMae) {
        texto += `ID CHIP: *${registro.idChipMae}*\n`
      }
      if (registro.categoriaMae) {
        texto += `CATEGORIA MÃE: *${registro.categoriaMae}*\n`
      }
      if (registro.escoreMatriz) {
        texto += `ESCORE MATRIZ: *${registro.escoreMatriz}*\n`
      }
      if (registro.docilidadeMatriz) {
        texto += `DOCILIDADE MATRIZ: *${registro.docilidadeMatriz}*\n`
      }
      texto += `\n`

      // Seção: IDENTIFICAÇÃO DA CRIA
      texto += `IDENTIFICAÇÃO DA CRIA\n`
      if (registro.idProvisorioCria) {
        texto += `ID PROVISÓRIO: *${registro.idProvisorioCria}*\n`
      }
      if (registro.idBrincoCria) {
        texto += `ID BRINCO: *${registro.idBrincoCria}*\n`
      }
      if (registro.idChipCria) {
        texto += `ID CHIP: *${registro.idChipCria}*\n`
      }
      if (registro.pesoCria) {
        texto += `PESO CRIA: *${registro.pesoCria}* kg\n`
      }
      if (registro.sexo) {
        texto += `SEXO: *${registro.sexo}*\n`
      }
      if (registro.raca) {
        texto += `RAÇA: *${registro.raca}*\n`
      }
      texto += `\n`

      // Seção: PARTO
      texto += `PARTO\n`
      if (registro.tipoParto) {
        const tipoPartoFormatted = Array.isArray(registro.tipoParto) 
          ? registro.tipoParto.join(', ') 
          : registro.tipoParto
        texto += `TIPO DE PARTO: *${tipoPartoFormatted}*\n`
      }
      if (registro.observacaoParto) {
        texto += `OBSERVAÇÃO PARTO: *${registro.observacaoParto}*\n`
      }
      if (registro.tratamento) {
        texto += `TRATAMENTO: *${registro.tratamento}*\n`
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
          'pasto', 'avaliacao', 'manejador', 'numeroLote', 'gadoContado', 'totalAnimais', 'n_cabecas', 'qtd_bezerros' // campos já tratados na estrutura organizada
        ].includes(key)) {
          return // Não incluir detalhes dos pastos no texto compartilhável
        }
        
        // Para rodeio, ignorar campos já tratados na ordem específica
        if (caderneta === 'rodeio') {
          return // Já tratado na ordem específica acima
        }
        
        texto += `${label}: *${valorFormatado}*\n`
        
        // Para movimentação, adicionar campos especiais após loteOrigem
        if (caderneta === 'movimentacao' && key === 'loteOrigem' && camposMovimentacaoEspeciais.length > 0) {
          camposMovimentacaoEspeciais.forEach(([campoKey, campoValue]) => {
            let campoLabel = LABELS_BY_CADERNETA[caderneta]?.[campoKey] || campoKey.toUpperCase()
            const campoValorFormatado = formatFieldValue(campoKey, campoValue)
            texto += `${campoLabel}: *${campoValorFormatado}*\n`
          })
        }
        
        // Para enfermaria, adicionar observação abaixo do campo principal
        if (caderneta === 'enfermaria' && !key.endsWith('Obs') && !key.startsWith('tratamento')) {
          const obsKey = `${key}Obs`
          const obsValue = registro[obsKey]
          if (obsValue && obsValue !== '' && obsValue !== null && obsValue !== undefined) {
            texto += `OBSERVAÇÃO: *${String(obsValue)}*\n`
          }
        }
      })
    }
  }

  // Adicionar campos após peso vivo atual (movimentação)
  camposAposPesoVivoAtual.forEach(([key, value]) => {
    let label = LABELS_BY_CADERNETA[caderneta]?.[key] || key.toUpperCase()
    const valorFormatado = formatFieldValue(key, value)
    texto += `${label}: *${valorFormatado}*\n`
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
