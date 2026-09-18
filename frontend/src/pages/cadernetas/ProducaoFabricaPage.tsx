import { useEffect, useState, useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSelector } from 'react-redux'
import CadernetaLayout from '../../components/CadernetaLayout'
import { salvarRegistro } from '../../services/api'
import { todayBR } from '../../utils/formatDate'
import { RootState } from '../../store/store'
import { generateId } from '../../utils/generateId'
import { saveRegistro as saveRegistroIDB } from '../../services/indexedDB'
import { enqueueRegistro } from '../../services/syncService'
import { registerBackgroundSync } from '../../serviceWorkerRegistration'
import { normalizarNumero } from '../../utils/formatNumber'
import {
  loadQueryCacheFromIndexedDB,
  getCachedCadastroData,
  getInsumosByFormulacaoCached,
  getFormulacaoByNomeCached,
} from '../../services/cadastroCache'
import { getFormulacoes } from '../../services/supabaseService'
import { Brush, Save, AlertCircle, Loader2 } from 'lucide-react'
import SuccessModal from '../../components/SuccessModal'
import FeatureLock from '../../components/FeatureLock'
import { DatePicker } from '../../components/ui'

interface InsumoFormulacao {
  insumo_id: string
  nome: string
  tipo: string | null
  teor_ms: number
  formula_teor_ms: number
  formula_mn_percent: number
  ordem: number
}

interface FormState {
  dataProducao: string
  formulacaoId: string
  formulacaoNome: string
  destinoProducao: string
  totalProduzido: string
  insumosQuantidades: Record<string, string>
}

const makeInitial = (): FormState => ({
  dataProducao: todayBR(),
  formulacaoId: '',
  formulacaoNome: '',
  destinoProducao: '',
  totalProduzido: '',
  insumosQuantidades: {},
})

const DESTINOS = ['Cria', 'Recria', 'Engorda', 'Tropa', 'Outros Animais']

