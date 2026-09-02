import { ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft, ClipboardList } from 'lucide-react'
import { LOGO_URL } from '../utils/constants'

interface CadernetaHeaderProps {
  title: string
  cadernetaId?: string
  onBack?: () => void
  showRegistros?: boolean
  extraHeaderContent?: ReactNode
  dateContent?: ReactNode
  centerContent?: ReactNode
  leftContent?: ReactNode
  rightContent?: ReactNode
  className?: string
}

export default function CadernetaHeader({
  title,
  cadernetaId,
  onBack,
  showRegistros = true,
  extraHeaderContent,
  dateContent,
  centerContent,
  leftContent,
  rightContent,
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
      className={`sticky top-0 z-20 bg-gradient-to-b from-[#23503a] via-[#1d4030] to-[#1a3a2a] text-white shadow-[0_4px_20px_rgba(0,0,0,0.16)] ${className}`}
    >
      <div className="px-4 py-3 desktop-form-container">
        <div className="relative flex h-12 items-center justify-center">
          <button
            onClick={handleBack}
            className="absolute left-0 flex h-10 !min-h-0 !min-w-0 items-center gap-1 rounded-full bg-white/10 px-3 text-sm font-semibold transition-colors hover:bg-white/20 active:bg-white/25"
            aria-label="Voltar"
          >
            <ChevronLeft className="h-5 w-5" strokeWidth={2.5} />
            <span>Voltar</span>
          </button>

          <div className="flex min-w-0 items-center justify-center gap-3 overflow-hidden">
            {leftContent || centerContent || (
              <img
                src={LOGO_URL}
                alt="GestaUp"
                className="h-11 w-11 shrink-0 rounded-xl object-contain shadow-lg shadow-black/10"
              />
            )}
          </div>

          <div className="absolute right-0 flex shrink-0 items-center gap-2">
            {rightContent && (
              <div className="flex min-w-0 items-center gap-2">
                {rightContent}
              </div>
            )}

            {showRegistros && cadernetaId ? (
              <button
                onClick={handleRegistros}
                className="flex h-10 !min-h-0 !min-w-0 items-center gap-1.5 rounded-full bg-white/10 px-3 text-sm font-semibold transition-colors hover:bg-white/20 active:bg-white/25"
                aria-label="Registros"
              >
                <ClipboardList className="h-5 w-5" strokeWidth={2.3} />
                <span>Registros</span>
              </button>
            ) : (
              <div className="w-10" aria-hidden />
            )}
          </div>
        </div>

        <div className="mt-3 flex items-center justify-between gap-2">
          <h1 className="min-w-0 whitespace-nowrap text-lg font-extrabold leading-tight tracking-tight">{title}</h1>
          {dateContent && <div className="shrink-0">{dateContent}</div>}
        </div>

        {extraHeaderContent}
      </div>
    </header>
  )
}
