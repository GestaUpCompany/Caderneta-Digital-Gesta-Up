import ListaRegistros from '../../components/cadernetas/ListaRegistros'

export default function RecebimentoCompraListaPage() {
  return (
    <ListaRegistros
      caderneta="os-recebimentos"
      titulo="RECEPÇÃO ANIMAIS"
      rotaForm="/caderneta/recebimento-compra"
    />
  )
}
