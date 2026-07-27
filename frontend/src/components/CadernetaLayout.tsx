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
}

export default function CadernetaLayout({
  title,
  cadernetaId,
  children,
  showLogos = true,
  showRegistrosButton = true,
  onBack,
  extraHeaderContent,
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
      />

      {/* Logos não sticky */}
      {showLogos && (
        <div className="bg-[#1a3a2a] text-white px-4 py-5 border-b border-white/5">
          <div className="flex items-center justify-center gap-8 desktop-form-container">
            <FarmLogo type="both" size="medium" logoUrl={logoUrl} farmName={fazenda} />
          </div>
        </div>
      )}

      {/* Conteúdo principal */}
      <main className="flex-1 p-4 flex flex-col gap-5 pb-8 desktop-form-container">
        {children}
      </main>
    </div>
  )
}
