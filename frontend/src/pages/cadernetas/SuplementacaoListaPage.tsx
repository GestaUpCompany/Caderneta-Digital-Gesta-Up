import { useState, useCallback, useEffect } from 'react'
import { useSelector } from 'react-redux'
import ListaRegistros from '../../components/cadernetas/ListaRegistros'
import ResumoDiario from '../../components/cadernetas/ResumoDiario'
import { listarRegistros } from '../../services/api'
import { compartilharWhatsApp, formatarRegistroComoTexto, Registro } from '../../utils/shareUtils'
import { gerarPdfResumoSuplementacao, compartilharPdf } from '../../utils/pdfUtils'
import { calcularMetricasSuplementacao } from '../../utils/supplementMetrics'
import { isCategoriaAoPe } from '../../utils/categorias'
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

export default function SuplementacaoListaPage() {
  const [todosRegistros, setTodosRegistros] = useState<Registro[]>([])
  const { fazenda, fazendaId } = useSelector((state: RootState) => state.config)

  const carregarRegistros = useCallback(async () => {
    const lista = await listarRegistros('suplementacao')
    setTodosRegistros(lista)
  }, [])

  useEffect(() => {
    carregarRegistros()
  }, [carregarRegistros])

  const filtrarRegistrosDoDia = (data: string) => {
    const dataBase = data.split(' ')[0]
    return todosRegistros.filter((r) => String(r.data).split(' ')[0] === dataBase)
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

      // Escopo do registro do resumo: creep quando a linha carrega só dados de
      // bezerro ao pé (suplementarAdulto=false) ou veio do banco como escopo
      // 'creep'. Categorias e série seguem o mesmo escopo para peso e
      // denominador ficarem na mesma base (adulto ÷ adulto).
      const isCreep = registro.suplementarAdulto === false || registro.escopo === 'creep'
      const categorias = (detalhesLote.categorias_raw || [])
        .filter((c: any) => isCreep ? isCategoriaAoPe(c.categoria) : !isCategoriaAoPe(c.categoria))
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
        .filter(r => r.loteId === loteId
          && (isCreep
            ? r.suplementarAdulto === false || r.escopo === 'creep' || Number(r.creepKgCocho) > 0
            : r.suplementarAdulto !== false && r.escopo !== 'creep'))
        .map(r => {
          // Linhas "só creep" já carregam os dados do creep nos campos
          // primários; em linhas mistas o creep fica nos campos creep*.
          const linhaCreep = r.suplementarAdulto === false || r.escopo === 'creep'
          const usarCreep = isCreep && !linhaCreep
          return {
            id: r.id,
            data: r.data,
            kg_cocho: usarCreep
              ? (r.creepKgCocho ? Number(r.creepKgCocho) : null)
              : (r.kgCocho ? Number(r.kgCocho) : null),
            kg_deposito: isCreep ? null : (r.kgDeposito ? Number(r.kgDeposito) : null),
            formulacao: usarCreep ? (r.creepFormulacao ?? null) : r.formulacao,
            n_cabecas: usarCreep
              ? (r.creepNCabecas ? Number(r.creepNCabecas) : null)
              : (r.nCabecasLote ? Number(r.nCabecasLote) : null),
            qtd_bezerros: isCreep ? 0 : (r.qtdBezerrosLote ? Number(r.qtdBezerrosLote) : null),
          }
        })

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

  // Remove fotos do checklist: o resumo é só texto, sem álbum para os marcadores "(foto N)".
  const semFotosChecklist = (r: Registro): Registro => {
    const checklist = r.checklist as Record<string, any> | null | undefined
    if (!checklist) return r
    const limpo = Object.fromEntries(
      Object.entries(checklist).map(([k, v]) => [k, v && typeof v === 'object' ? { ...v, fotoBase64: undefined, foto_url: undefined } : v])
    )
    return { ...r, checklist: limpo }
  }

  const handleGerarResumoTexto = async (data: string) => {
    const registrosDoDia = filtrarRegistrosDoDia(data)
    const partes: string[] = []

    // Incluir nome da fazenda quando pertence a um grupo
    const fazendasDoGrupo = await getFazendasDoMesmoGrupoCached(fazendaId)
    if (fazendasDoGrupo && fazendasDoGrupo.length > 0) {
      partes.push(`Fazenda: *${fazenda}*`)
      partes.push('')
    }

    // Cada registro usa o mesmo formatador do compartilhar individual
    for (let i = 0; i < registrosDoDia.length; i++) {
      const r = registrosDoDia[i]
      const metricas = await buscarMetricas(r)
      let teorMs: number | null = null
      let creepTeorMs: number | null = null
      if (fazendaId) {
        try {
          if (r.formulacao) {
            teorMs = (await getFormulacaoByNomeCached(fazendaId, r.formulacao as string))?.teor_ms_dieta ?? null
          }
          if (r.creepFormulacao) {
            creepTeorMs = (await getFormulacaoByNomeCached(fazendaId, r.creepFormulacao as string))?.teor_ms_dieta ?? null
          }
        } catch (error) {
          console.error('Erro ao buscar teor MS para resumo:', error)
        }
      }
      const registroShare: Registro = {
        ...semFotosChecklist(r),
        teorMs: teorMs ?? r.teorMs ?? null,
        creepTeorMs: creepTeorMs ?? r.creepTeorMs ?? null,
        ...(metricas ?? {}),
      }
      partes.push(formatarRegistroComoTexto(registroShare, 'suplementacao', todosRegistros).trimEnd())

      if (i < registrosDoDia.length - 1) {
        partes.push('')
        partes.push('━━━━━━━━━━━━━━━━━━━━━━━━')
        partes.push('')
      }
    }

    await compartilharWhatsApp(partes.join('\n'))
  }

  const handleGerarResumoPdf = async (data: string) => {
    const registrosDoDia = filtrarRegistrosDoDia(data)
    const dataBase = data.split(' ')[0]

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

    await compartilharPdf(
      pdfFile,
      `Resumo Suplementação — ${dataBase}`,
      `Resumo diário de suplementação — ${dataBase} (${registrosDoDia.length} registro(s))`
    )
  }

  return (
    <ListaRegistros
      caderneta="suplementacao"
      titulo="SUPLEMENTAÇÃO"
      rotaForm="/caderneta/suplementacao"
      extraActions={
        <ResumoDiario
          descricao="suplementação"
          contarRegistros={(d) => filtrarRegistrosDoDia(d).length}
          onEnviarTexto={handleGerarResumoTexto}
          onExportarPdf={handleGerarResumoPdf}
        />
      }
    />
  )
}
