import ListaRegistros from '../../components/cadernetas/ListaRegistros'

export default function BebedourosListaPage() {
  return (
    <ListaRegistros
      caderneta="bebedouros"
      titulo="💧 BEBEDOUROS — LISTA"
      rotaForm="/caderneta/bebedouros"
      colunas={[
        { campo: 'responsavel', label: 'Responsável' },
        { campo: 'pasto', label: 'Pasto' },
        { campo: 'numeroLote', label: 'Lote' },
        { campo: 'gado', label: 'Gado' },
        { campo: 'categoria', label: 'Categoria' },
        { campo: 'leituraBebedouro', label: 'Leitura' },
      ]}
    />
  )
}
