import ListaRegistros from '../../components/cadernetas/ListaRegistros'

export default function PastagensListaPage() {
  return (
    <ListaRegistros
      caderneta="pastagens"
      titulo="🌾 TROCA DE PASTOS — LISTA"
      rotaForm="/caderneta/pastagens"
      colunas={[
        { campo: 'manejador', label: 'Manejador' },
        { campo: 'numeroLote', label: 'Lote' },
        { campo: 'pastoSaida', label: 'Saída' },
        { campo: 'pastoEntrada', label: 'Entrada' },
        { campo: 'totalAnimais', label: 'Total', formatador: (v) => `${v ?? 0} animais` },
      ]}
    />
  )
}
