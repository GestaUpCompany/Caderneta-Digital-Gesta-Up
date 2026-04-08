import ListaRegistros from '../../components/cadernetas/ListaRegistros'

export default function RodeioListaPage() {
  return (
    <ListaRegistros
      caderneta="rodeio"
      titulo="🤠 RODEIO GADO — LISTA"
      rotaForm="/caderneta/rodeio"
      colunas={[
        { campo: 'pasto', label: 'Pasto' },
        { campo: 'numeroLote', label: 'Lote' },
        { campo: 'totalCabecas', label: 'Total', formatador: (v) => `${v ?? 0} cab.` },
        { campo: 'animaisTratados', label: 'Tratados' },
        { campo: 'animaisDoentes', label: 'Doentes?', formatador: (v) => v === 'S' ? '⚠️ SIM' : '✅ NÃO' },
        { campo: 'animalMorto', label: 'Morto?', formatador: (v) => v === 'S' ? '☠️ SIM' : '✅ NÃO' },
      ]}
    />
  )
}
