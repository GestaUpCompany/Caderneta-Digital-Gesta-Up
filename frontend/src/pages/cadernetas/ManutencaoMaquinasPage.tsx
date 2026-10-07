import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { Truck } from 'lucide-react'
import { Input, DatePicker, ValidationMessage } from '../../components/ui'
import SearchableModal from '../../components/ui/SearchableModal'
import SuccessModal from '../../components/SuccessModal'
import BannerRascunho from '../../components/BannerRascunho'
import CadernetaLayout from '../../components/CadernetaLayout'
import CadernetaSection from '../../components/cadernetas/CadernetaSection'
import InfoCard from '../../components/cadernetas/InfoCard'
import InfoStrip from '../../components/cadernetas/InfoStrip'
import FormFooter from '../../components/cadernetas/FormFooter'
import { salvarRegistro } from '../../services/api'
import { todayBR } from '../../utils/formatDate'
import { RootState } from '../../store/store'
import { getCachedCadastroData, getMaquinasVeiculosCached } from '../../services/cadastroCache'
import { getFuncionarios } from '../../services/supabaseService'
import { scrollToFirstError } from '../../utils/scrollToError'
import { useFormValidation } from '../../hooks/useFormValidation'
import { atualizarNomeUsuarioConfig } from '../../utils/nomeUsuario'
import { normalizarNumeroString } from '../../utils/formatNumber'
import { useRascunhoForm } from '../../hooks/useRascunhoForm'
import { usePhotoGps } from '../../hooks/usePhotoGps'
import { useVoiceInput } from '../../hooks/useVoiceInput'
import { base64ToDataUrl } from '../../utils/photoCompress'
import { iniciais, corAvatar } from '../../utils/avatar'

// Checklist vira lista de problemas: clicar marca "o problema existe".
// O payload mantem as chaves e o formato historicos: valor 'S' = condicao
// adequada (padrao, nao marcado), 'N' = problema marcado.
const CHECKLIST_PROBLEMAS = [
  { campo: 'abastecimentoRealizado', label: 'NÃO ABASTECEU', aviso: 'Não abasteceu: mostre e conte' },
  { campo: 'lavagemRealizada', label: 'NÃO LAVOU', aviso: 'Não lavou: mostre e conte' },
  { campo: 'vidrosPerfeitos', label: 'VIDROS COM PROBLEMA', aviso: 'Vidros com problema: mostre e conte' },
  { campo: 'freiosBons', label: 'FREIOS COM PROBLEMA', aviso: 'Freios com problema: mostre e conte' },
  { campo: 'bateriaBoa', label: 'BATERIA COM PROBLEMA', aviso: 'Bateria com problema: mostre e conte' },
  { campo: 'conferiuEletrica', label: 'NÃO CONFERIU A ELÉTRICA', aviso: 'Elétrica não conferida: mostre e conte' },
  { campo: 'maquinaEngraxada', label: 'NÃO ENGRAXOU', aviso: 'Não engraxou: mostre e conte' },
  { campo: 'nivelAguaIdeal', label: 'NÍVEL DE ÁGUA FORA DO IDEAL', aviso: 'Nível de água fora do ideal: mostre e conte' },
  { campo: 'conferiuNivelOleo', label: 'NÃO CONFERIU O ÓLEO', aviso: 'Óleo não conferido: mostre e conte' },
  { campo: 'calibrouPneus', label: 'NÃO CALIBROU OS PNEUS', aviso: 'Pneus não calibrados: mostre e conte' },
  { campo: 'limpouRadiador', label: 'NÃO LIMPOU O RADIADOR', aviso: 'Radiador não limpo: mostre e conte' },
  { campo: 'tapetesBons', label: 'TAPETES COM PROBLEMA', aviso: 'Tapetes com problema: mostre e conte' },
  { campo: 'assentoBom', label: 'ASSENTO COM PROBLEMA', aviso: 'Assento com problema: mostre e conte' },
] as const

