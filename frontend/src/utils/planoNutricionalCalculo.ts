// Cálculo do plano nutricional (projeção de peso e GMD por lote). Puro: sem acesso ao banco.
// Usado pela consulta individual e pela consulta em lote, que precisam dar o mesmo resultado.

import type { CategoriaProjecao } from './pesoProjetado'

export function calcularPlanoNutricional(
  plano: { data_inicio: string | null; formulacao_id: string | null },
  formulacaoNome: string | null,
  categorias: any[],
  personalizacao: any[],
  gmds: any[]
) {
  const pcpMap: Record<string, number> = {}
  personalizacao.forEach((p: any) => {
    if (p.peso_inicio_kg_cab != null) {
      pcpMap[p.lote_categoria_id] = Number(p.peso_inicio_kg_cab)
    }
  })

  const gmdMap: Record<string, number> = {}
  gmds.forEach((g: any) => {
    gmdMap[(g.categoria || '').toLowerCase().trim()] = Number(g.gmd)
  })

  // Médias ponderadas por quant_atual para o lote
  let totalPesoInicio = 0
  let totalPesoAtual = 0
  let totalGmd = 0
  let totalCabecas = 0
  let catsComAjuste = 0
  let catsSemAjuste = 0
  // Base de projeção de cada categoria: o lote pode misturar categorias com e sem ajuste manual
  const categoriasProjecao: CategoriaProjecao[] = []

  for (const cat of categorias) {
    const quant = cat.quant_atual || 0
    if (quant <= 0) continue

    const gmd = gmdMap[(cat.categoria || '').toLowerCase().trim()]
    if (gmd == null) continue // categoria não coberta pela formulação, GMD NULL

    if (cat.data_ajuste_peso) {
      catsComAjuste++
      if (cat.peso_vivo_atual_kg_cab == null) continue // sem peso ajustado, nao pode projetar esta categoria
      totalPesoAtual += Number(cat.peso_vivo_atual_kg_cab) * quant
      categoriasProjecao.push({ quant, gmd, base: 'ajuste', pesoBase: Number(cat.peso_vivo_atual_kg_cab) })
    } else {
      const pesoInicio = pcpMap[cat.id]
      if (pesoInicio == null) continue // sem peso_inicio na personalizacao, nao pode projetar esta categoria
      catsSemAjuste++
      totalPesoInicio += pesoInicio * quant
      categoriasProjecao.push({ quant, gmd, base: 'inicio', pesoBase: pesoInicio })
    }

    totalGmd += gmd * quant
    totalCabecas += quant
  }

  if (totalCabecas === 0) {
    return {
      pesoInicioKgCab: null,
      dataInicio: plano.data_inicio ?? null,
      gmdEfetivo: null,
      dataAjustePeso: null,
      pesoVivoAtualKgCab: null,
      formulacaoId: plano.formulacao_id ?? null,
      formulacaoNome,
      categoriasProjecao,
    }
  }

  // Se todas as categorias com GMD têm ajuste manual, usar projeção por ajuste.
  // Senão, usar projeção por peso_inicio (mais comum e mais estável).
  const usarAjuste = catsComAjuste > 0 && catsSemAjuste === 0

  return {
    pesoInicioKgCab: usarAjuste ? null : totalPesoInicio / totalCabecas,
    dataInicio: plano.data_inicio ?? null,
    gmdEfetivo: totalGmd / totalCabecas,
    dataAjustePeso: usarAjuste ? categorias.find((c: any) => c.data_ajuste_peso)?.data_ajuste_peso ?? null : null,
    pesoVivoAtualKgCab: usarAjuste ? totalPesoAtual / totalCabecas : null,
    formulacaoId: plano.formulacao_id ?? null,
    formulacaoNome,
    categoriasProjecao,
  }
}
