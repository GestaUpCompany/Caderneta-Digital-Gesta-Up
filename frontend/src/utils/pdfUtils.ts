import { jsPDF } from 'jspdf'
import { Registro } from './shareUtils'
import { LOGO_URL } from './constants'
import { formatarNumeroBR } from './formatNumber'

interface MedicaoPluviometro {
  pluviometro_nome?: string
  pluviometroNome?: string
  pluviometro_localizacao?: string
  pluviometroLocalizacao?: string
  medicao?: string | number | null
  temperatura?: string | number | null
  horario?: string | null
}

/**
 * Gera um PDF profissional com o resumo diário de clima.
 * Retorna um objeto File pronto para compartilhamento via Web Share API.
 */
export async function gerarPdfResumoClima(
  registros: Registro[],
  dataResumo: string,
  fazenda?: string
): Promise<File> {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const margin = 15
  const contentWidth = pageWidth - margin * 2
  const labelValueGap = 3
  let y = margin

  // === HEADER ===
  // Faixa verde superior
  doc.setFillColor(26, 58, 42) // #1a3a2a
  doc.rect(0, 0, pageWidth, 28, 'F')

  // Logo com bordas arredondadas à esquerda do título
  const logoSize = 18
  const logoX = margin
  const logoY = 5
  try {
    // Buscar a imagem como base64 para o jsPDF
    const logoDataUrl = await fetchImageAsBase64(LOGO_URL)
    if (logoDataUrl) {
      // Máscara de cantos arredondados: desenhar um retângulo branco arredondado
      // como máscara visual atrás da logo
      doc.setFillColor(255, 255, 255)
      doc.roundedRect(logoX - 1, logoY - 1, logoSize + 2, logoSize + 2, 3, 3, 'F')
      // Adicionar a imagem
      doc.addImage(logoDataUrl, 'PNG', logoX, logoY, logoSize, logoSize, undefined, 'FAST')
    }
  } catch (err) {
    // Se a logo não carregar, continuar sem ela
    console.warn('[pdfUtils] Logo não carregou:', err)
  }

  // Título (deslocado para a direita para não sobrepor a logo)
  const titleX = logoX + logoSize + 5
  doc.setTextColor(255, 255, 255)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(16)
  doc.text("Gesta'Up — Cadernetas Digitais", titleX, 12)

  doc.setFontSize(11)
  doc.setFont('helvetica', 'normal')
  doc.text('Resumo Diário — Clima', titleX, 19)

  // Data e fazenda à direita
  const dataFormatada = dataResumo.split(' ')[0]
  doc.text(`Data: ${dataFormatada}`, pageWidth - margin, 12, { align: 'right' })
  if (fazenda) {
    doc.setFontSize(9)
    doc.text(`Fazenda: ${fazenda}`, pageWidth - margin, 19, { align: 'right' })
  }

  y = 34

  // Linha separadora
  doc.setDrawColor(26, 58, 42)
  doc.setLineWidth(0.5)
  doc.line(margin, y, pageWidth - margin, y)
  y += 6

  // === RESUMO ESTATÍSTICO ===
  doc.setTextColor(26, 58, 42)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.text('VISÃO GERAL', margin, y)
  y += 5

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.setTextColor(60, 60, 60)

  const totalRegistros = registros.length

  // Coletar todas as medições de chuva válidas do dia para calcular a média
  const medicoesChuva: number[] = []
  registros.forEach((r) => {
    const medicoes = r.medicoes as MedicaoPluviometro[] | undefined
    if (medicoes && Array.isArray(medicoes)) {
      medicoes.forEach((m) => {
        const valor = Number(m.medicao)
        if (!isNaN(valor)) medicoesChuva.push(valor)
      })
    }
  })
  const mediaChuva = medicoesChuva.length > 0
    ? medicoesChuva.reduce((s, v) => s + v, 0) / medicoesChuva.length
    : 0

  const temps: number[] = []
  registros.forEach((r) => {
    if (r.temperaturaMedia !== null && r.temperaturaMedia !== undefined && r.temperaturaMedia !== '') {
      const t = Number(r.temperaturaMedia)
      if (!isNaN(t)) temps.push(t)
    }
    const medicoes = r.medicoes as MedicaoPluviometro[] | undefined
    if (medicoes && Array.isArray(medicoes)) {
      medicoes.forEach((m) => {
        if (m.temperatura !== null && m.temperatura !== undefined && m.temperatura !== '') {
          const t = Number(m.temperatura)
          if (!isNaN(t)) temps.push(t)
        }
      })
    }
  })

  const tempMin = temps.length > 0 ? Math.min(...temps) : null
  const tempMax = temps.length > 0 ? Math.max(...temps) : null
  const tempMedia = temps.length > 0 ? temps.reduce((s, t) => s + t, 0) / temps.length : null

  const fmtTemp = (t: number | null) => (t !== null ? `${t.toFixed(1).replace('.', ',')}°C` : '—')

  doc.text(`Total de registros: ${totalRegistros}`, margin, y); y += 5
  doc.text(`Precipitação total (média dos pluviômetros): ${mediaChuva.toFixed(1).replace('.', ',')} mm`, margin, y); y += 5
  doc.text(`Temperatura mínima: ${fmtTemp(tempMin)}`, margin, y); y += 5
  doc.text(`Temperatura máxima: ${fmtTemp(tempMax)}`, margin, y); y += 5
  doc.text(`Temperatura média: ${fmtTemp(tempMedia)}`, margin, y); y += 7

  // Linha separadora
  doc.setDrawColor(200, 200, 200)
  doc.setLineWidth(0.3)
  doc.line(margin, y, pageWidth - margin, y)
  y += 6

  // === REGISTROS DETALHADOS ===
  doc.setTextColor(26, 58, 42)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.text('REGISTROS DETALHADOS', margin, y)
  y += 6

  registros.forEach((registro, index) => {
    // Verificar se precisa de nova página
    if (y > pageHeight - 40) {
      doc.addPage()
      y = margin
    }

    // Card de registro: fundo cinza claro
    const cardStartY = y
    doc.setFillColor(245, 245, 245)
    doc.setDrawColor(200, 200, 200)
    doc.setLineWidth(0.2)

    // Estimar altura do card (mínimo 30mm)
    let cardHeight = 30

    // Número do registro + horário
    doc.setTextColor(26, 58, 42)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(10)
    const dataHora = String(registro.data || '')
    const horario = dataHora.split(' ')[1] || ''
    doc.text(`Registro #${index + 1}${horario ? ` — ${horario}` : ''}`, margin + 3, y + 5)

    y += 10

    // Campos principais
    doc.setFontSize(9)
    doc.setTextColor(50, 50, 50)

    const responsavel = registro.responsavel as string
    if (responsavel) {
      doc.setFont('helvetica', 'bold')
      doc.text('Responsável: ', margin + 3, y)
      doc.setFont('helvetica', 'normal')
      doc.text(String(responsavel), margin + 3 + doc.getTextWidth('Responsável: ') + labelValueGap, y)
      y += 5
    }

    const umidade = registro.umidadeRelativa
    if (umidade !== null && umidade !== undefined && umidade !== '') {
      doc.setFont('helvetica', 'bold')
      doc.text('Umidade relativa: ', margin + 3, y)
      doc.setFont('helvetica', 'normal')
      doc.text(`${umidade}%`, margin + 3 + doc.getTextWidth('Umidade relativa: ') + labelValueGap, y)
      y += 5
    }

    const tempMediaReg = registro.temperaturaMedia
    if (tempMediaReg !== null && tempMediaReg !== undefined && tempMediaReg !== '') {
      const tNum = Number(tempMediaReg)
      const tStr = !isNaN(tNum) ? `${tNum.toFixed(1).replace('.', ',')}°C` : String(tempMediaReg)
      doc.setFont('helvetica', 'bold')
      doc.text('Temperatura média: ', margin + 3, y)
      doc.setFont('helvetica', 'normal')
      doc.text(tStr, margin + 3 + doc.getTextWidth('Temperatura média: ') + labelValueGap, y)
      y += 5
    }

    // Medições de pluviômetros
    const medicoes = registro.medicoes as MedicaoPluviometro[] | undefined
    if (medicoes && Array.isArray(medicoes) && medicoes.length > 0) {
      const medicoesValidas = medicoes.filter(
        (m) => m.medicao !== null && m.medicao !== undefined && m.medicao !== ''
      )
      if (medicoesValidas.length > 0) {
        doc.setFont('helvetica', 'bold')
        doc.setFontSize(9)
        doc.setTextColor(26, 58, 42)
        doc.text('Pluviômetros:', margin + 3, y)
        y += 5

        medicoesValidas.forEach((m) => {
          if (y > pageHeight - 20) {
            doc.addPage()
            y = margin
          }
          const nome = m.pluviometro_nome || m.pluviometroNome || 'Pluviômetro'
          const local = m.pluviometro_localizacao || m.pluviometroLocalizacao
          const chuva = Number(m.medicao) || 0
          const temp = m.temperatura !== null && m.temperatura !== undefined && m.temperatura !== ''
            ? Number(m.temperatura)
            : null
          const horarioM = m.horario || ''

          doc.setFont('helvetica', 'normal')
          doc.setFontSize(9)
          doc.setTextColor(50, 50, 50)

          let linha = `  • ${nome}`
          if (local) linha += ` (${local})`
          if (horarioM) linha += ` — ${horarioM}`
          linha += `: ${chuva.toFixed(1).replace('.', ',')} mm`
          if (temp !== null && !isNaN(temp)) {
            linha += ` | ${temp.toFixed(1).replace('.', ',')}°C`
          }
          doc.text(linha, margin + 3, y)
          y += 5
        })
      }
    }

    // Observação
    const obs = registro.observacao as string
    if (obs && obs !== '') {
      if (y > pageHeight - 20) {
        doc.addPage()
        y = margin
      }
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(9)
      doc.setTextColor(26, 58, 42)
      doc.text('Observação:', margin + 3, y)
      y += 5
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(50, 50, 50)
      const obsLines = doc.splitTextToSize(String(obs), contentWidth - 6)
      obsLines.forEach((line: string) => {
        if (y > pageHeight - 15) {
          doc.addPage()
          y = margin
        }
        doc.text(line, margin + 3, y)
        y += 5
      })
    }

    y += 3

    // Desenhar retângulo do card
    cardHeight = y - cardStartY
    doc.setFillColor(248, 248, 248)
    doc.setDrawColor(210, 210, 210)
    doc.setLineWidth(0.2)
    doc.roundedRect(margin, cardStartY - 2, contentWidth, cardHeight + 2, 2, 2, 'S')

    // Re-renderizar conteúdo que ficou atrás do retângulo
    // (jsPDF não tem z-index, então o retângulo cobre o texto se for preenchido)
    // Por isso usamos apenas 'S' (stroke) sem fill

    y += 4
  })

  // === RODAPÉ ===
  const totalPaginas = doc.getNumberOfPages()
  for (let i = 1; i <= totalPaginas; i++) {
    doc.setPage(i)
    const pageY = doc.internal.pageSize.getHeight()
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.setTextColor(150, 150, 150)
    doc.text(
      `Gesta'Up Caderneta Digital — Gerado em ${new Date().toLocaleString('pt-BR')}`,
      margin,
      pageY - 8
    )
    doc.text(`Página ${i} de ${totalPaginas}`, pageWidth - margin, pageY - 8, { align: 'right' })
  }

  // Gerar blob e criar File
  const blob = doc.output('blob')
  const fileName = `resumo_clima_${dataFormatada.replace(/\//g, '-')}.pdf`
  return new File([blob], fileName, { type: 'application/pdf' })
}

