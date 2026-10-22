import { useState, useEffect, useMemo, useRef } from 'react'
import { useRefreshTick } from '../../hooks/useRefreshCadastros'
import { useNavigate } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { Input, DatePicker, ValidationMessage, SearchableModal } from '../ui'
import SuccessModal from '../SuccessModal'
import CadernetaLayout from '../CadernetaLayout'
import BannerRascunho from '../BannerRascunho'
import CadernetaSection from './CadernetaSection'
import ChoiceGrid from './ChoiceGrid'
import InfoCard from './InfoCard'
import InfoStrip from './InfoStrip'
import StepperInput from './StepperInput'
import FormFooter from './FormFooter'
import NovoMedicamentoModal, { NovoMedicamentoDados } from './NovoMedicamentoModal'
import { salvarRegistro } from '../../services/api'
import { todayBR } from '../../utils/formatDate'
import { scrollToFirstError } from '../../utils/scrollToError'
import { adicionarMedicamentoCache, getMedicamentosCached, updateMedicamentoSaldoCache } from '../../services/cadastroCache'
import { useCadastroOptions } from '../../hooks/useCadastroOptions'
import { useRascunhoForm } from '../../hooks/useRascunhoForm'
import { useVoiceInput } from '../../hooks/useVoiceInput'
import { RootState } from '../../store/store'
import { useFormValidation } from '../../hooks/useFormValidation'
import { formatarQuantidade, parseQuantidade, saldoApos, statusEstoque, unidadeConcordada } from '../../utils/farmaciaEstoque'
import { Pill, Plus, Syringe } from 'lucide-react'

export type ModoFarmacia = 'entrada' | 'baixa'

const MOTIVOS_SAIDA = [
  { value: 'Uso na fazenda', label: 'USO NA FAZENDA', icon: '🐄' },
  { value: 'Perda ou vencido', label: 'PERDA / VENCIDO', icon: '🗑️' },
  { value: 'Outro', label: 'OUTRO', icon: '📝' },
]

interface MedicamentoNovo extends NovoMedicamentoDados {
  id: string
  principio_ativo: string
  estoque_atual: number
  controla_estoque: boolean
  novo: true
}

interface FormState {
  data: string
  medicamento: string
  // Medicamento criado neste aparelho e ainda não enviado: vai junto no rascunho para sobreviver a fechar o app
  novoMedicamento: MedicamentoNovo | null
  quantidade: string
  motivoSaida: string
  // Texto digitado ou ditado quando o motivo é "Outro"
  motivoOutro: string
  custoUnitario: string
  fornecedor: string
  notaFiscal: string
  loteProduto: string
  validade: string
  observacao: string
}

const makeInitial = (): FormState => ({
  data: todayBR(),
  medicamento: '',
  novoMedicamento: null,
  quantidade: '',
  motivoSaida: '',
  motivoOutro: '',
  custoUnitario: '',
  fornecedor: '',
  notaFiscal: '',
  loteProduto: '',
  validade: '',
  observacao: '',
})

const rotuloMedicamento = (m: any) => `${m.nome_comercial} (${m.tipo})${m.sku ? ` · ${m.sku}` : ''}`
const normalizar = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim()

// Sanitiza campos decimais: permite apenas dígitos e uma vírgula decimal
const sanitizarDecimal = (texto: string) => {
  let value = texto.replace(/[^\d,]/g, '')
  const firstComma = value.indexOf(',')
  if (firstComma !== -1) value = value.slice(0, firstComma + 1) + value.slice(firstComma + 1).replace(/,/g, '')
  return value
}

interface Props {
  modo: ModoFarmacia
}

