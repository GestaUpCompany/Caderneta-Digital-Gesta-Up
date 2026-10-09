import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { Input, DatePicker, ValidationMessage, SearchableModal, TextArea } from '../../components/ui'
import { Beef, X } from 'lucide-react'
import SuccessModal from '../../components/SuccessModal'
import { salvarRegistro } from '../../services/api'
import { todayBR } from '../../utils/formatDate'
import { RootState } from '../../store/store'
import CadernetaLayout from '../../components/CadernetaLayout'
import InfoCard from '../../components/cadernetas/InfoCard'
import InfoStrip from '../../components/cadernetas/InfoStrip'
import BannerRascunho from '../../components/BannerRascunho'
import CadernetaSection from '../../components/cadernetas/CadernetaSection'
import ChoiceGrid from '../../components/cadernetas/ChoiceGrid'
import FormFooter from '../../components/cadernetas/FormFooter'
import {
  getLoteByNomeCached,
  getLoteByNomeFromCacheOnly,
  getLoteByIdCached,
  getLoteDetalhesComCategoriasCached,
  getLoteDetalhesFromCacheOnly,
  getMedicamentosCached,
  getMedicamentosFromCacheOnly,
  getLotesAtivosCached,
} from '../../services/cadastroCache'
import { scrollToFirstError } from '../../utils/scrollToError'
import AnimalIdentifier from '../../components/AnimalIdentifier'
import { eventBus, CADASTRO_CACHE_UPDATED } from '../../utils/eventBus'
import { useFormValidation } from '../../hooks/useFormValidation'
import { usePhotoGps } from '../../hooks/usePhotoGps'
import { useVoiceInput } from '../../hooks/useVoiceInput'
import { useRascunhoForm } from '../../hooks/useRascunhoForm'
import { base64ToDataUrl } from '../../utils/photoCompress'
import { capitalizarCategoria, processarCategorias as processarCategoriasUtil } from '../../utils/categorias'
import MedicamentosSection, { MedicamentoItem } from '../../components/cadernetas/MedicamentosSection'

const DIAGNOSTICOS = [
  { value: 'Pneumonia', label: 'PNEUMONIA', icon: '🫁' },
  { value: 'Cobra', label: 'PICADA DE COBRA', icon: '🐍' },
  { value: 'Tremores Musculares', label: 'TREMENDO', icon: '〰️' },
  { value: 'Incoordenação Motora', label: 'ANDANDO TORTO', icon: '🌀' },
  { value: 'Febre', label: 'FEBRE', icon: '🌡️' },
  { value: 'Sangramento', label: 'SANGRAMENTO', icon: '🩸' },
  { value: 'Fratura', label: 'FRATURA', icon: '🦴' },
  { value: 'Diarreia', label: 'DIARREIA', icon: '💩' },
  { value: 'Empanzinado', label: 'EMPANZINADO', icon: '🎈' },
  { value: 'Cegueira', label: 'CEGUEIRA', icon: '👁️' },
  { value: 'Bicheira', label: 'BICHEIRA', icon: '🪰' },
  { value: 'Inchaço', label: 'INCHAÇO', icon: '⭕' },
]

function calcularIdade(dataNascimento: string | null | undefined): string {
  if (!dataNascimento) return ''
  try {
    const hoje = new Date()
    const nascimento = new Date(dataNascimento)
    if (isNaN(nascimento.getTime())) return ''
    let anos = hoje.getFullYear() - nascimento.getFullYear()
    let meses = hoje.getMonth() - nascimento.getMonth()
    if (meses < 0) {
      anos--
      meses += 12
    }
    const partes: string[] = []
    if (anos > 0) partes.push(`${anos} ${anos === 1 ? 'ano' : 'anos'}`)
    if (meses > 0) partes.push(`${meses} ${meses === 1 ? 'mês' : 'meses'}`)
    return partes.join(' e ') || '0 mês'
  } catch {
    return ''
  }
}

