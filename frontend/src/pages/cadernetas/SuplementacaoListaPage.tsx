import { useState, useCallback, useEffect } from 'react'
import { useSelector } from 'react-redux'
import ListaRegistros from '../../components/cadernetas/ListaRegistros'
import { Button } from '../../components/ui'
import DatePickerIcon from '../../components/ui/DatePickerIcon'
import { listarRegistros } from '../../services/api'
import { compartilharWhatsApp, Registro } from '../../utils/shareUtils'
import { gerarPdfResumoSuplementacao, compartilharPdf } from '../../utils/pdfUtils'
import { todayBR } from '../../utils/formatDate'
import { formatarNumeroBR } from '../../utils/formatNumber'
import { calcularMetricasSuplementacao } from '../../utils/supplementMetrics'
import { getLoteDetalhesComCategoriasCached, getFormulacaoByNomeCached, getFazendasDoMesmoGrupoCached } from '../../services/cadastroCache'
import { RootState } from '../../store/store'

interface MetricasShare {
  consumoMedioGeralPercentPV: number | null
  consumoMedio30DiasPercentPV: number | null
  consumoMedioGeralKgMN: number | null
  consumoMedio30DiasKgMN: number | null
  consumoMedioGeralKgMS: number | null
  consumoMedio30DiasKgMS: number | null
  custoMedioReaisCabDia: number | null
}

/**
 * Extrai o horário do campo data do registro (formato "DD/MM/YYYY HH:MM").
 * Retorna "HHh" para horas cheias ou "HH:MMh" para horas com minutos.
 */
function formatarHorarioRegistro(dataRegistro: unknown): string {
  const str = String(dataRegistro ?? '')
  const timePart = str.split(' ')[1]
  if (!timePart) return ''
  const [h, m] = timePart.split(':')
  if (!h) return ''
  const hh = h.padStart(2, '0')
  const mm = (m || '00').padStart(2, '0')
  return mm === '00' ? `${hh}` : `${hh}:${mm}`
}

