import { useSelector } from 'react-redux'
import CadernetaLayout from '../../components/CadernetaLayout'
import InfoStrip from '../../components/cadernetas/InfoStrip'
import ListaRegistros from '../../components/cadernetas/ListaRegistros'
import { cadernetaVisivelNaFazenda } from '../../utils/constants'
import { RootState } from '../../store/store'

export default function ProtocoloIatfLoteListaPage() {
  const { fazendaId } = useSelector((state: RootState) => state.config)

  // Em teste: acompanha a liberação da caderneta Protocolo IATF (só a fazenda de testes)
  if (!fazendaId || !cadernetaVisivelNaFazenda('protocolo-iatf', fazendaId)) {
    return (
      <CadernetaLayout title="LOTES DE PROTOCOLO" cadernetaId="protocolo-iatf" showRegistrosButton={false}>
        <InfoStrip tone="warning" icon="⚠️">
          {!fazendaId ? 'Configure a fazenda antes de usar esta caderneta.' : 'Esta caderneta ainda está em teste e não está liberada para esta fazenda.'}
        </InfoStrip>
      </CadernetaLayout>
    )
  }

  return (
    <ListaRegistros
      caderneta="protocolo-iatf-lote"
      titulo="LOTES DE PROTOCOLO"
      rotaForm="/caderneta/protocolo-iatf/novo-lote"
    />
  )
}
