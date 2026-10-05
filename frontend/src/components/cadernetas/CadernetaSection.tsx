import { ReactNode } from 'react'

interface CadernetaSectionProps {
  /** Numero da secao, ex: 1, 2, 3 */
  numero?: number | string
  titulo: string
  required?: boolean
  /** Elemento a direita do titulo (ex: chip POP) */
  right?: ReactNode
  children: ReactNode
  className?: string
}

/**
 * Card de secao numerada no padrao de referencia das cadernetas.
 * Fundo branco, borda sutil, sombra minima, titulo pequeno em caixa alta.
 */
export default function CadernetaSection({
  numero,
  titulo,
  required = false,
  right,
  children,
  className = '',
}: CadernetaSectionProps) {
  return (
    <section className={`app-card flex flex-col gap-5 p-5 ${className}`}>
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h2 className="text-[15px] font-extrabold uppercase tracking-tight text-gray-900">
          {numero !== undefined && <>{numero}. </>}
          {titulo}
          {required && <span className="text-red-500"> *</span>}
        </h2>
        {right}
      </div>
      {children}
    </section>
  )
}
