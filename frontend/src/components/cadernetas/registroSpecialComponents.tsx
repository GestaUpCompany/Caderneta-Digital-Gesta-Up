import React from 'react'
import { CadernetaStore } from '../../services/indexedDB'
import { Registro } from '../../config/registroDisplayConfig'

type SpecialComponentFn = (registro: Registro) => React.ReactNode

export const SPECIAL_COMPONENTS: Partial<Record<CadernetaStore, Record<string, SpecialComponentFn>>> = {
  enfermaria: {
    diagnosticos: (registro) => {
      const diag = registro.diagnosticos as Record<string, { valor: unknown; observacao?: string }> | undefined
      if (!diag || typeof diag !== 'object') return null
      const entries = Object.entries(diag).filter(([, d]) => d?.valor !== null && d?.valor !== undefined && d?.valor !== '')
      if (entries.length === 0) return null
      return (
        <div className="col-span-2 mt-2">
          <p className="text-xs font-bold text-gray-700 mb-1">🩺 DIAGNÓSTICOS</p>
          {entries.map(([key, d]) => (
            <div key={key} className="text-sm text-gray-900">
              {key.toUpperCase()}:{' '}
              <span className="font-semibold">{d.valor === 'S' || d.valor === true ? 'Sim' : 'Não'}</span>
              {d.observacao ? <span className="text-gray-500"> ({d.observacao})</span> : null}
            </div>
          ))}
        </div>
      )
    },
    medicamentos: (registro) => {
      const meds = registro.medicamentos as { tipo?: string; nomeComercial?: string; doseAplicada?: string }[] | undefined
      if (!meds || !Array.isArray(meds) || meds.length === 0) return null
      return (
        <div className="col-span-2 mt-2">
          <p className="text-xs font-bold text-gray-700 mb-1">💊 MEDICAMENTOS</p>
          {meds.map((med, i) => (
            <div key={i} className="text-sm text-gray-900">
              {i + 1}. {med.tipo || ''} - {med.nomeComercial || ''}
              {med.doseAplicada ? <span className="text-gray-500"> ({med.doseAplicada})</span> : null}
            </div>
          ))}
        </div>
      )
    },
  },

  morte: {
    diagnosticos: (registro) => {
      const diag = registro.diagnosticos as Record<string, { valor: unknown; observacao?: string }> | undefined
      if (!diag || typeof diag !== 'object') return null
      const entries = Object.entries(diag).filter(([, d]) => d?.valor !== null && d?.valor !== undefined && d?.valor !== '')
      if (entries.length === 0) return null
      return (
        <div className="col-span-2 mt-2">
          <p className="text-xs font-bold text-gray-700 mb-1">🩺 DIAGNÓSTICOS</p>
          {entries.map(([key, d]) => (
            <div key={key} className="text-sm text-gray-900">
              {key.toUpperCase()}:{' '}
              <span className="font-semibold">{d.valor === 'S' || d.valor === true ? 'Sim' : 'Não'}</span>
              {d.observacao ? <span className="text-gray-500"> ({d.observacao})</span> : null}
            </div>
          ))}
        </div>
      )
    },
  },

  clima: {
    medicoes: (registro) => {
      const medicoes = registro.medicoes as { pluviometro_nome?: string; pluviometroNome?: string; pluviometro_localizacao?: string; pluviometroLocalizacao?: string; medicao?: unknown }[] | undefined
      if (!medicoes || !Array.isArray(medicoes) || medicoes.length === 0) return null
      const filtered = medicoes.filter(m => m.medicao !== null && m.medicao !== undefined && m.medicao !== '')
      if (filtered.length === 0) return null
      return (
        <div className="col-span-2 mt-2">
          <p className="text-xs font-bold text-gray-700 mb-1">🌧️ PLUVIÔMETROS</p>
          {filtered.map((m, i) => {
            const nome = m.pluviometro_nome || m.pluviometroNome || 'Pluviômetro'
            const loc = m.pluviometro_localizacao || m.pluviometroLocalizacao
            return (
              <div key={i} className="text-sm text-gray-900">
                {nome}{loc ? ` (${loc})` : ''}: <span className="font-semibold">{String(m.medicao)} mm</span>
              </div>
            )
          })}
        </div>
      )
    },
  },

  cantina: {
    itens: (registro) => {
      const itens = registro.itens as Record<string, unknown> | undefined
      if (!itens || typeof itens !== 'object') return null
      const filtered = Object.entries(itens).filter(([, v]) => v !== null && v !== undefined && v !== '' && Number(v) > 0)
      if (filtered.length === 0) return null
      return (
        <div className="col-span-2 mt-2">
          <p className="text-xs font-bold text-gray-700 mb-1">📦 ITENS</p>
          {filtered.map(([nome, valor]) => (
            <div key={nome} className="flex justify-between text-sm text-gray-900">
              <span>{nome.toUpperCase()}</span>
              <span className="font-semibold">{String(valor)}</span>
            </div>
          ))}
        </div>
      )
    },
  },

  almoxarifado: {
    itens: (registro) => {
      const itens = registro.itens as { tipo?: string; quantidade?: unknown; setor?: string; necessitaDevolucao?: string; prazoDevolucao?: string; tipoClassificacao?: string }[] | undefined
      if (!itens || !Array.isArray(itens) || itens.length === 0) return null
      return (
        <div className="col-span-2 mt-2">
          <p className="text-xs font-bold text-gray-700 mb-1">🔧 ITENS</p>
          {itens.map((item, i) => (
            <div key={i} className="bg-gray-50 rounded-lg p-2 mb-1 text-sm">
              <p className="font-semibold text-gray-900">{i + 1}. {item.tipo?.toUpperCase() || '—'}: {String(item.quantidade || '—')}</p>
              {item.setor && <p className="text-gray-600">Setor: {item.setor}</p>}
              {item.tipoClassificacao && <p className="text-gray-600">Classificação: {item.tipoClassificacao}</p>}
              {item.necessitaDevolucao === 'S'
                ? <p className="text-orange-600">Devolução: Sim ({item.prazoDevolucao || '—'})</p>
                : <p className="text-gray-500">Devolução: Não</p>}
            </div>
          ))}
        </div>
      )
    },
  },

  'manutencao-maquinas': {
    checklist: (registro) => {
      const checklist = registro.checklist as Record<string, { valor?: string; observacao?: string }> | undefined
      if (!checklist || typeof checklist !== 'object') return null
      const perguntas: [string, string][] = [
        ['abastecimentoRealizado', 'ABASTECIMENTO REALIZADO?'],
        ['lavagemRealizada', 'LAVAGEM REALIZADA?'],
        ['vidrosPerfeitos', 'VIDROS PERFEITOS?'],
        ['freiosBons', 'FREIOS BONS?'],
        ['bateriaBoa', 'BATERIA BOA?'],
        ['conferiuEletrica', 'CONFERIU ELÉTRICA?'],
        ['maquinaEngraxada', 'MÁQUINA ENGRAXADA?'],
        ['nivelAguaIdeal', 'NÍVEL ÁGUA IDEAL?'],
        ['conferiuNivelOleo', 'NÍVEL ÓLEO CONFERIDO?'],
        ['calibrouPneus', 'PNEUS CALIBRADOS?'],
        ['limpouRadiador', 'RADIADOR LIMPO?'],
        ['tapetesBons', 'TAPETES BONS?'],
        ['assentoBom', 'ASSENTO BOM?'],
      ]
      return (
        <div className="col-span-2 mt-2">
          <p className="text-xs font-bold text-gray-700 mb-1">✅ CHECKLIST</p>
          {perguntas.map(([campo, label]) => {
            const item = checklist[campo]
            if (!item || (item.valor !== 'S' && item.valor !== 'N')) return null
            return (
              <div key={campo} className="text-sm text-gray-900">
                {label}:{' '}
                <span className={item.valor === 'S' ? 'text-green-600 font-semibold' : 'text-red-600 font-semibold'}>
                  {item.valor === 'S' ? 'Sim' : 'Não'}
                </span>
                {item.observacao ? <span className="text-gray-500 text-xs"> ({item.observacao})</span> : null}
              </div>
            )
          })}
        </div>
      )
    },
  },

  'entrada-insumos': {
    itens: (registro) => {
      const itens = registro.itens as { produto?: string; quantidade?: unknown; valorUnitario?: unknown; valorTotal?: unknown }[] | undefined
      if (!itens || !Array.isArray(itens) || itens.length === 0) return null
      const total = itens.reduce((acc, item) => acc + (parseFloat(String(item.valorTotal)) || 0), 0)
      return (
        <div className="col-span-2 mt-2">
          <p className="text-xs font-bold text-gray-700 mb-1">📦 ITENS DA ENTRADA</p>
          {itens.map((item, i) => (
            <div key={i} className="bg-gray-50 rounded-lg p-2 mb-1 text-sm">
              <p className="font-semibold text-gray-900">{i + 1}. {item.produto || '—'}</p>
              {item.quantidade !== undefined && <p className="text-gray-600">Quantidade: {String(item.quantidade)}</p>}
              {item.valorUnitario !== undefined && <p className="text-gray-600">Valor unitário: R$ {String(item.valorUnitario)}</p>}
              {item.valorTotal !== undefined && <p className="text-gray-600">Valor total: R$ {String(item.valorTotal)}</p>}
            </div>
          ))}
          {total > 0 && <p className="text-sm font-bold text-gray-900 mt-1">VALOR TOTAL: R$ {total.toFixed(2)}</p>}
        </div>
      )
    },
  },

  'saida-insumos': {
    insumosQuantidades: (registro) => {
      const insumos = registro.insumosQuantidades as Record<string, unknown> | undefined
      if (!insumos || typeof insumos !== 'object') return null
      const filtered = Object.entries(insumos).filter(([, v]) => v !== null && v !== undefined && parseFloat(String(v)) > 0)
      if (filtered.length === 0) return null
      return (
        <div className="col-span-2 mt-2">
          <p className="text-xs font-bold text-gray-700 mb-1">🧪 INSUMOS UTILIZADOS (kg)</p>
          {filtered.map(([nome, qtd]) => (
            <div key={nome} className="flex justify-between text-sm text-gray-900">
              <span>{nome}</span>
              <span className="font-semibold">{String(qtd)}</span>
            </div>
          ))}
        </div>
      )
    },
  },
}
