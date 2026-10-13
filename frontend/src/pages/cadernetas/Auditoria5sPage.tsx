import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { Input, DatePicker, ValidationMessage } from '../../components/ui'
import SearchableModal from '../../components/ui/SearchableModal'
import SuccessModal from '../../components/SuccessModal'
import CadernetaLayout from '../../components/CadernetaLayout'
import CadernetaSection from '../../components/cadernetas/CadernetaSection'
import ChoiceGrid from '../../components/cadernetas/ChoiceGrid'
import InfoStrip from '../../components/cadernetas/InfoStrip'
import FormFooter from '../../components/cadernetas/FormFooter'
import BannerRascunho from '../../components/BannerRascunho'
import ObservacaoAtrasoModal from '../../components/ObservacaoAtrasoModal'
import { salvarRegistro } from '../../services/api'
import { getCachedCadastroData, getSetoresCached } from '../../services/cadastroCache'
import { todayBR } from '../../utils/formatDate'
import { scrollToFirstError } from '../../utils/scrollToError'
import { eventBus, CADASTRO_CACHE_UPDATED } from '../../utils/eventBus'
import { SECOES_5S, TOTAL_ITENS_5S, calcularResultado5S } from '../../utils/auditoria5sItens'
import { validateAuditoria5s } from '../../utils/validation'
import { useRascunhoForm } from '../../hooks/useRascunhoForm'
import { useSalvarRegistro } from '../../hooks/useSalvarRegistro'
import { RootState } from '../../store/store'

const RESPOSTA_OPTIONS = [
  { value: 'C', label: 'C', tone: 'success' as const },
  { value: 'N', label: 'N', tone: 'danger' as const },
]

interface FormState {
  data: string
  setor: string
  setorId: string
  responsavel: string
  itens: Record<string, string>
  observacoes: Record<string, string>
}

const makeInitial = (): FormState => ({
  data: todayBR(),
  setor: '',
  setorId: '',
  responsavel: '',
  itens: {},
  observacoes: {},
})

interface SetorOpcao {
  id: string
  nome: string
}