export default function FarmaciaForm({ modo }: Props) {
  const navigate = useNavigate()
  const { fazendaId } = useSelector((state: RootState) => state.config)
  const ehSaida = modo === 'baixa'
  const cadernetaId = ehSaida ? 'saida-farmacia' : 'entrada-farmacia'
  const { form, setForm, limparRascunho, rascunhoRestaurado, confirmarRascunho, descartarRascunho } =
    useRascunhoForm<FormState>({ rascunhoKey: cadernetaId, makeInitial })
  const [apiErrors, setApiErrors] = useState<{ field: string; message: string }[]>([])
  const [salvando, setSalvando] = useState(false)
  const [showSuccessModal, setShowSuccessModal] = useState(false)
  const [registroSalvo, setRegistroSalvo] = useState<any>(null)
  const [medicamentosServidor, setMedicamentosServidor] = useState<any[]>([])
  const [mostrarNovo, setMostrarNovo] = useState(false)
  const salvandoRef = useRef(false)
  const baseVozRef = useRef('')
  const baseVozMotivoRef = useRef('')

  const { ouvindo: ouvindoVoz, erro: vozErro, toggle: toggleVoz, parar: pararVoz } = useVoiceInput()
  const { ouvindo: ouvindoMotivo, erro: vozMotivoErro, toggle: toggleVozMotivo, parar: pararVozMotivo } = useVoiceInput()
  const { options: fornecedoresOptions, loading: loadingFornecedores } = useCadastroOptions('fornecedores', fazendaId)

  const refreshTick = useRefreshTick()
  useEffect(() => {
    async function carregar() {
      if (!fazendaId) return
      try {
        const lista = await getMedicamentosCached(fazendaId)
        if (lista) setMedicamentosServidor(lista)
      } catch (error) {
        console.error('Erro ao carregar medicamentos:', error)
      }
    }
    carregar()
  }, [fazendaId, refreshTick])

  // Lista do servidor + o medicamento novo deste aparelho (se o servidor ainda não o conhece)
  const medicamentos = useMemo(() => {
    const novo = form.novoMedicamento
    return novo && !medicamentosServidor.some((m) => m.id === novo.id) ? [...medicamentosServidor, novo] : medicamentosServidor
  }, [medicamentosServidor, form.novoMedicamento])

  const opcoes = useMemo(() => medicamentos.map(rotuloMedicamento), [medicamentos])
  const selecionado = useMemo(() => medicamentos.find((m) => rotuloMedicamento(m) === form.medicamento), [medicamentos, form.medicamento])

  const setCampo = <K extends keyof FormState>(campo: K) => (valor: FormState[K]) =>
    setForm((prev) => ({ ...prev, [campo]: valor }))
  const setInput = (campo: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((prev) => ({ ...prev, [campo]: e.target.value }))

  const quantidade = parseQuantidade(form.quantidade)
  const unidade = selecionado?.unidade || 'un'

  const validationRules: any = {
    data: { required: true },
    medicamento: {
      required: true,
      custom: (value: string) => (value && !medicamentos.some((m) => rotuloMedicamento(m) === value) ? 'Selecione um medicamento da lista' : null),
    },
    quantidade: {
      required: true,
      custom: (value: string) => {
        const n = parseFloat(String(value).replace(',', '.'))
        return value && (isNaN(n) || n <= 0) ? 'Informe uma quantidade maior que zero' : null
      },
    },
  }

  const { isValid } = useFormValidation(form, validationRules)

  // O que falta preencher aparece no rodapé (pendenciaTexto); aqui só entram os erros devolvidos ao salvar
  const getError = (field: string) => apiErrors.find((e) => e.field === field)?.message

  const handleAdicionarNovo = (dados: NovoMedicamentoDados) => {
    const existente = medicamentos.find(
      (m) => normalizar(m.nome_comercial) === normalizar(dados.nome_comercial) || (dados.sku && normalizar(m.sku || '') === normalizar(dados.sku))
    )
    if (existente) {
      setForm((prev) => ({ ...prev, medicamento: rotuloMedicamento(existente) }))
    } else {
      const novo: MedicamentoNovo = {
        ...dados,
        id: crypto.randomUUID(),
        principio_ativo: '',
        estoque_atual: 0,
        controla_estoque: true,
        novo: true,
      }
      setForm((prev) => ({ ...prev, novoMedicamento: novo, medicamento: rotuloMedicamento(novo) }))
    }
    setMostrarNovo(false)
  }

  // Ditado: o texto parcial é acrescentado ao que já existia quando a gravação começou.
  const handleFalar = async () => {
    if (ouvindoVoz) {
      await pararVoz()
      return
    }
    baseVozRef.current = form.observacao.trim()
    await toggleVoz((parcial) => {
      const texto = baseVozRef.current ? `${baseVozRef.current} ${parcial}` : parcial
      setForm((prev) => ({ ...prev, observacao: texto }))
    })
  }

  // Ditado do motivo "Outro": mesmo esquema da observação, em campo próprio
  const handleFalarMotivo = async () => {
    if (ouvindoMotivo) {
      await pararVozMotivo()
      return
    }
    baseVozMotivoRef.current = (form.motivoOutro ?? '').trim()
    await toggleVozMotivo((parcial) => {
      const texto = baseVozMotivoRef.current ? `${baseVozMotivoRef.current} ${parcial}` : parcial
      setForm((prev) => ({ ...prev, motivoOutro: texto }))
    })
  }

  const motivoSaidaTexto = form.motivoSaida === 'Outro' ? (form.motivoOutro ?? '').trim() : form.motivoSaida
  // Motivo "Outro" sem texto impede salvar, como os demais campos obrigatórios
  const motivoPendente = ehSaida && form.motivoSaida === 'Outro' && !motivoSaidaTexto

  const handleSalvar = async () => {
    if (!selecionado || salvandoRef.current) return
    salvandoRef.current = true
    setSalvando(true)
    setApiErrors([])

    // Na saída o motivo escolhido vai na frente da observação (não há coluna própria)
    const observacao = [ehSaida ? motivoSaidaTexto : '', form.observacao.trim()].filter(Boolean).join(' - ')

    let result: Awaited<ReturnType<typeof salvarRegistro>>
    try {
      result = await salvarRegistro(cadernetaId, {
        data: form.data,
        tipoMovimentacao: modo,
        medicamentoId: selecionado.id,
        medicamentoNome: selecionado.nome_comercial,
        unidade,
        quantidade: form.quantidade,
        custoUnitario: ehSaida ? '' : form.custoUnitario,
        fornecedor: ehSaida ? '' : form.fornecedor,
        notaFiscal: ehSaida ? '' : form.notaFiscal,
        loteProduto: form.loteProduto,
        validade: ehSaida ? '' : form.validade,
        observacao,
        // Medicamento que ainda não existe no servidor: o sync o cria (RPC criar_medicamento_pwa) antes da movimentação
        novoMedicamento: selecionado.novo
          ? {
              id: selecionado.id,
              nome_comercial: selecionado.nome_comercial,
              sku: selecionado.sku,
              tipo: selecionado.tipo,
              unidade: selecionado.unidade,
              conteudo_por_unidade: selecionado.conteudo_por_unidade,
              conteudo_unidade: selecionado.conteudo_unidade,
            }
          : undefined,
      })
    } finally {
      salvandoRef.current = false
      setSalvando(false)
    }

    if (!result.success && result.errors) {
      setApiErrors(result.errors)
      scrollToFirstError(result.errors)
      return
    }

    if (fazendaId) {
      if (selecionado.novo) await adicionarMedicamentoCache(fazendaId, { ...selecionado, estoque_atual: 0 })
      if (quantidade > 0) {
        const delta = ehSaida ? -quantidade : quantidade
        await updateMedicamentoSaldoCache(fazendaId, selecionado.id, delta)
        setMedicamentosServidor((prev) => {
          const base = prev.some((m) => m.id === selecionado.id) ? prev : [...prev, { ...selecionado, novo: undefined }]
          return base.map((m) => (m.id === selecionado.id ? { ...m, estoque_atual: Number(Number(m.estoque_atual || 0) + delta) } : m))
        })
      }
    }
    setRegistroSalvo(result.registro)
    setShowSuccessModal(true)
    limparRascunho()
  }

  const handleNewRecord = () => {
    setShowSuccessModal(false)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleExit = () => {
    setShowSuccessModal(false)
    navigate('/')
  }

  const saldoAtual = Number(selecionado?.estoque_atual || 0)
  const saldoDepois = saldoApos(saldoAtual, quantidade, ehSaida)
  const custoTotal = parseQuantidade(form.custoUnitario) * quantidade

  const pendenciaTexto = (() => {
    if (!form.medicamento) return 'Falta escolher o medicamento ou vacina'
    if (!selecionado) return 'Escolha um medicamento da lista'
    if (!form.quantidade.trim()) return 'Falta informar a quantidade'
    if (quantidade <= 0) return 'A quantidade precisa ser maior que zero'
    if (motivoPendente) return 'Descreva o motivo da saída'
    return undefined
  })()

  const iconeMedicamento = selecionado?.tipo === 'Vacina' ? Syringe : Pill

  return (
    <>
      <CadernetaLayout
        title={ehSaida ? 'FARMÁCIA · SAÍDA' : 'FARMÁCIA · ENTRADA'}
        cadernetaId={cadernetaId}
        dateContent={
          <DatePicker
            value={form.data}
            onChange={setCampo('data')}
            maxDate={todayBR()}
            variant="header"
            compact
            inline
          />
        }
      >
        <BannerRascunho visible={rascunhoRestaurado} onConfirmar={confirmarRascunho} onDescartar={descartarRascunho} />
        {apiErrors.length > 0 && <ValidationMessage errors={apiErrors} />}

        <CadernetaSection numero={1} titulo={ehSaida ? 'O que saiu?' : 'O que chegou?'} required>
          <SearchableModal
            label=""
            value={form.medicamento}
            onChange={setCampo('medicamento')}
            error={getError('medicamento')}
            options={opcoes}
            placeholder="Buscar medicamento ou vacina..."
            id="medicamento"
            name="medicamento"
          />

          {!ehSaida && (
            <button
              type="button"
              onClick={() => setMostrarNovo(true)}
              className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-gray-300 bg-gray-50/50 px-4 py-3 text-sm font-bold uppercase tracking-wide text-gray-500 transition-colors hover:border-brand-600 hover:text-brand-700 active:scale-[0.99]"
            >
              <Plus className="h-4 w-4" strokeWidth={2.5} />
              Não está na lista? Cadastrar novo
            </button>
          )}

          {selecionado && (
            <InfoCard
              icon={iconeMedicamento}
              title={selecionado.nome_comercial}
              subtitle={[selecionado.tipo?.replace(/_/g, ' '), selecionado.sku].filter(Boolean).join(' · ')}
              stats={[
                { label: 'Saldo atual', value: selecionado.controla_estoque ? formatarQuantidade(saldoAtual, unidade) : '-' },
                {
                  label: 'Mínimo',
                  value: Number(selecionado.estoque_minimo) > 0 ? formatarQuantidade(Number(selecionado.estoque_minimo), unidade) : '-',
                },
                { label: 'Unidade', value: unidade },
              ]}
              status={
                selecionado.novo
                  ? { tone: 'success', text: 'Medicamento novo: será cadastrado ao sincronizar' }
                  : statusEstoque(selecionado)
              }
            />
          )}
        </CadernetaSection>

        <CadernetaSection numero={2} titulo="Quantidade" required>
          <StepperInput
            value={form.quantidade}
            onChange={setCampo('quantidade')}
            min={0}
            suffix={selecionado ? unidadeConcordada(unidade, quantidade) : undefined}
            error={getError('quantidade')}
          />

          {selecionado?.controla_estoque && quantidade > 0 && (
            <InfoStrip tone={saldoDepois < 0 ? 'danger' : 'success'} icon={saldoDepois < 0 ? '⚠️' : '✅'}>
              {saldoDepois < 0
                ? `Saída maior que o saldo: ficará em ${formatarQuantidade(saldoDepois, unidade)}. Confira a quantidade`
                : `Saldo passará de ${formatarQuantidade(saldoAtual, unidade)} para ${formatarQuantidade(saldoDepois, unidade)}`}
            </InfoStrip>
          )}

          {ehSaida && (
            <div className="flex flex-col gap-2" data-field="motivoSaida">
              <p className="text-[13px] font-bold uppercase text-gray-900">Motivo da saída</p>
              <ChoiceGrid
                options={MOTIVOS_SAIDA}
                value={form.motivoSaida}
                onChange={(v) => setForm((prev) => ({ ...prev, motivoSaida: prev.motivoSaida === v ? '' : v }))}
                cols={2}
                labelSize="xs"
                showCheck={false}
              />

              {form.motivoSaida === 'Outro' && (
                <>
                  <button
                    type="button"
                    onClick={handleFalarMotivo}
                    className={`flex min-h-[56px] items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-white transition-colors active:scale-[0.99] ${
                      ouvindoMotivo ? 'animate-pulse bg-red-600' : 'bg-gray-600 hover:bg-gray-700'
                    }`}
                  >
                    <span className="text-lg leading-none">🎤</span>
                    <span className="text-sm font-extrabold uppercase tracking-wide">{ouvindoMotivo ? 'Ouvindo...' : 'Gravar motivo'}</span>
                  </button>
                  {vozMotivoErro && <InfoStrip tone="danger">{vozMotivoErro}</InfoStrip>}
                  <Input
                    label={<span>QUAL O MOTIVO?</span>}
                    placeholder="Digite ou grave o motivo da saída"
                    value={form.motivoOutro ?? ''}
                    onChange={setInput('motivoOutro')}
                    error={getError('motivoOutro')}
                  />
                </>
              )}
            </div>
          )}

          <Input
            label={<span>LOTE DO PRODUTO</span>}
            placeholder="Número do lote (opcional)"
            value={form.loteProduto}
            onChange={setInput('loteProduto')}
          />
        </CadernetaSection>

        {!ehSaida && (
          <CadernetaSection numero={3} titulo="Dados da compra (opcional)">
            <Input
              label={<span>CUSTO UNITÁRIO (R$)</span>}
              placeholder="Ex: 12,50"
              value={form.custoUnitario}
              onChange={(e) => setCampo('custoUnitario')(sanitizarDecimal(e.target.value))}
              inputMode="decimal"
            />
            {custoTotal > 0 && (
              <InfoStrip tone="neutral" icon="💰">
                Custo total da entrada: {custoTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              </InfoStrip>
            )}

            <SearchableModal
              label="FORNECEDOR"
              value={form.fornecedor}
              onChange={setCampo('fornecedor')}
              options={fornecedoresOptions}
              placeholder="Buscar fornecedor..."
              disabled={loadingFornecedores}
              id="fornecedor"
              name="fornecedor"
            />

            <Input
              label={<span>NOTA FISCAL</span>}
              placeholder="Número ou chave da NF"
              value={form.notaFiscal}
              onChange={setInput('notaFiscal')}
            />

            {form.validade ? (
              <div className="flex flex-col gap-2">
                <DatePicker label="VALIDADE" value={form.validade} onChange={setCampo('validade')} />
                <button
                  type="button"
                  onClick={() => setCampo('validade')('')}
                  className="self-start !min-h-0 text-sm font-bold text-gray-500 underline"
                >
                  Remover validade
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setCampo('validade')(todayBR())}
                className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-gray-300 bg-gray-50/50 px-4 py-3 text-sm font-bold uppercase tracking-wide text-gray-500 transition-colors hover:border-brand-600 hover:text-brand-700 active:scale-[0.99]"
              >
                <Plus className="h-4 w-4" strokeWidth={2.5} />
                Informar validade
              </button>
            )}
          </CadernetaSection>
        )}

        <CadernetaSection numero={ehSaida ? 3 : 4} titulo="Observação">
          <button
            type="button"
            onClick={handleFalar}
            className={`flex min-h-[56px] items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-white transition-colors active:scale-[0.99] ${
              ouvindoVoz ? 'animate-pulse bg-red-600' : 'bg-gray-600 hover:bg-gray-700'
            }`}
          >
            <span className="text-lg leading-none">🎤</span>
            <span className="text-sm font-extrabold uppercase tracking-wide">{ouvindoVoz ? 'Ouvindo...' : 'Gravar áudio'}</span>
          </button>
          {vozErro && <InfoStrip tone="danger">{vozErro}</InfoStrip>}
          <Input
            placeholder={ehSaida ? 'Destino ou detalhes da saída (opcional)' : 'Detalhes adicionais (opcional)'}
            value={form.observacao}
            onChange={setInput('observacao')}
          />
        </CadernetaSection>

        <FormFooter
          onSalvar={handleSalvar}
          onLimpar={limparRascunho}
          salvando={salvando}
          disabled={!isValid || motivoPendente}
          formValido={isValid}
          pendenciaTexto={pendenciaTexto}
        />
      </CadernetaLayout>

      <NovoMedicamentoModal isOpen={mostrarNovo} onClose={() => setMostrarNovo(false)} onConfirmar={handleAdicionarNovo} />

      <SuccessModal
        isOpen={showSuccessModal}
        onClose={() => setShowSuccessModal(false)}
        onNewRecord={handleNewRecord}
        onExit={handleExit}
        cadernetaName={ehSaida ? 'Saída de Farmácia' : 'Entrada de Farmácia'}
        registro={registroSalvo}
        caderneta={cadernetaId}
      />
    </>
  )
}
