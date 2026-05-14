import ListaRegistros from '../../components/cadernetas/ListaRegistros'

export default function PastagensListaPage() {
  return (
    <ListaRegistros
      caderneta="pastagens"
      titulo={<>MANEJO<br/>PASTAGENS</>}
      rotaForm="/caderneta/pastagens"
    />
  )
}
