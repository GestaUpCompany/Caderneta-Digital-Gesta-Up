import { jsPDF } from 'jspdf'
import { Registro } from './shareUtils'
import { LOGO_URL } from './constants'

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
