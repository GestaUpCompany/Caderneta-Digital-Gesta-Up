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
    <div className="bg-white rounded-xl border border-gray-200 p-4 mb-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <RefreshCw size={20} className="text-green-700" />
          <div>
            <p className="font-semibold text-gray-800">Atualizar dados automaticamente</p>
            <p className="text-sm text-gray-500">
              Ao abrir o app depois do horário, com internet, atualiza sozinho em segundo plano.
            </p>
          </div>
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
          <span className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors ${prefs.ativo ? 'bg-green-600' : 'bg-gray-300'}`}>
            <span className={`inline-block h-5 w-5 rounded-full bg-white transition-transform ${prefs.ativo ? 'translate-x-6' : 'translate-x-1'}`} />
          </span>
        </button>
      </div>
      {prefs.ativo && (
        <label className="mt-3 flex items-center justify-between gap-3 text-sm text-gray-700">
          Horário
          <input
            type="time"
            value={prefs.horario}
            onChange={(e) => e.target.value && atualizar({ horario: e.target.value })}
            className="border border-gray-300 rounded-lg px-3 py-2"
          />
        </label>
      )}
    </div>
  )
}
