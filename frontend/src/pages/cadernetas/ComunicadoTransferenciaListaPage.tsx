import ListaRegistros from '../../components/cadernetas/ListaRegistros'

export default function ComunicadoTransferenciaListaPage() {
  return (
    <ListaRegistros
      caderneta="ordens-servico"
      titulo="COMUNICADOS DE TRANSFERÊNCIA"
      rotaForm="/caderneta/comunicado-transferencia"
      filtrarRegistro={(r) => r.tipo === 'transferencia'}
    />
  )
}
