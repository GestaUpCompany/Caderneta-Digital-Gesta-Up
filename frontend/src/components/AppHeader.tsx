import { ReactNode } from 'react'
import { LOGO_URL } from '../utils/constants'

interface AppHeaderProps {
  title: ReactNode
  subtitle?: ReactNode
  /** Conteúdo do chip esquerdo (ex.: botão Voltar). Omitir na Home. */
  left?: ReactNode
  /** Conteúdo do chip direito (ex.: engrenagem de configurações, ação contextual). */
  right?: ReactNode
  /** Elemento à direita da linha do título (ex.: chip de data, no padrão das cadernetas). */
  titleExtra?: ReactNode
  /**
   * centered: logo centralizado entre chips + linha de título abaixo (telas internas, padrão referência).
   * start: logo à esquerda com título/subtítulo ao lado em linha única (home, padrão "profile bar").
   */
  variant?: 'centered' | 'start'
  sticky?: boolean
}

export default function AppHeader({ title, subtitle, left, right, titleExtra, variant = 'centered', sticky = false }: AppHeaderProps) {
  return (
    <header
      className={`${sticky ? 'sticky top-0 z-20 ' : ''}bg-gradient-to-b from-brand-700 via-brand-800 to-brand-900 text-white shadow-[0_2px_12px_rgba(0,0,0,0.15)]`}
    >
      <div className="px-3 py-3 desktop-container">
        {variant === 'start' ? (
          <div className="flex items-center gap-3 min-h-[48px]">
            {left}
            <div className="w-10 h-10 rounded-xl bg-white/95 p-1 shadow-sm flex items-center justify-center flex-shrink-0">
              <img src={LOGO_URL} alt="Manej'Us 360" className="w-full h-full object-contain" />
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-[15px] font-bold leading-snug">{title}</h1>
              {subtitle && (
                <p className="text-[11px] font-medium text-white/70 mt-0.5 truncate">{subtitle}</p>
              )}
            </div>
            {titleExtra}
            {right}
          </div>
        ) : (
          <>
            <div className="relative flex items-center justify-center min-h-[44px]">
              {left && <div className="absolute left-0 top-1/2 -translate-y-1/2">{left}</div>}
              <div className="w-11 h-11 rounded-2xl bg-white/95 p-1 shadow-sm flex items-center justify-center">
                <img src={LOGO_URL} alt="Manej'Us 360" className="w-full h-full object-contain" />
              </div>
              {right && <div className="absolute right-0 top-1/2 -translate-y-1/2">{right}</div>}
            </div>
            <div className="mt-2.5 relative flex items-end justify-center gap-3">
              <div className="min-w-0 text-center">
                <h1 className="text-lg font-extrabold uppercase tracking-wide leading-tight">{title}</h1>
                {subtitle && (
                  <p className="text-xs font-semibold text-white/70 mt-0.5 truncate">{subtitle}</p>
                )}
              </div>
              {titleExtra && <div className="absolute right-0 bottom-0">{titleExtra}</div>}
            </div>
          </>
        )}
      </div>
    </header>
  )
}
