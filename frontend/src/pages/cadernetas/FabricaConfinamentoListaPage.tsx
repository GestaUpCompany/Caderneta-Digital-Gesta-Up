import { useState } from 'react'
import { useDispatch } from 'react-redux'
import { Pencil } from 'lucide-react'
import ListaRegistros from '../../components/cadernetas/ListaRegistros'
import EditarValoresRegistroModal from '../../components/cadernetas/EditarValoresRegistroModal'
import { editarInsumosFabrica, listarInsumosCarregados, type InsumoCarregado } from '../../services/edicaoFabricaConfinamento'
import { requestSyncNow } from '../../store/slices/syncSlice'
import { normalizarNumero } from '../../utils/formatNumber'
import { Registro } from '../../types/cadernetas'

interface Edicao {
  registro: Registro
  insumos: InsumoCarregado[]
}

export default function FabricaConfinamentoListaPage() {
  const dispatch = useDispatch()
  const [edicao, setEdicao] = useState<Edicao | null>(null)

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
          }}
          onFechar={() => setEdicao(null)}
        />
      )}
    </>
  )
}
