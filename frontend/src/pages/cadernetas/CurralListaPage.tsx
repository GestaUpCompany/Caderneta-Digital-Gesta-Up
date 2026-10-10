import ListaRegistros from '../../components/cadernetas/ListaRegistros'

export default function CurralListaPage() {
  return (
    <ListaRegistros
      caderneta="curral"
      titulo={<>MANEJO DE<br/>CURRAIS</>}
      rotaForm="/caderneta/pastagens?modo=curral"
    />
  )
}
