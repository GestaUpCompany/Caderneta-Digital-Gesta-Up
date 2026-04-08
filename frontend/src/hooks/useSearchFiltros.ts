import { useState, useMemo } from 'react'
import { Registro } from '../types/cadernetas'

interface FiltrosState {
  busca: string
  dataInicio: string
  dataFim: string
  ordenacao: 'data_desc' | 'data_asc' | 'id_desc' | 'id_asc'
}

const makeInitialFiltros = (): FiltrosState => ({
  busca: '',
  dataInicio: '',
  dataFim: '',
  ordenacao: 'data_desc',
})

export function useSearchFiltros(registros: Registro[]) {
  const [filtros, setFiltros] = useState<FiltrosState>(makeInitialFiltros)

  const registrosFiltrados = useMemo(() => {
    let resultado = [...registros]

    // Filtro de busca textual
    if (filtros.busca.trim()) {
      const termo = filtros.busca.toLowerCase().trim()
      resultado = resultado.filter((r) =>
        Object.values(r).some((val) =>
          String(val).toLowerCase().includes(termo)
        )
      )
    }

    // Filtro de período
    const isValidDateFormat = (date: string): boolean => /^\d{2}\/\d{2}\/\d{4}$/.test(date)

    if (filtros.dataInicio && isValidDateFormat(filtros.dataInicio)) {
      const [dia, mes, ano] = filtros.dataInicio.split('/')
      const inicio = new Date(`${ano}-${mes}-${dia}`).getTime()
      resultado = resultado.filter((r) => {
        if (!isValidDateFormat(String(r.data))) return true
        const dataRegistro = new Date(String(r.data).split('/').reverse().join('-')).getTime()
        return dataRegistro >= inicio
      })
    }

    if (filtros.dataFim && isValidDateFormat(filtros.dataFim)) {
      const [dia, mes, ano] = filtros.dataFim.split('/')
      const fim = new Date(`${ano}-${mes}-${dia}`).getTime()
      resultado = resultado.filter((r) => {
        if (!isValidDateFormat(String(r.data))) return true
        const dataRegistro = new Date(String(r.data).split('/').reverse().join('-')).getTime()
        return dataRegistro <= fim
      })
    }

    // Ordenação
    resultado.sort((a, b) => {
      switch (filtros.ordenacao) {
        case 'data_desc': {
          const dateA = new Date(String(a.data).split('/').reverse().join('-')).getTime()
          const dateB = new Date(String(b.data).split('/').reverse().join('-')).getTime()
          return dateB - dateA
        }
        case 'data_asc': {
          const dateA = new Date(String(a.data).split('/').reverse().join('-')).getTime()
          const dateB = new Date(String(b.data).split('/').reverse().join('-')).getTime()
          return dateA - dateB
        }
        case 'id_desc':
          return String(b.id).localeCompare(String(a.id))
        case 'id_asc':
          return String(a.id).localeCompare(String(b.id))
        default:
          return 0
      }
    })

    return resultado
  }, [registros, filtros])

  const setBusca = (val: string) => setFiltros((p) => ({ ...p, busca: val }))
  const setDataInicio = (val: string) => setFiltros((p) => ({ ...p, dataInicio: val }))
  const setDataFim = (val: string) => setFiltros((p) => ({ ...p, dataFim: val }))
  const setOrdenacao = (val: FiltrosState['ordenacao']) => setFiltros((p) => ({ ...p, ordenacao: val }))
  const limparFiltros = () => setFiltros(makeInitialFiltros())

  const temFiltrosAtivos = filtros.busca || filtros.dataInicio || filtros.dataFim || filtros.ordenacao !== 'data_desc'

  return {
    filtros,
    registrosFiltrados,
    setBusca,
    setDataInicio,
    setDataFim,
    setOrdenacao,
    limparFiltros,
    temFiltrosAtivos,
    totalOriginal: registros.length,
    totalFiltrado: registrosFiltrados.length,
  }
}
