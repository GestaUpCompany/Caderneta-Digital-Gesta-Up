import { useSelector } from 'react-redux'
import CadernetaLayout from '../../components/CadernetaLayout'
import InfoStrip from '../../components/cadernetas/InfoStrip'
import ListaRegistros from '../../components/cadernetas/ListaRegistros'
import { cadernetaVisivel } from '../../utils/constants'
import { RootState } from '../../store/store'

export default function ProtocoloIatfListaPage() {
  const { fazendaId, acessoIatf } = useSelector((state: RootState) => state.config)

  // Em teste: só a fazenda de testes abre (a lista também, para quem chega por URL direta)
  if (!fazendaId || !cadernetaVisivel('protocolo-iatf', fazendaId, acessoIatf)) {
    return (
      <CadernetaLayout title="PROTOCOLO IATF" cadernetaId="protocolo-iatf" showRegistrosButton={false}>
        <InfoStrip tone="warning" icon="⚠️">
          {!fazendaId ? 'Configure a fazenda antes de usar esta caderneta.' : 'Esta caderneta não está liberada para esta fazenda. Peça ao administrador para ativar o Acesso ao IATF.'}
        </InfoStrip>
      </CadernetaLayout>
    )
  }

  return (
    <ListaRegistros
      caderneta="protocolo-iatf"
      titulo="PROTOCOLO IATF"
      rotaForm="/caderneta/protocolo-iatf"
    />
  )
}
