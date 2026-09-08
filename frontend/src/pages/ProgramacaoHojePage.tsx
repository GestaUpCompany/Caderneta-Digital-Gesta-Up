import { useNavigate } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { useState, useEffect } from 'react'
import { RootState } from '../store/store'
import { useProgramacaoHoje } from '../hooks/useProgramacaoHoje'
import { CADERNETAS, CADERNETA_GRUPO_CORES } from '../utils/constants'
import { formatarHorario } from '../utils/rotinas'
import { ChevronLeft, Clock } from 'lucide-react'
import { LOGO_URL, getFarmLogo } from '../utils/constants'
import {
  ChecklistRegra,
  getChecklistRegrasOnlineFirst,
  isRegraAtivaParaCaderneta,
  getHojeIso,
  getFarmTimezoneAsync,
} from '../services/checklistRegrasService'
import { getTiposProgramacaoTratosCached, getProgramacaoTratosCompletaCached } from '../services/cadastroCache'

const hexToRgba = (hex: string, alpha: number = 0.25): string => {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

export default function ProgramacaoHojePage() {
  const navigate = useNavigate()
  const { fazenda, logoUrl, funcionarioNome, fazendaId, acessoConfinamento } = useSelector((state: RootState) => state.config)
  const { programacao, horarios, loading, refresh } = useProgramacaoHoje()

  // Carregar regras de checklist uma única vez para a página inteira,
  // evitando N chamadas idênticas ao Supabase (uma por caderneta programada)
  const [regrasChecklist, setRegrasChecklist] = useState<ChecklistRegra[]>([])
  const [timezone, setTimezone] = useState<string | null>(null)
  const [checklistLoading, setChecklistLoading] = useState(true)
  const [horariosTratos, setHorariosTratos] = useState<string[]>([])

  useEffect(() => {
    if (!fazendaId) {
      setChecklistLoading(false)
      return
    }
    let cancelled = false
    const loadRegras = async () => {
      try {
        const [regras, tz] = await Promise.all([
          getChecklistRegrasOnlineFirst(fazendaId).catch(() => [] as ChecklistRegra[]),
          getFarmTimezoneAsync(),
        ])
        if (!cancelled) {
          setRegrasChecklist(regras || [])
          setTimezone(tz)
        }
      } catch {
        if (!cancelled) setRegrasChecklist([])
      } finally {
        if (!cancelled) setChecklistLoading(false)
      }
    }
    loadRegras()
    return () => { cancelled = true }
  }, [fazendaId])

  // Carrega horários sugeridos dos tratos quando trato-confinamento está programado
  useEffect(() => {
    if (!fazendaId || !programacao.includes('trato-confinamento')) {
      setHorariosTratos([])
      return
    }
    let cancelled = false
    const loadHorarios = async () => {
      try {
        const tipos = await getTiposProgramacaoTratosCached(fazendaId)
        if (!tipos || tipos.length === 0) return
        // Pega o primeiro tipo ativo (engorda tem prioridade)
        const tipo = tipos.includes('engorda') ? 'engorda' : tipos[0]
        const prog = await getProgramacaoTratosCompletaCached(fazendaId, tipo)
        if (!cancelled && prog?.percentuais) {
          const horarios = prog.percentuais
            .filter((p: any) => p.horario_sugerido)
            .sort((a: any, b: any) => a.ordem_trato - b.ordem_trato)
            .map((p: any) => p.horario_sugerido.slice(0, 5))
          setHorariosTratos(horarios)
        }
      } catch {
        // ignorar erro
      }
    }
    loadHorarios()
    return () => { cancelled = true }
  }, [fazendaId, programacao])

  const hoje = getHojeIso(timezone || undefined)
  const temRegras = regrasChecklist.length > 0

  const FAZENDA_INSUMOS = 'd649c65e-16ab-4b77-a84b-df937aa41cc3'
  const CADERNETAS_EXCLUSIVAS: Record<string, string[]> = {
    'entrada-insumos': [FAZENDA_INSUMOS],
    'saida-insumos': [FAZENDA_INSUMOS],
  }
  const CADERNETAS_CONFINAMENTO = ['leitura-cocho', 'trato-confinamento', 'fabrica-confinamento']

  const programacaoMap = new Map(programacao.map((id) => [id, true]))
  const cadernetasProgramadas = CADERNETAS.filter(
    (c) => c.disponivel && programacaoMap.has(c.id)
  ).filter(c => {
    const fazendasPermitidas = CADERNETAS_EXCLUSIVAS[c.id]
    if (fazendasPermitidas && !fazendasPermitidas.includes(fazendaId)) return false
    if (CADERNETAS_CONFINAMENTO.includes(c.id) && !acessoConfinamento) return false
    return true
  })

  const handleCadernetaClick = (cadernetaId: string) => {
    navigate(`/caderneta/${cadernetaId}`)
  }

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-20 bg-gradient-to-b from-[#23503a] via-[#1d4030] to-[#1a3a2a] text-white shadow-[0_4px_20px_rgba(0,0,0,0.1)]">
        <div className="relative px-3 py-3 desktop-container">
          <button
            onClick={() => navigate('/modulos/cadernetas')}
            className="absolute left-3 top-3 flex items-center gap-1.5 rounded-full bg-white/15 hover:bg-white/20 active:bg-white/25 transition-colors text-white text-xs font-semibold pl-2 pr-3 py-2 min-h-[40px]"
            aria-label="Voltar"
          >
            <ChevronLeft className="w-4 h-4" strokeWidth={2.5} />
            <span>Voltar</span>
          </button>

          <div className="mx-24 sm:mx-0 flex flex-col items-center">
            <h1 className="mt-2 text-lg font-bold leading-tight tracking-tight text-center tracking-wide">
              PROGRAMAÇÃO DE HOJE
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

      <main className="flex-1 p-4 flex flex-col gap-4 desktop-container">
        {/* Data e funcionário */}
        <div className="bg-white rounded-2xl p-4 shadow-lg border border-gray-100">
          <p className="text-sm text-gray-500 uppercase tracking-wide font-bold">Data</p>
          <p className="text-lg font-bold text-gray-900">
            {new Date().toLocaleDateString('pt-BR', {
              weekday: 'long',
              day: '2-digit',
              month: 'long',
              year: 'numeric',
            })}
          </p>
          {funcionarioNome && (
            <p className="text-sm text-gray-600 mt-1">
              Funcionário: <span className="font-semibold">{funcionarioNome}</span>
            </p>
          )}
        </div>

        {/* Lista de cadernetas programadas */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-12 gap-3">
            <div className="animate-spin h-8 w-8 border-4 border-green-600 border-t-transparent rounded-full" />
            <p className="text-gray-600 font-medium">Carregando programação...</p>
          </div>
        ) : cadernetasProgramadas.length === 0 ? (
          <div className="bg-white rounded-2xl p-8 shadow-lg border border-gray-100 text-center">
            <p className="text-5xl mb-4">📋</p>
            <p className="text-lg font-bold text-gray-900 mb-2">Nenhuma caderneta programada</p>
            <p className="text-sm text-gray-600">
              Não há cadernetas na sua rotina para hoje.
            </p>
            <button
              onClick={refresh}
              className="mt-4 text-green-600 font-semibold text-sm underline"
            >
              Atualizar
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            {cadernetasProgramadas.map((caderneta) => {
              const checklistAtivo = !temRegras || isRegraAtivaParaCaderneta(regrasChecklist, caderneta.id, hoje)
              return (
                <CadernetaProgramada
                  key={caderneta.id}
                  caderneta={caderneta}
                  horario={formatarHorario(horarios[caderneta.id])}
                  horariosTratos={caderneta.id === 'trato-confinamento' ? horariosTratos : []}
                  onClick={() => handleCadernetaClick(caderneta.id)}
                  checklistAtivo={checklistAtivo}
                  checklistLoading={checklistLoading}
                />
              )
            })}
          </div>
        )}
      </main>
    </div>
  )
}

