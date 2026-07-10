import { useNavigate } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { RootState } from '../store/store'
import { useProgramacaoHoje } from '../hooks/useProgramacaoHoje'
import { useChecklistAtivo } from '../hooks/useChecklistAtivo'
import { CADERNETAS } from '../utils/constants'
import { formatarHorario } from '../utils/rotinas'
import FarmLogo from '../components/FarmLogo'
import { Clock } from 'lucide-react'

const hexToRgba = (hex: string, alpha: number = 0.25): string => {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

export default function ProgramacaoHojePage() {
  const navigate = useNavigate()
  const { fazenda, logoUrl, funcionarioNome } = useSelector((state: RootState) => state.config)
  const { programacao, horarios, loading, refresh } = useProgramacaoHoje()

  const programacaoMap = new Map(programacao.map((id) => [id, true]))
  const cadernetasProgramadas = CADERNETAS.filter(
    (c) => c.disponivel && programacaoMap.has(c.id)
  )

  const handleCadernetaClick = (cadernetaId: string) => {
    navigate(`/caderneta/${cadernetaId}`)
  }

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      {/* Header */}
      <header className="bg-[#1a3a2a] text-white py-6 border-b-4 border-yellow-400 relative">
        <div className="flex flex-col items-center gap-3 px-4">
          <div className="flex items-center justify-between w-full">
            <FarmLogo
              farmName={fazenda}
              logoUrl={logoUrl}
              type="both"
              size="medium"
              className="justify-between w-full"
            />
          </div>
          <div className="flex items-center gap-3 w-full relative">
            <button
              onClick={() => navigate('/modulos/cadernetas')}
              className="text-yellow-400 font-bold text-sm min-h-[40px] px-3 absolute left-0"
            >
              VOLTAR
            </button>
            <p className="text-white text-base font-semibold flex-1 text-center">PROGRAMAÇÃO DE HOJE</p>
          </div>
        </div>
      </header>

      <main className="flex-1 p-4 flex flex-col gap-4">
        {/* Data e funcionário */}
        <div className="bg-white rounded-2xl p-4 shadow-lg border border-gray-100">
          <p className="text-sm text-gray-500 uppercase tracking-wide font-bold">Data</p>
          <p className="text-lg font-bold text-gray-900">
            {new Date().toLocaleDateString('pt-BR', {
              weekday: 'long',
              day: '2-digit',
              month: 'long',
              year: 'numeric',
            })}
          </p>
          {funcionarioNome && (
            <p className="text-sm text-gray-600 mt-1">
              Funcionário: <span className="font-semibold">{funcionarioNome}</span>
            </p>
          )}
        </div>

        {/* Lista de cadernetas programadas */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-12 gap-3">
            <div className="animate-spin h-8 w-8 border-4 border-green-600 border-t-transparent rounded-full" />
            <p className="text-gray-600 font-medium">Carregando programação...</p>
          </div>
        ) : cadernetasProgramadas.length === 0 ? (
          <div className="bg-white rounded-2xl p-8 shadow-lg border border-gray-100 text-center">
            <p className="text-5xl mb-4">📋</p>
            <p className="text-lg font-bold text-gray-900 mb-2">Nenhuma caderneta programada</p>
            <p className="text-sm text-gray-600">
              Não há cadernetas na sua rotina para hoje.
            </p>
            <button
              onClick={refresh}
              className="mt-4 text-green-600 font-semibold text-sm underline"
            >
              Atualizar
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            {cadernetasProgramadas.map((caderneta) => (
              <CadernetaProgramada
                key={caderneta.id}
                caderneta={caderneta}
                horario={formatarHorario(horarios[caderneta.id])}
                onClick={() => handleCadernetaClick(caderneta.id)}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  )
}

interface CadernetaProgramadaProps {
  caderneta: (typeof CADERNETAS)[0]
  horario: string | null
  onClick: () => void
}

function CadernetaProgramada({ caderneta, horario, onClick }: CadernetaProgramadaProps) {
  const { ativo: checklistAtivo, loading: checklistLoading } = useChecklistAtivo(caderneta.id)

  return (
    <button
      onClick={onClick}
      style={{ backgroundColor: hexToRgba(caderneta.color || '#E5E7EB') }}
      className="relative flex flex-col items-center justify-center gap-2 p-4 transition-all rounded-2xl hover:scale-105 hover:shadow-lg"
    >
      {checklistLoading ? (
        <div className="absolute top-2 right-2">
          <div className="animate-spin h-4 w-4 border-2 border-green-600 border-t-transparent rounded-full" />
        </div>
      ) : checklistAtivo ? (
        <span className="absolute -top-2 -right-2 bg-green-500 text-white text-xs font-bold px-3 py-1 rounded-full shadow-lg">
          CHECKLIST
        </span>
      ) : null}
      <img
        src={caderneta.icon}
        alt={caderneta.label}
        className="w-24 h-auto object-contain rounded-[24px]"
        onError={(e) => {
          const target = e.target as HTMLImageElement
          target.style.display = 'none'
          const emoji = target.parentElement?.querySelector('.fallback-emoji') as HTMLElement
          if (emoji) emoji.style.display = 'block'
        }}
      />
      <span className="text-4xl fallback-emoji hidden">{caderneta.emoji}</span>
      <span className="text-sm font-bold text-center leading-tight text-gray-900">
        {caderneta.label}
      </span>
      {horario && (
        <span className="flex items-center gap-1 text-xs text-gray-700 font-semibold bg-white/60 px-2 py-1 rounded-full">
          <Clock size={12} />
          {horario}
        </span>
      )}
      {checklistAtivo && !checklistLoading && (
        <span className="text-xs text-green-700 font-semibold">Checklist ativo</span>
      )}
    </button>
  )
}
