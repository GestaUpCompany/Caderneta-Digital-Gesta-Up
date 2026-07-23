import { useState, useCallback, useEffect } from 'react'
import { useSelector } from 'react-redux'
import ListaRegistros from '../../components/cadernetas/ListaRegistros'
import { Button } from '../../components/ui'
import DatePickerIcon from '../../components/ui/DatePickerIcon'
import { listarRegistros } from '../../services/api'
import { compartilharWhatsApp, Registro } from '../../utils/shareUtils'
import { gerarPdfResumoMaternidade, compartilharPdf } from '../../utils/pdfUtils'
import { todayBR } from '../../utils/formatDate'
import { RootState } from '../../store/store'

export default function MaternidadeListaPage() {
  const [mostrarModalResumo, setMostrarModalResumo] = useState(false)
  const [dataResumo, setDataResumo] = useState(todayBR())
  const [gerando, setGerando] = useState(false)
  const [todosRegistros, setTodosRegistros] = useState<Registro[]>([])
  const { fazenda } = useSelector((state: RootState) => state.config)

  const carregarRegistros = useCallback(async () => {
    const lista = await listarRegistros('maternidade')
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

      // Calcular estatísticas
      const totalNascimentos = registrosDoDia.length
      let machos = 0
      let femeas = 0
      let naoIdentificados = 0
      const pesos: number[] = []
      let houveMorte = false
      const tiposPartoContagem: Record<string, number> = {}

      registrosDoDia.forEach((r) => {
        const sexo = String(r.sexo || '').toLowerCase()
        if (sexo === 'macho') machos++
        else if (sexo === 'fêmea' || sexo === 'femea') femeas++
        else naoIdentificados++

        const peso = Number(r.pesoCria)
        if (!isNaN(peso) && peso > 0) pesos.push(peso)

        const tipoParto = r.tipoParto
        const tipos = Array.isArray(tipoParto) ? tipoParto : [tipoParto]
        tipos.forEach((t) => {
          const tStr = String(t).trim()
          if (tStr) tiposPartoContagem[tStr] = (tiposPartoContagem[tStr] || 0) + 1
        })
        if (tipos.some((t) => String(t).toLowerCase() === 'natimorto')) {
          houveMorte = true
        }
        const obs = String(r.observacaoParto || '').toLowerCase()
        if (obs.includes('natimorto')) {
          houveMorte = true
        }
      })

      const pesoMedio = pesos.length > 0
        ? (pesos.reduce((s, p) => s + p, 0) / pesos.length).toFixed(1).replace('.', ',')
        : null
      const pesoTotal = pesos.length > 0
        ? pesos.reduce((s, p) => s + p, 0).toFixed(1).replace('.', ',')
        : null
      const menorPeso = pesos.length > 0 ? Math.min(...pesos).toFixed(1).replace('.', ',') : null
      const maiorPeso = pesos.length > 0 ? Math.max(...pesos).toFixed(1).replace('.', ',') : null

      // Montar resumo
      const partes: string[] = []
      partes.push(`📋 *RESUMO DIÁRIO — MATERNIDADE*`)
      partes.push(`📅 Data: *${dataResumo.split(' ')[0]}*`)
      partes.push('')
      partes.push(`Total de nascimentos: *${totalNascimentos}*`)
      partes.push(`Machos: *${machos}*`)
      partes.push(`Fêmeas: *${femeas}*`)
      if (naoIdentificados > 0) {
        partes.push(`Não identificados: *${naoIdentificados}*`)
      }
      partes.push(`Peso médio: *${pesoMedio !== null ? pesoMedio + ' kg' : '—'}*`)
      if (pesoTotal !== null) {
        partes.push(`Peso total: *${pesoTotal} kg*`)
      }
      if (menorPeso !== null && maiorPeso !== null) {
        partes.push(`Menor peso: *${menorPeso} kg* | Maior peso: *${maiorPeso} kg*`)
      }
      // Tipo de parto
      const tiposOrdenados = Object.entries(tiposPartoContagem).sort((a, b) => b[1] - a[1])
      if (tiposOrdenados.length > 0) {
        partes.push('')
        partes.push(`*Tipo de parto:*`)
        tiposOrdenados.forEach(([tipo, count]) => {
          partes.push(`  ${tipo}: ${count}`)
        })
      }
      partes.push(`Houve morte: *${houveMorte ? 'Sim' : 'Não'}*`)

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
      const pdfFile = await gerarPdfResumoMaternidade(registrosDoDia, dataBase, fazenda)

      setMostrarModalResumo(false)
      await compartilharPdf(
        pdfFile,
        `Resumo Maternidade — ${dataBase}`,
        `Resumo diário de maternidade — ${dataBase} (${registrosDoDia.length} nascimentos)`
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
        caderneta="maternidade"
        titulo="MATERNIDADE"
        rotaForm="/caderneta/maternidade"
        extraActions={extraActions}
      />

      {/* Modal de resumo diário */}
      {mostrarModalResumo && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl">
            <h3 className="text-xl font-bold text-gray-900 mb-4">📊 Resumo Diário</h3>
            <p className="text-base text-gray-700 mb-4">
              Escolha a data para gerar o resumo de nascimentos do dia.
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
