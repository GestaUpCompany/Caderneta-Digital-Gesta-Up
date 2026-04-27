import { useState, useEffect, useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { Registro } from '../../types/cadernetas'
import { CadernetaStore } from '../../services/indexedDB'
import { listarRegistros, excluirRegistro } from '../../services/api'
import { useSearchFiltros } from '../../hooks/useSearchFiltros'
import { Input, Button } from '../ui'
import DatePickerIcon from '../ui/DatePickerIcon'
import { RootState } from '../../store/store'
import { LABELS_BY_CADERNETA } from '../../config/labelConfig'

interface Props {
  caderneta: CadernetaStore
  titulo: string
  rotaForm: string
}

const statusLabel: Record<string, string> = {
  pending: '⏳',
  synced: '✅',
  conflict: '⚠️',
  error: '❌',
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

export default function ListaRegistros({ caderneta, titulo, rotaForm }: Props) {
  const navigate = useNavigate()
  const { usuario } = useSelector((state: RootState) => state.config)
  const [registros, setRegistros] = useState<Registro[]>([])
  const [carregando, setCarregando] = useState(true)
  const [mostrarFiltros, setMostrarFiltros] = useState(false)
  const [filtroSexo, setFiltroSexo] = useState('')
  const [filtroTipoParto, setFiltroTipoParto] = useState('')
  const [periodoAtivo, setPeriodoAtivo] = useState<'todos' | 'hoje' | '7dias' | '30dias' | null>(null)
  const [mostrarModalExcluir, setMostrarModalExcluir] = useState(false)
  const [registroParaExcluir, setRegistroParaExcluir] = useState<string | null>(null)
  const [mostrarModalCompartilhar, setMostrarModalCompartilhar] = useState(false)
  const [registroParaCompartilhar, setRegistroParaCompartilhar] = useState<Registro | null>(null)

  const carregar = useCallback(async () => {
    setCarregando(true)
    const lista = await listarRegistros(caderneta)
    setRegistros(lista)
    setCarregando(false)
  }, [caderneta])

  useEffect(() => {
    carregar()
  }, [carregar])

  const {
    filtros,
    registrosFiltrados,
    setBusca,
    setDataInicio,
    setDataFim,
    setOrdenacao,
    limparFiltros,
    setPeriodoRapido,
    temFiltrosAtivos,
  } = useSearchFiltros(registros)

  // Filtragem específica para maternidade
  const registrosFiltradosFinal = useMemo(() => {
    let resultado = registrosFiltrados

    if (caderneta === 'maternidade') {
      if (filtroSexo) {
        resultado = resultado.filter((r) => r.sexo === filtroSexo)
      }
      if (filtroTipoParto) {
        resultado = resultado.filter((r) => r.tipoParto === filtroTipoParto)
      }
    }

    return resultado
  }, [registrosFiltrados, caderneta, filtroSexo, filtroTipoParto])

  const handleExcluir = (id: string) => {
    setRegistroParaExcluir(id)
    setMostrarModalExcluir(true)
  }

  const confirmarExclusao = async () => {
    if (registroParaExcluir) {
      await excluirRegistro(caderneta, registroParaExcluir)
      setMostrarModalExcluir(false)
      setRegistroParaExcluir(null)
      carregar()
    }
  }

  // const handleExportCSV = () => exportToCSV(registrosFiltradosFinal, `${caderneta}_export`, colunas)
  // const handleExportJSON = () => exportToJSON(registrosFiltradosFinal, `${caderneta}_export`)
  // const handleCopy = () => copyToClipboard(registrosFiltradosFinal)

  const handleLimparFiltrosCompletos = () => {
    limparFiltros()
    setFiltroSexo('')
    setFiltroTipoParto('')
    setPeriodoAtivo(null)
  }

  const handleSetPeriodoRapido = (periodo: 'todos' | '7dias' | '30dias' | 'hoje') => {
    setPeriodoRapido(periodo)
    setPeriodoAtivo(periodo)
  }

  const formatarRegistroComoTexto = (registro: Registro): string => {
    let texto = `📅 Data: ${String(registro.data)}\n\n`

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

  const compartilharWhatsApp = async (texto: string) => {
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

  const handleCompartilhar = (registro: Registro) => {
    setRegistroParaCompartilhar(registro)
    setMostrarModalCompartilhar(true)
  }

  const handleCompartilharTexto = () => {
    if (registroParaCompartilhar) {
      const texto = formatarRegistroComoTexto(registroParaCompartilhar)
      compartilharWhatsApp(texto)
      setMostrarModalCompartilhar(false)
      setRegistroParaCompartilhar(null)
    }
  }

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      <header className="bg-[#1a3a2a] text-white flex items-center px-4 py-4">
        <button
          onClick={() => navigate(-1)}
          className="text-yellow-400 font-bold text-sm min-h-[40px] px-3"
        >
          VOLTAR
        </button>
        <h1 className="text-base font-bold flex-1 text-center">{titulo}</h1>
        <span className="text-yellow-400 font-bold text-sm">
          {registrosFiltradosFinal.length} registros
        </span>
      </header>

      <main className="flex-1 p-4 flex flex-col gap-3 pb-8">
        {/* Ações principais */}
        <Button onClick={() => navigate(rotaForm)} variant="primary" icon="➕">
          NOVO REGISTRO
        </Button>

        {/* Busca rápida */}
        <Input
          placeholder="🔍 Buscar por pasto, número, tratamento..."
          value={filtros.busca}
          onChange={(e) => setBusca(e.target.value)}
          fullWidth
          textSize="base"
        />

        {/* Botões de período rápido */}
        <div className="flex gap-2 overflow-x-auto pb-1">
          <Button
            onClick={() => handleSetPeriodoRapido('todos')}
            variant={periodoAtivo === 'todos' ? 'secondary' : 'ghost'}
            size="sm"
            icon="📆"
            className="!gap-1"
          >
            TODOS
          </Button>
          <Button
            onClick={() => handleSetPeriodoRapido('hoje')}
            variant={periodoAtivo === 'hoje' ? 'secondary' : 'ghost'}
            size="sm"
            icon="📆"
            className="!gap-1"
          >
            HOJE
          </Button>
          <Button
            onClick={() => handleSetPeriodoRapido('7dias')}
            variant={periodoAtivo === '7dias' ? 'secondary' : 'ghost'}
            size="sm"
            icon="📆"
            className="!gap-1"
          >
            7 DIAS
          </Button>
          <Button
            onClick={() => handleSetPeriodoRapido('30dias')}
            variant={periodoAtivo === '30dias' ? 'secondary' : 'ghost'}
            size="sm"
            icon="📆"
            className="!gap-1"
          >
            30 DIAS
          </Button>
        </div>

        {/* Botões de filtros e exportar */}
        <div className="grid grid-cols-1 gap-3">
          <Button
            onClick={() => setMostrarFiltros(!mostrarFiltros)}
            variant={temFiltrosAtivos ? 'secondary' : 'ghost'}
            size="sm"
            icon="🔎"
          >
            {temFiltrosAtivos ? 'FILTROS ATIVOS' : 'FILTROS'}
          </Button>
        </div>

        {temFiltrosAtivos && (
          <Button
            onClick={limparFiltros}
            variant="secondary"
            size="sm"
            icon="🧹"
          >
            LIMPAR FILTROS
          </Button>
        )}

        {/* Painel de filtros avançados */}
        {mostrarFiltros && (
          <div className="bg-white rounded-2xl p-4 border-2 border-gray-200 flex flex-col gap-3">
            <h3 className="font-bold text-gray-800">🔎 Filtros Avançados</h3>
            <div className="grid grid-cols-2 gap-3">
              <DatePickerIcon
                label="Data Início"
                value={filtros.dataInicio}
                onChange={setDataInicio}
              />
              <DatePickerIcon
                label="Data Fim"
                value={filtros.dataFim}
                onChange={setDataFim}
              />
            </div>
            <div>
              <label className="block text-base font-bold text-gray-800 mb-2">ORDENAÇÃO</label>
              <select
                value={filtros.ordenacao}
                onChange={(e) => setOrdenacao(e.target.value as any)}
                className="w-full min-h-[60px] text-xl px-4 py-3 bg-white border-2 border-gray-400 rounded-xl"
              >
                <option value="data_desc">📅 Data (mais recente)</option>
                <option value="data_asc">📅 Data (mais antiga)</option>
              </select>
            </div>

            {caderneta === 'maternidade' && (
              <>
                <div>
                  <label className="block text-base font-bold text-gray-800 mb-2">SEXO</label>
                  <select
                    value={filtroSexo}
                    onChange={(e) => setFiltroSexo(e.target.value)}
                    className="w-full min-h-[60px] text-xl px-4 py-3 bg-white border-2 border-gray-400 rounded-xl"
                  >
                    <option value="">Todos</option>
                    <option value="Macho">Macho ♂️</option>
                    <option value="Fêmea">Fêmea ♀️</option>
                  </select>
                </div>
                <div>
                  <label className="block text-base font-bold text-gray-800 mb-2">TIPO DE PARTO</label>
                  <select
                    value={filtroTipoParto}
                    onChange={(e) => setFiltroTipoParto(e.target.value)}
                    className="w-full min-h-[60px] text-xl px-4 py-3 bg-white border-2 border-gray-400 rounded-xl"
                  >
                    <option value="">Todos</option>
                    <option value="Normal">Normal ✅</option>
                    <option value="Auxiliado">Auxiliado 🤝</option>
                    <option value="Cesárea">Cesárea 🏥</option>
                    <option value="Aborto">Aborto ❌</option>
                  </select>
                </div>
              </>
            )}
            {(temFiltrosAtivos || filtroSexo || filtroTipoParto) && (
              <Button onClick={handleLimparFiltrosCompletos} variant="ghost" size="sm">
                🧹 LIMPAR FILTROS
              </Button>
            )}
          </div>
        )}

        {/* Lista de registros */}
        {carregando ? (
          <div className="flex items-center justify-center py-16">
            <span className="text-2xl animate-spin">⏳</span>
            <span className="ml-3 text-lg font-semibold text-gray-600">Carregando...</span>
          </div>
        ) : registrosFiltradosFinal.length === 0 ? (
          <div className="bg-white rounded-2xl p-8 text-center border-2 border-gray-200">
            <p className="text-5xl mb-4">📋</p>
            <p className="text-xl font-bold text-gray-700">
              {registros.length === 0 ? 'Nenhum registro ainda' : 'Nenhum resultado encontrado'}
            </p>
            <p className="text-base text-gray-500 mt-2">
              {registros.length === 0
                ? 'Toque em "NOVO REGISTRO" para começar'
                : 'Ajuste os filtros ou limpe a busca'}
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {registrosFiltradosFinal.map((registro) => (
              <div
                key={registro.id}
                className="bg-white rounded-2xl p-4 border-2 border-gray-200 shadow-sm"
              >
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{statusLabel[registro.syncStatus] ?? '⏳'}</span>
                    <span className="text-base font-bold text-gray-800">{registro.data as string}</span>
                  </div>
                  <span className="text-xs text-gray-400 font-mono">{(registro.id as string).slice(0, 8)}</span>
                </div>

                <div className="grid grid-cols-2 gap-x-4 gap-y-2 mb-3">
                  {usuario && (
                    <div className="col-span-2">
                      <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">USUÁRIO</p>
                      <p className="text-base font-semibold text-gray-900">{usuario}</p>
                    </div>
                  )}
                  {(() => {
                    const camposNormais: [string, unknown][] = []
                    const categoriasAnimais: string[] = []

                    if (caderneta === 'movimentacao') {
                      // Para movimentação, usar ordem específica dos formulários
                      const ordemMovimentacao = [
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
                          camposNormais.push([key, value])
                        }
                      })
                    } else if (caderneta === 'bebedouros') {
                      // Para bebedouros, usar ordem específica dos formulários
                      const ordemBebedouros = [
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
                          camposNormais.push([key, value])
                        }
                      })
                    } else if (caderneta === 'suplementacao') {
                      // Para suplementação, usar ordem específica dos formulários
                      const ordemSuplementacao = [
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
                          camposNormais.push([key, value])
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
                          camposNormais.push([key, value])
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
                          camposNormais.push([key, value])
                        }
                      })
                      
                      // Adicionar insumos utilizados
                      if (registro.insumosQuantidades) {
                        Object.entries(registro.insumosQuantidades).forEach(([insumo, quantidade]) => {
                          if (quantidade && parseFloat(String(quantidade)) > 0) {
                            camposNormais.push([insumo, quantidade])
                          }
                        })
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
                        'equipe'
                      ]
                      
                      ordemRodeio.forEach(key => {
                        const value = registro[key]
                        if (value !== null && value !== undefined && value !== '') {
                          camposNormais.push([key, value])
                        }
                        
                        // Adicionar observação imediatamente após o campo principal
                        const obsField = `${key}Obs`
                        if (registro[obsField] && registro[obsField] !== '') {
                          camposNormais.push([obsField, registro[obsField]])
                        }
                      })
                    } else if (caderneta === 'enfermaria') {
                      // Para enfermaria, usar ordem específica dos formulários
                      const ordemEnfermaria = [
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
                          camposNormais.push([key, value])
                        }
                        
                        // Adicionar observação imediatamente após o campo principal
                        const obsField = `${key}Obs`
                        if (registro[obsField] && registro[obsField] !== '') {
                          camposNormais.push([obsField, registro[obsField]])
                        }
                      })
                    } else {
                      Object.entries(registro).forEach(([key, value]) => {
                        if (
                          !['id', 'googleRowId', 'version', 'lastModified', 'syncStatus', 'categoriasMarcadas'].includes(key) &&
                          value !== null &&
                          value !== undefined &&
                          value !== ''
                        ) {
                          if (key === 'causaObservacao') {
                            // Será adicionado por último
                          } else {
                            camposNormais.push([key, value])
                          }
                        }
                      })
                    }

                    return (
                      <>
                        {camposNormais.map(([key, value]) => {
                          // Formatar label especial para animais tratados
                          let label = LABELS_BY_CADERNETA[caderneta]?.[key] || key.toUpperCase()
                          if (key.match(/^animal\d+Id$/)) {
                            label = `animal ${String(value)}`
                          } else if (key.match(/^animal\d+Tratamentos$/)) {
                            label = 'Tratamentos'
                          }

                          return (
                            <div key={key}>
                              <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">
                                {label}
                              </p>
                              <p className="text-base font-semibold text-gray-900 break-words whitespace-normal">
                                {formatFieldValue(key, value)}
                              </p>
                            </div>
                          )
                        })}
                        {caderneta === 'movimentacao' && categoriasAnimais.length > 0 && (
                          <div className="col-span-2" key="categoriasAnimais">
                            <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">
                              CATEGORIAS DOS ANIMAIS
                            </p>
                            <p className="text-base font-semibold text-gray-900 break-words whitespace-normal">
                              {categoriasAnimais.join(', ')}
                            </p>
                          </div>
                        )}
                        {caderneta === 'movimentacao' && registro.causaObservacao && registro.causaObservacao !== '' && (
                          <div className="col-span-2" key="causaObservacao">
                            <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">
                              {LABELS_BY_CADERNETA[caderneta]?.['causaObservacao'] || 'CAUSA/OBSERVAÇÃO'}
                            </p>
                            <p className="text-base font-semibold text-gray-900 break-words whitespace-normal">
                              {formatFieldValue('causaObservacao', registro.causaObservacao)}
                            </p>
                          </div>
                        )}
                      </>
                    )
                  })()}
                </div>

                <div className="flex gap-2 border-t border-gray-100 pt-3">
                  <Button
                    onClick={() => handleExcluir(registro.id)}
                    variant="danger"
                    size="sm"
                    icon="🗑️"
                  >
                    EXCLUIR
                  </Button>
                  <Button
                    onClick={() => handleCompartilhar(registro)}
                    variant="ghost"
                    size="sm"
                    icon="🔗"
                  >
                    COMPARTILHAR
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Modal de confirmação de exclusão */}
        {mostrarModalExcluir && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl">
              <h3 className="text-xl font-bold text-gray-900 mb-4">⚠️ Confirmar Exclusão</h3>
              <p className="text-base text-gray-700 mb-6">
                Tem certeza que deseja excluir este registro? Esta ação não pode ser desfeita.
              </p>
              <div className="flex gap-3">
                <Button
                  onClick={() => {
                    setMostrarModalExcluir(false)
                    setRegistroParaExcluir(null)
                  }}
                  variant="secondary"
                  fullWidth
                >
                  CANCELAR
                </Button>
                <Button
                  onClick={confirmarExclusao}
                  variant="danger"
                  fullWidth
                >
                  EXCLUIR
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Modal de escolha de formato de compartilhamento */}
        {mostrarModalCompartilhar && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl">
              <h3 className="text-xl font-bold text-gray-900 mb-4">📤 Compartilhar Registro</h3>
              <div className="flex flex-col gap-3">
                <Button
                  onClick={handleCompartilharTexto}
                  variant="secondary"
                  fullWidth
                  icon="📋"
                >
                  COMPARTILHAR
                </Button>
                <Button
                  onClick={() => {
                    setMostrarModalCompartilhar(false)
                    setRegistroParaCompartilhar(null)
                  }}
                  variant="ghost"
                  fullWidth
                >
                  CANCELAR
                </Button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
