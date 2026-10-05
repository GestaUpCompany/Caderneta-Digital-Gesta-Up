import { useNavigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { useSelector } from 'react-redux'
import { ChevronLeft, Search } from 'lucide-react'
import { RootState } from '../store/store'
import AppHeader from '../components/AppHeader'

// Funções para gerenciar últimos checklists acessados
const getRecentChecklists = (): string[] => {
  const stored = localStorage.getItem('recentChecklists')
  return stored ? JSON.parse(stored) : []
}

const addRecentChecklist = (checklistId: string) => {
  const recent = getRecentChecklists()
  const filtered = recent.filter((id: string) => id !== checklistId)
  const updated = [checklistId, ...filtered].slice(0, 3)
  localStorage.setItem('recentChecklists', JSON.stringify(updated))
}

export default function ChecklistsMenuPage() {
  const navigate = useNavigate()
  const { fazenda } = useSelector((state: RootState) => state.config)

  const [searchTerm, setSearchTerm] = useState('')
  const [recentChecklists, setRecentChecklists] = useState<string[]>([])

  useEffect(() => {
    setRecentChecklists(getRecentChecklists())
  }, [])

  const menuItems: any[] = []

  const filteredItems = menuItems.filter(item =>
    item.label.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const recentChecklistsData = recentChecklists
    .map(id => menuItems.find(i => i.id === id))
    .filter((item): item is typeof menuItems[0] => item !== undefined)

  const handleChecklistClick = (checklistId: string, path: string) => {
    addRecentChecklist(checklistId)
    setRecentChecklists(getRecentChecklists())
    navigate(path)
  }

  const hexToRgba = (hex: string, alpha: number = 0.25): string => {
    const r = parseInt(hex.slice(1, 3), 16)
    const g = parseInt(hex.slice(3, 5), 16)
    const b = parseInt(hex.slice(5, 7), 16)
    return `rgba(${r}, ${g}, ${b}, ${alpha})`
  }

  return (
    <div className="min-h-screen bg-surface flex flex-col">
      <AppHeader
        sticky
        title="Checklists"
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

      {/* Menu de Insumos */}
      <main className="flex-1 p-4 flex flex-col gap-4 desktop-container">
        {/* Últimos Checklists Acessados */}
        {recentChecklistsData.length > 0 && (
          <div className="app-card p-4">
            <h2 className="text-xs font-extrabold uppercase tracking-wider text-gray-400 mb-3">Últimos acessados</h2>
            <div className="grid grid-cols-3 gap-3">
              {recentChecklistsData.map((item) => (
                <button
                  key={item.id}
                  onClick={() => handleChecklistClick(item.id, item.path)}
                  style={{ backgroundColor: hexToRgba(item.color) }}
                  className="relative flex flex-col items-center justify-center gap-1 p-3 transition-all rounded-xl hover:scale-105 hover:shadow-md"
                >
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
                  <span className="text-xs font-bold text-center leading-tight text-gray-900">
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
            placeholder="Buscar checklist..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-4 py-3 pl-11 rounded-xl bg-white border border-gray-200 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/30 outline-none transition-all"
          />
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        </div>

        {/* Grid de Checklists */}
        {filteredItems.length === 0 ? (
          <div className="app-card p-8 text-center animate-fade-in">
            <div className="w-16 h-16 bg-brand-50 border border-brand-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-brand-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
              </svg>
            </div>
            <p className="text-xl font-extrabold text-gray-900 mb-2">
              Checklists em desenvolvimento
            </p>
            <p className="text-sm text-gray-600 leading-relaxed">
              Estamos trabalhando para disponibilizar essa funcionalidade em breve.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-6">
            {filteredItems.map((item) => (
              <button
                key={item.id}
                onClick={() => handleChecklistClick(item.id, item.path)}
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
                ) : (
                  <span className="text-5xl">{item.emoji}</span>
                )}
                <span className="text-base font-bold text-center leading-tight text-gray-900">
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
