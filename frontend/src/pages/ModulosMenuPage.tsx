import { useNavigate } from 'react-router-dom'
import { useState, useEffect, useMemo } from 'react'
import { CADERNETAS, CADERNETA_GRUPO_ORDEM, CADERNETA_GRUPO_CORES } from '../utils/constants'
import { useSelector } from 'react-redux'
import { RootState } from '../store/store'
import { getRecentCadernetas, addRecentCaderneta } from '../utils/recentCadernetas'
import { useProgramacaoHoje } from '../hooks/useProgramacaoHoje'
import { CalendarCheck, ChevronLeft, ChevronRight, Search, ArrowUp } from 'lucide-react'
import AppHeader from '../components/AppHeader'
import { getFazendasDoMesmoGrupoCached } from '../services/cadastroCache'

// Função helper para converter HEX para RGBA com opacidade
const hexToRgba = (hex: string, alpha: number = 0.25): string => {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

export default function ModulosMenuPage() {
  const navigate = useNavigate()
  const { fazenda, fazendaId, controleAcessoHabilitado, funcionarioCadernetas, acessoConfinamento, acessoComercial } = useSelector((state: RootState) => state.config)
  const [searchTerm, setSearchTerm] = useState('')
  const [recentCadernetas, setRecentCadernetas] = useState<string[]>([])
  const [showScrollTop, setShowScrollTop] = useState(false)
  const [temFazendaNoGrupo, setTemFazendaNoGrupo] = useState(false)

  const rbacAtivo = controleAcessoHabilitado && funcionarioCadernetas.length > 0
  const { programacao, loading: programacaoLoading } = useProgramacaoHoje()

  const CADERNETAS_CONFINAMENTO = ['leitura-cocho', 'trato-confinamento', 'fabrica-confinamento']
  const CADERNETAS_COMERCIAL = ['comunicado-venda', 'comunicado-compra', 'recebimento-compra', 'comunicado-transferencia']

  // Transferência só existe entre fazendas do mesmo grupo (2+ fazendas ativas)
  useEffect(() => {
    if (!fazendaId) return
    getFazendasDoMesmoGrupoCached(fazendaId)
      .then((lista) => setTemFazendaNoGrupo((lista || []).length > 0))
      .catch(() => setTemFazendaNoGrupo(false))
  }, [fazendaId])

  const cadernetasPermitidas = useMemo(() => {
    let lista = CADERNETAS

    // Filtro por módulo de confinamento
    if (!acessoConfinamento) {
      lista = lista.filter(c => !CADERNETAS_CONFINAMENTO.includes(c.id))
    }

    // Filtro por módulo comercial (feature flag por fazenda)
    if (!acessoComercial) {
      lista = lista.filter(c => !CADERNETAS_COMERCIAL.includes(c.id))
    }

    // Transferência exige outra fazenda ativa no mesmo grupo
    if (!temFazendaNoGrupo) {
      lista = lista.filter(c => c.id !== 'comunicado-transferencia')
    }

    // Filtro RBAC (controle de acesso por funcionário)
    if (rbacAtivo) {
      const permitidas = new Set(funcionarioCadernetas)
      lista = lista.filter(c => permitidas.has(c.id))
    }

    return lista
  }, [rbacAtivo, funcionarioCadernetas, acessoConfinamento, acessoComercial, temFazendaNoGrupo])

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
    <div className="min-h-screen bg-surface flex flex-col">
      <AppHeader
        sticky
        title="Cadernetas"
        subtitle={
          fazenda
            ? fazenda.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ')
            : undefined
        }
        left={
          <button onClick={() => navigate('/')} className="header-chip pl-2" aria-label="Voltar">
            <ChevronLeft className="w-4 h-4" strokeWidth={2.5} />
            <span>Voltar</span>
          </button>
        }
      />

      <main className="flex-1 p-4 flex flex-col gap-5 desktop-container">
        {/* Programação de hoje */}
        <button
          onClick={() => navigate('/programacao-hoje')}
          className="app-card w-full p-3.5 flex items-center gap-3 text-left transition-transform active:scale-[0.98]"
        >
          <div className="w-11 h-11 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center flex-shrink-0">
            <CalendarCheck className="w-5 h-5 text-amber-600" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-gray-900">Programação de hoje</p>
            <p className="text-xs text-gray-500 mt-0.5">
              {programacaoLoading
                ? 'Carregando...'
                : programacao.length === 0
                ? 'Nenhuma caderneta programada'
                : `${programacao.length} caderneta${programacao.length > 1 ? 's' : ''} para hoje`}
            </p>
          </div>
          <ChevronRight className="w-5 h-5 text-gray-400 flex-shrink-0" />
        </button>

        {/* Últimas Cadernetas Acessadas */}
        {recentCadernetasData.length > 0 && (
          <div className="app-card p-4">
            <h2 className="text-xs font-extrabold uppercase tracking-wider text-gray-400 mb-3">Últimas acessadas</h2>
            <div className="grid grid-cols-3 gap-2.5">
              {recentCadernetasData.map((caderneta) => {
                const corRecente = CADERNETA_GRUPO_CORES[caderneta.grupo] || '#6B7280'
                return (
                  <button
                    key={caderneta.id}
                    onClick={() => handleCadernetaClick(caderneta.id)}
                    style={{
                      backgroundColor: hexToRgba(corRecente, 0.07),
                      borderColor: hexToRgba(corRecente, 0.18),
                    }}
                    className="relative flex flex-col items-center justify-center gap-1.5 p-3 rounded-xl border transition-transform active:scale-95"
                  >
                    <img
                      src={caderneta.icon}
                      alt={caderneta.label}
                      className="w-12 h-12 object-contain rounded-xl"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement
                        target.style.display = 'none'
                        const emoji = target.parentElement?.querySelector('.fallback-emoji') as HTMLElement
                        if (emoji) emoji.style.display = 'block'
                      }}
                    />
                    <span className="text-2xl fallback-emoji hidden">{caderneta.emoji}</span>
                    <span className="text-[11px] font-bold text-center leading-tight text-gray-800">
                      {caderneta.label}
                    </span>
                  </button>
                )
              })}
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
            className="w-full px-4 py-3 pl-11 rounded-xl bg-white border border-gray-200 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/30 outline-none transition-all"
          />
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        </div>

        {/* Cadernetas agrupadas por categoria */}
        {CADERNETA_GRUPO_ORDEM.map((grupoNome) => {
          const cadernetasDoGrupo = filteredCaderas.filter(c => c.grupo === grupoNome)
          if (cadernetasDoGrupo.length === 0) return null
          const corGrupo = CADERNETA_GRUPO_CORES[grupoNome] || '#6B7280'
          return (
            <div key={grupoNome}>
              <h2 className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider mb-3 px-0.5" style={{ color: corGrupo }}>
                <span className="w-1 h-3.5 rounded-full flex-shrink-0" style={{ backgroundColor: corGrupo }} />
                {grupoNome}
                <span className="flex-1 h-px bg-gray-200" />
              </h2>
              <div className="grid grid-cols-2 gap-3">
                {cadernetasDoGrupo.map((caderneta) => (
                  <button
                    key={caderneta.id}
                    onClick={() => handleCadernetaClick(caderneta.id)}
                    disabled={!caderneta.disponivel}
                    className={`app-card relative flex flex-col items-center justify-center gap-2 p-4 min-h-[124px] transition-transform
                      ${caderneta.disponivel
                        ? 'active:scale-[0.97]'
                        : 'opacity-50 cursor-not-allowed'
                      }`}
                  >
                    {!caderneta.disponivel && (
                      <span className="absolute top-2 right-2 bg-gray-100 text-gray-500 border border-gray-200 text-[10px] font-bold px-2 py-0.5 rounded-full">
                        EM BREVE
                      </span>
                    )}
                    <img
                      src={caderneta.icon}
                      alt={caderneta.label}
                      className="w-16 h-16 object-contain rounded-2xl"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement
                        target.style.display = 'none'
                        const emoji = target.parentElement?.querySelector('.fallback-emoji') as HTMLElement
                        if (emoji) emoji.style.display = 'block'
                      }}
                    />
                    <span className="text-3xl fallback-emoji hidden">{caderneta.emoji}</span>
                    <span className="text-xs font-bold text-center leading-tight text-gray-800">
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
          className="fixed bottom-6 right-6 w-11 h-11 min-h-0 min-w-0 bg-white border border-gray-200 text-brand-800 rounded-full shadow-md transition-transform flex items-center justify-center z-50 active:scale-95"
          aria-label="Voltar ao topo"
        >
          <ArrowUp className="w-5 h-5" strokeWidth={2.5} />
        </button>
      )}
    </div>
  )
}