interface CadernetaProgramadaProps {
  caderneta: (typeof CADERNETAS)[0]
  horario: string | null
  horariosTratos: string[]
  onClick: () => void
  checklistAtivo: boolean
  checklistLoading: boolean
}

function CadernetaProgramada({ caderneta, horario, horariosTratos, onClick, checklistAtivo, checklistLoading }: CadernetaProgramadaProps) {
  return (
    <button
      onClick={onClick}
      style={{ backgroundColor: hexToRgba(CADERNETA_GRUPO_CORES[caderneta.grupo] || '#E5E7EB') }}
      className="relative flex flex-col items-center justify-center gap-2 p-4 transition-all rounded-2xl hover:scale-105 hover:shadow-lg"
    >
      {checklistLoading ? (
        <div className="absolute top-2 right-2">
          <div className="animate-spin h-4 w-4 border-2 border-green-600 border-t-transparent rounded-full" />
        </div>
      ) : checklistAtivo ? (
        <span className="absolute -top-2 -right-2 bg-green-500 text-white text-xs font-bold px-3 py-1 rounded-full shadow-lg">
          CHECKLIST
        </span>
      ) : null}
      <img
        src={caderneta.icon}
        alt={caderneta.label}
        className="w-24 h-auto object-contain rounded-[24px]"
        onError={(e) => {
          const target = e.target as HTMLImageElement
          target.style.display = 'none'
          const emoji = target.parentElement?.querySelector('.fallback-emoji') as HTMLElement
          if (emoji) emoji.style.display = 'block'
        }}
      />
      <span className="text-4xl fallback-emoji hidden">{caderneta.emoji}</span>
      <span className="text-sm font-bold text-center leading-tight text-gray-900">
        {caderneta.label}
      </span>
      {horario && horariosTratos.length === 0 && (
        <span className="flex items-center gap-1 text-xs text-gray-700 font-semibold bg-white/60 px-2 py-1 rounded-full">
          <Clock size={12} />
          {horario}
        </span>
      )}
      {horariosTratos.length > 0 && (
        <div className="flex flex-col items-center gap-1 w-full">
          <div className="flex flex-wrap items-center justify-center gap-1">
            {horariosTratos.map((h, i) => (
              <span
                key={i}
                className="flex items-center gap-0.5 text-xs text-gray-700 font-semibold bg-white/60 px-2 py-0.5 rounded-full"
              >
                <Clock size={10} />
                {h}
              </span>
            ))}
          </div>
          <span className="text-[0.65rem] text-gray-600 font-medium">
            {horariosTratos.length} tratos hoje
          </span>
        </div>
      )}
      {checklistAtivo && !checklistLoading && (
        <span className="text-xs text-green-700 font-semibold">Checklist ativo</span>
      )}
    </button>
  )
}