export default function Auditoria5sPage() {
  const navigate = useNavigate()
  const { usuario, fazendaId, controleAcessoHabilitado, funcionarioCadernetas, funcionarioNome } = useSelector(
    (state: RootState) => state.config
  )
  const { salvando, salvar, showObservacaoModal, horariosModal, onConfirmarObservacao, onCancelarObservacao } =
    useSalvarRegistro('auditoria-5s')
  const { form, setForm, limparRascunho, rascunhoRestaurado, confirmarRascunho, descartarRascunho } =
    useRascunhoForm<FormState>({ rascunhoKey: 'auditoria-5s', makeInitial })

  const [errors, setErrors] = useState<{ field: string; message: string }[]>([])
  const [showSuccessModal, setShowSuccessModal] = useState(false)
  const [registroSalvo, setRegistroSalvo] = useState<any>(null)
  const [setores, setSetores] = useState<SetorOpcao[]>([])
  const [setoresCarregados, setSetoresCarregados] = useState(false)
  const [funcionarios, setFuncionarios] = useState<string[]>([])

  // Com controle de acesso por funcionário (RBAC) ativo, o responsável é quem está logado.
  // Sem RBAC, ou sem nome do funcionário, escolhe-se na lista de funcionários.
  const responsavelLogado = controleAcessoHabilitado && funcionarioCadernetas.length > 0 ? funcionarioNome : ''
  const responsavel = responsavelLogado || form.responsavel

  // Setores e funcionários: cache local primeiro (funciona offline)
  useEffect(() => {
    let cancelado = false
    const carregar = async () => {
      try {
        const cache = await getCachedCadastroData()
        if (!cancelado && cache?.funcionarios) setFuncionarios(cache.funcionarios)
      } catch (error) {
        console.error('[Auditoria5sPage] Erro ao carregar funcionários:', error)
      }
      try {
        if (fazendaId) {
          const lista = await getSetoresCached(fazendaId)
          if (!cancelado) setSetores((lista || []).map((s: any) => ({ id: s.id, nome: s.nome })))
        }
      } catch (error) {
        console.error('[Auditoria5sPage] Erro ao carregar setores:', error)
      } finally {
        if (!cancelado) setSetoresCarregados(true)
      }
    }
    carregar()
    return () => {
      cancelado = true
    }
  }, [fazendaId])

  useEffect(() => {
    return eventBus.on(CADASTRO_CACHE_UPDATED, (data: any) => {
      if (data && Array.isArray(data.funcionarios)) setFuncionarios(data.funcionarios)
    })
  }, [])

  const resultado = useMemo(() => calcularResultado5S(form.itens), [form.itens])
  const faltam = TOTAL_ITENS_5S - resultado.respondidos

  const validacao = validateAuditoria5s({ ...form, responsavel })
  const isValid = validacao.isValid

  const getError = (field: string) => errors.find((e) => e.field === field)?.message

  const handleSetor = (nome: string) =>
    setForm((prev) => ({ ...prev, setor: nome, setorId: setores.find((s) => s.nome === nome)?.id || '' }))

  const setResposta = (chave: string) => (valor: string) =>
    setForm((prev) => ({ ...prev, itens: { ...prev.itens, [chave]: valor } }))

  const setObservacao = (secaoId: string, texto: string) =>
    setForm((prev) => ({ ...prev, observacoes: { ...prev.observacoes, [secaoId]: texto } }))

  const pendenciaTexto = (() => {
    if (!form.setor) return 'Falta escolher o setor'
    if (!responsavel) return 'Falta escolher o responsável'
    if (faltam > 0) return `Faltam ${faltam} ${faltam === 1 ? 'item' : 'itens'} para responder`
    return undefined
  })()

  const executarSalvamento = async () => {
    setErrors([])
    if (!isValid) return

    const observacoes = Object.fromEntries(
      Object.entries(form.observacoes)
        .map(([secao, texto]) => [secao, texto.trim()])
        .filter(([, texto]) => texto)
    )

    const result = await salvarRegistro('auditoria-5s', {
      data: form.data,
      usuario,
      setor: form.setor,
      setorId: form.setorId || null,
      responsavel,
      itens: form.itens,
      observacoes: Object.keys(observacoes).length > 0 ? observacoes : null,
      totalItens: resultado.totalItens,
      totalConformes: resultado.conformes,
      totalNaoConformes: resultado.naoConformes,
      percentualConformidade: resultado.percentual,
    })

    if (!result.success && result.errors) {
      setErrors(result.errors)
      scrollToFirstError(result.errors)
    } else {
      setRegistroSalvo(result.registro)
      setShowSuccessModal(true)
      limparRascunho()
    }
  }

  const handleLimpar = () => {
    limparRascunho()
    setErrors([])
  }

  const handleNewRecord = () => {
    setShowSuccessModal(false)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleExit = () => {
    setShowSuccessModal(false)
    navigate('/modulos/checklists')
  }

  return (
    <>
      <CadernetaLayout
        title="AUDITORIA 5S"
        cadernetaId="auditoria-5s"
        dateContent={<DatePicker value={form.data} onChange={(v) => setForm((prev) => ({ ...prev, data: v }))} variant="header" compact inline maxDate={todayBR()} />}
      >
        <BannerRascunho visible={rascunhoRestaurado} onConfirmar={confirmarRascunho} onDescartar={descartarRascunho} />
        {errors.length > 0 && <ValidationMessage errors={errors.filter((e) => !e.field.includes('_'))} />}

        <CadernetaSection titulo="Identificação" required>
          {setores.length > 0 ? (
            <SearchableModal
              label={<span>Setor <span className="text-red-500">*</span></span>}
              value={form.setor}
              onChange={handleSetor}
              error={getError('setor')}
              options={setores.map((s) => s.nome)}
              placeholder="Selecione o setor..."
              id="setor"
              name="setor"
            />
          ) : (
            <Input
              label="SETOR"
              placeholder={setoresCarregados ? 'Nenhum setor neste aparelho. Conecte à internet e atualize os dados' : 'Carregando...'}
              value={form.setor}
              onChange={() => {}}
              error={getError('setor')}
              disabled
            />
          )}

          {responsavelLogado ? (
            <InfoStrip tone="neutral" icon="👤">Responsável: {responsavelLogado}</InfoStrip>
          ) : funcionarios.length > 0 ? (
            <SearchableModal
              label={<span>Responsável <span className="text-red-500">*</span></span>}
              value={form.responsavel}
              onChange={(v) => setForm((prev) => ({ ...prev, responsavel: v }))}
              error={getError('responsavel')}
              options={funcionarios}
              placeholder="Buscar funcionário..."
              id="responsavel"
              name="responsavel"
            />
          ) : (
            <Input
              label="RESPONSÁVEL"
              placeholder="Nenhum funcionário neste aparelho. Conecte à internet e atualize os dados"
              value={form.responsavel}
              onChange={() => {}}
              error={getError('responsavel')}
              disabled
            />
          )}

          <div className="flex items-center justify-between rounded-xl bg-gray-50 px-4 py-3">
            <span className="text-sm font-bold text-gray-600">RESPONDIDOS</span>
            <span className="text-lg font-extrabold text-gray-900">
              {resultado.respondidos}/{TOTAL_ITENS_5S}
              {resultado.percentual !== null && <span className="ml-2 text-sm font-bold text-gray-500">{resultado.percentual}% conforme</span>}
            </span>
          </div>
        </CadernetaSection>

        {SECOES_5S.map((secao, indice) => {
          const res = resultado.secoes.find((s) => s.id === secao.id)
          return (
            <CadernetaSection
              key={secao.id}
              numero={indice + 1}
              titulo={secao.titulo}
              required
              right={res && res.conformes + res.naoConformes > 0 ? <span className="text-xs font-extrabold text-gray-500">{res.percentual}%</span> : undefined}
            >
              {secao.itens.map((item, i) => (
                <div key={item.chave} className="flex flex-col gap-2">
                  <p className="text-[15px] font-bold leading-snug text-gray-900">
                    {i + 1}) {item.texto}
                  </p>
                  <ChoiceGrid
                    options={RESPOSTA_OPTIONS}
                    value={form.itens[item.chave] || ''}
                    onChange={setResposta(item.chave)}
                    cols={2}
                    dataField={item.chave}
                  />
                  {getError(item.chave) && <p className="text-sm font-semibold text-red-700">{getError(item.chave)}</p>}
                </div>
              ))}
              <Input
                label="OBSERVAÇÕES"
                placeholder="Observações (opcional)"
                value={form.observacoes[secao.id] || ''}
                onChange={(e) => setObservacao(secao.id, e.target.value)}
              />
            </CadernetaSection>
          )
        })}

        <FormFooter
          onSalvar={() => salvar(executarSalvamento)}
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
        cadernetaName="Auditoria 5S"
        registro={registroSalvo}
        caderneta="auditoria-5s"
      />

      <ObservacaoAtrasoModal
        isOpen={showObservacaoModal}
        onClose={async (observacao) => {
          if (observacao !== undefined) {
            await onConfirmarObservacao(observacao)
          } else {
            onCancelarObservacao()
          }
        }}
        horarioProgramado={horariosModal.programado}
        horarioRegistro={horariosModal.registro}
      />
    </>
  )
}
