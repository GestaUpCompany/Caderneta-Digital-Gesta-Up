import { useNavigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { useSelector } from 'react-redux'
import { ChevronLeft } from 'lucide-react'
import { RootState } from '../store/store'
import { LOGO_URL, getFarmLogo } from '../utils/constants'

// Função helper para converter HEX para RGBA com opacidade
const hexToRgba = (hex: string, alpha: number = 0.25): string => {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

// Funções para gerenciar últimos relatórios acessados
const getRecentRelatorios = (): string[] => {
  const stored = localStorage.getItem('recentRelatorios')
  return stored ? JSON.parse(stored) : []
}

const addRecentRelatorio = (relatorioId: string) => {
  const recent = getRecentRelatorios()
  const filtered = recent.filter((id: string) => id !== relatorioId)
  const updated = [relatorioId, ...filtered].slice(0, 3)
  localStorage.setItem('recentRelatorios', JSON.stringify(updated))
}

const BASE = import.meta.env.BASE_URL

export default function RelatoriosPage() {
  const navigate = useNavigate()
  const { fazenda, logoUrl } = useSelector((state: RootState) => state.config)

  const [searchTerm, setSearchTerm] = useState('')
  const [recentRelatorios, setRecentRelatorios] = useState<string[]>([])

  useEffect(() => {
    setRecentRelatorios(getRecentRelatorios())
  }, [])

  const menuItems: any[] = [
    {
      id: 'lote',
      label: 'Relatório de Lote',
      color: '#3b82f6',
      path: '/modulos/relatorios/lote',
      icon: `${BASE}cadernetas/relatorio-lote.png`,
    },
  ]

  const filteredItems = menuItems.filter(item =>
    item.label.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const recentRelatoriosData = recentRelatorios
    .map(id => menuItems.find(i => i.id === id))
    .filter((item): item is typeof menuItems[0] => item !== undefined)

  const handleRelatorioClick = (relatorioId: string, path: string) => {
    addRecentRelatorio(relatorioId)
    setRecentRelatorios(getRecentRelatorios())
    navigate(path)
  }

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-20 bg-gradient-to-b from-[#23503a] via-[#1d4030] to-[#1a3a2a] text-white shadow-[0_4px_20px_rgba(0,0,0,0.1)]">
        <div className="relative px-3 py-3 desktop-container">
          <button
            onClick={() => navigate('/')}
            className="absolute left-3 top-3 flex items-center gap-1.5 rounded-full bg-white/15 hover:bg-white/20 active:bg-white/25 transition-colors text-white text-xs font-semibold pl-2 pr-3 py-2 min-h-[40px] backdrop-blur-sm"
            aria-label="Voltar"
          >
            <ChevronLeft className="w-4 h-4" strokeWidth={2.5} />
            <span>Voltar</span>
          </button>

          <div className="flex flex-col items-center">
            <h1 className="mt-2 text-lg font-bold leading-tight tracking-tight text-center tracking-wide">
              RELATÓRIOS
            </h1>
            <p className="mt-1 text-sm font-semibold text-white/75 text-center tracking-wide">
              Gesta'Up
            </p>

            <div className="mt-4 flex items-center justify-center gap-3">
              <img
                src={LOGO_URL}
                alt="GestaUp"
                className="w-14 h-14 object-contain rounded-[22px]"
              />
              {fazenda && (
                <div className="rounded-[12px] overflow-hidden flex items-center justify-center h-14 w-auto max-w-[120px] bg-white/0">
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

      {/* Grid de Relatórios */}
      <main className="flex-1 p-4 flex flex-col gap-4 desktop-container">
        {/* Últimos Relatórios Acessados */}
        {recentRelatoriosData.length > 0 && (
          <div className="bg-white rounded-2xl p-4 shadow-lg border border-gray-100">
            <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wide mb-3">ÚLTIMOS ACESSADOS</h2>
            <div className="grid grid-cols-2 gap-3">
              {recentRelatoriosData.map((item) => (
                <button
                  key={item.id}
                  onClick={() => handleRelatorioClick(item.id, item.path)}
                  style={{ backgroundColor: hexToRgba(item.color) }}
                  className="relative flex flex-col items-center justify-center gap-1.5 p-4 transition-all rounded-xl hover:scale-105 hover:shadow-md min-h-[88px]"
                >
                  {item.icon ? (
                    <>
                      <img
                        src={item.icon}
                        alt={item.label}
                        className="w-12 h-auto object-contain rounded-[16px]"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement
                          target.style.display = 'none'
                          const emoji = target.parentElement?.querySelector('.fallback-emoji') as HTMLElement
                          if (emoji) emoji.style.display = 'block'
                        }}
                      />
                      <span className="text-2xl fallback-emoji hidden">{item.emoji}</span>
                    </>
                  ) : item.emoji ? (
                    <span className="text-2xl">{item.emoji}</span>
                  ) : null}
                  <span className="text-sm font-bold text-center leading-snug text-gray-900 px-1">
                    {item.label}
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
            placeholder="Buscar relatório..."
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

        {/* Grid de Relatórios */}
        {filteredItems.length === 0 ? (
          <div className="bg-gradient-to-br from-purple-50 to-indigo-100 border-2 border-purple-300 rounded-3xl p-8 text-center shadow-lg animate-fade-in">
            <div className="w-20 h-20 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-10 h-10 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <p className="text-2xl font-bold text-purple-900 mb-3">
              Relatórios em desenvolvimento!
            </p>
            <p className="text-base text-gray-700 leading-relaxed">
              Estamos trabalhando para disponibilizar essa funcionalidade em breve.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-6">
            {filteredItems.map((item) => (
              <button
                key={item.id}
                onClick={() => handleRelatorioClick(item.id, item.path)}
                style={{ backgroundColor: hexToRgba(item.color) }}
                className="relative flex flex-col items-center justify-center gap-2 p-4 transition-all rounded-2xl hover:scale-105"
              >
                {item.icon ? (
                  <>
                    <img
                      src={item.icon}
                      alt={item.label}
                      className="w-40 h-auto object-contain rounded-[32px]"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement
                        target.style.display = 'none'
                        const emoji = target.parentElement?.querySelector('.fallback-emoji') as HTMLElement
                        if (emoji) emoji.style.display = 'block'
                      }}
                    />
                    <span className="text-5xl fallback-emoji hidden">{item.emoji}</span>
                  </>
                ) : item.emoji ? (
                  <span className="text-5xl">{item.emoji}</span>
                ) : null}
                <span className="text-base font-bold text-center leading-snug text-gray-900 px-2">
                  {item.label}
                </span>
              </button>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
