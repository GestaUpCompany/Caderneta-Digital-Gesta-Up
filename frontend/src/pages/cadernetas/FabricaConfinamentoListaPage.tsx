import { useState, useCallback, useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { Pencil } from 'lucide-react'
import ListaRegistros from '../../components/cadernetas/ListaRegistros'
import ResumoDiario from '../../components/cadernetas/ResumoDiario'
import EditarValoresRegistroModal from '../../components/cadernetas/EditarValoresRegistroModal'
import { editarInsumosFabrica, listarInsumosCarregados, type InsumoCarregado } from '../../services/edicaoFabricaConfinamento'
import { listarRegistros } from '../../services/api'
import { requestSyncNow } from '../../store/slices/syncSlice'
import { RootState } from '../../store/store'
import { formatarNumeroBR, normalizarNumero } from '../../utils/formatNumber'
import { compartilharWhatsApp, Registro } from '../../utils/shareUtils'
import { getFazendasDoMesmoGrupoCached } from '../../services/cadastroCache'

interface Edicao {
  registro: Registro
  insumos: InsumoCarregado[]
}

export default function FabricaConfinamentoListaPage() {
  const dispatch = useDispatch()
  const { fazenda, fazendaId } = useSelector((state: RootState) => state.config)
  const lastSync = useSelector((state: RootState) => state.sync.lastSync)
  const [edicao, setEdicao] = useState<Edicao | null>(null)
  const [todosRegistros, setTodosRegistros] = useState<Registro[]>([])

  const carregarRegistros = useCallback(async () => {
    setTodosRegistros(await listarRegistros('fabrica-confinamento'))
  }, [])

  // Recarrega ao abrir, ao concluir sync (edição de insumos também passa por ele) e após salvar
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

    partes.push(`📋 *RESUMO DIÁRIO — FÁBRICA CONFINAMENTO*`)
    const fazendasDoGrupo = await getFazendasDoMesmoGrupoCached(fazendaId)
    if (fazendasDoGrupo && fazendasDoGrupo.length > 0) {
      partes.push(`Fazenda: *${fazenda}*`)
    }
    partes.push(`📅 Data: *${dataBase}*`)
    partes.push('')

    let totalPrevisto = 0
    let totalProduzido = 0
    registrosDoDia.forEach((r) => {
      totalPrevisto += normalizarNumero(r.totalPrevisto as string | number) ?? 0
      totalProduzido += normalizarNumero(r.totalProduzido as string | number) ?? 0
    })

    partes.push(`Produções registradas: *${registrosDoDia.length}*`)
    partes.push(`KG previsto: *${formatarNumeroBR(totalPrevisto)} kg*`)
    partes.push(`KG produzido: *${formatarNumeroBR(totalProduzido)} kg*`)

    registrosDoDia.forEach((r) => {
      partes.push('')
      partes.push('━━━━━━━━━━━━━━━━━━━━━━━━')
      partes.push('')

      if (r.responsavel || r.usuario) partes.push(`RESPONSÁVEL: *${r.responsavel || r.usuario}*`)
      if (r.ordemTrato !== null && r.ordemTrato !== undefined && r.ordemTrato !== '') {
        partes.push(`TRATO: *${r.ordemTrato}*`)
      }
      const previsto = normalizarNumero(r.totalPrevisto as string | number)
      if (previsto !== null) partes.push(`KG PREVISTO: *${formatarNumeroBR(previsto)} kg*`)
      const produzido = normalizarNumero(r.totalProduzido as string | number)
      if (produzido !== null) partes.push(`KG PRODUZIDO: *${formatarNumeroBR(produzido)} kg*`)
    })

    await compartilharWhatsApp(partes.join('\n'))
  }

  const abrirEdicao = async (registro: Registro) => {
    const insumos = await listarInsumosCarregados(registro.id)
    if (insumos.length === 0) {
      alert('Este registro não tem insumos salvos neste aparelho para editar.')
      return
    }
    setEdicao({ registro, insumos })
  }

  return (
    <>
      <ListaRegistros
        caderneta="fabrica-confinamento"
        titulo="FÁBRICA CONFINAMENTO"
        rotaForm="/caderneta/fabrica-confinamento"
        extraActions={
          <ResumoDiario
            descricao="produções da fábrica de confinamento"
            contarRegistros={(d) => filtrarRegistrosDoDia(d).length}
            onEnviarTexto={handleGerarResumoTexto}
          />
        }
        acoesRegistro={(registro) => (
          <button
            onClick={() => void abrirEdicao(registro)}
            className="inline-flex items-center gap-1.5 rounded-full border border-gray-300 bg-white px-3.5 py-1.5 text-xs font-bold uppercase tracking-wide text-gray-600 transition-colors hover:bg-gray-50 active:bg-gray-100"
          >
            <Pencil className="h-3.5 w-3.5" strokeWidth={2.5} />
            Editar insumos
          </button>
        )}
      />
      {edicao && (
        <EditarValoresRegistroModal
          titulo="Editar insumos carregados"
          unidade="kg"
          rotuloTotal="Total carregado"
          itens={edicao.insumos.map((i) => ({ id: i.insumoId, label: i.nome, valor: i.kg }))}
          calcularTotal={(valores) => {
            const variacao = edicao.insumos.reduce((acc, i) => acc + ((valores[i.insumoId] ?? i.kg) - i.kg), 0)
            return (normalizarNumero(edicao.registro.totalProduzido as string | number) ?? 0) + variacao
          }}
          onSalvar={async (valores) => {
            await editarInsumosFabrica(edicao.registro.id, valores)
            // Sync imediato; o ListaRegistros atualiza o selo do card quando o sync conclui
            dispatch(requestSyncNow())
            await carregarRegistros()
          }}
          onFechar={() => setEdicao(null)}
        />
      )}
    </>
  )
}
