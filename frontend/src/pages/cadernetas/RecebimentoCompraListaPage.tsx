import ListaRegistros from '../../components/cadernetas/ListaRegistros'

export default function RecebimentoCompraListaPage() {
  return (
    <ListaRegistros
      caderneta="os-recebimentos"
      titulo="RECEBIMENTOS DE COMPRA"
      rotaForm="/caderneta/recebimento-compra"
    />
  )
}