export default function SuplementacaoListaPage() {
  const [mostrarModalResumo, setMostrarModalResumo] = useState(false)
  const [dataResumo, setDataResumo] = useState(todayBR())
  const [gerando, setGerando] = useState(false)
  const [todosRegistros, setTodosRegistros] = useState<Registro[]>([])
  const { fazenda, fazendaId } = useSelector((state: RootState) => state.config)

  const carregarRegistros = useCallback(async () => {
    const lista = await listarRegistros('suplementacao')
    setTodosRegistros(lista)
  }, [])

  useEffect(() => {
    carregarRegistros()
  }, [carregarRegistros])

  const filtrarRegistrosDoDia = () => {
    const dataBase = dataResumo.split(' ')[0]
    return todosRegistros.filter((r) => {
      const dataRegistro = String(r.data).split(' ')[0]
      return dataRegistro === dataBase
    })
  }

  const handleAbrirResumo = () => {
    setDataResumo(todayBR())
    setMostrarModalResumo(true)
  }

  /**
   * Busca métricas de consumo para um registro individual (lote + formulação).
   * Replica a lógica do handleCompartilharTexto do ListaRegistros.
   */
  const buscarMetricas = async (registro: Registro): Promise<MetricasShare | null> => {
    if (!registro.loteId || !registro.formulacao || !fazendaId) return null
    try {
      const loteId = registro.loteId as string
      const nomeFormulacao = registro.formulacao as string
      const [detalhesLote, formulacaoData] = await Promise.all([
        getLoteDetalhesComCategoriasCached(loteId),
        getFormulacaoByNomeCached(fazendaId, nomeFormulacao),
      ])

      if (!detalhesLote || !formulacaoData) return null

      const categorias = detalhesLote.categorias_raw || []
      const formulacao = {
        nome: formulacaoData.nome,
        teor_ms_dieta: formulacaoData.teor_ms_dieta ?? null,
        meta_consumo_ms_percent_pv: formulacaoData.consumo_ms_percent_pv ?? null,
        custo_dieta_reais_cab_dia: formulacaoData.custo_dieta_reais_cab_dia ?? null,
        custo_mn_tonelada: formulacaoData.custo_mn_tonelada ?? null,
        consumo_mn_kg_cab_dia: null,
        consumo_ms_kg_cab_dia: null,
        custo_ms_tonelada: null,
      }

      const registrosDoLote = (todosRegistros as any[])
        .filter(r => r.loteId === loteId)
        .map(r => ({
          id: r.id,
          data: r.data,
          kg_cocho: r.kgCocho ? Number(r.kgCocho) : null,
          kg_deposito: r.kgDeposito ? Number(r.kgDeposito) : null,
          formulacao: r.formulacao,
        }))

      const metricas = calcularMetricasSuplementacao(categorias, registrosDoLote, formulacao, registro.id)
      if (!metricas) return null
      return {
        consumoMedioGeralPercentPV: metricas.consumoMedioGeralPercentPV,
        consumoMedio30DiasPercentPV: metricas.consumoMedio30DiasPercentPV,
        consumoMedioGeralKgMN: metricas.consumoMedioGeralKgMN,
        consumoMedio30DiasKgMN: metricas.consumoMedio30DiasKgMN,
        consumoMedioGeralKgMS: metricas.consumoMedioGeralKgMS,
        consumoMedio30DiasKgMS: metricas.consumoMedio30DiasKgMS,
        custoMedioReaisCabDia: metricas.custoMedioReaisCabDia,
      }
    } catch (error) {
      console.error('Erro ao buscar métricas para resumo:', error)
      return null
    }
  }

  const handleGerarResumoTexto = async () => {
    setGerando(true)
    try {
      const registrosDoDia = filtrarRegistrosDoDia()

      if (registrosDoDia.length === 0) {
        const dataBase = dataResumo.split(' ')[0]
        alert(`Nenhum registro encontrado para ${dataBase}`)
        setGerando(false)
        return
      }

      const dataBase = dataResumo.split(' ')[0]
      const partes: string[] = []

      // Cabeçalho fixo
      partes.push(`📋 *SUPLEMENTAÇÃO*`)
      // Incluir nome da fazenda quando pertence a um grupo
      const fazendasDoGrupo = await getFazendasDoMesmoGrupoCached(fazendaId)
      if (fazendasDoGrupo && fazendasDoGrupo.length > 0) {
        partes.push(`Fazenda: *${fazenda}*`)
      }
      partes.push(`📅 Data: *${dataBase}*`)
      partes.push('')

      // Processar cada registro
      for (let i = 0; i < registrosDoDia.length; i++) {
        const r = registrosDoDia[i]

        // Cabeçalho do tratador (fixo, primeiro registro define)
        if (i === 0) {
          partes.push(`TRATADOR: *${r.tratador || r.usuario || '—'}*`)
          partes.push('')
        }

        // Horário do registro (extraído do mesmo campo da data, formato DD/MM/YYYY HH:MM)
        const horario = formatarHorarioRegistro(r.data)
        if (horario) {
          partes.push(`HORÁRIO: ${horario}`)
        }

        // Dados do registro
        partes.push(`PASTO/CURRAL: *${r.pasto || '—'}*`)
        partes.push(`LOTE: *${r.numeroLote || '—'}*`)
        partes.push('')

        // Formulação e meta de consumo
        partes.push(`R/S - ${r.formulacao || '—'}`)
        if (r.metaConsumo != null) {
          partes.push(`META CONSUMO (%PV): *${formatarNumeroBR(r.metaConsumo, '—', 2)}%*`)
        }
        // Meta consumo em kg/cab/dia: teorMs% * pesoVivo / 100
        const pesoVivo = r.pesoVivoKgLote ? Number(r.pesoVivoKgLote) : null
        const nCabecas = r.nCabecasLote ? Number(r.nCabecasLote) : null
        if (r.metaConsumo != null && pesoVivo) {
          const metaKgCabDia = (Number(r.metaConsumo) / 100) * pesoVivo
          partes.push(`META CONSUMO (kg/cab/dia): *${formatarNumeroBR(metaKgCabDia, '—', 3)} kg*`)
        }
        if (nCabecas) {
          partes.push(`N° CABEÇAS: *${nCabecas}*`)
        }
        if (pesoVivo) {
          partes.push(`PV MÉDIO: *${formatarNumeroBR(pesoVivo, '—', 2)} kg*`)
        }

        // Categorias
        const categorias = r.categoriasString || (Array.isArray(r.categorias) ? r.categorias.join(', ') : '')
        if (categorias) {
          partes.push('')
          partes.push(`CATEGORIAS: *${categorias}*`)
        }

        // Leitura e quantidades
        partes.push('')
        partes.push(`LEITURA COCHO: *${r.leituraCocho ?? '—'}*`)
        if (r.kgCocho) {
          partes.push(`SUPLEMENTO COCHO (KG): *${formatarNumeroBR(r.kgCocho, '—', 0)}*`)
        }
        if (r.escoreFezes != null && r.escoreFezes !== '') {
          partes.push(`ESCORE FEZES: *${r.escoreFezes}*`)
        }

        // Histórico de consumo
        const metricas = await buscarMetricas(r)
        const temConsumo = metricas && (
          metricas.consumoMedioGeralPercentPV ||
          metricas.consumoMedio30DiasPercentPV ||
          metricas.consumoMedioGeralKgMN ||
          metricas.consumoMedio30DiasKgMN ||
          metricas.custoMedioReaisCabDia
        )
        if (temConsumo) {
          partes.push('')
          partes.push(`HISTÓRICO DE CONSUMO`)
          if (metricas!.consumoMedioGeralPercentPV != null) {
            partes.push(`CMS Geral (%PV): *${Number(metricas!.consumoMedioGeralPercentPV).toFixed(3).replace('.', ',')}%*`)
          }
          if (metricas!.consumoMedio30DiasPercentPV != null) {
            partes.push(`CMS 30 DIAS (%PV): *${Number(metricas!.consumoMedio30DiasPercentPV).toFixed(3).replace('.', ',')}%*`)
          }
          if (metricas!.consumoMedioGeralKgMN != null) {
            partes.push(`CMN Geral (kg/MN): *${Number(metricas!.consumoMedioGeralKgMN).toFixed(3).replace('.', ',')} kg*`)
          }
          if (metricas!.consumoMedio30DiasKgMN != null) {
            partes.push(`CMN 30 dias (kg/MN): *${Number(metricas!.consumoMedio30DiasKgMN).toFixed(3).replace('.', ',')} kg*`)
          }
          if (metricas!.custoMedioReaisCabDia != null) {
            partes.push(`CUSTO MÉDIO (R$/cab/dia): *R$ ${Number(metricas!.custoMedioReaisCabDia).toFixed(2).replace('.', ',')}*`)
          }
        }

        // Separador entre registros
        if (i < registrosDoDia.length - 1) {
          partes.push('')
          partes.push('━━━━━━━━━━━━━━━━━━━━━━━━')
          partes.push('')
        }
      }

      const textoCompleto = partes.join('\n')

      setMostrarModalResumo(false)
      await compartilharWhatsApp(textoCompleto)
    } catch (err) {
      console.error('Erro ao gerar resumo:', err)
      alert('Erro ao gerar resumo. Tente novamente.')
    } finally {
      setGerando(false)
    }
  }

  const handleGerarResumoPdf = async () => {
    setGerando(true)
    try {
      const registrosDoDia = filtrarRegistrosDoDia()

      if (registrosDoDia.length === 0) {
        const dataBase = dataResumo.split(' ')[0]
        alert(`Nenhum registro encontrado para ${dataBase}`)
        setGerando(false)
        return
      }

      const dataBase = dataResumo.split(' ')[0]

      // Pré-calcular métricas para cada registro
      const metricasPorRegistro: (MetricasShare | null)[] = []
      for (const r of registrosDoDia) {
        const m = await buscarMetricas(r)
        metricasPorRegistro.push(m)
      }

      const pdfFile = await gerarPdfResumoSuplementacao(
        registrosDoDia,
        dataBase,
        fazenda,
        metricasPorRegistro
      )

      setMostrarModalResumo(false)
      await compartilharPdf(
        pdfFile,
        `Resumo Suplementação — ${dataBase}`,
        `Resumo diário de suplementação — ${dataBase} (${registrosDoDia.length} registro(s))`
      )
    } catch (err) {
      console.error('Erro ao gerar PDF:', err)
      alert('Erro ao gerar PDF. Tente novamente.')
    } finally {
      setGerando(false)
    }
  }

  const extraActions = (
    <Button onClick={handleAbrirResumo} variant="secondary" icon="📊">
      RESUMO DIÁRIO
    </Button>
  )

  return (
    <>
      <ListaRegistros
        caderneta="suplementacao"
        titulo="SUPLEMENTAÇÃO"
        rotaForm="/caderneta/suplementacao"
        extraActions={extraActions}
      />

      {/* Modal de resumo diário */}
      {mostrarModalResumo && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl">
            <h3 className="text-xl font-bold text-gray-900 mb-4">📊 Resumo Diário</h3>
            <p className="text-base text-gray-700 mb-4">
              Escolha a data para gerar o resumo de suplementação do dia.
            </p>
            <div className="mb-6">
              <DatePickerIcon
                label="Data do resumo"
                value={dataResumo}
                onChange={setDataResumo}
              />
            </div>
            <div className="flex flex-col gap-3">
              <Button
                onClick={handleGerarResumoTexto}
                variant="primary"
                fullWidth
                loading={gerando}
                icon="📤"
              >
                ENVIAR COMO TEXTO
              </Button>
              <Button
                onClick={handleGerarResumoPdf}
                variant="secondary"
                fullWidth
                loading={gerando}
                icon=""
              >
                EXPORTAR PDF
              </Button>
              <Button
                onClick={() => setMostrarModalResumo(false)}
                variant="ghost"
                fullWidth
                disabled={gerando}
              >
                CANCELAR
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
