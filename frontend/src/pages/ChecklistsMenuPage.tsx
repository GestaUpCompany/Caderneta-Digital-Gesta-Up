import { useNavigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { useSelector } from 'react-redux'
import { RootState } from '../store/store'
import FarmLogo from '../components/FarmLogo'

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
    <div className="min-h-screen bg-gray-100 flex flex-col">
      {/* Header */}
      <header className="bg-[#1a3a2a] text-white py-6 border-b-4 border-yellow-400 relative">
        <div className="flex flex-col items-center gap-3 px-4">
          <div className="flex items-center justify-between w-full">
            <FarmLogo
              farmName={fazenda}
              type="both"
              size="medium"
              className="justify-between w-full"
            />
          </div>
          {fazenda && (
            <h1 className="text-2xl font-bold text-white">{fazenda.toUpperCase()}</h1>
          )}
          <div className="flex items-center gap-3 w-full relative">
            <button
              onClick={() => navigate('/')}
              className="text-yellow-400 font-bold text-sm min-h-[40px] px-3 absolute left-0"
            >
              VOLTAR
            </button>
            <p className="text-white text-base font-semibold flex-1 text-center">CHECKLISTS DIGITAIS</p>
          </div>
        </div>
      </header>

      {/* Menu de Insumos */}
      <main className="flex-1 p-4 flex flex-col gap-4">
        {/* Últimos Checklists Acessados */}
        {recentChecklistsData.length > 0 && (
          <div className="bg-white rounded-2xl p-4 shadow-lg border border-gray-100">
            <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wide mb-3">ÚLTIMOS ACESSADOS</h2>
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

        {/* Grid de Checklists */}
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
      </main>
    </div>
  )
}
