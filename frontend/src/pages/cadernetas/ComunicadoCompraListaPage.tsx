import ListaRegistros from '../../components/cadernetas/ListaRegistros'

export default function ComunicadoCompraListaPage() {
  return (
    <ListaRegistros
      caderneta="ordens-servico"
      titulo="COMUNICADOS DE COMPRA"
      rotaForm="/caderneta/comunicado-compra"
      filtrarRegistro={(r) => r.tipo === 'compra'}
    />
  )
}
