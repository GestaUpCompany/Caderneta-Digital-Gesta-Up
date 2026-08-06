/**
 * Calcula o peso vivo projetado para uma data específica, replicando a lógica
 * do cron `update_dados_lotes` do Supabase.
 *
 * O PWA precisa gravar em registros_suplementacao o peso projetado para a
 * data do registro (campo "data"), não o peso atual de
 * lote_categorias.peso_vivo_atual_kg_cab (que reflete a data de hoje).
 *
 * Fórmula:
 *   Se houver data_ajuste_peso:
 *     peso = peso_vivo_atual_kg_cab + gmd_efetivo * (data_registro - hoje)
 *   Senão:
 *     peso = peso_inicio_kg_cab + gmd_efetivo * (data_registro - data_inicio)
 *
 * Atenção sobre data_ajuste_peso: peso_vivo_atual_kg_cab tem semântica ambígua.
 * Logo após um ajuste manual (antes do cron rodar), ele é o peso na data_ajuste_peso.
 * Depois que o cron roda (diariamente às 00:00 UTC), ele é o peso projetado para hoje.
 * A fórmula peso_atual + gmd * (D - hoje) é correta quando o cron já rodou (caso comum,
 * pois o peão sincroniza durante o dia, após o cron). Se o cron ainda não rodou no dia
 * do ajuste, o valor calculado será ligeiramente incorreto, mas a trigger
 * recalcular_peso_vivo_lote no banco corrigirá automaticamente quando o cron rodar.
 */

export interface ParametrosPesoProjetado {
  pesoInicioKgCab: number | null
  dataInicio: string | null
  gmdEfetivo: number | null
  dataAjustePeso: string | null
  pesoVivoAtualKgCab: number | null
}

/**
 * Calcula a diferença em dias entre duas datas, truncando para date (sem horário).
 * Permite valores negativos (registros retroativos têm data anterior à referência).
 * Para a projeção padrão (data_inicio), clampa em 0 para não projetar peso negativo
 * antes do início do plano.
 */
function diasEntre(dataAlvo: Date, dataReferencia: Date, clampZero: boolean = false): number {
  const d1 = new Date(dataAlvo.getFullYear(), dataAlvo.getMonth(), dataAlvo.getDate())
  const d2 = new Date(dataReferencia.getFullYear(), dataReferencia.getMonth(), dataReferencia.getDate())
  const diffMs = d1.getTime() - d2.getTime()
  const dias = Math.floor(diffMs / (1000 * 60 * 60 * 24))
  return clampZero ? Math.max(0, dias) : dias
}

/**
 * Calcula o peso vivo projetado para a data do registro.
 *
 * @param dataRegistro ISO date (string) do campo "data" do registro
 * @param params Parâmetros do plano nutricional ativo + lote_categorias
 * @returns peso projetado em kg, ou null se não houver dados suficientes
 */
export function calcularPesoProjetado(
  dataRegistro: string,
  params: ParametrosPesoProjetado,
): number | null {
  const {
    pesoInicioKgCab,
    dataInicio,
    gmdEfetivo,
    dataAjustePeso,
    pesoVivoAtualKgCab,
  } = params

  if (!dataRegistro) return null

  const dataReg = new Date(dataRegistro)
  if (isNaN(dataReg.getTime())) return null

  // Se houve ajuste manual de peso, projetar a partir de hoje.
  // peso_vivo_atual_kg_cab é o peso projetado para hoje (o cron incrementa diariamente).
  // Para obter o peso na data D: peso_atual + gmd * (D - hoje)
  // Isso é equivalente a: peso_no_ajuste + gmd * (D - data_ajuste) quando o cron tem corrido.
  if (dataAjustePeso && pesoVivoAtualKgCab != null && gmdEfetivo != null) {
    const hoje = new Date()
    const dias = diasEntre(dataReg, hoje)
    return pesoVivoAtualKgCab + gmdEfetivo * dias
  }

  // Projeção padrão: peso_inicio + gmd * dias_desde_data_inicio
  if (pesoInicioKgCab != null && dataInicio && gmdEfetivo != null) {
    const dataIni = new Date(dataInicio)
    if (isNaN(dataIni.getTime())) return null
    const dias = diasEntre(dataReg, dataIni, true)
    return pesoInicioKgCab + gmdEfetivo * dias
  }

  // Sem dados suficientes para projetar
  return null
}
