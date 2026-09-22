import ListaRegistros from '../../components/cadernetas/ListaRegistros'

export default function ComunicadoVendaListaPage() {
  return (
    <ListaRegistros
      caderneta="ordens-servico"
      titulo="COMUNICADOS DE VENDA"
      rotaForm="/caderneta/comunicado-venda"
    />
  )
}