export default function SaidaInsumosPage() {
  const navigate = useNavigate()
  const { fazendaId, usuario } = useSelector((state: RootState) => state.config)
  const [form, setForm] = useState<FormState>(makeInitial())
  const [errors, setErrors] = useState<{ field: string; message: string }[]>([])
  const [salvando, setSalvando] = useState(false)
  const [showSuccessModal, setShowSuccessModal] = useState(false)
  const [registroSalvo, setRegistroSalvo] = useState<any>(null)
  const [carregando, setCarregando] = useState(true)
  const [dietasDisponiveis, setDietasDisponiveis] = useState<{ id: string; nome: string }[]>([])
  const [insumos, setInsumos] = useState<InsumoFormulacao[]>([])
  const [carregandoInsumos, setCarregandoInsumos] = useState(false)
  const [estoqueInsuficiente] = useState<string[]>([])

  const set = (field: keyof FormState) => (val: string) =>
    setForm((prev) => ({ ...prev, [field]: val }))

  const getError = (field: string) => errors.find((e) => e.field === field)?.message

  // Carregar dietas disponíveis (formulações ativas)
  const carregarDietas = useCallback(async () => {
    if (!fazendaId) {
      setDietasDisponiveis([])
      setCarregando(false)
      return
    }
    setCarregando(true)
    try {
      await loadQueryCacheFromIndexedDB()

      let dietas: { id: string; nome: string }[] = []

      // Tentar Supabase primeiro (online)
      if (navigator.onLine) {
        try {
          const formulacoes = await getFormulacoes(fazendaId)
          dietas = formulacoes.map((f: any) => ({ id: f.id, nome: f.nome }))
        } catch {
          // erro de rede, usar cache
        }
      }

      // Fallback: cache offline (nomes -> buscar IDs por nome)
      if (dietas.length === 0) {
        try {
          const cache = await getCachedCadastroData()
          if (cache?.formulacoes) {
            for (const nome of cache.formulacoes) {
              try {
                const form = await getFormulacaoByNomeCached(fazendaId, nome)
                if (form?.id) {
                  dietas.push({ id: form.id, nome })
                }
              } catch {
                // ignorar
              }
            }
          }
        } catch {
          // ignorar
        }
      }

      setDietasDisponiveis(dietas)
    } catch (error) {
      console.error('Erro ao carregar dietas:', error)
      setDietasDisponiveis([])
    } finally {
      setCarregando(false)
    }
  }, [fazendaId])

  useEffect(() => {
    carregarDietas()
  }, [carregarDietas])

  // Carregar insumos da formulação selecionada
  const carregarInsumos = useCallback(async () => {
    if (!form.formulacaoId) {
      setInsumos([])
      setForm((prev) => ({ ...prev, insumosQuantidades: {} }))
      return
    }
    setCarregandoInsumos(true)
    try {
      const insumosData = await getInsumosByFormulacaoCached(form.formulacaoId)
      setInsumos((insumosData as InsumoFormulacao[]) || [])
      setForm((prev) => ({ ...prev, insumosQuantidades: {} }))
    } catch (error) {
      console.error('Erro ao carregar insumos da formulação:', error)
      setInsumos([])
    } finally {
      setCarregandoInsumos(false)
    }
  }, [form.formulacaoId])

  useEffect(() => {
    carregarInsumos()
  }, [carregarInsumos])

  const kgPrevistoPorInsumo = useMemo(() => {
    const total = normalizarNumero(form.totalProduzido) ?? 0
    return insumos.reduce<Record<string, number>>((result, insumo) => {
      result[insumo.insumo_id] = (Number(insumo.formula_mn_percent || 0) / 100) * total
      return result
    }, {})
  }, [form.totalProduzido, insumos])

  const handleTotalProduzidoChange = (valor: string) => {
    setForm((prev) => ({ ...prev, totalProduzido: valor }))
  }

  const handleInsumoRealizadoChange = (insumoId: string, valor: string) => {
    setForm((prev) => ({
      ...prev,
      insumosQuantidades: {
        ...prev.insumosQuantidades,
        [insumoId]: valor,
      },
    }))
  }

  const handleSelecionarFormulacao = (id: string) => {
    const dieta = dietasDisponiveis.find((d) => d.id === id)
    setForm({
      ...makeInitial(),
      dataProducao: form.dataProducao,
      formulacaoId: id,
      formulacaoNome: dieta?.nome || '',
    })
  }

  const handleSalvar = async () => {
    setSalvando(true)
    setErrors([])

    try {
      // Validar
      if (!form.formulacaoId) {
        setErrors([{ field: 'formulacaoId', message: 'Selecione uma formulação' }])
        setSalvando(false)
        return
      }

      // Salvar registro principal
      const result = await salvarRegistro('saida-insumos', {
        dataProducao: form.dataProducao,
        dietaProduzida: form.formulacaoNome,
        formulacaoId: form.formulacaoId,
        destinoProducao: form.destinoProducao,
        totalProduzido: form.totalProduzido ? (normalizarNumero(form.totalProduzido) ?? 0) : 0,
        usuario: usuario,
      })

      if (!result.success && result.errors) {
        setErrors(result.errors)
        setSalvando(false)
        return
      }

      const saidaId = result.id

      // Salvar cada insumo na tabela de itens
      for (const insumo of insumos) {
        const quantidadeStr = form.insumosQuantidades[insumo.insumo_id]
        const quantidade = quantidadeStr ? (normalizarNumero(quantidadeStr) ?? 0) : 0
        if (quantidade > 0) {
          const insumoRegistro = {
            id: generateId(),
            data: form.dataProducao,
            idSaida: saidaId,
            insumoId: insumo.insumo_id,
            quantidade: quantidade,
            version: 1,
            lastModified: new Date().toISOString(),
            syncStatus: 'pending' as const,
          }
          await saveRegistroIDB('insumos-por-saida', insumoRegistro)
          await enqueueRegistro('insumos-por-saida', insumoRegistro.id, 'create')
        }
      }

      registerBackgroundSync('sync-registros').catch(() => {})

      setRegistroSalvo(result.registro)
      setShowSuccessModal(true)
      setForm(makeInitial())
    } catch (err) {
      console.error('Erro ao salvar saída de insumos:', err)
      setErrors([{ field: 'geral', message: 'Erro ao salvar saída de insumos' }])
    } finally {
      setSalvando(false)
    }
  }

  const handleNewRecord = () => {
    setShowSuccessModal(false)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleExit = () => {
    setShowSuccessModal(false)
    navigate('/modulos/cadernetas')
  }

  return (
    <FeatureLock feature="saida-insumos" fazendaId={fazendaId}>
      <CadernetaLayout
        title="SAÍDA DE INSUMOS"
        cadernetaId="saida-insumos"
        dateContent={
          <DatePicker value={form.dataProducao} onChange={set('dataProducao')} variant="header" compact inline />
        }
      >
        <main className="flex-1 p-4 flex flex-col gap-5 pb-8 desktop-form-container">
          {errors.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4">
              {errors.map((e, i) => (
                <p key={i} className="text-sm text-red-700">{e.message}</p>
              ))}
            </div>
          )}

          {carregando ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
            </div>
          ) : (
            <>
              {/* Seção 1: Dados da Produção */}
              <div className="bg-white rounded-3xl p-6 shadow-lg border border-gray-100 flex flex-col gap-5">
                <h2 className="text-lg font-black text-gray-900 tracking-tight">1. DADOS DA PRODUÇÃO</h2>

                {/* Seleção de formulação */}
                <div className="flex flex-col gap-2">
                  <label className="block text-lg font-bold text-gray-900 mb-2">
                    FORMULAÇÃO *
                  </label>
                  {dietasDisponiveis.length === 0 ? (
                    <p className="text-sm text-gray-400">
                      Nenhuma formulação ativa cadastrada. Cadastre formulações no Painel Web.
                    </p>
                  ) : (
                    <select
                      value={form.formulacaoId}
                      onChange={(e) => handleSelecionarFormulacao(e.target.value)}
                      className="w-full min-h-[60px] rounded-2xl border-2 border-gray-400 px-3 sm:px-4 py-3 text-lg sm:text-xl text-gray-900 bg-white focus:border-black focus:outline-none"
                    >
                      <option value="">Selecione uma formulação...</option>
                      {dietasDisponiveis.map((d) => (
                        <option key={d.id} value={d.id}>{d.nome}</option>
                      ))}
                    </select>
                  )}
                  {getError('formulacaoId') && (
                    <p className="text-xs text-red-500">{getError('formulacaoId')}</p>
                  )}
                </div>

                <div className="flex flex-col gap-2">
                  <label className="block text-lg font-bold text-gray-900 mb-2">
                    DESTINO DA PRODUÇÃO *
                  </label>
                  <select
                    value={form.destinoProducao}
                    onChange={(e) => set('destinoProducao')(e.target.value)}
                    className="w-full min-h-[60px] rounded-2xl border-2 border-gray-400 px-3 sm:px-4 py-3 text-lg sm:text-xl text-gray-900 bg-white focus:border-black focus:outline-none"
                  >
                    <option value="">Selecione...</option>
                    {DESTINOS.map((d) => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-col gap-2">
                  <label className="block text-lg font-bold text-gray-900 mb-2">
                    TOTAL PRODUZIDO (KG)
                  </label>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={form.totalProduzido}
                    onChange={(e) => handleTotalProduzidoChange(e.target.value)}
                    placeholder="0"
                    className="w-full min-h-[60px] rounded-2xl border-2 border-gray-400 px-3 sm:px-4 py-3 text-lg sm:text-xl font-black text-gray-900 focus:border-black focus:outline-none"
                  />
                </div>
              </div>

              {/* Seção 2: Insumos Utilizados */}
              <div className="bg-white rounded-3xl p-6 shadow-lg border border-gray-100 flex flex-col gap-5">
                <h2 className="text-lg font-black text-gray-900 tracking-tight">2. INSUMOS UTILIZADOS (kg)</h2>

                {carregandoInsumos ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
                  </div>
                ) : insumos.length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-4">
                    {form.formulacaoId
                      ? 'Esta formulação não tem insumos cadastrados.'
                      : 'Selecione uma formulação para ver os insumos.'}
                  </p>
                ) : (
                  <div className="overflow-hidden rounded-xl border border-gray-200">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-gray-50 border-b border-gray-200">
                          <th className="text-left p-2 font-bold text-gray-700">INSUMO</th>
                          <th className="text-center p-2 font-bold text-gray-700">% MN</th>
                          <th className="text-center p-2 font-bold text-gray-700">PREVISTO</th>
                          <th className="text-center p-2 font-bold text-gray-700">REALIZADO</th>
                        </tr>
                      </thead>
                      <tbody>
                        {insumos.map((insumo) => (
                          <tr key={insumo.insumo_id} className="border-b border-gray-100 last:border-0">
                            <td className="p-2 font-bold text-gray-900">
                              {insumo.nome}
                              {insumo.tipo && <span className="ml-1 text-[10px] font-bold text-gray-500 align-middle">{insumo.tipo.toUpperCase()}</span>}
                            </td>
                            <td className="p-2 text-center text-gray-600">
                              {Number(insumo.formula_mn_percent || 0).toFixed(2).replace('.', ',')}%
                            </td>
                            <td className="p-2 text-center font-bold text-gray-700">
                              {(kgPrevistoPorInsumo[insumo.insumo_id] || 0).toFixed(1).replace('.', ',')}
                            </td>
                            <td className="p-2 text-center">
                              <input
                                type="text"
                                inputMode="decimal"
                                value={form.insumosQuantidades[insumo.insumo_id] || ''}
                                onChange={(e) => handleInsumoRealizadoChange(insumo.insumo_id, e.target.value)}
                                placeholder="0"
                                className="w-20 rounded-lg border border-gray-200 px-2 py-1 text-center font-bold text-gray-900 focus:border-[#1a3a2a] focus:outline-none"
                              />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Aviso de estoque insuficiente */}
              {estoqueInsuficiente.length > 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-amber-800">
                      Estoque insuficiente para: {estoqueInsuficiente.join(', ')}
                    </p>
                    <p className="text-xs text-amber-600 mt-1">
                      O registro será salvo mesmo assim. O saldo ficará negativo.
                    </p>
                  </div>
                </div>
              )}

              <div className="flex flex-col gap-2">
                <button
                  type="button"
                  onClick={handleSalvar}
                  disabled={salvando || !form.formulacaoId}
                  className={`w-full !min-h-0 rounded-2xl border-2 px-3 py-4 text-base font-bold transition-colors active:scale-[0.99] ${
                    salvando || !form.formulacaoId
                      ? 'cursor-not-allowed border-gray-200 bg-gray-100 text-gray-400'
                      : 'border-green-600 bg-green-600 text-white hover:bg-green-700'
                  }`}
                >
                  <span className="inline-flex items-center justify-center gap-2">
                    <Save className="h-5 w-5" strokeWidth={2.5} />
                    {salvando ? 'SALVANDO...' : 'SALVAR'}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => { setForm(makeInitial()); setErrors([]) }}
                  className="w-full !min-h-0 rounded-2xl border-2 border-gray-300 bg-gray-200 px-3 py-3 text-sm font-bold text-gray-700 transition-colors hover:bg-gray-300 active:scale-95"
                >
                  <span className="inline-flex items-center justify-center gap-2">
                    <Brush className="h-4 w-4" strokeWidth={2.5} />
                    LIMPAR
                  </span>
                </button>
              </div>
            </>
          )}
        </main>

        <SuccessModal
          isOpen={showSuccessModal}
          onClose={() => setShowSuccessModal(false)}
          onNewRecord={handleNewRecord}
          onExit={handleExit}
          cadernetaName="Saída de Insumos"
          registro={registroSalvo}
          caderneta="saida-insumos"
        />
      </CadernetaLayout>
    </FeatureLock>
  )
}
