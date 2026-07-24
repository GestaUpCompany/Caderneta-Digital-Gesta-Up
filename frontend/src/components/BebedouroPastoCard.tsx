interface BebedouroPastoCardProps {
  nomeBebedouro: string
  pastos: { id: string; nome: string }[] | null
  loading?: boolean
}

/**
 * Card que mostra a qual(is) pasto(s) o bebedouro selecionado está vinculado.
 * Semelhante ao LoteDetalhesCard. Se não houver vínculo, exibe orientação
 * para o usuário associar o bebedouro a um pasto via o site Manej'Us.
 */
export default function BebedouroPastoCard({
  nomeBebedouro,
  pastos,
  loading,
}: BebedouroPastoCardProps) {
  const temPastos = pastos && pastos.length > 0

  return (
    <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
      <div className="grid grid-cols-1 gap-2 text-base">
        {loading ? (
          <div>
            <p className="text-gray-500 font-semibold">PASTO</p>
            <p className="text-gray-900 font-bold">Carregando...</p>
          </div>
        ) : temPastos ? (
          <div>
            <p className="text-gray-500 font-semibold">
              {pastos!.length > 1 ? 'PASTOS' : 'PASTO'}
            </p>
            <p className="text-gray-900 font-bold break-words">
              {pastos!.map((p) => p.nome).join(', ')}
            </p>
          </div>
        ) : (
          <div className="col-span-2">
            <p className="text-gray-500 font-semibold">PASTO</p>
            <p className="text-gray-900 font-bold mb-2">Não associado</p>
            <p className="text-sm text-gray-700 leading-relaxed">
              O bebedouro <span className="font-bold">{nomeBebedouro}</span> não está
              associado a nenhum pasto. Acesse o site Manej'Us, vá em Pastos, escolha o
              pasto desejado e clique em Editar. Selecione{' '}
              <span className="font-bold">{nomeBebedouro}</span> no campo de seleção de
              bebedouros e clique em Salvar.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
