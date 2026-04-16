import ListaRegistros from '../../components/cadernetas/ListaRegistros'

export default function MaternidadeListaPage() {
  return (
    <ListaRegistros
      caderneta="maternidade"
      titulo="MATERNIDADE"
      rotaForm="/caderneta/maternidade"
      colunas={[
        { campo: 'pasto', label: 'Pasto' },
        { campo: 'numeroCria', label: 'Nº Cria' },
        { campo: 'numeroMae', label: 'Nº Mãe' },
        { campo: 'sexo', label: 'Sexo' },
        { campo: 'tipoParto', label: 'Parto' },
        { campo: 'raca', label: 'Raça' },
        { campo: 'tratamento', label: 'Tratamento' },
      ]}
    />
  )
}
