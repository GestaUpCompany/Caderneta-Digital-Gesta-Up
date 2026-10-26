import PastagensPastoForm from './PastagensPastoForm'

/**
 * Manejo de lotes: um único formulário para pasto e curral. Cada lado (saída e entrada)
 * escolhe pasto ou curral. Curral -> curral grava na caderneta curral; os demais na pastagens.
 */
export default function PastagensPage() {
  return <PastagensPastoForm />
}
