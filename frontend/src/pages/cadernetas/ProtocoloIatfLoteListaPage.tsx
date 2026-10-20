import ListaRegistros from '../../components/cadernetas/ListaRegistros'

export default function ProtocoloIatfLoteListaPage() {
  return (
    <ListaRegistros
      caderneta="protocolo-iatf-lote"
      titulo="LOTES DE PROTOCOLO"
      rotaForm="/caderneta/protocolo-iatf/novo-lote"
    />
  )
}
