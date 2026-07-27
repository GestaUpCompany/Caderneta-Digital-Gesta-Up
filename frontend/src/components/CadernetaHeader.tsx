import { ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft, ClipboardList } from 'lucide-react'

interface CadernetaHeaderProps {
  title: string
  cadernetaId?: string
  onBack?: () => void
  showRegistros?: boolean
  extraHeaderContent?: ReactNode
  className?: string
}

export default function CadernetaHeader({
  title,
  cadernetaId,
  onBack,
  showRegistros = true,
  extraHeaderContent,
  className = '',
}: CadernetaHeaderProps) {
  const navigate = useNavigate()

  const handleBack = () => {
    if (onBack) {
      onBack()
    } else {
      navigate(-1)
    }
  }

  const handleRegistros = () => {
    if (cadernetaId) {
      navigate(`/caderneta/${cadernetaId}/lista`)
    }
  }

  return (
    <header
      className={`sticky top-0 z-20 bg-gradient-to-b from-[#23503a] via-[#1d4030] to-[#1a3a2a] text-white shadow-[0_4px_20px_rgba(0,0,0,0.1)] ${className}`}
    >
      <div className="px-3 py-3 desktop-form-container">
        <div className="flex items-center justify-between gap-2">
          <button
            onClick={handleBack}
            className="flex items-center gap-1.5 rounded-full bg-white/15 hover:bg-white/20 active:bg-white/25 transition-colors text-white text-xs font-semibold pl-2 pr-3 py-2 min-h-[40px] backdrop-blur-sm"
            aria-label="Voltar"
          >
            <ChevronLeft className="w-4 h-4" strokeWidth={2.5} />
            <span>Voltar</span>
          </button>

          {showRegistros && cadernetaId ? (
            <button
              onClick={handleRegistros}
              className="flex items-center gap-1.5 rounded-full bg-white/15 hover:bg-white/20 active:bg-white/25 transition-colors text-white text-xs font-semibold px-3 py-2 min-h-[40px] backdrop-blur-sm"
              aria-label="Registros"
            >
              <ClipboardList className="w-4 h-4" strokeWidth={2.5} />
              <span>Registros</span>
            </button>
          ) : (
            <div className="w-[92px]" aria-hidden />
          )}
        </div>

        <h1 className="mt-2 text-lg font-bold leading-tight tracking-tight text-center truncate tracking-wide">{title}</h1>

        {extraHeaderContent}
      </div>
    </header>
  )
}
