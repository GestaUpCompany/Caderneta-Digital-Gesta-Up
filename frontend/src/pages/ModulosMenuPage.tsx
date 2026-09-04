import { useNavigate } from 'react-router-dom'
import { useState, useEffect, useMemo } from 'react'
import { CADERNETAS, CADERNETA_GRUPO_ORDEM, CADERNETA_GRUPO_CORES } from '../utils/constants'
import { useSelector } from 'react-redux'
import { RootState } from '../store/store'
import { getRecentCadernetas, addRecentCaderneta } from '../utils/recentCadernetas'
import { useProgramacaoHoje } from '../hooks/useProgramacaoHoje'
import { CalendarCheck, ChevronLeft } from 'lucide-react'
import { LOGO_URL, getFarmLogo } from '../utils/constants'

// Função helper para converter HEX para RGBA com opacidade
const hexToRgba = (hex: string, alpha: number = 0.25): string => {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

export default function ModulosMenuPage() {
  const navigate = useNavigate()
  const { fazenda, logoUrl, controleAcessoHabilitado, funcionarioCadernetas, fazendaId, acessoConfinamento } = useSelector((state: RootState) => state.config)
  const [searchTerm, setSearchTerm] = useState('')
  const [recentCadernetas, setRecentCadernetas] = useState<string[]>([])
  const [showScrollTop, setShowScrollTop] = useState(false)

  const rbacAtivo = controleAcessoHabilitado && funcionarioCadernetas.length > 0
  const { programacao, loading: programacaoLoading } = useProgramacaoHoje()

  const FAZENDA_INSUMOS = 'd649c65e-16ab-4b77-a84b-df937aa41cc3'
  // Cadernetas exclusivas de fazendas específicas: cadernetaId -> [fazendaIds permitidas]
  const CADERNETAS_EXCLUSIVAS: Record<string, string[]> = {
    'entrada-insumos': [FAZENDA_INSUMOS],
    'saida-insumos': [FAZENDA_INSUMOS],
  }
  const CADERNETAS_CONFINAMENTO = ['leitura-cocho', 'trato-confinamento', 'fabrica-confinamento']

  const cadernetasPermitidas = useMemo(() => {
    let lista = CADERNETAS

    // Filtro por fazenda (cadernetas exclusivas de fazendas específicas)
    lista = lista.filter(c => {
      const fazendasPermitidas = CADERNETAS_EXCLUSIVAS[c.id]
      if (!fazendasPermitidas) return true
      return fazendasPermitidas.includes(fazendaId)
    })

    // Filtro por módulo de confinamento
    if (!acessoConfinamento) {
      lista = lista.filter(c => !CADERNETAS_CONFINAMENTO.includes(c.id))
    }

    // Filtro RBAC (controle de acesso por funcionário)
    if (rbacAtivo) {
      const permitidas = new Set(funcionarioCadernetas)
      lista = lista.filter(c => permitidas.has(c.id))
    }

    return lista
  }, [rbacAtivo, funcionarioCadernetas, fazendaId, acessoConfinamento])

  useEffect(() => {
    setRecentCadernetas(getRecentCadernetas())
  }, [])

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 300) {
        setShowScrollTop(true)
      } else {
        setShowScrollTop(false)
      }
    }

    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    })
  }

  const filteredCaderas = cadernetasPermitidas.filter(caderneta =>
    caderneta.label.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const recentCadernetasData = recentCadernetas
    .map(id => cadernetasPermitidas.find(c => c.id === id))
    .filter((c): c is typeof CADERNETAS[0] => c !== undefined && c.disponivel)

  const handleCadernetaClick = (cadernetaId: string) => {
    const caderneta = CADERNETAS.find(c => c.id === cadernetaId)
    if (caderneta?.disponivel) {
      addRecentCaderneta(cadernetaId)
      setRecentCadernetas(getRecentCadernetas())
      navigate(`/caderneta/${cadernetaId}`)
    }
  }

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      {/* Header */}
      <header className="bg-gradient-to-b from-[#23503a] via-[#1d4030] to-[#1a3a2a] text-white shadow-[0_4px_20px_rgba(0,0,0,0.1)] relative">
        <div className="relative px-3 py-3 desktop-container">
          <button
            onClick={() => navigate('/')}
            className="absolute left-3 top-3 flex items-center gap-1.5 rounded-full bg-white/15 hover:bg-white/20 active:bg-white/25 transition-colors text-white text-xs font-semibold pl-2 pr-3 py-2 min-h-[40px]"
            aria-label="Voltar"
          >
            <ChevronLeft className="w-4 h-4" strokeWidth={2.5} />
            <span>Voltar</span>
          </button>

          {/* Título e subtítulo */}
          <div className="flex flex-col items-center">
            <div className="mt-2 flex items-baseline justify-center gap-1.5">
              <span className="text-2xl font-bold text-white leading-none">Manej'Us</span>
              <span className="text-2xl font-bold text-yellow-400 leading-none">360</span>
            </div>
            <p className="mt-1 text-sm font-semibold text-white/75 text-center tracking-wide">
              Gesta'Up
            </p>

            {/* Logos */}
            <div className="mt-4 flex items-center justify-center gap-3">
              <img
                src={LOGO_URL}
                alt="GestaUp"
                className="w-14 h-14 object-contain rounded-[22px]"
              />
              {fazenda && (
                <div className="rounded-[22px] overflow-hidden flex items-center justify-center h-14 w-auto max-w-[120px] bg-white/0">
                  <img
                    src={logoUrl && logoUrl.trim() !== '' ? logoUrl : getFarmLogo(fazenda)}
                    alt="Logo Fazenda"
                    className="h-14 w-auto max-w-[120px] object-contain"
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Botão de Programação de Hoje */}
      <div className="px-4 pt-4 desktop-container">
        <button
          onClick={() => navigate('/programacao-hoje')}
          className="w-full bg-[#1a3a2a] hover:bg-[#142b20] text-white font-bold py-3 px-4 rounded-xl shadow-md hover:shadow-lg transition-all duration-300 flex items-center justify-between"
        >
          <div className="flex items-center gap-3">
            <div className="bg-yellow-400 text-[#1a3a2a] p-2 rounded-lg">
              <CalendarCheck size={20} />
            </div>
            <div className="text-left">
              <p className="text-sm font-bold">Programação de hoje</p>
              <p className="text-xs text-gray-300">
                {programacaoLoading
                  ? 'Carregando...'
                  : programacao.length === 0
                  ? 'Nenhuma caderneta programada'
                  : `${programacao.length} caderneta${programacao.length > 1 ? 's' : ''} para hoje`}
              </p>
            </div>
          </div>
          <span className="text-yellow-400 text-xl">→</span>
        </button>
      </div>

      {/* Grid de Cadernetas - 6 botões grandes */}
      <main className="flex-1 p-4 flex flex-col gap-4 desktop-container">
        {/* Últimas Cadernetas Acessadas */}
        {recentCadernetasData.length > 0 && (
          <div className="bg-white rounded-2xl p-4 shadow-lg border border-gray-100">
            <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wide mb-3">ÚLTIMAS ACESSADAS</h2>
            <div className="grid grid-cols-3 gap-3">
              {recentCadernetasData.map((caderneta) => (
                <button
                  key={caderneta.id}
                  onClick={() => handleCadernetaClick(caderneta.id)}
                  style={{ backgroundColor: hexToRgba(CADERNETA_GRUPO_CORES[caderneta.grupo] || '#E5E7EB') }}
                  className="relative flex flex-col items-center justify-center gap-1 p-3 transition-all rounded-xl hover:scale-105 hover:shadow-md"
                >
                  <img
                    src={caderneta.icon}
                    alt={caderneta.label}
                    className="w-12 h-auto object-contain rounded-[16px]"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement
                      target.style.display = 'none'
                      const emoji = target.parentElement?.querySelector('.fallback-emoji') as HTMLElement
                      if (emoji) emoji.style.display = 'block'
                    }}
                  />
                  <span className="text-2xl fallback-emoji hidden">{caderneta.emoji}</span>
                  <span className="text-xs font-bold text-center leading-tight text-gray-900">
                    {caderneta.label}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Campo de Busca */}
        <div className="relative">
          <input
            type="text"
            placeholder="Buscar caderneta..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-4 py-3 pl-10 rounded-xl border border-gray-300 focus:border-[#3b82f6] focus:ring-2 focus:ring-[#3b82f6] focus:ring-opacity-50 outline-none transition-all"
          />
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        </div>

        {/* Cadernetas agrupadas por categoria */}
        {CADERNETA_GRUPO_ORDEM.map((grupoNome) => {
          const cadernetasDoGrupo = filteredCaderas.filter(c => c.grupo === grupoNome)
          if (cadernetasDoGrupo.length === 0) return null
          const corGrupo = CADERNETA_GRUPO_CORES[grupoNome] || '#6B7280'
          return (
            <div
              key={grupoNome}
              className="rounded-2xl p-4 shadow-lg border border-gray-100"
              style={{ backgroundColor: hexToRgba(corGrupo, 0.06) }}
            >
              <h2
                className="text-sm font-bold uppercase tracking-wide mb-3"
                style={{ color: corGrupo }}
              >
                {grupoNome}
              </h2>
              <div className="grid grid-cols-2 gap-4">
                {cadernetasDoGrupo.map((caderneta) => (
                  <button
                    key={caderneta.id}
                    onClick={() => handleCadernetaClick(caderneta.id)}
                    disabled={!caderneta.disponivel}
                    style={{ backgroundColor: hexToRgba(corGrupo, 0.2) }}
                    className={`caderneta-card relative flex flex-col items-center justify-center gap-2 p-4 transition-all rounded-2xl
                      ${caderneta.disponivel
                        ? 'hover:scale-105'
                        : 'opacity-50 cursor-not-allowed'
                      }`}
                  >
                    {!caderneta.disponivel && (
                      <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold px-3 py-1 rounded-full shadow-lg">
                        EM BREVE
                      </span>
                    )}
                    <img
                      src={caderneta.icon}
                      alt={caderneta.label}
                      className="w-40 h-auto object-contain rounded-[32px]"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement
                        target.style.display = 'none'
                        const emoji = target.parentElement?.querySelector('.fallback-emoji') as HTMLElement
                        if (emoji) emoji.style.display = 'block'
                      }}
                    />
                    <span className="text-5xl fallback-emoji hidden">{caderneta.emoji}</span>
                    <span className="text-base font-bold text-center leading-tight text-gray-900">
                      {caderneta.label}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )
        })}
      </main>

      {/* Botão voltar ao topo */}
      {showScrollTop && (
        <button
          onClick={scrollToTop}
          className="fixed bottom-6 right-6 w-12 h-12 bg-[#3b82f6] text-white rounded-full shadow-lg hover:bg-[#2563eb] transition-all duration-300 flex items-center justify-center z-50 hover:scale-110"
          aria-label="Voltar ao topo"
        >
          <svg
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 10l7-7m0 0l7 7m-7-7v18"
            />
          </svg>
        </button>
      )}
    </div>
  )
}
