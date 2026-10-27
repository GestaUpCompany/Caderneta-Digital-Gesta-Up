import { useState, useCallback, useEffect } from 'react'
import { useSelector } from 'react-redux'
import ListaRegistros from '../../components/cadernetas/ListaRegistros'
import ResumoDiario from '../../components/cadernetas/ResumoDiario'
import { listarRegistros } from '../../services/api'
import { useRefreshCadastros } from '../../hooks/useRefreshCadastros'
import { compartilharWhatsApp, Registro } from '../../utils/shareUtils'
import { formatarNumeroBR } from '../../utils/formatNumber'
import { RootState } from '../../store/store'
import { getFazendasDoMesmoGrupoCached } from '../../services/cadastroCache'

export default function TratoConfinamentoListaPage() {
  const [todosRegistros, setTodosRegistros] = useState<Registro[]>([])
  const { fazenda, fazendaId } = useSelector((state: RootState) => state.config)

  const carregarRegistros = useCallback(async () => {
    const lista = await listarRegistros('trato-confinamento')
    setTodosRegistros(lista)
  }, [])

  useEffect(() => {
    carregarRegistros()
  }, [carregarRegistros])

  useRefreshCadastros(carregarRegistros)

  const filtrarRegistrosDoDia = (data: string) => {
    const dataBase = data.split(' ')[0]
    return todosRegistros.filter((r) => String(r.data).split(' ')[0] === dataBase)
  }

  const handleGerarResumoTexto = async (data: string) => {
    const registrosDoDia = filtrarRegistrosDoDia(data)
    const dataBase = data.split(' ')[0]
    const partes: string[] = []

    // Cabeçalho
    partes.push(`📋 *RESUMO DIÁRIO — TRATO CONFINAMENTO*`)
    // Incluir nome da fazenda quando pertence a um grupo
    const fazendasDoGrupo = await getFazendasDoMesmoGrupoCached(fazendaId)
    if (fazendasDoGrupo && fazendasDoGrupo.length > 0) {
      partes.push(`Fazenda: *${fazenda}*`)
    }
    partes.push(`📅 Data: *${dataBase}*`)
    partes.push('')

    // Consolidado
    let totalPlanejado = 0
    let totalFornecido = 0
    registrosDoDia.forEach((r) => {
      totalPlanejado += Number(r.kgPlanejado) || 0
      totalFornecido += Number(r.kgReal) || 0
    })

    partes.push(`Tratos registrados: *${registrosDoDia.length}*`)
    partes.push(`KG planejado: *${formatarNumeroBR(totalPlanejado)} kg*`)
    partes.push(`KG fornecido: *${formatarNumeroBR(totalFornecido)} kg*`)

    // Detalhamento por registro
    registrosDoDia.forEach((r) => {
      partes.push('')
      partes.push('━━━━━━━━━━━━━━━━━━━━━━━━')
      partes.push('')

      if (r.responsavel || r.usuario) partes.push(`RESPONSÁVEL: *${r.responsavel || r.usuario}*`)
      partes.push(`CURRAL: *${r.curral || '—'}*`)
      partes.push(`LOTE: *${r.numeroLote || '—'}*`)
      if (r.ordemTrato !== null && r.ordemTrato !== undefined && r.ordemTrato !== '') {
        partes.push(`TRATO: *${r.ordemTrato}*`)
      }
      if (r.kgPlanejado !== null && r.kgPlanejado !== undefined && r.kgPlanejado !== '') {
        partes.push(`KG PLANEJADO: *${formatarNumeroBR(r.kgPlanejado)} kg*`)
      }
      if (r.kgReal !== null && r.kgReal !== undefined && r.kgReal !== '') {
        partes.push(`KG FORNECIDO: *${formatarNumeroBR(r.kgReal)} kg*`)
      }
      if (r.leituraCochoNota !== null && r.leituraCochoNota !== undefined && r.leituraCochoNota !== '') {
        partes.push(`LEITURA COCHO: *${r.leituraCochoNota}*`)
      }
    })

    await compartilharWhatsApp(partes.join('\n'))
  }

  return (
    <ListaRegistros
      caderneta="trato-confinamento"
      titulo="TRATO CONFINAMENTO"
      rotaForm="/caderneta/trato-confinamento"
      extraActions={
        <ResumoDiario
          descricao="tratos de confinamento"
          contarRegistros={(d) => filtrarRegistrosDoDia(d).length}
          onEnviarTexto={handleGerarResumoTexto}
        />
      }
    />
  )
}