type CampoChecklist = typeof CHECKLIST_PROBLEMAS[number]['campo']

interface ItemChecklist {
  valor: string | null
  observacao: string
  fotoBase64?: string
}

interface FormState {
  data: string
  responsavelChecklist: string
  operadorMotorista: string
  maquinaVeiculo: string
  placa: string
  odometro: string
  checklist: Record<string, ItemChecklist>
  observacao: string
}

const makeInitial = (): FormState => ({
  data: todayBR(),
  responsavelChecklist: '',
  operadorMotorista: '',
  maquinaVeiculo: '',
  placa: '',
  odometro: '',
  checklist: CHECKLIST_PROBLEMAS.reduce((acc, { campo }) => {
    acc[campo] = { valor: 'S', observacao: '', fotoBase64: '' }
    return acc
  }, {} as FormState['checklist']),
  observacao: '',
})

// Alvo do ditado: um item do checklist ou a observacao geral
type AlvoVoz = CampoChecklist | 'observacao'

export default function ManutencaoMaquinasPage() {
  const navigate = useNavigate()
  const { fazendaId, usuario } = useSelector((state: RootState) => state.config)

  const { form, setForm, limparRascunho, rascunhoRestaurado, confirmarRascunho, descartarRascunho } =
    useRascunhoForm<FormState>({ rascunhoKey: 'manutencao-maquinas', makeInitial })
  const [errors, setErrors] = useState<{ field: string; message: string }[]>([])
  const [salvando, setSalvando] = useState(false)
  const [showSuccessModal, setShowSuccessModal] = useState(false)
  const [registroSalvo, setRegistroSalvo] = useState<any>(null)
  const [funcionariosDisponiveis, setFuncionariosDisponiveis] = useState<string[]>([])
  const [maquinasVeiculosDisponiveis, setMaquinasVeiculosDisponiveis] = useState<any[]>([])
  const [trocandoResponsavel, setTrocandoResponsavel] = useState(false)
  const [campoFotoAtual, setCampoFotoAtual] = useState<CampoChecklist | null>(null)
  const [alvoVozAtual, setAlvoVozAtual] = useState<AlvoVoz | null>(null)
  const baseVozRef = useRef('')

  // Foto do painel (horimetro): vai em foto_url, como a foto unica de antes
  const {
    fotoBase64,
    capturandoFoto,
    fotoErro,
    capturarFoto,
    limpar: limparFoto,
    fotoInputRef,
    handleFileInputChange,
  } = usePhotoGps({ comGps: false })

  // Foto por item do checklist (vai dentro do jsonb)
  const {
    capturandoFoto: capturandoFotoItem,
    fotoErro: fotoItemErro,
    capturarFoto: capturarFotoItem,
    fotoInputRef: fotoItemInputRef,
    handleFileInputChange: handleFileInputItemChange,
  } = usePhotoGps({ comGps: false })

  const {
    ouvindo: ouvindoVoz,
    erro: vozErro,
    toggle: toggleVoz,
    parar: pararVoz,
  } = useVoiceInput()

  const set = (key: keyof FormState) => (value: string) => setForm(prev => ({ ...prev, [key]: value }))
  const setInput = (key: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement>) => setForm(prev => ({ ...prev, [key]: e.target.value }))

  const atualizarItem = (campo: CampoChecklist, parcial: Partial<ItemChecklist>) =>
    setForm((p) => ({
      ...p,
      checklist: {
        ...p.checklist,
        [campo]: { ...p.checklist[campo], ...parcial } as ItemChecklist,
      },
    }))

  const toggleProblema = (campo: CampoChecklist) =>
    setForm((p) => {
      const atual = p.checklist[campo]
      const marcado = atual?.valor === 'N'
      return {
        ...p,
        checklist: {
          ...p.checklist,
          // Desmarcar zera foto e observacao (item volta a "ok")
          [campo]: marcado
            ? { valor: 'S', observacao: '', fotoBase64: '' }
            : { ...atual, valor: 'N', observacao: atual?.observacao || '' },
        },
      }
    })

  const handleTirarFotoItem = async (campo: CampoChecklist) => {
    setCampoFotoAtual(campo)
    const base64 = await capturarFotoItem()
    // Nativo retorna a foto aqui; no web o retorno vem pelo input file hidden
    if (base64) atualizarItem(campo, { fotoBase64: base64 })
  }

  const handleFotoInputItem = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const result = await handleFileInputItemChange(e)
    if (result?.fotoBase64 && campoFotoAtual) {
      atualizarItem(campoFotoAtual, { fotoBase64: result.fotoBase64 })
    }
  }

  // Ditado: o texto parcial e acrescentado ao que ja existia quando a
  // gravacao comecou (da para falar mais de uma vez).
  const handleFalar = async (alvo: AlvoVoz) => {
    if (ouvindoVoz) {
      await pararVoz()
      if (alvoVozAtual === alvo) return
    }
    setAlvoVozAtual(alvo)
    baseVozRef.current = (alvo === 'observacao'
      ? form.observacao
      : form.checklist[alvo]?.observacao || ''
    ).trim()
    await toggleVoz((parcial) => {
      const texto = baseVozRef.current ? `${baseVozRef.current} ${parcial}` : parcial
      if (alvo === 'observacao') setForm((prev) => ({ ...prev, observacao: texto }))
      else atualizarItem(alvo, { observacao: texto })
    })
  }

  const getError = (field: string) => errors.find((e) => e.field === field)?.message

  // Itens do checklist nao sao obrigatorios: "nao marcado" ja significa
  // "condicao adequada".
  const validationRules: any = {
    data: { required: true },
    responsavelChecklist: { required: true },
    operadorMotorista: { required: true },
    maquinaVeiculo: { required: true },
    odometro: { required: true },
  }

  const { isValid } = useFormValidation(form, validationRules)

  const handleSalvar = async () => {
    setSalvando(true)
    setErrors([])

    // Rascunhos antigos podem ter valor '' (nao respondido): conta como adequado
    const checklist = Object.fromEntries(
      CHECKLIST_PROBLEMAS.map(({ campo }) => {
        const item = form.checklist[campo]
        const marcado = item?.valor === 'N'
        return [campo, {
          valor: marcado ? 'N' : 'S',
          observacao: marcado ? item?.observacao || '' : '',
          fotoBase64: marcado ? item?.fotoBase64 || undefined : undefined,
        }]
      })
    )

    const result = await salvarRegistro('manutencao-maquinas', {
      data: form.data,
      responsavelChecklist: form.responsavelChecklist,
      operadorMotorista: form.operadorMotorista,
      maquinaVeiculo: form.maquinaVeiculo,
      placa: form.placa,
      odometro: normalizarNumeroString(form.odometro),
      checklist,
      observacao: form.observacao || '',
      fotoBase64: fotoBase64 || null,
    })

    setSalvando(false)
    if (!result.success && result.errors) {
      setErrors(result.errors)
      scrollToFirstError(result.errors)
    } else {
      setRegistroSalvo(result.registro)
      setShowSuccessModal(true)
      limparRascunho()
      limparFoto()
      setTrocandoResponsavel(false)
    }
  }

  const handleLimpar = () => {
    limparRascunho()
    limparFoto()
    setTrocandoResponsavel(false)
  }

  const handleNewRecord = () => {
    setShowSuccessModal(false)
    setTimeout(() => {
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }, 100)
  }

  // Responsavel vem do login; so preenche quando vazio (rascunho/limpar)
  useEffect(() => {
    if (!form.responsavelChecklist && usuario) {
      setForm(prev => prev.responsavelChecklist ? prev : { ...prev, responsavelChecklist: usuario })
    }
  }, [form.responsavelChecklist, usuario])

  // Carregar funcionários do cache
  useEffect(() => {
    const loadData = async () => {
      const cache = await getCachedCadastroData()
      if (cache && cache.funcionarios && cache.funcionarios.length > 0) {
        setFuncionariosDisponiveis(cache.funcionarios)
      } else if (fazendaId) {
        try {
          const funcionariosData = await getFuncionarios(fazendaId)
          setFuncionariosDisponiveis(funcionariosData?.map((f: any) => f.nome) || [])
        } catch (error) {
          console.error('Erro ao carregar funcionários do Supabase:', error)
        }
      }
    }
    loadData()
  }, [fazendaId])

  // Carregar máquinas/veículos (com cache lazy para offline)
  useEffect(() => {
    const loadData = async () => {
      if (fazendaId) {
        try {
          const maquinasData = await getMaquinasVeiculosCached(fazendaId)
          const filtered = (maquinasData || []).filter((m: any) => m.status?.toLowerCase() === 'ativo')
          setMaquinasVeiculosDisponiveis(filtered)
        } catch (error) {
          console.error('Erro ao carregar máquinas/veículos:', error)
        }
      }
    }
    loadData()
  }, [fazendaId])

  // Buscar detalhes da máquina/veículo quando selecionada
  useEffect(() => {
    async function carregarDetalhesMaquinaVeiculo() {
      if (!form.maquinaVeiculo || !fazendaId) {
        setForm(prev => ({ ...prev, placa: '' }))
        return
      }
      try {
        const lista = await getMaquinasVeiculosCached(fazendaId)
        if (!lista || lista.length === 0) {
          // Cache ainda nao carregou: manter valores existentes (rascunho pode ter restaurado)
          return
        }
        const maquina = lista.find((m: any) => m.nome === form.maquinaVeiculo) || null
        if (maquina) {
          setForm(prev => ({ ...prev, placa: maquina.placa || '' }))
        } else {
          setForm(prev => ({ ...prev, placa: '' }))
        }
      } catch (error) {
        console.error('Erro ao carregar detalhes da máquina/veículo:', error)
        setForm(prev => ({ ...prev, placa: '' }))
      }
    }
    carregarDetalhesMaquinaVeiculo()
  }, [form.maquinaVeiculo, fazendaId])

  const maquinaSelecionada = maquinasVeiculosDisponiveis.find((m: any) => m.nome === form.maquinaVeiculo)
  const problemasMarcados = CHECKLIST_PROBLEMAS.filter(({ campo }) => form.checklist[campo]?.valor === 'N').length

  const botaoFalar = (alvo: AlvoVoz, className = '') => (
    <button
      type="button"
      onClick={() => handleFalar(alvo)}
      className={`flex min-h-[56px] flex-col items-center justify-center gap-1 rounded-xl px-3 py-2.5 text-white transition-colors active:scale-[0.99] ${
        ouvindoVoz && alvoVozAtual === alvo ? 'animate-pulse bg-red-600' : 'bg-gray-600 hover:bg-gray-700'
      } ${className}`}
    >
      <span className="text-lg leading-none">🎤</span>
      <span className="text-xs font-extrabold uppercase tracking-wide">
        {ouvindoVoz && alvoVozAtual === alvo ? 'Ouvindo...' : 'Falar'}
      </span>
    </button>
  )

  return (
    <>
      <CadernetaLayout
        title="MANUTENÇÃO MÁQUINAS"
        cadernetaId="manutencao-maquinas"
        dateContent={<DatePicker value={form.data} onChange={set('data')} variant="header" compact inline />}
      >
        <BannerRascunho
          visible={rascunhoRestaurado}
          onConfirmar={confirmarRascunho}
          onDescartar={descartarRascunho}
        />
        {errors.length > 0 && <ValidationMessage errors={errors} />}

        {/* Seção 1: Dados */}
        <CadernetaSection numero={1} titulo="Dados">
          {maquinasVeiculosDisponiveis.length > 0 ? (
            <SearchableModal
              label={<span>MÁQUINA/VEÍCULO <span className="text-red-500">*</span></span>}
              value={form.maquinaVeiculo}
              onChange={set('maquinaVeiculo')}
              error={getError('maquinaVeiculo')}
              options={maquinasVeiculosDisponiveis.map(m => m.nome)}
              placeholder="Buscar máquina/veículo..."
              id="maquinaVeiculo"
              name="maquinaVeiculo"
            />
          ) : (
            <Input
              label={<span>MÁQUINA/VEÍCULO <span className="text-red-500">*</span></span>}
              placeholder="Carregando..."
              value={form.maquinaVeiculo}
              onChange={setInput('maquinaVeiculo')}
              error={getError('maquinaVeiculo')}
              disabled
            />
          )}
          {form.maquinaVeiculo && (
            <InfoCard
              icon={Truck}
              title={form.maquinaVeiculo}
              subtitle={maquinaSelecionada?.categoria || maquinaSelecionada?.tipo || undefined}
              stats={[
                { label: 'Placa', value: form.placa || '-', span: 1 },
                { label: 'Modelo', value: maquinaSelecionada?.modelo || '-', span: 1 },
              ]}
            />
          )}

          {funcionariosDisponiveis.length > 0 ? (
            <div data-field="operadorMotorista" id="operadorMotorista">
              <label className="mb-2 block text-[15px] font-bold uppercase text-gray-900">
                Operador/Motorista <span className="text-red-500">*</span>
              </label>
              <div className="grid grid-cols-4 gap-2">
                {funcionariosDisponiveis.map((nome) => {
                  const selecionado = form.operadorMotorista === nome
                  return (
                    <button
                      key={nome}
                      type="button"
                      onClick={() => set('operadorMotorista')(selecionado ? '' : nome)}
                      aria-pressed={selecionado}
                      className={`flex !min-h-0 min-w-0 flex-col items-center justify-center gap-1.5 rounded-xl border-2 px-1 py-2.5 transition-all active:scale-95 ${
                        selecionado
                          ? 'border-brand-900 bg-brand-900 text-white'
                          : 'border-gray-300 bg-white text-gray-900 hover:border-gray-400'
                      }`}
                    >
                      <span
                        className={`flex h-11 w-11 items-center justify-center rounded-full text-sm font-extrabold ${
                          selecionado ? 'border-2 border-white/80 bg-white/20 text-white' : corAvatar(nome)
                        }`}
                      >
                        {iniciais(nome)}
                      </span>
                      <span className="w-full truncate text-center text-xs font-bold leading-tight">
                        {nome.split(' ')[0]}
                      </span>
                    </button>
                  )
                })}
              </div>
              {getError('operadorMotorista') && (
                <p className="mt-2 text-base font-semibold text-red-700">{getError('operadorMotorista')}</p>
              )}
            </div>
          ) : (
            <Input
              label={<span>OPERADOR/MOTORISTA <span className="text-red-500">*</span></span>}
              placeholder="Carregando..."
              value={form.operadorMotorista}
              onChange={setInput('operadorMotorista')}
              error={getError('operadorMotorista')}
              disabled
              id="operadorMotorista"
            />
          )}

          {form.responsavelChecklist && !trocandoResponsavel ? (
            <div data-field="responsavelChecklist" className="flex items-center gap-2">
              <InfoStrip tone="neutral" icon="👤" className="flex-1">
                Responsável: {form.responsavelChecklist}{form.responsavelChecklist === usuario ? ' (pega do login)' : ''}
              </InfoStrip>
              {funcionariosDisponiveis.length > 0 && (
                <button
                  type="button"
                  onClick={() => setTrocandoResponsavel(true)}
                  className="!min-h-0 shrink-0 rounded-lg bg-gray-200 px-3 py-2 text-xs font-bold uppercase text-gray-700 active:scale-95"
                >
                  Trocar
                </button>
              )}
            </div>
          ) : funcionariosDisponiveis.length > 0 ? (
            <SearchableModal
              label={<span>RESPONSÁVEL <span className="text-red-500">*</span></span>}
              value={form.responsavelChecklist}
              onChange={(val) => { set('responsavelChecklist')(val); atualizarNomeUsuarioConfig(val); setTrocandoResponsavel(false) }}
              error={getError('responsavelChecklist')}
              options={funcionariosDisponiveis}
              placeholder="Buscar funcionário..."
              id="responsavelChecklist"
              name="responsavelChecklist"
            />
          ) : (
            <Input
              label={<span>RESPONSÁVEL <span className="text-red-500">*</span></span>}
              placeholder="Carregando..."
              value={form.responsavelChecklist}
              onChange={(e) => { setInput('responsavelChecklist')(e); atualizarNomeUsuarioConfig(e.target.value) }}
              error={getError('responsavelChecklist')}
              disabled
              id="responsavelChecklist"
            />
          )}

          <div>
            <label className="mb-2 block text-[15px] font-bold uppercase text-gray-900">
              Odômetro/Horímetro <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-2 gap-2" data-field="odometro">
              <Input
                placeholder="Informe a quilometragem/horímetro"
                value={form.odometro}
                onChange={(e) => {
                  // Só dígitos e uma única vírgula como separador decimal
                  const limpo = e.target.value.replace(/[^\d,]/g, '')
                  const i = limpo.indexOf(',')
                  const valor = i === -1 ? limpo : limpo.slice(0, i + 1) + limpo.slice(i + 1).replace(/,/g, '')
                  set('odometro')(valor)
                }}
                error={getError('odometro')}
                inputMode="decimal"
              />
              {fotoBase64 ? (
                <button
                  type="button"
                  onClick={limparFoto}
                  aria-label="Remover foto do painel"
                  className="relative !min-h-0 h-14 w-14 overflow-hidden rounded-xl border border-gray-300 active:scale-95"
                >
                  <img src={base64ToDataUrl(fotoBase64)} alt="Foto do painel" className="h-full w-full object-cover" />
                  <span className="absolute inset-x-0 bottom-0 bg-black/60 text-[10px] font-bold text-white">REMOVER</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => capturarFoto()}
                  disabled={capturandoFoto}
                  className="flex !min-h-0 h-14 items-center justify-center gap-1.5 rounded-xl bg-brand-900 px-3 text-xs font-extrabold uppercase tracking-wide text-white hover:bg-brand-800 active:scale-[0.99] disabled:opacity-60"
                >
                  <span className="text-lg leading-none">📷</span>
                  {capturandoFoto ? 'Capturando...' : 'Foto do painel'}
                </button>
              )}
            </div>
            {fotoErro && <InfoStrip tone="danger" className="mt-2">{fotoErro}</InfoStrip>}
          </div>
        </CadernetaSection>

        {/* Seção 2: Checklist */}
        <CadernetaSection numero={2} titulo="Checklist">
          <p className="-mt-2 text-sm text-gray-500">
            Toque em um item se encontrar o problema. Não tocar significa que está tudo certo.
          </p>
          {CHECKLIST_PROBLEMAS.map(({ campo, label, aviso }) => {
            const item = form.checklist[campo]
            const marcado = item?.valor === 'N'
            const foto = item?.fotoBase64 || ''
            return (
              <div key={campo} className="flex flex-col gap-2">
                <button
                  type="button"
                  onClick={() => toggleProblema(campo)}
                  data-field={campo}
                  className={`flex min-h-[52px] w-full cursor-pointer items-center justify-between gap-3 rounded-xl border-2 px-4 py-3 text-left transition-all active:scale-[0.99] ${
                    marcado
                      ? 'border-red-500 bg-red-50 text-red-800'
                      : 'border-gray-300 bg-white text-gray-900 hover:border-gray-400'
                  }`}
                >
                  <span className="text-sm font-bold leading-tight">{label}</span>
                  {marcado && <span className="text-lg leading-none">⚠️</span>}
                </button>

                {marcado && (
                  <div className="flex flex-col gap-2 rounded-xl border border-red-200 bg-red-50/60 p-3">
                    <InfoStrip tone="danger" icon="⚠️">{aviso}</InfoStrip>

                    {foto && (
                      <div className="flex items-start gap-3">
                        <img
                          src={base64ToDataUrl(foto)}
                          alt={`Foto de ${label}`}
                          className="h-20 w-20 rounded-lg border border-gray-200 object-cover"
                        />
                        <button
                          type="button"
                          onClick={() => atualizarItem(campo, { fotoBase64: '' })}
                          className="flex-1 rounded-xl bg-gray-200 px-3 py-2.5 text-sm font-bold text-gray-600 transition-colors hover:bg-gray-300 active:scale-[0.99]"
                        >
                          🗑️ REMOVER FOTO
                        </button>
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-2">
                      {!foto && (
                        <button
                          type="button"
                          onClick={() => handleTirarFotoItem(campo)}
                          disabled={capturandoFotoItem}
                          className="flex min-h-[56px] flex-col items-center justify-center gap-1 rounded-xl bg-brand-900 px-3 py-2.5 text-white transition-colors hover:bg-brand-800 active:scale-[0.99] disabled:opacity-60"
                        >
                          <span className="text-lg leading-none">📷</span>
                          <span className="text-xs font-extrabold uppercase tracking-wide">
                            {capturandoFotoItem && campoFotoAtual === campo ? 'Capturando...' : 'Foto'}
                          </span>
                        </button>
                      )}
                      {botaoFalar(campo, foto ? 'col-span-2' : '')}
                    </div>
                    {fotoItemErro && campoFotoAtual === campo && (
                      <InfoStrip tone="danger">{fotoItemErro}</InfoStrip>
                    )}
                    {vozErro && alvoVozAtual === campo && (
                      <InfoStrip tone="danger">{vozErro}</InfoStrip>
                    )}

                    <Input
                      placeholder="Adicionar observação (opcional)"
                      value={item?.observacao || ''}
                      onChange={(e) => atualizarItem(campo, { observacao: e.target.value })}
                    />
                  </div>
                )}
              </div>
            )
          })}
          {problemasMarcados === 0 && (
            <InfoStrip tone="success" icon="✅">Nenhum problema marcado</InfoStrip>
          )}
        </CadernetaSection>

        {/* Seção 3: Observação */}
        <CadernetaSection numero={3} titulo="Observação">
          <div className="grid grid-cols-[1fr_auto] items-start gap-2">
            <Input
              placeholder="Observações adicionais (opcional)"
              value={form.observacao}
              onChange={setInput('observacao')}
              error={getError('observacao')}
            />
            {botaoFalar('observacao', '!min-h-0 h-14 w-20 !py-1')}
          </div>
          {vozErro && alvoVozAtual === 'observacao' && <InfoStrip tone="danger">{vozErro}</InfoStrip>}
        </CadernetaSection>

        <FormFooter
          onSalvar={handleSalvar}
          onLimpar={handleLimpar}
          salvando={salvando}
          disabled={salvando || !isValid}
          formValido={isValid}
        />

        <input
          ref={fotoItemInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleFotoInputItem}
          className="hidden"
        />
        <input
          ref={fotoInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleFileInputChange}
          className="hidden"
        />
      </CadernetaLayout>

      <SuccessModal
        isOpen={showSuccessModal}
        onClose={handleNewRecord}
        onNewRecord={handleNewRecord}
        onExit={() => navigate(-1)}
        cadernetaName="MANUTENÇÃO DE MÁQUINAS"
        registro={registroSalvo}
        caderneta="manutencao-maquinas"
      />
    </>
  )
}
