import { ReactNode, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { RootState } from '../store/store'
import { getFazendaByAcessoId } from '../services/supabaseService'
import FarmLogo from './FarmLogo'

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
  const navigate = useNavigate()
  const { acessoId } = useSelector((state: RootState) => state.config)
  const [logoUrl, setLogoUrl] = useState<string | undefined>(undefined)

  // Buscar logoUrl diretamente do banco usando acessoId
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

  const handleBack = () => {
    if (onBack) {
      onBack()
    } else {
      navigate(-1)
    }
  }

  const handleRegistros = () => {
    navigate(`/caderneta/${cadernetaId}/lista`)
  }

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      {/* Header sticky com botões e título */}
      <div className="sticky top-0 z-10 bg-[#1a3a2a] text-white px-4 py-4">
        <div className="flex items-center justify-between">
          <button
            onClick={handleBack}
            className="text-yellow-400 font-bold text-sm min-h-[40px] px-3"
          >
            VOLTAR
          </button>
          <h1 className="text-base font-bold absolute left-1/2 -translate-x-1/2">{title}</h1>
          {showRegistrosButton && (
            <button
              onClick={handleRegistros}
              className="text-yellow-400 font-bold text-sm min-h-[40px] px-3 -mr-2"
            >
              REGISTROS
            </button>
          )}
          {!showRegistrosButton && <div className="w-[60px]" />}
        </div>
        {extraHeaderContent}
      </div>

      {/* Logos não sticky */}
      {showLogos && (
        <div className="bg-[#1a3a2a] text-white px-4 py-5">
          <div className="flex items-center justify-center gap-8">
            <FarmLogo type="both" size="medium" logoUrl={logoUrl} />
          </div>
        </div>
      )}

      {/* Conteúdo principal */}
      <main className="flex-1 p-4 flex flex-col gap-5 pb-8">
        {children}
      </main>
    </div>
  )
}
