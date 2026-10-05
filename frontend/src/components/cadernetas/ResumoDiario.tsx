import { useState } from 'react'
import { BarChart3, FileDown, Loader2, Share2 } from 'lucide-react'
import DatePickerIcon from '../ui/DatePickerIcon'
import { todayBR } from '../../utils/formatDate'

interface ResumoDiarioProps {
  /** completa a frase "resumo de ... do dia" (ex.: "todos os registros de clima") */
  descricao: string
  /** quantos registros existem na data DD/MM/YYYY selecionada */
  contarRegistros: (data: string) => number
  onEnviarTexto: (data: string) => Promise<void>
  onExportarPdf: (data: string) => Promise<void>
}

export default function ResumoDiario({ descricao, contarRegistros, onEnviarTexto, onExportarPdf }: ResumoDiarioProps) {
  const [aberto, setAberto] = useState(false)
  const [dataResumo, setDataResumo] = useState(todayBR())
  const [gerando, setGerando] = useState<'texto' | 'pdf' | null>(null)
  const [erro, setErro] = useState<string | null>(null)

  const dataBase = dataResumo.split(' ')[0]
  const totalNaData = contarRegistros(dataBase)
  const semRegistros = totalNaData === 0

  const abrir = () => {
    setDataResumo(todayBR())
    setErro(null)
    setAberto(true)
  }

  const fechar = () => {
    if (!gerando) setAberto(false)
  }

  const executar = async (acao: 'texto' | 'pdf') => {
    setErro(null)
    setGerando(acao)
    try {
      if (acao === 'texto') await onEnviarTexto(dataResumo)
      else await onExportarPdf(dataResumo)
      setAberto(false)
    } catch (err) {
      console.error('Erro ao gerar resumo diário:', err)
      setErro('Erro ao gerar resumo. Tente novamente.')
    } finally {
      setGerando(null)
    }
  }

  return (
    <>
      <button
        onClick={abrir}
        className="app-card flex w-full items-center justify-center gap-2 py-3.5 text-sm font-bold uppercase tracking-wide text-brand-700 transition-all hover:border-brand-300 active:scale-[0.99]"
      >
        <BarChart3 className="h-5 w-5" strokeWidth={2.2} />
        Resumo diário
      </button>

      {aberto && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={fechar}
        >
          <div
            className="bg-white rounded-3xl p-5 max-w-sm w-full shadow-2xl animate-in fade-in zoom-in duration-200 text-center"
            onClick={(e) => e.stopPropagation()}
          >
            <BarChart3 className="h-12 w-12 text-brand-700 mx-auto" />
            <h3 className="text-lg font-black text-gray-900 mt-2">
              Resumo diário
            </h3>
            <p className="text-sm text-gray-600 mt-1">
              Escolha a data para gerar o resumo de {descricao} do dia.
            </p>

            <div className="mt-4 text-left">
              <DatePickerIcon
                label="Data do resumo"
                value={dataResumo}
                onChange={setDataResumo}
              />
            </div>
            <p className={`mt-2 text-xs font-semibold ${semRegistros ? 'text-gray-400' : 'text-brand-700'}`}>
              {semRegistros
                ? 'Nenhum registro nesta data'
                : `${totalNaData} registro${totalNaData === 1 ? '' : 's'} nesta data`}
            </p>

            {erro && (
              <p className="mt-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-left text-sm font-semibold text-red-700">
                {erro}
              </p>
            )}

            <div className="mt-4 flex flex-col gap-2">
              <button
                onClick={() => executar('texto')}
                disabled={!!gerando || semRegistros}
                className="w-full font-bold px-4 py-3 rounded-2xl bg-brand-700 text-white active:bg-brand-800 flex items-center justify-center gap-2 disabled:opacity-60"
              >
                {gerando === 'texto'
                  ? <Loader2 className="h-5 w-5 animate-spin" />
                  : <Share2 className="h-5 w-5" />}
                ENVIAR COMO TEXTO
              </button>
              <button
                onClick={() => executar('pdf')}
                disabled={!!gerando || semRegistros}
                className="w-full font-bold px-4 py-3 rounded-2xl bg-brand-900 text-white active:bg-brand-950 flex items-center justify-center gap-2 disabled:opacity-60"
              >
                {gerando === 'pdf'
                  ? <Loader2 className="h-5 w-5 animate-spin" />
                  : <FileDown className="h-5 w-5" />}
                EXPORTAR PDF
              </button>
              <button
                onClick={fechar}
                disabled={!!gerando}
                className="w-full font-bold px-4 py-3 rounded-2xl border-2 border-gray-300 text-gray-700 bg-gray-100 active:bg-gray-200 disabled:opacity-60"
              >
                CANCELAR
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
