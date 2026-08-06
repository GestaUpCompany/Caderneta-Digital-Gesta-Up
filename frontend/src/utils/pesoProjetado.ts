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
 *     peso = peso_vivo_atual_kg_cab + gmd_efetivo * (data_registro - data_ajuste_peso)
 *   Senão:
 *     peso = peso_inicio_kg_cab + gmd_efetivo * (data_registro - data_inicio)
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
 * Retorna 0 se a data alvo for anterior à data de referência.
 */
function diasEntre(dataAlvo: Date, dataReferencia: Date): number {
  const d1 = new Date(dataAlvo.getFullYear(), dataAlvo.getMonth(), dataAlvo.getDate())
  const d2 = new Date(dataReferencia.getFullYear(), dataReferencia.getMonth(), dataReferencia.getDate())
  const diffMs = d1.getTime() - d2.getTime()
  return Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)))
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

  // Se houve ajuste manual de peso, projetar a partir do ajuste
  if (dataAjustePeso && pesoVivoAtualKgCab != null && gmdEfetivo != null) {
    const dataAj = new Date(dataAjustePeso)
    if (isNaN(dataAj.getTime())) return null
    const dias = diasEntre(dataReg, dataAj)
    return pesoVivoAtualKgCab + gmdEfetivo * dias
  }

  // Projeção padrão: peso_inicio + gmd * dias_desde_data_inicio
  if (pesoInicioKgCab != null && dataInicio && gmdEfetivo != null) {
    const dataIni = new Date(dataInicio)
    if (isNaN(dataIni.getTime())) return null
    const dias = diasEntre(dataReg, dataIni)
    return pesoInicioKgCab + gmdEfetivo * dias
  }

  // Sem dados suficientes para projetar
  return null
}
