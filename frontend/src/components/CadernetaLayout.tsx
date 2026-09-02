import { ReactNode, useEffect, useState } from 'react'
import { useSelector } from 'react-redux'
import { RootState } from '../store/store'
import { getFazendaByAcessoId } from '../services/supabaseService'
import FarmLogo from './FarmLogo'
import CadernetaHeader from './CadernetaHeader'
import { useExecucaoRotina } from '../hooks/useExecucaoRotina'

interface CadernetaLayoutProps {
  title: string
  cadernetaId: string
  children: ReactNode
  showLogos?: boolean
  showRegistrosButton?: boolean
  onBack?: () => void
  extraHeaderContent?: ReactNode
  dateContent?: ReactNode
  centerContent?: ReactNode
  leftContent?: ReactNode
  rightContent?: ReactNode
  bottomContent?: ReactNode
}

export default function CadernetaLayout({
  title,
  cadernetaId,
  children,
  showLogos = false,
  showRegistrosButton = true,
  onBack,
  extraHeaderContent,
  dateContent,
  centerContent,
  leftContent,
  rightContent,
  bottomContent,
}: CadernetaLayoutProps) {
  const { acessoId, fazenda } = useSelector((state: RootState) => state.config)
  const [logoUrl, setLogoUrl] = useState<string | undefined>(undefined)
  const { garantirExecucao } = useExecucaoRotina()

  useEffect(() => {
    garantirExecucao(cadernetaId)
  }, [cadernetaId, garantirExecucao])

  useEffect(() => {
    async function fetchLogoUrl() {
      if (!acessoId) {
        return
      }

      try {
        const fazenda = await getFazendaByAcessoId(acessoId)
        if (fazenda?.logo_url) {
          setLogoUrl(fazenda.logo_url)
        }
      } catch (error) {
        console.error('[CadernetaLayout] Error fetching fazenda:', error)
      }
    }

    fetchLogoUrl()
  }, [acessoId])

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      <CadernetaHeader
        title={title}
        cadernetaId={cadernetaId}
        onBack={onBack}
        showRegistros={showRegistrosButton}
        extraHeaderContent={extraHeaderContent}
        dateContent={dateContent}
        centerContent={centerContent}
        leftContent={leftContent}
        rightContent={rightContent}
      />

      {/* Logos não sticky */}
      {showLogos && (
        <div className="bg-gradient-to-b from-[#1a3a2a] to-[#163b2b] text-white px-4 py-5 border-b border-white/5">
          <div className="flex items-center justify-center gap-8 desktop-form-container">
            <FarmLogo type="both" size="medium" logoUrl={logoUrl} farmName={fazenda} />
          </div>
        </div>
      )}

      {/* Conteúdo principal */}
      <main className={`flex-1 p-4 flex flex-col gap-5 desktop-form-container ${bottomContent ? 'pb-80' : 'pb-8'}`}>
        {children}
      </main>

      {bottomContent && (
        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-gray-200 bg-white px-4 pt-3 shadow-[0_-8px_24px_rgba(0,0,0,0.12)] pb-[env(safe-area-inset-bottom)]">
          <div className="desktop-form-container">
            {bottomContent}
          </div>
        </div>
      )}
    </div>
  )
}
