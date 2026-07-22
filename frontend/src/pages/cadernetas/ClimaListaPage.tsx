import { useState, useCallback, useEffect } from 'react'
import { useSelector } from 'react-redux'
import ListaRegistros from '../../components/cadernetas/ListaRegistros'
import { Button } from '../../components/ui'
import DatePickerIcon from '../../components/ui/DatePickerIcon'
import { listarRegistros } from '../../services/api'
import { formatarRegistroComoTexto, compartilharWhatsApp, Registro } from '../../utils/shareUtils'
import { gerarPdfResumoClima, compartilharPdf } from '../../utils/pdfUtils'
import { todayBR } from '../../utils/formatDate'
import { RootState } from '../../store/store'

export default function ClimaListaPage() {
  const [mostrarModalResumo, setMostrarModalResumo] = useState(false)
  const [dataResumo, setDataResumo] = useState(todayBR())
  const [gerando, setGerando] = useState(false)
  const [todosRegistros, setTodosRegistros] = useState<Registro[]>([])
  const { fazenda } = useSelector((state: RootState) => state.config)

  const carregarRegistros = useCallback(async () => {
    const lista = await listarRegistros('clima')
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

      // Montar resumo: header + cada registro separado visualmente
      const partes: string[] = []
      partes.push(`📋 *RESUMO DIÁRIO — CLIMA*`)
      partes.push(`📅 Data: *${dataResumo.split(' ')[0]}*`)
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
      const pdfFile = await gerarPdfResumoClima(registrosDoDia, dataBase, fazenda)

      setMostrarModalResumo(false)
      await compartilharPdf(
        pdfFile,
        `Resumo Clima — ${dataBase}`,
        `Resumo diário de clima — ${dataBase} (${registrosDoDia.length} registros)`
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
        caderneta="clima"
        titulo="CLIMA"
        rotaForm="/caderneta/clima"
        extraActions={extraActions}
      />

      {/* Modal de resumo diário */}
      {mostrarModalResumo && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl">
            <h3 className="text-xl font-bold text-gray-900 mb-4">📊 Resumo Diário</h3>
            <p className="text-base text-gray-700 mb-4">
              Escolha a data para gerar o resumo de todos os registros de clima do dia.
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
