import { useState } from 'react'
import { RefreshCw } from 'lucide-react'
import {
  lerPrefsAtualizacaoAutomatica,
  salvarPrefsAtualizacaoAutomatica,
  type PrefsAtualizacaoAutomatica,
} from '../utils/atualizacaoAutomatica'

export default function AtualizacaoAutomaticaCard() {
  const [prefs, setPrefs] = useState<PrefsAtualizacaoAutomatica>(() => lerPrefsAtualizacaoAutomatica())

  const atualizar = (parcial: Partial<PrefsAtualizacaoAutomatica>) => {
    const novo = { ...prefs, ...parcial }
    setPrefs(novo)
    salvarPrefsAtualizacaoAutomatica(novo)
  }

  return (
    <div className="bg-white rounded-2xl border border-[#e4dfd3] p-5 shadow-[0_1px_0_rgba(0,0,0,0.04),0_8px_24px_-12px_rgba(29,64,48,0.25)]">
      <div className="flex items-start gap-4">
        <span className="shrink-0 flex items-center justify-center w-12 h-12 rounded-xl bg-green-100 text-green-700">
          <RefreshCw size={26} strokeWidth={2.25} aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-bold text-base text-[#1d4030]">Atualizar dados automaticamente</p>
          <p className="mt-0.5 text-sm text-gray-600 leading-snug">
            Ao abrir o app depois do horário, com internet, atualiza sozinho em segundo plano.
          </p>
        </div>
        {/* O botão herda a área de toque mínima global (60px); a trilha visual fica dentro dele */}
        <button
          type="button"
          role="switch"
          aria-checked={prefs.ativo}
          aria-label="Atualizar dados automaticamente"
          onClick={() => atualizar({ ativo: !prefs.ativo })}
          className="shrink-0 flex items-center justify-center bg-transparent"
        >
          <span className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors ${prefs.ativo ? 'bg-green-600' : 'bg-gray-300'}`}>
            <span className={`inline-block h-6 w-6 rounded-full bg-white shadow transition-transform ${prefs.ativo ? 'translate-x-7' : 'translate-x-1'}`} />
          </span>
        </button>
      </div>
      {prefs.ativo && (
        <label className="mt-4 flex items-center justify-between gap-3 rounded-xl bg-[#faf7ee] border border-[#e4dfd3] px-4 py-3 text-sm font-semibold text-[#1d4030]">
          Horário
          <input
            type="time"
            value={prefs.horario}
            onChange={(e) => e.target.value && atualizar({ horario: e.target.value })}
            className="bg-white border border-gray-300 rounded-lg px-3 py-2 text-base font-mono text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-600"
          />
        </label>
      )}
    </div>
  )
}
