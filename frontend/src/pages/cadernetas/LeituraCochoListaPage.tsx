import { useState, useCallback, useEffect } from 'react'
import { useSelector } from 'react-redux'
import ListaRegistros from '../../components/cadernetas/ListaRegistros'
import ResumoDiario from '../../components/cadernetas/ResumoDiario'
import { listarRegistros } from '../../services/api'
import { RootState } from '../../store/store'
import { compartilharWhatsApp, Registro } from '../../utils/shareUtils'
import { getFazendasDoMesmoGrupoCached } from '../../services/cadastroCache'

export default function LeituraCochoListaPage() {
  const { fazenda, fazendaId } = useSelector((state: RootState) => state.config)
  const lastSync = useSelector((state: RootState) => state.sync.lastSync)
  const [todosRegistros, setTodosRegistros] = useState<Registro[]>([])

  const carregarRegistros = useCallback(async () => {
    setTodosRegistros(await listarRegistros('leitura-cocho'))
  }, [])

  // Recarrega ao abrir e ao concluir sync
  useEffect(() => {
    void carregarRegistros()
  }, [carregarRegistros, lastSync])

  const filtrarRegistrosDoDia = (data: string) => {
    const dataBase = data.split(' ')[0]
    return todosRegistros.filter((r) => String(r.data).split(' ')[0] === dataBase)
  }

  const handleGerarResumoTexto = async (data: string) => {
    const registrosDoDia = filtrarRegistrosDoDia(data)
    const dataBase = data.split(' ')[0]
    const partes: string[] = []

    partes.push(`📋 *RESUMO DIÁRIO — LEITURA DE COCHO*`)
    const fazendasDoGrupo = await getFazendasDoMesmoGrupoCached(fazendaId)
    if (fazendasDoGrupo && fazendasDoGrupo.length > 0) {
      partes.push(`Fazenda: *${fazenda}*`)
    }
    partes.push(`📅 Data: *${dataBase}*`)
    partes.push('')
    partes.push(`Leituras registradas: *${registrosDoDia.length}*`)

    registrosDoDia.forEach((r) => {
      partes.push('')
      partes.push('━━━━━━━━━━━━━━━━━━━━━━━━')
      partes.push('')

      if (r.responsavel || r.usuario) partes.push(`RESPONSÁVEL: *${r.responsavel || r.usuario}*`)
      partes.push(`PASTO/CURRAL: *${r.pastoCurral || '—'}*`)
      partes.push(`LOTE: *${r.numeroLote || '—'}*`)
      if (r.leituraCocho !== null && r.leituraCocho !== undefined && r.leituraCocho !== '') {
        partes.push(`LEITURA COCHO: *${r.leituraCocho}*`)
      }
    })

    await compartilharWhatsApp(partes.join('\n'))
  }

  return (
    <ListaRegistros
      caderneta="leitura-cocho"
      titulo="LEITURA DE COCHO"
      rotaForm="/caderneta/leitura-cocho"
      extraActions={
        <ResumoDiario
          descricao="leituras de cocho"
          contarRegistros={(d) => filtrarRegistrosDoDia(d).length}
          onEnviarTexto={handleGerarResumoTexto}
        />
      }
    />
  )
}