/**
 * Gera um PDF com o resumo diário de maternidade.
 * Contém: data, total de nascimentos, machos/fêmeas, peso médio, e se houve morte.
 */
export async function gerarPdfResumoMaternidade(
  registros: Registro[],
  dataResumo: string,
  fazenda?: string
): Promise<File> {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const pageWidth = doc.internal.pageSize.getWidth()
  const margin = 15
  let y = margin

  // === HEADER ===
  doc.setFillColor(26, 58, 42) // #1a3a2a
  doc.rect(0, 0, pageWidth, 28, 'F')

  const logoSize = 18
  const logoX = margin
  const logoY = 5
  try {
    const logoDataUrl = await fetchImageAsBase64(LOGO_URL)
    if (logoDataUrl) {
      doc.setFillColor(255, 255, 255)
      doc.roundedRect(logoX - 1, logoY - 1, logoSize + 2, logoSize + 2, 3, 3, 'F')
      doc.addImage(logoDataUrl, 'PNG', logoX, logoY, logoSize, logoSize, undefined, 'FAST')
    }
  } catch (err) {
    console.warn('[pdfUtils] Logo não carregou:', err)
  }

  const titleX = logoX + logoSize + 5
  doc.setTextColor(255, 255, 255)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(16)
  doc.text("Gesta'Up — Cadernetas Digitais", titleX, 12)

  doc.setFontSize(11)
  doc.setFont('helvetica', 'normal')
  doc.text('Resumo Diário — Maternidade', titleX, 19)

  const dataFormatada = dataResumo.split(' ')[0]
  doc.text(`Data: ${dataFormatada}`, pageWidth - margin, 12, { align: 'right' })
  if (fazenda) {
    doc.setFontSize(9)
    doc.text(`Fazenda: ${fazenda}`, pageWidth - margin, 19, { align: 'right' })
  }

  y = 34

  // Linha separadora
  doc.setDrawColor(26, 58, 42)
  doc.setLineWidth(0.5)
  doc.line(margin, y, pageWidth - margin, y)
  y += 8

  // === CÁLCULOS ===
  const totalNascimentos = registros.length

  let machos = 0
  let femeas = 0
  let naoIdentificados = 0
  const pesos: number[] = []
  let houveMorte = false
  const tiposPartoContagem: Record<string, number> = {}

  registros.forEach((r) => {
    const sexo = String(r.sexo || '').toLowerCase()
    if (sexo === 'macho') machos++
    else if (sexo === 'fêmea' || sexo === 'femea') femeas++
    else naoIdentificados++

    const peso = Number(r.pesoCria)
    if (!isNaN(peso) && peso > 0) pesos.push(peso)

    // Verificar morte: tipoParto contém "Natimorto" ou observacaoParto contém "Natimorto"
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
    ? pesos.reduce((s, p) => s + p, 0) / pesos.length
    : null
  const pesoTotal = pesos.length > 0
    ? pesos.reduce((s, p) => s + p, 0)
    : null
  const menorPeso = pesos.length > 0 ? Math.min(...pesos) : null
  const maiorPeso = pesos.length > 0 ? Math.max(...pesos) : null

  // === RESUMO ===
  doc.setTextColor(26, 58, 42)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(12)
  doc.text('RESUMO DO DIA', margin, y)
  y += 8

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(11)
  doc.setTextColor(50, 50, 50)

  const labelW = 70
  doc.setFont('helvetica', 'bold')
  doc.text('Data:', margin, y)
  doc.setFont('helvetica', 'normal')
  doc.text(dataFormatada, margin + labelW, y)
  y += 7

  doc.setFont('helvetica', 'bold')
  doc.text('Total de nascimentos:', margin, y)
  doc.setFont('helvetica', 'normal')
  doc.text(String(totalNascimentos), margin + labelW, y)
  y += 7

  doc.setFont('helvetica', 'bold')
  doc.text('Machos:', margin, y)
  doc.setFont('helvetica', 'normal')
  doc.text(String(machos), margin + labelW, y)
  y += 7

  doc.setFont('helvetica', 'bold')
  doc.text('Fêmeas:', margin, y)
  doc.setFont('helvetica', 'normal')
  doc.text(String(femeas), margin + labelW, y)
  y += 7

  if (naoIdentificados > 0) {
    doc.setFont('helvetica', 'bold')
    doc.text('Não identificados:', margin, y)
    doc.setFont('helvetica', 'normal')
    doc.text(String(naoIdentificados), margin + labelW, y)
    y += 7
  }

  doc.setFont('helvetica', 'bold')
  doc.text('Peso médio:', margin, y)
  doc.setFont('helvetica', 'normal')
  doc.text(pesoMedio !== null ? `${pesoMedio.toFixed(1).replace('.', ',')} kg` : '—', margin + labelW, y)
  y += 7

  if (pesoTotal !== null) {
    doc.setFont('helvetica', 'bold')
    doc.text('Peso total:', margin, y)
    doc.setFont('helvetica', 'normal')
    doc.text(`${pesoTotal.toFixed(1).replace('.', ',')} kg`, margin + labelW, y)
    y += 7
  }

  if (menorPeso !== null && maiorPeso !== null) {
    doc.setFont('helvetica', 'bold')
    doc.text('Menor | Maior peso:', margin, y)
    doc.setFont('helvetica', 'normal')
    doc.text(`${menorPeso.toFixed(1).replace('.', ',')} kg | ${maiorPeso.toFixed(1).replace('.', ',')} kg`, margin + labelW, y)
    y += 7
  }

  // Tipo de parto
  const tiposOrdenados = Object.entries(tiposPartoContagem).sort((a, b) => b[1] - a[1])
  if (tiposOrdenados.length > 0) {
    y += 3
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(12)
    doc.setTextColor(26, 58, 42)
    doc.text('TIPO DE PARTO', margin, y)
    y += 7
    doc.setFontSize(11)
    doc.setTextColor(50, 50, 50)
    tiposOrdenados.forEach(([tipo, count]) => {
      doc.setFont('helvetica', 'bold')
      doc.text(`${tipo}:`, margin + 4, y)
      doc.setFont('helvetica', 'normal')
      doc.text(String(count), margin + labelW, y)
      y += 6
    })
    y += 3
  }

  doc.setFont('helvetica', 'bold')
  doc.text('Houve morte:', margin, y)
  doc.setFont('helvetica', 'normal')
  if (houveMorte) {
    doc.setTextColor(180, 0, 0)
    doc.text('Sim', margin + labelW, y)
    doc.setTextColor(50, 50, 50)
  } else {
    doc.text('Não', margin + labelW, y)
  }
  y += 10

  // === RODAPÉ ===
  const totalPaginas = doc.getNumberOfPages()
  for (let i = 1; i <= totalPaginas; i++) {
    doc.setPage(i)
    const pageY = doc.internal.pageSize.getHeight()
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.setTextColor(150, 150, 150)
    doc.text(
      `Gesta'Up Caderneta Digital — Gerado em ${new Date().toLocaleString('pt-BR')}`,
      margin,
      pageY - 8
    )
    doc.text(`Página ${i} de ${totalPaginas}`, pageWidth - margin, pageY - 8, { align: 'right' })
  }

  const blob = doc.output('blob')
  const fileName = `resumo_maternidade_${dataFormatada.replace(/\//g, '-')}.pdf`
  return new File([blob], fileName, { type: 'application/pdf' })
}

/** Formata número para string no padrão brasileiro (vírgula decimal, ponto milhar) */
function formatBRNum(v: number, decimais: number): string {
  return formatarNumeroBR(v, '0', decimais)
}

/** Extrai horário do campo data (formato "DD/MM/YYYY HH:MM"). Retorna "HH" ou "HH:MM". */
function formatarHorarioRegistro(dataRegistro: unknown): string {
  const str = String(dataRegistro ?? '')
  const timePart = str.split(' ')[1]
  if (!timePart) return ''
  const [h, m] = timePart.split(':')
  if (!h) return ''
  const hh = h.padStart(2, '0')
  const mm = (m || '00').padStart(2, '0')
  return mm === '00' ? hh : `${hh}:${mm}`
}

interface MetricasSuplementacaoPDF {
  consumoMedioGeralPercentPV: number | null
  consumoMedio30DiasPercentPV: number | null
  consumoMedioGeralKgMN: number | null
  consumoMedio30DiasKgMN: number | null
  consumoMedioGeralKgMS: number | null
  consumoMedio30DiasKgMS: number | null
  custoMedioReaisCabDia: number | null
}

/**
 * Gera um PDF com o resumo diário de suplementação.
 * Inclui resumo consolidado do dia + detalhamento por registro com métricas de consumo.
 */
export async function gerarPdfResumoSuplementacao(
  registros: Registro[],
  dataResumo: string,
  fazenda?: string,
  metricasPorRegistro?: (MetricasSuplementacaoPDF | null)[]
): Promise<File> {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const margin = 15
  const contentW = pageWidth - margin * 2
  let y = margin

  // Helper: garantir espaço na página, adicionar nova se necessário
  const ensureSpace = (needed: number) => {
    if (y + needed > pageHeight - 15) {
      doc.addPage()
      y = margin + 4
    }
  }

  // Helper: linha label-valor
  const labelValue = (label: string, value: string, indent = 0) => {
    ensureSpace(7)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(10)
    doc.setTextColor(26, 58, 42)
    doc.text(label, margin + indent, y)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(50, 50, 50)
    doc.text(value, margin + indent + 55, y)
    y += 6
  }

  // === HEADER ===
  doc.setFillColor(26, 58, 42) // #1a3a2a
  doc.rect(0, 0, pageWidth, 28, 'F')

  const logoSize = 18
  const logoX = margin
  const logoY = 5
  try {
    const logoDataUrl = await fetchImageAsBase64(LOGO_URL)
    if (logoDataUrl) {
      doc.setFillColor(255, 255, 255)
      doc.roundedRect(logoX - 1, logoY - 1, logoSize + 2, logoSize + 2, 3, 3, 'F')
      doc.addImage(logoDataUrl, 'PNG', logoX, logoY, logoSize, logoSize, undefined, 'FAST')
    }
  } catch (err) {
    console.warn('[pdfUtils] Logo não carregou:', err)
  }

  const titleX = logoX + logoSize + 5
  doc.setTextColor(255, 255, 255)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(16)
  doc.text("Gesta'Up — Cadernetas Digitais", titleX, 12)

  doc.setFontSize(11)
  doc.setFont('helvetica', 'normal')
  doc.text('Resumo Diário — Suplementação', titleX, 19)

  const dataFormatada = dataResumo.split(' ')[0]
  doc.text(`Data: ${dataFormatada}`, pageWidth - margin, 12, { align: 'right' })
  if (fazenda) {
    doc.setFontSize(9)
    doc.text(`Fazenda: ${fazenda}`, pageWidth - margin, 19, { align: 'right' })
  }

  y = 34

  // Linha separadora
  doc.setDrawColor(26, 58, 42)
  doc.setLineWidth(0.5)
  doc.line(margin, y, pageWidth - margin, y)
  y += 8

  // === RESUMO CONSOLIDADO DO DIA ===
  doc.setTextColor(26, 58, 42)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(12)
  doc.text('RESUMO DO DIA', margin, y)
  y += 8

  // Tratador (do primeiro registro)
  const tratador = String(registros[0]?.tratador || registros[0]?.usuario || '—')

  // Cabeças atendidas: contar lotes únicos para evitar dupla contagem
  const lotesUnicos = new Map<string, number>()
  registros.forEach((r) => {
    const key = (r.loteId as string) || `${r.pasto}|${r.numeroLote}`
    const cabecas = r.nCabecasLote ? Number(r.nCabecasLote) : 0
    if (!lotesUnicos.has(key) || cabecas > (lotesUnicos.get(key) || 0)) {
      lotesUnicos.set(key, cabecas)
    }
  })
  const totalCabecas = Array.from(lotesUnicos.values()).reduce((s, v) => s + v, 0)
  const totalLotes = lotesUnicos.size

  // Custo estimado do dia: soma de custoMedioReaisCabDia × cabeças por lote único
  let custoEstimadoDia = 0
  let temCusto = false
  if (metricasPorRegistro) {
    const custoPorLote = new Map<string, number>()
    registros.forEach((r, i) => {
      const m = metricasPorRegistro[i]
      if (!m || m.custoMedioReaisCabDia == null) return
      const key = (r.loteId as string) || `${r.pasto}|${r.numeroLote}`
      const cabecas = r.nCabecasLote ? Number(r.nCabecasLote) : 0
      const custoLote = m.custoMedioReaisCabDia * cabecas
      custoPorLote.set(key, (custoPorLote.get(key) || 0) + custoLote)
      temCusto = true
    })
    custoEstimadoDia = Array.from(custoPorLote.values()).reduce((s, v) => s + v, 0)
  }

  doc.setFontSize(10)
  labelValue('Tratador:', tratador)
  labelValue('Total de registros:', String(registros.length))
  labelValue('Lotes atendidos:', String(totalLotes))
  if (totalCabecas > 0) {
    labelValue('Cabeças atendidas:', String(totalCabecas))
  }
  if (temCusto && custoEstimadoDia > 0) {
    labelValue('Custo estimado do dia:', `R$ ${formatBRNum(custoEstimadoDia, 2)}`)
  }

  y += 4

  // === DETALHAMENTO POR REGISTRO ===
  doc.setTextColor(26, 58, 42)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(12)
  doc.text('DETALHAMENTO POR REGISTRO', margin, y)
  y += 8

  for (let i = 0; i < registros.length; i++) {
    const r = registros[i]
    const metricas = metricasPorRegistro?.[i] || null

    // Quebra de página antes do registro se não houver espaço suficiente (~60mm)
    ensureSpace(60)

    // Cabeçalho do registro
    doc.setFillColor(240, 245, 240)
    doc.rect(margin, y - 4, contentW, 7, 'F')
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(11)
    doc.setTextColor(26, 58, 42)
    const horario = formatarHorarioRegistro(r.data)
    doc.text(`REGISTRO ${i + 1}${horario ? ` — ${horario}` : ''}`, margin + 2, y + 1)
    y += 9

    // Dados do lote
    doc.setFontSize(10)
    labelValue('Pasto/Curral:', String(r.pasto || '—'))
    labelValue('Lote:', String(r.numeroLote || '—'))

    // Formulação
    const teorMs = r.teorMs != null ? formatBRNum(Number(r.teorMs), 2) : null
    const formulacaoStr = String(r.formulacao || '—')
    labelValue('Formulação:', formulacaoStr)
    if (teorMs) {
      labelValue('Teor MS dieta:', `${teorMs}%`)
    }

    // Meta e cabeças
    if (r.metaConsumo != null) {
      labelValue('Meta consumo (%PV):', `${formatBRNum(Number(r.metaConsumo), 2)}%`)
      const pesoVivo = r.pesoVivoKgLote ? Number(r.pesoVivoKgLote) : null
      if (r.metaConsumo != null && pesoVivo) {
        const metaKg = (Number(r.metaConsumo) / 100) * pesoVivo
        labelValue('Meta consumo (kg/cab/dia):', `${formatBRNum(metaKg, 3)} kg`)
      }
    }
    const nCabecas = r.nCabecasLote ? Number(r.nCabecasLote) : null
    if (nCabecas) {
      labelValue('N° cabeças:', String(nCabecas))
    }
    const pesoVivoLote = r.pesoVivoKgLote ? Number(r.pesoVivoKgLote) : null
    if (pesoVivoLote) {
      labelValue('PV médio:', `${formatBRNum(pesoVivoLote, 2)} kg`)
    }

    // Categorias
    const categorias = String(r.categoriasString || (Array.isArray(r.categorias) ? r.categorias.join(', ') : ''))
    if (categorias) {
      ensureSpace(10)
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(10)
      doc.setTextColor(26, 58, 42)
      doc.text('Categorias:', margin, y)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(50, 50, 50)
      const catLines = doc.splitTextToSize(categorias, contentW - 55)
      doc.text(catLines, margin + 55, y)
      y += 6 * catLines.length
    }

    // Leitura e quantidades
    y += 2
    labelValue('Leitura cocho:', String(r.leituraCocho ?? '—'))
    if (r.kgCocho) {
      labelValue('Suplemento cocho:', `${formatBRNum(Number(r.kgCocho), 0)} kg`)
    }
    if (r.escoreFezes != null && r.escoreFezes !== '') {
      labelValue('Escore fezes:', String(r.escoreFezes))
    }

    // Histórico de consumo
    if (metricas) {
      const temConsumo = metricas.consumoMedioGeralPercentPV ||
        metricas.consumoMedio30DiasPercentPV ||
        metricas.consumoMedioGeralKgMN ||
        metricas.consumoMedio30DiasKgMN ||
        metricas.consumoMedioGeralKgMS ||
        metricas.consumoMedio30DiasKgMS ||
        metricas.custoMedioReaisCabDia
      if (temConsumo) {
        y += 3
        ensureSpace(40)
        doc.setFont('helvetica', 'bold')
        doc.setFontSize(10)
        doc.setTextColor(26, 58, 42)
        doc.text('HISTÓRICO DE CONSUMO', margin, y)
        y += 6

        if (metricas.consumoMedioGeralPercentPV != null) {
          labelValue('CMS geral (%PV):', `${formatBRNum(metricas.consumoMedioGeralPercentPV, 2)}%`, 4)
        }
        if (metricas.consumoMedio30DiasPercentPV != null) {
          labelValue('CMS 30 dias (%PV):', `${formatBRNum(metricas.consumoMedio30DiasPercentPV, 2)}%`, 4)
        }
        if (metricas.consumoMedioGeralKgMN != null) {
          labelValue('CMN geral (kg/MN):', `${formatBRNum(metricas.consumoMedioGeralKgMN, 3)} kg`, 4)
        }
        if (metricas.consumoMedio30DiasKgMN != null) {
          labelValue('CMN 30 dias (kg/MN):', `${formatBRNum(metricas.consumoMedio30DiasKgMN, 3)} kg`, 4)
        }
        if (metricas.consumoMedioGeralKgMS != null) {
          labelValue('CMS geral (kg/MS):', `${formatBRNum(metricas.consumoMedioGeralKgMS, 3)} kg`, 4)
        }
        if (metricas.consumoMedio30DiasKgMS != null) {
          labelValue('CMS 30 dias (kg/MS):', `${formatBRNum(metricas.consumoMedio30DiasKgMS, 3)} kg`, 4)
        }
        if (metricas.custoMedioReaisCabDia != null) {
          labelValue('Custo médio (R$/cab/dia):', `R$ ${formatBRNum(metricas.custoMedioReaisCabDia, 2)}`, 4)
          // Custo estimado lote/dia
          if (nCabecas && nCabecas > 0) {
            const custoLoteDia = metricas.custoMedioReaisCabDia * nCabecas
            labelValue('Custo estimado lote/dia:', `R$ ${formatBRNum(custoLoteDia, 2)}`, 4)
          }
        }
      }
    }

    // Separador entre registros
    if (i < registros.length - 1) {
      y += 4
      ensureSpace(8)
      doc.setDrawColor(200, 200, 200)
      doc.setLineWidth(0.3)
      doc.line(margin, y, pageWidth - margin, y)
      y += 6
    }
  }

  // === RODAPÉ ===
  const totalPaginas = doc.getNumberOfPages()
  for (let i = 1; i <= totalPaginas; i++) {
    doc.setPage(i)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.setTextColor(150, 150, 150)
    doc.text(
      `Gesta'Up Caderneta Digital — Gerado em ${new Date().toLocaleString('pt-BR')}`,
      margin,
      pageHeight - 8
    )
    doc.text(`Página ${i} de ${totalPaginas}`, pageWidth - margin, pageHeight - 8, { align: 'right' })
  }

  const blob = doc.output('blob')
  const fileName = `resumo_suplementacao_${dataFormatada.replace(/\//g, '-')}.pdf`
  return new File([blob], fileName, { type: 'application/pdf' })
}

/**
 * Compartilha um arquivo PDF via Web Share API (redes sociais).
 * Fallback: faz download do arquivo se Web Share não estiver disponível.
 */
export async function compartilharPdf(
  file: File,
  titulo: string,
  texto: string
): Promise<void> {
  // Verificar se o navegador suporta compartilhar arquivos
  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({
        title: titulo,
        text: texto,
        files: [file],
      })
      return
    } catch (err) {
      // Se o usuário cancelou, não fazer fallback
      if (err instanceof Error && err.name === 'AbortError') return
      // Outros erros: tentar download
    }
  }

  // Fallback: fazer download do PDF
  const url = URL.createObjectURL(file)
  const a = document.createElement('a')
  a.href = url
  a.download = file.name
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

/**
 * Busca uma imagem URL e a converte para base64 data URL.
 * Necessário porque o jsPDF addImage precisa de dados base64 ou HTMLImageElement.
 */
async function fetchImageAsBase64(url: string): Promise<string | null> {
  try {
    const response = await fetch(url)
    if (!response.ok) return null
    const blob = await response.blob()
    return new Promise((resolve) => {
      const reader = new FileReader()
      reader.onloadend = () => resolve(reader.result as string)
      reader.onerror = () => resolve(null)
      reader.readAsDataURL(blob)
    })
  } catch {
    return null
  }
}
