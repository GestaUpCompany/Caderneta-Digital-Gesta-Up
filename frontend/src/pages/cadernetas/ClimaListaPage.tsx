import { useState, useCallback, useEffect } from 'react'
import { useSelector } from 'react-redux'
import ListaRegistros from '../../components/cadernetas/ListaRegistros'
import ResumoDiario from '../../components/cadernetas/ResumoDiario'
import { listarRegistros } from '../../services/api'
import { formatarRegistroComoTexto, compartilharWhatsApp, Registro } from '../../utils/shareUtils'
import { gerarPdfResumoClima, compartilharPdf } from '../../utils/pdfUtils'
import { RootState } from '../../store/store'
import { getFazendasDoMesmoGrupoCached } from '../../services/cadastroCache'

export default function ClimaListaPage() {
  const [todosRegistros, setTodosRegistros] = useState<Registro[]>([])
  const { fazenda, fazendaId } = useSelector((state: RootState) => state.config)

  const carregarRegistros = useCallback(async () => {
    const lista = await listarRegistros('clima')
    setTodosRegistros(lista)
  }, [])

  useEffect(() => {
    carregarRegistros()
  }, [carregarRegistros])

  const filtrarRegistrosDoDia = (data: string) => {
    const dataBase = data.split(' ')[0]
    return todosRegistros.filter((r) => String(r.data).split(' ')[0] === dataBase)
  }

  const handleGerarResumoTexto = async (data: string) => {
    const registrosDoDia = filtrarRegistrosDoDia(data)
    const dataBase = data.split(' ')[0]

    // Montar resumo: header + cada registro separado visualmente
    const partes: string[] = []
    partes.push(`📋 *RESUMO DIÁRIO — CLIMA*`)
    // Incluir nome da fazenda quando pertence a um grupo
    const fazendasDoGrupo = await getFazendasDoMesmoGrupoCached(fazendaId)
    if (fazendasDoGrupo && fazendasDoGrupo.length > 0) {
      partes.push(`Fazenda: *${fazenda}*`)
    }
    partes.push(`📅 Data: *${dataBase}*`)
    partes.push(`📊 Total de registros: *${registrosDoDia.length}*`)
    partes.push('')
    partes.push('──────────────────')

    registrosDoDia.forEach((registro, index) => {
      const textoRegistro = formatarRegistroComoTexto(registro, 'clima', todosRegistros)
      partes.push(textoRegistro.trim())
      if (index < registrosDoDia.length - 1) {
        partes.push('──────────────────')
      }
    })

    await compartilharWhatsApp(partes.join('\n'))
  }

  const handleGerarResumoPdf = async (data: string) => {
    const registrosDoDia = filtrarRegistrosDoDia(data)
    const dataBase = data.split(' ')[0]
    const pdfFile = await gerarPdfResumoClima(registrosDoDia, dataBase, fazenda)
    await compartilharPdf(
      pdfFile,
      `Resumo Clima — ${dataBase}`,
      `Resumo diário de clima — ${dataBase} (${registrosDoDia.length} registros)`
    )
  }

  return (
    <ListaRegistros
      caderneta="clima"
      titulo="CLIMA"
      rotaForm="/caderneta/clima"
      extraActions={
        <ResumoDiario
          descricao="todos os registros de clima"
          contarRegistros={(d) => filtrarRegistrosDoDia(d).length}
          onEnviarTexto={handleGerarResumoTexto}
          onExportarPdf={handleGerarResumoPdf}
        />
      }
    />
  )
}
