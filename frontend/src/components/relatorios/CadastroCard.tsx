import type { CadastroLote } from '../../types/relatorioLote'
import { formatarDataBR } from '../../utils/formatDate'

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
    <div className="py-2 flex flex-col gap-3">
      {/* Pasto atual em destaque */}
      {cadastro.pasto_nome && (
        <div className={`rounded-xl p-3 border-2 ${cadastro.ativo ? 'border-green-300 bg-green-50' : 'border-gray-200 bg-gray-50'}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-2xl">📍</span>
              <div>
                <p className="text-gray-500 font-semibold text-xs uppercase">Pasto atual</p>
                <p className="text-gray-900 font-bold text-lg">{cadastro.pasto_nome}</p>
              </div>
            </div>
            {cadastro.ativo && (
              <span className="text-xs bg-green-200 text-green-800 px-2 py-1 rounded-full font-semibold">
                Ocupado agora
              </span>
            )}
          </div>
          {cadastro.pasto_area_ha !== null && (
            <p className="text-sm text-gray-500 mt-1 ml-9">{cadastro.pasto_area_ha} ha</p>
          )}
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <Campo label="Raça" valor={cadastro.raca} />
        <Campo label="Sexo" valor={cadastro.sexo} />
        <Campo label="Sistema" valor={cadastro.sistema_producao} />
        <Campo label="Destino" valor={cadastro.destino} />
        <Campo label="Produtor" valor={cadastro.produtor_rural} />
        <Campo label="Origem" valor={cadastro.propriedade_origem} />
        <Campo label="Contrato" valor={cadastro.numero_contrato} />
        <Campo label="Competência" valor={formatarDataBR(cadastro.mes_competencia)} />
        <Campo label="Idade (meses)" valor={cadastro.idade_meses ?? cadastro.idade} />
        <Campo label="GMD (kg/dia)" valor={cadastro.gmd} />
        <Campo label="Peso entrada/cab" valor={cadastro.peso_entrada_kg_cab ? `${cadastro.peso_entrada_kg_cab} kg` : null} />
        <Campo label="Peso vivo total" valor={cadastro.peso_vivo_kg ? `${cadastro.peso_vivo_kg} kg` : null} />
        <Campo label="Peso meta/cab" valor={cadastro.peso_vivo_meta_kg ? `${cadastro.peso_vivo_meta_kg} kg` : null} />
        <Campo label="Data meta" valor={formatarDataBR(cadastro.data_meta)} />
        <Campo label="Próximo rodeio" valor={formatarDataBR(cadastro.data_proximo_rodeio)} />
        <Campo label="Intervalo rodeio" valor={cadastro.meta_intervalo_rodeio_dias ? `${cadastro.meta_intervalo_rodeio_dias} dias` : null} />
        {cadastro.data_liberacao_sisbov && (
          <Campo label="Liberação Sisbov" valor={formatarDataBR(cadastro.data_liberacao_sisbov)} />
        )}
        {cadastro.data_embarque_previsto && (
          <Campo label="Embarque previsto" valor={formatarDataBR(cadastro.data_embarque_previsto)} />
        )}
        <div className="col-span-2">
          <Campo label="Criado em" valor={cadastro.created_at ? new Date(cadastro.created_at).toLocaleDateString('pt-BR') : null} />
        </div>
      </div>
    </div>
  )
}
