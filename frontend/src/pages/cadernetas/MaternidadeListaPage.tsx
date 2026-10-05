import { useState, useCallback, useEffect } from 'react'
import { useSelector } from 'react-redux'
import ListaRegistros from '../../components/cadernetas/ListaRegistros'
import ResumoDiario from '../../components/cadernetas/ResumoDiario'
import { listarRegistros } from '../../services/api'
import { compartilharWhatsApp, Registro } from '../../utils/shareUtils'
import { gerarPdfResumoMaternidade, compartilharPdf } from '../../utils/pdfUtils'
import { RootState } from '../../store/store'
import { getFazendasDoMesmoGrupoCached } from '../../services/cadastroCache'

export default function MaternidadeListaPage() {
  const [todosRegistros, setTodosRegistros] = useState<Registro[]>([])
  const { fazenda, fazendaId } = useSelector((state: RootState) => state.config)

  const carregarRegistros = useCallback(async () => {
    const lista = await listarRegistros('maternidade')
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
      if (tipos.some((t) => ['natimorto', 'aborto'].includes(String(t).toLowerCase()))) {
        houveMorte = true
      }
      const obs = String(r.observacaoParto || '').toLowerCase()
      if (obs.includes('natimorto') || obs.includes('aborto')) {
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
    // Incluir nome da fazenda quando pertence a um grupo
    const fazendasDoGrupo = await getFazendasDoMesmoGrupoCached(fazendaId)
    if (fazendasDoGrupo && fazendasDoGrupo.length > 0) {
      partes.push(`Fazenda: *${fazenda}*`)
    }
    partes.push(`📅 Data: *${dataBase}*`)
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

    await compartilharWhatsApp(partes.join('\n'))
  }

  const handleGerarResumoPdf = async (data: string) => {
    const registrosDoDia = filtrarRegistrosDoDia(data)
    const dataBase = data.split(' ')[0]
    const pdfFile = await gerarPdfResumoMaternidade(registrosDoDia, dataBase, fazenda)
    await compartilharPdf(
      pdfFile,
      `Resumo Maternidade — ${dataBase}`,
      `Resumo diário de maternidade — ${dataBase} (${registrosDoDia.length} nascimentos)`
    )
  }

  return (
    <ListaRegistros
      caderneta="maternidade"
      titulo="MATERNIDADE"
      rotaForm="/caderneta/maternidade"
      extraActions={
        <ResumoDiario
          descricao="nascimentos"
          contarRegistros={(d) => filtrarRegistrosDoDia(d).length}
          onEnviarTexto={handleGerarResumoTexto}
          onExportarPdf={handleGerarResumoPdf}
        />
      }
    />
  )
}
