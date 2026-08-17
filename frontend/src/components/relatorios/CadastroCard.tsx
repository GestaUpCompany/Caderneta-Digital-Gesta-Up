import type { CadastroLote } from '../../types/relatorioLote'

interface Props {
  cadastro: CadastroLote
}

function Campo({ label, valor }: { label: string; valor: React.ReactNode }) {
  const v = valor === null || valor === undefined || valor === '' ? '—' : valor
  return (
    <div>
      <p className="text-gray-500 font-semibold text-xs uppercase">{label}</p>
      <p className="text-gray-900 font-bold text-base break-words">{v}</p>
    </div>
  )
}

export default function CadastroCard({ cadastro }: Props) {
  return (
    <div className="grid grid-cols-2 gap-3 py-2">
      <Campo label="Raça" valor={cadastro.raca} />
      <Campo label="Sexo" valor={cadastro.sexo} />
      <Campo label="Sistema" valor={cadastro.sistema_producao} />
      <Campo label="Destino" valor={cadastro.destino} />
      <Campo label="Pasto atual" valor={cadastro.pasto_nome} />
      <Campo label="Área (ha)" valor={cadastro.pasto_area_ha} />
      <Campo label="Produtor" valor={cadastro.produtor_rural} />
      <Campo label="Origem" valor={cadastro.propriedade_origem} />
      <Campo label="Contrato" valor={cadastro.numero_contrato} />
      <Campo label="Competência" valor={cadastro.mes_competencia} />
      <Campo label="Idade (meses)" valor={cadastro.idade_meses ?? cadastro.idade} />
      <Campo label="GMD (kg/dia)" valor={cadastro.gmd} />
      <Campo label="Peso entrada/cab" valor={cadastro.peso_entrada_kg_cab ? `${cadastro.peso_entrada_kg_cab} kg` : null} />
      <Campo label="Peso vivo total" valor={cadastro.peso_vivo_kg ? `${cadastro.peso_vivo_kg} kg` : null} />
      <Campo label="Peso meta/cab" valor={cadastro.peso_vivo_meta_kg ? `${cadastro.peso_vivo_meta_kg} kg` : null} />
      <Campo label="Data meta" valor={cadastro.data_meta} />
      <Campo label="Próximo rodeio" valor={cadastro.data_proximo_rodeio} />
      <Campo label="Intervalo rodeio" valor={cadastro.meta_intervalo_rodeio_dias ? `${cadastro.meta_intervalo_rodeio_dias} dias` : null} />
      {cadastro.data_liberacao_sisbov && (
        <Campo label="Liberação Sisbov" valor={cadastro.data_liberacao_sisbov} />
      )}
      {cadastro.data_embarque_previsto && (
        <Campo label="Embarque previsto" valor={cadastro.data_embarque_previsto} />
      )}
      <div className="col-span-2">
        <Campo label="Criado em" valor={cadastro.created_at ? new Date(cadastro.created_at).toLocaleDateString('pt-BR') : null} />
      </div>
    </div>
  )
}
