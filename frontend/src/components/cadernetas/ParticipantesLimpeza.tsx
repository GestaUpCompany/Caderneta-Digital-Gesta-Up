import { useState } from 'react'
import ChoiceGrid from './ChoiceGrid'
import { AVATAR_CORES, iniciais, primeiroNome } from '../../utils/avatarFuncionario'

export const MAX_DIARISTAS = 20
const MAX_NOME = 60

// Separa por vírgula/ponto e vírgula/quebra de linha, tira espaços e ignora vazios.
export function separarNomes(texto: string): string[] {
  return texto
    .split(/[,;\n]/)
    .map((n) => n.trim().slice(0, MAX_NOME))
    .filter(Boolean)
}

// Junta novos nomes à lista sem repetir (ignora maiúsculas/minúsculas) e respeita o teto.
export function mesclarNomes(atuais: string[], novos: string[]): string[] {
  const resultado = [...atuais]
  for (const nome of novos) {
    if (resultado.length >= MAX_DIARISTAS) break
    if (!resultado.some((n) => n.toLowerCase() === nome.toLowerCase())) resultado.push(nome)
  }
  return resultado
}

interface Props {
  funcionariosDisponiveis: string[]
  funcionariosSelecionados: string[]
  onChangeFuncionarios: (nomes: string[]) => void
  diaristas: string[]
  onChangeDiaristas: (nomes: string[]) => void
  digitando: string
  onChangeDigitando: (texto: string) => void
}

export default function ParticipantesLimpeza({
  funcionariosDisponiveis,
  funcionariosSelecionados,
  onChangeFuncionarios,
  diaristas,
  onChangeDiaristas,
  digitando,
  onChangeDigitando,
}: Props) {
  const [aviso, setAviso] = useState('')

  const adicionar = (texto: string) => {
    const nomes = separarNomes(texto)
    if (nomes.length === 0) {
      onChangeDigitando('')
      return
    }
    const novos = mesclarNomes(diaristas, nomes)
    onChangeDiaristas(novos)
    onChangeDigitando('')
    setAviso(diaristas.length + nomes.length > MAX_DIARISTAS && novos.length === MAX_DIARISTAS ? `Limite de ${MAX_DIARISTAS} diaristas` : '')
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const valor = e.target.value
    // Vírgula (digitada ou colada) confirma o que veio antes dela; o resto continua no campo
    if (/[,;]/.test(valor)) {
      const ultima = Math.max(valor.lastIndexOf(','), valor.lastIndexOf(';'))
      adicionar(valor.slice(0, ultima + 1))
      onChangeDigitando(valor.slice(ultima + 1).trimStart())
      return
    }
    onChangeDigitando(valor)
  }

  return (
    <>
      <p className="-mt-2 text-sm text-gray-500">Opcional. Toque em quem ajudou na limpeza.</p>

      <div>
        <label className="mb-2 block text-[15px] font-bold text-gray-900">FUNCIONÁRIOS</label>
        {funcionariosDisponiveis.length > 0 ? (
          <ChoiceGrid
            mode="multi"
            options={funcionariosDisponiveis.map((nome, i) => ({
              value: nome,
              label: primeiroNome(nome),
              icon: (
                <span
                  className="flex h-8 w-8 items-center justify-center rounded-full text-[11px] font-bold text-white"
                  style={{ backgroundColor: AVATAR_CORES[i % AVATAR_CORES.length] }}
                >
                  {iniciais(nome)}
                </span>
              ),
            }))}
            values={funcionariosSelecionados}
            onChangeMulti={onChangeFuncionarios}
            cols={4}
            dataField="participantesFuncionarios"
          />
        ) : (
          <p className="text-sm text-gray-500">Nenhum funcionário neste aparelho.</p>
        )}
      </div>

      <div>
        <label htmlFor="diaristaNome" className="mb-2 block text-[15px] font-bold text-gray-900">
          DIARISTAS
        </label>
        <div className="flex gap-2">
          <input
            id="diaristaNome"
            type="text"
            value={digitando}
            onChange={handleChange}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                adicionar(digitando)
              }
            }}
            placeholder="Nome (ou vários separados por vírgula)"
            autoComplete="off"
            enterKeyHint="done"
            className="min-h-[52px] min-w-0 flex-1 rounded-xl border-2 border-gray-300 bg-white px-3 text-base text-gray-900"
          />
          <button
            type="button"
            onClick={() => adicionar(digitando)}
            disabled={!digitando.trim()}
            className="min-h-[52px] shrink-0 rounded-xl bg-brand-900 px-4 text-sm font-extrabold uppercase tracking-wide text-white transition-colors hover:bg-brand-800 active:scale-[0.99] disabled:opacity-40"
          >
            Adicionar
          </button>
        </div>
        <p className="mt-1.5 text-xs text-gray-500">
          Dica: ao digitar uma vírgula, o nome já é salvo e você segue para o próximo.
        </p>
        {aviso && <p className="mt-2 text-sm font-semibold text-amber-700">{aviso}</p>}
        {diaristas.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-2">
            {diaristas.map((nome) => (
              <span
                key={nome}
                className="flex min-h-[40px] items-center gap-1 rounded-xl border-2 border-green-500 bg-green-50 py-1 pl-3 pr-1 text-sm font-bold text-green-800"
              >
                {nome}
                <button
                  type="button"
                  onClick={() => onChangeDiaristas(diaristas.filter((n) => n !== nome))}
                  aria-label={`Remover ${nome}`}
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-lg leading-none text-green-800 hover:bg-green-100"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        )}
      </div>
    </>
  )
}
