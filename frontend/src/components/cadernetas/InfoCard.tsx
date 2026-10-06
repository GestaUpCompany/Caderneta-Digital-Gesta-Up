import { ReactNode } from 'react'
import { AlertTriangle, CheckCircle2, LucideIcon } from 'lucide-react'
import InfoStrip from './InfoStrip'

export interface InfoCardStat {
  label: string
  value: string
  /** quantas colunas do grid o stat ocupa (ex: 2 = largura de dois cards) */
  span?: number
}

export interface InfoCardStatus {
  tone: 'neutral' | 'success' | 'warning' | 'danger'
  text: string
}

interface InfoCardProps {
  icon: LucideIcon
  title: string
  subtitle?: string
  stats?: InfoCardStat[]
  /** fracao 0..n do progresso em relacao a meta (valores > 1 = estourado) */
  progress?: number | null
  /** cor da barra; padrao: vermelho se estourado, ambar perto do limite, verde no prazo */
  progressTone?: InfoCardStatus['tone']
  status?: InfoCardStatus
  children?: ReactNode
}

const PROGRESS_COLOR: Record<InfoCardStatus['tone'], string> = {
  neutral: 'bg-brand-500',
  success: 'bg-green-500',
  warning: 'bg-amber-500',
  danger: 'bg-red-500',
}

/**
 * Card de resumo de uma entidade selecionada no formulario (bebedouro, lote,
 * pasto...): identidade no topo, metricas compactas no meio e uma unica
 * faixa de decisao embaixo. Substitui os antigos cards cinzas de
 * label/valor empilhados.
 */
export default function InfoCard({
  icon: Icon,
  title,
  subtitle,
  stats,
  progress,
  progressTone,
  status,
  children,
}: InfoCardProps) {
  const StatusIcon = status?.tone === 'success' ? CheckCircle2 : AlertTriangle
  const barTone =
    progressTone ??
    (progress != null && progress >= 1
      ? 'danger'
      : progress != null && progress >= 0.8
        ? 'warning'
        : 'success')

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="flex items-center gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
          <Icon className="h-5 w-5" strokeWidth={2.25} />
        </span>
        <div className="min-w-0">
          <p className="truncate text-base font-extrabold text-gray-900">{title}</p>
          {subtitle && <p className="truncate text-sm font-semibold text-gray-500">{subtitle}</p>}
        </div>
      </div>

      {stats && stats.length > 0 && (
        <div
          className="mt-3 grid gap-2"
          style={{
            gridTemplateColumns: `repeat(${Math.max(
              2,
              stats.filter((s) => !s.span).length
            )}, minmax(0, 1fr))`,
          }}
        >
          {stats.map((s) => (
            <div
              key={s.label}
              className="rounded-xl bg-gray-50 px-3 py-2"
              style={s.span ? { gridColumn: `span ${s.span}` } : undefined}
            >
              <p className="text-[10px] font-bold uppercase tracking-wide text-gray-500">{s.label}</p>
              <p className={`mt-0.5 text-sm font-extrabold text-gray-900 ${s.span ? '' : 'truncate'}`}>
                {s.value}
              </p>
            </div>
          ))}
        </div>
      )}

      {progress != null && (
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-gray-200">
          <div
            className={`h-full rounded-full transition-all ${PROGRESS_COLOR[barTone]}`}
            style={{ width: `${Math.min(Math.max(progress, 0), 1) * 100}%` }}
          />
        </div>
      )}

      {status && (
        <InfoStrip tone={status.tone} icon={<StatusIcon className="h-4 w-4" />} className="mt-3">
          {status.text}
        </InfoStrip>
      )}

      {children}
    </div>
  )
}
