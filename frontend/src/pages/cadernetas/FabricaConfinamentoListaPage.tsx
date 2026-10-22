import { useState } from 'react'
import { useDispatch } from 'react-redux'
import { Pencil } from 'lucide-react'
import ListaRegistros from '../../components/cadernetas/ListaRegistros'
import EditarValorRegistroModal from '../../components/cadernetas/EditarValorRegistroModal'
import { editarTotalFabrica } from '../../services/edicaoFabricaConfinamento'
import { requestSyncNow } from '../../store/slices/syncSlice'
import { normalizarNumero } from '../../utils/formatNumber'
import { Registro } from '../../types/cadernetas'

interface Edicao {
  registro: Registro
  recarregar: () => Promise<void>
}

export default function FabricaConfinamentoListaPage() {
  const dispatch = useDispatch()
  const [edicao, setEdicao] = useState<Edicao | null>(null)

  return (
    <>
      <ListaRegistros
        caderneta="fabrica-confinamento"
        titulo="FÁBRICA CONFINAMENTO"
        rotaForm="/caderneta/fabrica-confinamento"
        acoesRegistro={(registro, recarregar) => (
          <button
            onClick={() => setEdicao({ registro, recarregar })}
            className="inline-flex items-center gap-1.5 rounded-full border border-gray-300 bg-white px-3.5 py-1.5 text-xs font-bold uppercase tracking-wide text-gray-600 transition-colors hover:bg-gray-50 active:bg-gray-100"
          >
            <Pencil className="h-3.5 w-3.5" strokeWidth={2.5} />
            Editar total
          </button>
        )}
      />
      {edicao && (
        <EditarValorRegistroModal
          titulo="Editar total carregado"
          label="Total carregado"
          unidade="kg"
          valorAtual={normalizarNumero(edicao.registro.totalProduzido as string | number) ?? 0}
          onSalvar={async (novo) => {
            await editarTotalFabrica(edicao.registro.id, novo)
            await edicao.recarregar()
            // Sync imediato; o ListaRegistros atualiza o selo do card quando o sync conclui
            dispatch(requestSyncNow())
          }}
          onFechar={() => setEdicao(null)}
        />
      )}
    </>
  )
}
