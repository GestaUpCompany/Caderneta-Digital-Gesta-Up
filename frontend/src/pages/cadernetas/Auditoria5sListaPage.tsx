import ListaRegistros from '../../components/cadernetas/ListaRegistros'

export default function Auditoria5sListaPage() {
  return (
    <ListaRegistros
      caderneta="auditoria-5s"
      titulo={<>AUDITORIA<br/>5S</>}
      rotaForm="/caderneta/auditoria-5s"
    />
  )
}