interface FormState {
  data: string
  pasto: string
  lote: string
  loteId: string
  pastoId: string
  idManejo: string
  brinco: string
  chip: string
  individuoId: string
  sexo: string
  raca: string
  idade: string
  categoria: string
  diagnosticos: string[]
  observacaoTratamento: string
  medicamentos: MedicamentoItem[]
  tipoRegistro: string
}

const makeInitial = (): FormState => ({
  data: todayBR(),
  pasto: '',
  lote: '',
  loteId: '',
  pastoId: '',
  idManejo: '',
  brinco: '',
  chip: '',
  individuoId: '',
  sexo: '',
  raca: '',
  idade: '',
  categoria: '',
  diagnosticos: [],
  observacaoTratamento: '',
  medicamentos: [],
  tipoRegistro: '',
})

export default function EnfermariaPage() {
  const navigate = useNavigate()
  const { usuario, fazendaId } = useSelector((state: RootState) => state.config)
  const { form, setForm, limparRascunho, rascunhoRestaurado, confirmarRascunho, descartarRascunho } =
    useRascunhoForm<FormState>({ rascunhoKey: 'enfermaria', makeInitial })
  const [errors, setErrors] = useState<{ field: string; message: string }[]>([])
  const [salvando, setSalvando] = useState(false)
  const [showSuccessModal, setShowSuccessModal] = useState(false)
  const [registroSalvo, setRegistroSalvo] = useState<any>(null)
  const [lotesDisponiveis, setLotesDisponiveis] = useState<string[]>([])
  const [lotesPastoMap, setLotesPastoMap] = useState<Record<string, string>>({})
  const [detalhesLote, setDetalhesLote] = useState<any>(null)
  const [medicamentosDisponiveis, setMedicamentosDisponiveis] = useState<any[]>([])
  const [loteAutoIdentificado, setLoteAutoIdentificado] = useState<boolean>(false)
  const [mensagemLote, setMensagemLote] = useState<string>('')
  const [carregandoLote, setCarregandoLote] = useState(false)
  const [loteIndisponivel, setLoteIndisponivel] = useState(false)
  const [recarga, setRecarga] = useState(0)
  const [medicamentosKey, setMedicamentosKey] = useState(0)
  const salvandoRef = useRef(false)
  const identificacaoSeqRef = useRef(0)

  // Hook reutilizavel de foto (sem GPS nesta caderneta)
  const {
    fotoBase64,
    capturandoFoto,
    fotoErro,
    capturarFoto,
    limpar: limparFoto,
    fotoInputRef,
    handleFileInputChange,
  } = usePhotoGps({ comGps: false })

  // Foto do brinco (opcional)
  const fotoBrinco = usePhotoGps({ comGps: false })
  const { ouvindo: ouvindoVoz, erro: vozErro, toggle: toggleVoz, parar: pararVoz } = useVoiceInput()
  const baseVozRef = useRef('')

  // Ditado: o texto parcial é acrescentado ao que já existia quando a gravação começou.
  const handleFalar = async () => {
    if (ouvindoVoz) {
      await pararVoz()
      return
    }
    baseVozRef.current = form.observacaoTratamento.trim()
    await toggleVoz((parcial) => {
      const texto = baseVozRef.current ? `${baseVozRef.current} ${parcial}` : parcial
      setForm((prev) => ({ ...prev, observacaoTratamento: texto }))
    })
  }

  const getError = (field: string) => errors.find((e) => e.field === field)?.message

  // Validation rules
  const validationRules: any = {
    data: { required: true },
    lote: { required: true },
    // Chave com "_": o useFormValidation só roda regra custom com campo vazio nesse caso
    _idAnimal: {
      custom: () => {
        const hasManejo = form.idManejo && form.idManejo.trim() !== ''
        const hasBrinco = form.brinco && form.brinco.trim() !== ''
        const hasChip = form.chip && form.chip.trim() !== ''
        if (!hasManejo && !hasBrinco && !hasChip) return 'Preencha o ID Manejo, Brinco ou Chip'
        return null
      }
    },
    // O serviço exige o pasto, que vem do lote: sem os dados do lote neste aparelho o registro seria recusado
    _dadosLote: {
      custom: () => {
        if (!form.lote) return null
        if (carregandoLote) return 'Carregando os dados do lote...'
        if (loteIndisponivel) return 'Dados do lote indisponíveis neste aparelho. Conecte à internet e atualize os dados, ou escolha outro lote.'
        if (!form.pasto) return 'Este lote não possui pasto vinculado. Vincule um pasto ao lote antes de lançar.'
        return null
      }
    },
    diagnosticos: {
      custom: (value: string[]) => {
        if (!value || value.length === 0) return 'Selecione pelo menos um diagnóstico'
        return null
      }
    },
    medicamentos: {
      custom: (value: MedicamentoItem[]) => {
        if (!value || value.length === 0) return 'Adicione pelo menos um medicamento'
        return null
      }
    },
    tipoRegistro: { required: true },
  }

  const { isValid } = useFormValidation(form, validationRules)

  // Lotes e medicamentos: cache do aparelho primeiro (a tela abre na hora com sinal ruim) e conferência com o servidor em seguida
  useEffect(() => {
    if (!fazendaId) return
    let cancelado = false
    const loadData = async () => {
      try {
        const cacheMed = await getMedicamentosFromCacheOnly(fazendaId)
        if (!cancelado && cacheMed?.length) setMedicamentosDisponiveis(cacheMed)
      } catch {
        // sem cache: segue para a consulta normal
      }
      try {
        const { lotes, lotesPastoMap: mapa } = await getLotesAtivosCached(fazendaId)
        if (!cancelado && lotes.length > 0) {
          setLotesDisponiveis(lotes)
          setLotesPastoMap(mapa)
        }
      } catch (error) {
        console.error('Erro ao carregar lotes:', error)
      }
      try {
        const medicamentos = await getMedicamentosCached(fazendaId)
        if (!cancelado && medicamentos?.length) setMedicamentosDisponiveis(medicamentos)
      } catch (error) {
        console.error('Erro ao carregar medicamentos:', error)
      }
    }
    loadData()
    return () => {
      cancelado = true
    }
  }, [fazendaId, recarga])

  // Sem lotes (ou sem os dados do lote escolhido) neste aparelho: tenta de novo quando a rede volta e a cada 25 s (o evento "online" nem sempre dispara)
  useEffect(() => {
    if (lotesDisponiveis.length > 0 && !loteIndisponivel) return
    const recarregar = () => setRecarga((r) => r + 1)
    window.addEventListener('online', recarregar)
    const timer = setInterval(recarregar, 25000)
    return () => {
      window.removeEventListener('online', recarregar)
      clearInterval(timer)
    }
  }, [lotesDisponiveis.length, loteIndisponivel])

  // Escutar atualizações do cache de cadastro
  useEffect(() => {
    const unsubscribe = eventBus.on(CADASTRO_CACHE_UPDATED, (data: any) => {
      console.log('[EnfermariaPage] Cache atualizado, recarregando dados')
      if (data) {
        setLotesDisponiveis(data.lotes || [])
        setLotesPastoMap(data.lotesPastoMap || {})
      }
    })

    return unsubscribe
  }, [])

  // Detalhes do lote: cache do aparelho primeiro, depois conferência com o servidor (limite de 3 s); auto-deriva o pasto
  useEffect(() => {
    let cancelado = false
    async function carregarDetalhesLote() {
      if (!form.lote || !fazendaId) {
        setDetalhesLote(null)
        setCarregandoLote(false)
        setLoteIndisponivel(false)
        setForm(prev => (prev.pasto || prev.loteId || prev.pastoId ? { ...prev, pasto: '', loteId: '', pastoId: '' } : prev))
        return
      }

      setCarregandoLote(true)
      setLoteIndisponivel(false)

      const aplicar = (lote: any, categoriasDetalhes: any) => {
        if (cancelado) return
        setDetalhesLote({
          ...lote,
          categorias: categoriasDetalhes?.categorias,
          n_cabecas: categoriasDetalhes?.quant_atual,
          peso_vivo_kg: categoriasDetalhes?.peso_vivo_kg,
          qtd_bezerros: categoriasDetalhes?.qtd_bezerros,
        })
        setForm(prev => ({
          ...prev,
          pasto: (lote as any).pastos?.nome || '',
          loteId: lote.id,
          pastoId: (lote as any).pasto_id || '',
        }))
        setCarregandoLote(false)
        setLoteIndisponivel(false)
      }

      let achou = false
      try {
        const loteCache = await getLoteByNomeFromCacheOnly(fazendaId, form.lote)
        if (loteCache) {
          aplicar(loteCache, await getLoteDetalhesFromCacheOnly(loteCache.id))
          achou = true
        }
      } catch {
        // segue para o servidor
      }

      try {
        const lote = await getLoteByNomeCached(fazendaId, form.lote)
        if (lote) {
          aplicar(lote, await getLoteDetalhesComCategoriasCached(lote.id))
          achou = true
        }
      } catch (error) {
        console.error('Erro ao carregar detalhes do lote:', error)
      }

      if (!cancelado && !achou) {
        setDetalhesLote(null)
        setLoteIndisponivel(true)
        setCarregandoLote(false)
        setForm(prev => ({ ...prev, pasto: '', loteId: '', pastoId: '' }))
      }
    }

    carregarDetalhesLote()
    return () => {
      cancelado = true
    }
  }, [form.lote, fazendaId, recarga])

  const handleLimpar = () => {
    limparRascunho()
    limparFoto()
    fotoBrinco.limpar()
    setLoteAutoIdentificado(false)
    setMensagemLote('')
    setDetalhesLote(null)
    setMedicamentosKey((k) => k + 1)
  }

  const handleSalvar = async () => {
    if (salvandoRef.current) return
    salvandoRef.current = true
    setSalvando(true)
    setErrors([])

    let result: Awaited<ReturnType<typeof salvarRegistro>>
    try {
      result = await salvarRegistro('enfermaria', {
      data: form.data,
      responsavel: usuario,
      usuario: usuario,
      pasto: form.pasto,
      pastoId: form.pastoId,
      lote: form.lote,
      loteId: form.loteId,
      idManejo: form.idManejo,
      brinco: form.brinco,
      chip: form.chip,
      individuoId: form.individuoId,
      sexo: form.sexo,
      raca: form.raca,
      idade: form.idade,
      categoria: form.categoria,
      diagnosticos: form.diagnosticos,
      medicamentos: form.medicamentos,
      observacaoTratamento: form.observacaoTratamento,
      tipoRegistro: form.tipoRegistro,
      fotoBase64: fotoBase64 || null,
      fotoBrincoBase64: fotoBrinco.fotoBase64 || null,
      })
    } finally {
      salvandoRef.current = false
      setSalvando(false)
    }

    if (!result.success && result.errors) {
      setErrors(result.errors)
      scrollToFirstError(result.errors)
    } else {
      setRegistroSalvo(result.registro)
      setShowSuccessModal(true)
      handleLimpar()
    }
  }

  const handleNewRecord = () => {
    setShowSuccessModal(false)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleExit = () => {
    setShowSuccessModal(false)
    navigate('/')
  }

  const categoriasLoteStr = detalhesLote?.categorias
    ? processarCategoriasUtil(detalhesLote.categorias).map(capitalizarCategoria).join(', ')
    : ''

  const pendenciaTexto = (() => {
    if (!form.idManejo.trim() && !form.brinco.trim() && !form.chip.trim()) return 'Falta o ID manejo, brinco ou chip'
    if (!form.lote) return 'Falta escolher o pasto/lote'
    if (carregandoLote) return 'Carregando os dados do lote...'
    if (loteIndisponivel) return 'Dados do lote indisponíveis neste aparelho. Conecte à internet e atualize os dados.'
    if (!form.pasto) return 'Este lote não possui pasto vinculado'
    if (form.diagnosticos.length === 0) return 'Falta marcar o que o animal tem'
    if (!form.tipoRegistro) return 'Falta escolher curativo ou preventivo'
    if (form.medicamentos.length === 0) return 'Falta adicionar um medicamento'
    return undefined
  })()

  return (
    <>
      <CadernetaLayout
        title="ENFERMARIA"
        cadernetaId="enfermaria"
        dateContent={<DatePicker value={form.data} onChange={(val) => setForm((p) => ({ ...p, data: val }))} maxDate={todayBR()} variant="header" compact inline />}
      >
        <BannerRascunho visible={rascunhoRestaurado} onConfirmar={confirmarRascunho} onDescartar={descartarRascunho} />
        {errors.length > 0 && <ValidationMessage errors={errors} />}

        <CadernetaSection numero={1} titulo="IDENTIFICAÇÃO">
          {loteAutoIdentificado ? (
            <Input
              label={<span>LOTE <span className="text-red-500">*</span></span>}
              value={form.lote}
              readOnly
              id="lote"
            />
          ) : lotesDisponiveis.length > 0 ? (
            <SearchableModal
              label={<span>PASTO/LOTE <span className="text-red-500">*</span></span>}
              value={form.lote}
              onChange={(val) => {
                // o efeito dos detalhes do lote preenche loteId e pasto (cache primeiro)
                setForm((p) => ({ ...p, lote: val, loteId: '', pasto: '', pastoId: '' }))
              }}
              error={getError('lote')}
              options={lotesDisponiveis}
              secondaryText={(lote) => lotesPastoMap[lote] || ''}
              placeholder="Buscar pasto ou lote..."
              id="lote"
              name="lote"
              disabled={!form.idManejo && !form.brinco && !form.chip}
            />
          ) : (
            <Input
              label={<span>PASTO/LOTE <span className="text-red-500">*</span></span>}
              placeholder="Carregando..."
              value={form.lote}
              disabled
              id="lote"
            />
          )}
          {mensagemLote && (
            <p className="text-sm text-amber-600 font-medium">{mensagemLote}</p>
          )}
          {detalhesLote && (
            <InfoCard
              icon={Beef}
              title={form.lote}
              subtitle={form.pasto || 'Sem pasto associado'}
              stats={[
                { label: 'Cabeças', value: detalhesLote.n_cabecas != null ? String(detalhesLote.n_cabecas) : '-', span: 1 },
                {
                  label: 'PV médio',
                  value: detalhesLote.peso_vivo_kg != null
                    ? `${Number(detalhesLote.peso_vivo_kg).toLocaleString('pt-BR', { maximumFractionDigits: 0 })} kg`
                    : '-',
                  span: 1,
                },
                ...(categoriasLoteStr ? [{ label: 'Categorias', value: categoriasLoteStr, span: 2 }] : []),
              ]}
            />
          )}
          <AnimalIdentifier
            fazendaId={fazendaId}
            valueManejo={form.idManejo}
            valueBrinco={form.brinco}
            valueChip={form.chip}
            required
            mensagemNovoAnimal="ID novo: o registro guarda só o ID digitado, o animal não entra no cadastro."
            onChange={({ idManejo, idBrinco, idChip, individuoId, animalData }) => {
              const loteAtual = animalData?.lote_atual
              const seq = ++identificacaoSeqRef.current

              // Dados do animal entram na hora; o lote é resolvido em seguida (cache primeiro, 3 s de limite)
              setForm(prev => ({
                ...prev,
                idManejo: idManejo,
                brinco: idBrinco,
                chip: idChip,
                individuoId: individuoId || '',
                sexo: animalData?.sexo || prev.sexo,
                raca: animalData?.raca || prev.raca,
                idade: calcularIdade(animalData?.data_nascimento) || prev.idade,
                categoria: animalData?.categoria || prev.categoria,
              }))

              if (!loteAtual) {
                setLoteAutoIdentificado(false)
                setMensagemLote('Animal sem lote vinculado. Informe o lote manualmente.')
                return
              }

              setMensagemLote('')
              void (async () => {
                let lote: any = null
                try {
                  lote = await getLoteByIdCached(fazendaId, loteAtual)
                } catch {
                  lote = null
                }
                if (seq !== identificacaoSeqRef.current) return
                if (lote) {
                  setLoteAutoIdentificado(true)
                  setMensagemLote('')
                  setForm(prev => ({ ...prev, lote: lote.nome || '', loteId: lote.id || '' }))
                } else {
                  setLoteAutoIdentificado(false)
                  setMensagemLote('Não foi possível identificar o lote do animal. Informe o lote manualmente.')
                }
              })()
            }}
          />

          {/* Foto do brinco (opcional) */}
          <div className="flex flex-col gap-2">
            <label className="text-[13px] font-bold uppercase text-gray-900">Foto do brinco (opcional)</label>
            <div className="relative">
              <button
                type="button"
                onClick={() => fotoBrinco.capturarFoto()}
                disabled={fotoBrinco.capturandoFoto}
                className={`relative flex min-h-[56px] w-full items-center justify-center gap-2 overflow-hidden rounded-xl border-2 px-3 py-2.5 transition-all active:scale-[0.99] disabled:opacity-60 ${
                  fotoBrinco.fotoBase64
                    ? 'h-24 border-green-500 p-0'
                    : 'border-brand-900 bg-brand-900 text-white hover:bg-brand-800'
                }`}
              >
                {fotoBrinco.fotoBase64 ? (
                  <>
                    <img src={base64ToDataUrl(fotoBrinco.fotoBase64)} alt="Foto do brinco" className="h-full w-full object-cover" />
                    <span className="absolute left-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-green-500 text-sm font-black text-white">✓</span>
                  </>
                ) : (
                  <>
                    <span className="text-lg leading-none">📷</span>
                    <span className="text-sm font-extrabold uppercase tracking-wide">
                      {fotoBrinco.capturandoFoto ? 'Capturando...' : 'Foto do brinco'}
                    </span>
                  </>
                )}
              </button>
              {fotoBrinco.fotoBase64 && (
                <button
                  type="button"
                  onClick={fotoBrinco.limpar}
                  aria-label="Remover foto do brinco"
                  className="absolute right-1.5 top-1.5 flex !min-h-0 h-6 w-6 items-center justify-center rounded-full bg-black/60 text-white"
                >
                  <X className="h-3.5 w-3.5" strokeWidth={3} />
                </button>
              )}
            </div>
            {fotoBrinco.fotoErro && <InfoStrip tone="danger">{fotoBrinco.fotoErro}</InfoStrip>}
            <input
              ref={fotoBrinco.fotoInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={fotoBrinco.handleFileInputChange}
              className="hidden"
            />
          </div>
        </CadernetaSection>

        <CadernetaSection numero={2} titulo="O QUE ELE TEM? (MARQUE TODOS)" required>
          <ChoiceGrid
            options={DIAGNOSTICOS.map((d) => ({ ...d, tone: 'danger-solid' as const }))}
            mode="multi"
            values={form.diagnosticos}
            onChangeMulti={(vals) => setForm((p) => ({ ...p, diagnosticos: vals }))}
            cols={3}
            showCheck={false}
            labelSize="xs"
            dataField="diagnosticos"
          />
          {getError('diagnosticos') && (
            <p className="text-sm text-red-500">{getError('diagnosticos')}</p>
          )}
        </CadernetaSection>

        <CadernetaSection numero={3} titulo="TRATAMENTO">
          <div className="flex flex-col gap-2" data-field="tipoRegistro">
            <p className="text-[15px] font-bold text-gray-900">
              TIPO <span className="text-red-500">*</span>
            </p>
            <ChoiceGrid
              options={[
                { value: 'Curativo', label: 'CURATIVO', icon: '🩹' },
                { value: 'Preventivo', label: 'PREVENTIVO', icon: '🛡️' },
              ]}
              value={form.tipoRegistro}
              onChange={(val) => setForm((p) => ({ ...p, tipoRegistro: val }))}
              cols={2}
              showCheck={false}
            />
            {getError('tipoRegistro') && (
              <p className="text-sm text-red-500">{getError('tipoRegistro')}</p>
            )}
          </div>

          <div className="flex flex-col gap-2" data-field="medicamentos">
            <p className="text-[15px] font-bold text-gray-900">
              MEDICAMENTO <span className="text-red-500">*</span>
            </p>
            <MedicamentosSection
              key={medicamentosKey}
              items={form.medicamentos}
              onChange={(items) => setForm(prev => ({ ...prev, medicamentos: items }))}
              medicamentosDisponiveis={medicamentosDisponiveis}
            />
            {getError('medicamentos') && (
              <p className="text-sm text-red-500">{getError('medicamentos')}</p>
            )}
          </div>
        </CadernetaSection>

        <CadernetaSection numero={4} titulo="Foto ou recado">
          {fotoBase64 && (
            <div className="flex flex-col gap-3">
              <img
                src={base64ToDataUrl(fotoBase64)}
                alt="Foto do animal"
                className="mx-auto w-full max-w-sm rounded-xl border border-gray-200"
              />
              <button
                type="button"
                onClick={limparFoto}
                className="w-full rounded-xl bg-gray-200 px-3 py-2.5 text-sm font-bold text-gray-600 transition-colors hover:bg-gray-300 active:scale-[0.99]"
              >
                🗑️ REMOVER FOTO
              </button>
            </div>
          )}
          <div className="grid grid-cols-2 gap-2">
            {!fotoBase64 && (
              <button
                type="button"
                onClick={capturarFoto}
                disabled={capturandoFoto}
                className="flex min-h-[56px] items-center justify-center gap-2 rounded-xl bg-brand-900 px-3 py-2.5 text-white transition-colors hover:bg-brand-800 active:scale-[0.99] disabled:opacity-60"
              >
                <span className="text-lg leading-none">📷</span>
                <span className="text-sm font-extrabold uppercase tracking-wide">
                  {capturandoFoto ? 'Capturando...' : 'Tirar foto'}
                </span>
              </button>
            )}
            <button
              type="button"
              onClick={handleFalar}
              className={`flex min-h-[56px] items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-white transition-colors active:scale-[0.99] ${
                fotoBase64 ? 'col-span-2' : ''
              } ${ouvindoVoz ? 'animate-pulse bg-red-600' : 'bg-gray-600 hover:bg-gray-700'}`}
            >
              <span className="text-lg leading-none">🎤</span>
              <span className="text-sm font-extrabold uppercase tracking-wide">{ouvindoVoz ? 'Ouvindo...' : 'Gravar áudio'}</span>
            </button>
          </div>
          {fotoErro && <InfoStrip tone="danger">{fotoErro}</InfoStrip>}
          {vozErro && <InfoStrip tone="danger">{vozErro}</InfoStrip>}
          <TextArea
            label="OBSERVAÇÃO"
            placeholder="Detalhes adicionais (opcional)"
            value={form.observacaoTratamento}
            onChange={(e) => setForm((p) => ({ ...p, observacaoTratamento: e.target.value }))}
            rows={2}
          />
          <input
            ref={fotoInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleFileInputChange}
            className="hidden"
          />
        </CadernetaSection>

        <FormFooter
          onSalvar={handleSalvar}
          onLimpar={handleLimpar}
          salvando={salvando}
          disabled={!isValid}
          formValido={isValid}
          pendenciaTexto={pendenciaTexto}
        />
      </CadernetaLayout>

      <SuccessModal
        isOpen={showSuccessModal}
        onClose={() => setShowSuccessModal(false)}
        onNewRecord={handleNewRecord}
        onExit={handleExit}
        cadernetaName="Enfermaria"
        registro={registroSalvo}
        caderneta="enfermaria"
      />
    </>
  )
}
