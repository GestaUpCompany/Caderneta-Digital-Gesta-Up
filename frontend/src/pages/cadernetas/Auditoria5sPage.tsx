import { useState, useEffect, useMemo, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { Brush, Check, ClipboardList, User, X } from 'lucide-react'
import { Input, DatePicker, ValidationMessage } from '../../components/ui'
import SearchableModal from '../../components/ui/SearchableModal'
import SuccessModal from '../../components/SuccessModal'
import CadernetaLayout from '../../components/CadernetaLayout'
import CadernetaSection from '../../components/cadernetas/CadernetaSection'
import InfoStrip from '../../components/cadernetas/InfoStrip'
import EvidenciaProblema from '../../components/cadernetas/EvidenciaProblema'
import PlanoAcaoEditor, { novaMedida } from '../../components/cadernetas/PlanoAcaoEditor'
import BarraAcao5S from '../../components/cadernetas/auditoria5s/BarraAcao5S'
import ItemAuditoria5S from '../../components/cadernetas/auditoria5s/ItemAuditoria5S'
import SegmentoResposta5S, { type OpcaoSegmento } from '../../components/cadernetas/auditoria5s/SegmentoResposta5S'
import TrilhaPilares5S from '../../components/cadernetas/auditoria5s/TrilhaPilares5S'
import BannerRascunho from '../../components/BannerRascunho'
import ObservacaoAtrasoModal from '../../components/ObservacaoAtrasoModal'
import { salvarRegistro } from '../../services/api'
import { getCachedCadastroData, getSetoresCached, getPendencias5SCached } from '../../services/cadastroCache'
import { todayBR } from '../../utils/formatDate'
import { scrollToFirstError } from '../../utils/scrollToError'
import { eventBus, CADASTRO_CACHE_UPDATED } from '../../utils/eventBus'
import { SECOES_5S, TOTAL_ITENS_5S, CHAVES_ITENS_5S, calcularResultado5S } from '../../utils/auditoria5sItens'
import { chavesSemResposta5S, marcarRestantesConformes5S } from '../../utils/auditoria5sForm'
import { validateAuditoria5s } from '../../utils/validation'
import { MedidaPlano5S, Pendencia5S, SituacaoPendencia5S, diasEntre, situacaoPlano5S } from '../../utils/pendencias5s'
import { useRascunhoForm } from '../../hooks/useRascunhoForm'
import { usePhotoGps } from '../../hooks/usePhotoGps'
import { useVoiceInput } from '../../hooks/useVoiceInput'
import { useSalvarRegistro } from '../../hooks/useSalvarRegistro'
import { RootState } from '../../store/store'

// A nota usa as cores como o resto da tela: vermelho (0-1), âmbar (2-3), verde (4-5). O número e o texto abaixo dizem o mesmo.
const NOTAS_TEXTO = ['Muito ruim', 'Ruim', 'Regular', 'Bom', 'Muito bom', 'Excelente']
const OPCOES_NOTA: OpcaoSegmento[] = [0, 1, 2, 3, 4, 5].map((n) => ({
  value: String(n),
  label: String(n),
  descricao: `${n}, ${NOTAS_TEXTO[n]}`,
  tom: n <= 1 ? 'ruim' : n <= 3 ? 'alerta' : 'ok',
}))

const OPCOES_PENDENCIA: OpcaoSegmento[] = [
  { value: 'resolvida', label: 'Resolvido', tom: 'ok', icone: <Check className="h-5 w-5" strokeWidth={3} /> },
  { value: 'mantida', label: 'Ainda pendente', tom: 'ruim', icone: <X className="h-5 w-5" strokeWidth={3} /> },
]

interface FormState {
  data: string
  setor: string
  setorId: string
  responsavel: string
  itens: Record<string, string>
  observacoes: Record<string, string>
  // Evidência de cada item N: observação (obrigatória), foto (opcional) e plano de ação (opcional)
  naoConformidades: Record<string, { observacao: string; fotoBase64: string; planoAcao?: MedidaPlano5S[] }>
  // Resposta a cada pendência anterior do setor (chave do item -> resolvida | mantida)
  pendencias: Record<string, SituacaoPendencia5S | ''>
  notaGeral: number | null
}

const makeInitial = (): FormState => ({
  data: todayBR(),
  setor: '',
  setorId: '',
  responsavel: '',
  itens: {},
  observacoes: {},
  naoConformidades: {},
  pendencias: {},
  notaGeral: null,
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
  // Itens N de auditorias anteriores deste setor ainda não resolvidos
  const [pendenciasAbertas, setPendenciasAbertas] = useState<Pendencia5S[]>([])
  // null = ainda não consultado; false = histórico do servidor não lido (offline sem cache)
  const [pendenciasVerificadas, setPendenciasVerificadas] = useState<boolean | null>(null)
  const [carregandoPendencias, setCarregandoPendencias] = useState(false)
  const [confirmandoLimpar, setConfirmandoLimpar] = useState(false)
  const [campoFotoAtual, setCampoFotoAtual] = useState<string | null>(null)
  const [campoVozAtual, setCampoVozAtual] = useState<string | null>(null)
  const baseVozRef = useRef('')

  const { capturandoFoto, fotoErro, capturarFoto, fotoInputRef, handleFileInputChange } = usePhotoGps({ comGps: false })
  const { ouvindo: ouvindoVoz, erro: vozErro, toggle: toggleVoz, parar: pararVoz } = useVoiceInput()

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

  // Pendências do setor selecionado: cache primeiro (inclui auditorias deste aparelho ainda não sincronizadas) e revalida com timeout
  useEffect(() => {
    let cancelado = false
    setPendenciasAbertas([])
    setPendenciasVerificadas(null)
    if (!form.setor || !fazendaId) {
      setCarregandoPendencias(false)
      return
    }
    setCarregandoPendencias(true)
    getPendencias5SCached(fazendaId, form.setorId || null, form.setor)
      .then(({ resultado, verificado }) => {
        if (cancelado) return
        setPendenciasAbertas(resultado.abertas)
        setPendenciasVerificadas(verificado)
      })
      .catch((error) => {
        if (cancelado) return
        console.warn('[Auditoria5sPage] Pendências do setor indisponíveis:', error)
        setPendenciasVerificadas(false)
      })
      .finally(() => {
        if (!cancelado) setCarregandoPendencias(false)
      })
    return () => {
      cancelado = true
    }
  }, [form.setor, form.setorId, fazendaId])

  const naoConformidades = form.naoConformidades ?? {}
  const respostasPendencia = form.pendencias ?? {}
  const pendenciasPorChave = useMemo(
    () => Object.fromEntries(pendenciasAbertas.map((p) => [p.chave, p])) as Record<string, Pendencia5S>,
    [pendenciasAbertas]
  )
  const chavesPendentes = pendenciasAbertas.map((p) => p.chave)
  const pendenciasSemResposta = pendenciasAbertas.filter((p) => !respostasPendencia[p.chave])

  const resultado = useMemo(() => calcularResultado5S(form.itens), [form.itens])
  // Itens decididos pela pergunta de pendência não contam como "para responder"
  const faltam = chavesSemResposta5S(form.itens, chavesPendentes).length

  const validacao = validateAuditoria5s({ ...form, responsavel, pendenciasAbertas: chavesPendentes })
  const isValid = validacao.isValid && !carregandoPendencias
  const itensSemObservacao = validacao.errors.filter((e) => e.field.startsWith('obs_')).length

  const getError = (field: string) => errors.find((e) => e.field === field)?.message

  // Trocar de setor descarta as respostas das pendências do anterior (e os itens que elas definiram)
  const handleSetor = (nome: string) =>
    setForm((prev) => {
      if (prev.setor === nome) return prev
      const respondidas = Object.keys(prev.pendencias ?? {})
      const itens = { ...prev.itens }
      const evidencias = { ...(prev.naoConformidades ?? {}) }
      respondidas.forEach((c) => {
        delete itens[c]
        delete evidencias[c]
      })
      return { ...prev, setor: nome, setorId: setores.find((s) => s.nome === nome)?.id || '', itens, naoConformidades: evidencias, pendencias: {} }
    })

  // Só item N carrega evidência: mudar para C/– descarta observação e foto
  const setResposta = (chave: string) => (valor: string) =>
    setForm((prev) => {
      const evidencias = { ...(prev.naoConformidades ?? {}) }
      if (valor === 'N') evidencias[chave] = evidencias[chave] ?? { observacao: '', fotoBase64: '' }
      else delete evidencias[chave]
      return { ...prev, itens: { ...prev.itens, [chave]: valor }, naoConformidades: evidencias }
    })

  // Responder uma pendência define o item: ainda pendente = N (herda a evidência e o plano anteriores); resolvida = C.
  const responderPendencia = (chave: string, situacao: SituacaoPendencia5S) =>
    setForm((prev) => {
      const evidencias = { ...(prev.naoConformidades ?? {}) }
      if (situacao === 'mantida') {
        const planoAnterior = pendenciasPorChave[chave]?.planoAcao?.medidas.map((m) => ({ ...m }))
        evidencias[chave] = evidencias[chave] ?? { observacao: '', fotoBase64: '', planoAcao: planoAnterior }
      } else {
        delete evidencias[chave]
      }
      return {
        ...prev,
        pendencias: { ...(prev.pendencias ?? {}), [chave]: situacao },
        itens: { ...prev.itens, [chave]: situacao === 'mantida' ? 'N' : 'C' },
        naoConformidades: evidencias,
      }
    })

  const setEvidencia = (chave: string, parcial: Partial<{ observacao: string; fotoBase64: string; planoAcao: MedidaPlano5S[] }>) =>
    setForm((prev) => {
      const atual = (prev.naoConformidades ?? {})[chave] ?? { observacao: '', fotoBase64: '' }
      return { ...prev, naoConformidades: { ...(prev.naoConformidades ?? {}), [chave]: { ...atual, ...parcial } } }
    })

  const handleTirarFoto = async (chave: string) => {
    setCampoFotoAtual(chave)
    const base64 = await capturarFoto()
    // Nativo retorna a foto aqui; no web o retorno vem pelo input file hidden
    if (base64) setEvidencia(chave, { fotoBase64: base64 })
  }

  const handleFotoInput = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const result = await handleFileInputChange(e)
    if (result?.fotoBase64 && campoFotoAtual) setEvidencia(campoFotoAtual, { fotoBase64: result.fotoBase64 })
  }

  // Ditado: o texto parcial é acrescentado ao que já existia quando a gravação começou (dá para falar mais de uma vez)
  const handleFalar = async (chave: string) => {
    if (ouvindoVoz) {
      await pararVoz()
      if (campoVozAtual === chave) return
    }
    setCampoVozAtual(chave)
    baseVozRef.current = (naoConformidades[chave]?.observacao || '').trim()
    await toggleVoz((parcial) => {
      setEvidencia(chave, { observacao: baseVozRef.current ? `${baseVozRef.current} ${parcial}` : parcial })
    })
  }

  const setObservacao = (secaoId: string, texto: string) =>
    setForm((prev) => ({ ...prev, observacoes: { ...prev.observacoes, [secaoId]: texto } }))

  // Atalho de praticidade: itens do pilar ainda sem resposta viram Conforme; respostas existentes e pendências não mudam
  const marcarRestantesConformes = (secaoId: string) =>
    setForm((prev) => {
      const secao = SECOES_5S.find((s) => s.id === secaoId)
      if (!secao) return prev
      const itens = marcarRestantesConformes5S(prev.itens, secao, chavesPendentes)
      return itens === prev.itens ? prev : { ...prev, itens }
    })

  const rolarAte = (el: Element | null, focar = true) => {
    if (!el) return
    const reduzido = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    el.scrollIntoView({ behavior: reduzido ? 'auto' : 'smooth', block: 'center' })
    if (focar) (el.querySelector('button, input, textarea') as HTMLElement | null)?.focus({ preventScroll: true })
  }

  const irParaPilar = (secaoId: string) => {
    const el = document.getElementById(`pilar-${secaoId}`)
    if (!el) return
    const reduzido = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    el.scrollIntoView({ behavior: reduzido ? 'auto' : 'smooth', block: 'start' })
  }

  // Leva ao próximo ponto que impede salvar, na mesma ordem em que a tela pede as informações
  const irParaPendente = () => {
    const campo = (seletor: string) => document.querySelector(seletor)
    if (!form.setor) return rolarAte(document.getElementById('setor'))
    if (!responsavel) return rolarAte(document.getElementById('responsavel'))
    if (pendenciasSemResposta.length > 0) return rolarAte(campo(`[data-field="pendencia_${pendenciasSemResposta[0].chave}"]`))
    const semObservacao = validacao.errors.find((e) => e.field.startsWith('obs_'))
    if (semObservacao) return rolarAte(campo(`[data-field="${semObservacao.field}"]`))
    const semResposta = chavesSemResposta5S(form.itens, chavesPendentes)[0]
    if (semResposta) return rolarAte(campo(`[data-field="${semResposta}"]`))
    return rolarAte(campo('[data-field="notaGeral"]'))
  }

  // Plano de ação do item N: criado vazio por botão; a edição e a remoção ficam no PlanoAcaoEditor
  const renderPlano = (chave: string) => {
    const medidas = naoConformidades[chave]?.planoAcao
    if (!medidas) {
      return (
        <button
          type="button"
          onClick={() => setEvidencia(chave, { planoAcao: [novaMedida()] })}
          className="flex !min-h-[48px] items-center justify-center gap-2 rounded-xl border-2 border-blue-400 bg-white px-4 text-sm font-extrabold text-blue-900 hover:bg-blue-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-300/70"
        >
          <ClipboardList className="h-5 w-5" aria-hidden="true" />
          Criar plano de ação
        </button>
      )
    }
    return (
      <PlanoAcaoEditor
        medidas={medidas}
        onChange={(novas) => setEvidencia(chave, { planoAcao: novas })}
        onRemover={() => setEvidencia(chave, { planoAcao: undefined })}
        dataField={`plano_${chave}`}
      />
    )
  }

  const pendenciaTexto = (() => {
    if (!form.setor) return 'Falta escolher o setor'
    if (!responsavel) return 'Falta escolher o responsável'
    if (carregandoPendencias) return 'Buscando pendências do setor...'
    if (pendenciasSemResposta.length > 0) {
      const n = pendenciasSemResposta.length
      return `Falta responder ${n} ${n === 1 ? 'pendência anterior' : 'pendências anteriores'} do setor`
    }
    if (itensSemObservacao > 0) return `Falta descrever ${itensSemObservacao} ${itensSemObservacao === 1 ? 'não conformidade' : 'não conformidades'}`
    if (faltam > 0) return `Faltam ${faltam} ${faltam === 1 ? 'item' : 'itens'} para responder`
    if (form.notaGeral === null || form.notaGeral === undefined) return 'Falta dar a nota do setor'
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

    // Evidência só dos itens N; o item que veio de pendência "ainda pendente" leva o marcador com a data de origem.
    // Plano de ação: só medidas com descrição; sem medidas não grava plano. criado_em herda o da pendência anterior.
    const agora = new Date().toISOString()
    const evidencias = Object.fromEntries(
      CHAVES_ITENS_5S.filter((chave) => form.itens[chave] === 'N').map((chave) => {
        const ev = naoConformidades[chave]
        const pendencia = pendenciasPorChave[chave]
        const medidas = (ev?.planoAcao ?? [])
          .filter((m) => m.descricao.trim())
          .map((m) => ({ ...m, descricao: m.descricao.trim(), responsavel: m.responsavel?.trim() || null }))
        return [
          chave,
          {
            observacao: (ev?.observacao || '').trim(),
            fotoBase64: ev?.fotoBase64 || undefined,
            ...(medidas.length > 0
              ? { plano_acao: { medidas, criado_em: pendencia?.planoAcao?.criado_em ?? agora, atualizado_em: agora } }
              : {}),
            ...(pendencia && respostasPendencia[chave] ? { pendencia: { situacao: respostasPendencia[chave], desde: pendencia.desde } } : {}),
          },
        ]
      })
    )

    const result = await salvarRegistro('auditoria-5s', {
      data: form.data,
      usuario,
      setor: form.setor,
      setorId: form.setorId || null,
      responsavel,
      itens: form.itens,
      naoConformidades: Object.keys(evidencias).length > 0 ? evidencias : null,
      pendencias: Object.keys(respostasPendencia).length > 0 ? respostasPendencia : null,
      pendenciasAbertas: chavesPendentes,
      notaGeral: form.notaGeral,
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

  // Limpar apaga tudo o que foi preenchido: o primeiro toque só pede confirmação (volta ao normal em 4 s)
  const handleLimpar = () => {
    if (!confirmandoLimpar) {
      setConfirmandoLimpar(true)
      return
    }
    setConfirmandoLimpar(false)
    limparRascunho()
    setErrors([])
  }

  useEffect(() => {
    if (!confirmandoLimpar) return
    const t = setTimeout(() => setConfirmandoLimpar(false), 4000)
    return () => clearTimeout(t)
  }, [confirmandoLimpar])

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
        bottomPaddingClass="pb-56"
        bottomContent={
          <BarraAcao5S
            respondidos={resultado.respondidos}
            total={TOTAL_ITENS_5S}
            naoConformes={resultado.naoConformes}
            valido={isValid}
            salvando={salvando}
            pendenciaTexto={pendenciaTexto}
            onSalvar={() => salvar(executarSalvamento)}
            onIrParaPendente={irParaPendente}
          />
        }
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
            <p className="flex items-center gap-2 rounded-xl bg-gray-100 px-3.5 py-2.5 text-sm font-semibold text-gray-700">
              <User className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
              <span>
                Responsável: <strong className="text-gray-900">{responsavelLogado}</strong>
              </span>
            </p>
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

          <TrilhaPilares5S itens={form.itens} respondidos={resultado.respondidos} total={TOTAL_ITENS_5S} percentual={resultado.percentual} onIrPara={irParaPilar} />
        </CadernetaSection>

        {form.setor && (carregandoPendencias || pendenciasAbertas.length > 0 || pendenciasVerificadas === false) && (
          <CadernetaSection
            titulo="Pendências anteriores"
            required={pendenciasAbertas.length > 0}
            right={
              pendenciasAbertas.length > 0 ? (
                <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-extrabold tabular-nums text-amber-900">
                  {pendenciasAbertas.length - pendenciasSemResposta.length}/{pendenciasAbertas.length} respondidas
                </span>
              ) : undefined
            }
          >
            {carregandoPendencias ? (
              <p role="status" className="py-2 text-center text-sm text-gray-600">Buscando pendências do setor...</p>
            ) : (
              <>
                {pendenciasAbertas.length > 0 && (
                  <p className="-mt-2 text-sm text-gray-600">
                    Estes itens foram marcados como não conformes em auditorias anteriores deste setor. Informe se já foram resolvidos.
                  </p>
                )}
                {pendenciasVerificadas === false && (
                  <InfoStrip tone="warning" icon="⚠️">
                    Pendências não verificadas com o servidor neste aparelho. Conecte à internet e atualize os dados.
                  </InfoStrip>
                )}
                {pendenciasAbertas.map((p) => {
                  const dias = diasEntre(p.desde, new Date().toISOString())
                  const idTitulo = `pendencia-titulo-${p.chave}`
                  return (
                    <div key={p.chave} className="flex flex-col gap-3 rounded-xl border border-amber-300 border-l-4 border-l-amber-500 bg-amber-50/60 p-3.5">
                      <div className="flex flex-col gap-2">
                        <p id={idTitulo} className="text-[17px] font-extrabold leading-snug text-amber-950">
                          {p.secao}: {p.label}
                        </p>
                        <div className="flex flex-wrap gap-1.5 text-xs font-bold">
                          <span className={`rounded-full px-2.5 py-1 ${dias >= 7 ? 'bg-red-100 text-red-800' : 'bg-amber-200 text-amber-900'}`}>
                            {dias === 0 ? 'Aberta hoje' : `Aberta há ${dias} ${dias === 1 ? 'dia' : 'dias'}`}
                          </span>
                          <span className="rounded-full bg-white px-2.5 py-1 text-gray-700">desde {new Date(p.desde).toLocaleDateString('pt-BR')}</span>
                          {p.ocorrencias > 1 && <span className="rounded-full bg-red-100 px-2.5 py-1 text-red-800">Marcada em {p.ocorrencias} auditorias seguidas</span>}
                        </div>
                      </div>
                      {p.observacao && <p className="text-sm text-gray-800">“{p.observacao}”</p>}
                      {p.planoAcao && (
                        <div className="rounded-lg bg-white/80 p-2.5 text-sm text-gray-800">
                          <span className="font-bold text-blue-900">
                            Plano anterior: {p.planoAcao.medidas.filter((m) => m.concluida).length}/{p.planoAcao.medidas.length} medidas concluídas
                          </span>
                          {situacaoPlano5S(p.planoAcao, new Date().toISOString()) === 'atrasado' && <span className="ml-2 font-bold text-red-700">· com prazo vencido</span>}
                          <ul className="mt-1 list-disc pl-5">
                            {p.planoAcao.medidas
                              .filter((m) => !m.concluida)
                              .map((m) => (
                                <li key={m.id}>
                                  {m.descricao}
                                  {m.responsavel ? ` (${m.responsavel})` : ''}
                                  {m.prazo ? ` · prazo ${new Date(`${m.prazo}T12:00:00`).toLocaleDateString('pt-BR')}` : ''}
                                </li>
                              ))}
                          </ul>
                        </div>
                      )}
                      {p.fotoUrl && (
                        <img
                          src={p.fotoUrl}
                          alt={`Foto anterior: ${p.label}`}
                          className="h-24 w-24 rounded-lg border border-gray-200 object-cover"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none'
                          }}
                        />
                      )}
                      <SegmentoResposta5S
                        opcoes={OPCOES_PENDENCIA}
                        value={respostasPendencia[p.chave] || ''}
                        onChange={(v) => responderPendencia(p.chave, v as SituacaoPendencia5S)}
                        ariaLabelledBy={idTitulo}
                        dataField={`pendencia_${p.chave}`}
                        colunas={2}
                      />
                      {getError(`pendencia_${p.chave}`) && (
                        <p role="alert" className="text-sm font-semibold text-red-700">
                          {getError(`pendencia_${p.chave}`)}
                        </p>
                      )}
                      {respostasPendencia[p.chave] === 'mantida' && (
                        <EvidenciaProblema
                          observacao={naoConformidades[p.chave]?.observacao || ''}
                          onObservacao={(texto) => setEvidencia(p.chave, { observacao: texto })}
                          dataField={`obs_${p.chave}`}
                          foto={naoConformidades[p.chave]?.fotoBase64 || ''}
                          onTirarFoto={() => handleTirarFoto(p.chave)}
                          onRemoverFoto={() => setEvidencia(p.chave, { fotoBase64: '' })}
                          capturandoFoto={capturandoFoto && campoFotoAtual === p.chave}
                          fotoErro={campoFotoAtual === p.chave ? fotoErro : null}
                          ouvindo={ouvindoVoz && campoVozAtual === p.chave}
                          onFalar={() => handleFalar(p.chave)}
                          vozErro={campoVozAtual === p.chave ? vozErro : null}
                          aviso="Ainda pendente. A observação anterior é mantida; acrescente uma nova se quiser (opcional)."
                        />
                      )}
                      {respostasPendencia[p.chave] === 'mantida' && renderPlano(p.chave)}
                    </div>
                  )
                })}
              </>
            )}
          </CadernetaSection>
        )}

        {SECOES_5S.map((secao, indice) => {
          const res = resultado.secoes.find((s) => s.id === secao.id)
          const feitos = res ? res.conformes + res.naoConformes + res.naoAplicaveis : 0
          const restantes = chavesSemResposta5S(form.itens, chavesPendentes, secao).length
          return (
            <div key={secao.id} id={`pilar-${secao.id}`} className="scroll-mt-32">
              <CadernetaSection
                numero={indice + 1}
                titulo={secao.titulo}
                required
                right={
                  <div className="flex items-center gap-2">
                    {restantes > 0 && feitos > 0 && (
                      <button
                        type="button"
                        onClick={() => marcarRestantesConformes(secao.id)}
                        aria-label={`Marcar como conforme os ${restantes} itens ainda sem resposta do pilar ${secao.titulo}`}
                        className="!min-h-[40px] !min-w-0 rounded-lg border-2 border-green-700 px-2.5 text-xs font-extrabold text-green-800 hover:bg-green-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-green-400/70"
                      >
                        Restantes: Conforme
                      </button>
                    )}
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-extrabold tabular-nums ${
                        feitos === secao.itens.length ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-700'
                      }`}
                    >
                      {feitos}/{secao.itens.length}
                    </span>
                  </div>
                }
              >
                {secao.itens.map((item, i) => {
                  // Item com pendência anterior é decidido pela pergunta acima: resolvido some daqui, pendente aparece como N fixo
                  const pendencia = pendenciasPorChave[item.chave]
                  if (pendencia && respostasPendencia[item.chave] !== 'mantida') return null
                  const resposta = form.itens[item.chave] || ''
                  return (
                    <ItemAuditoria5S
                      key={item.chave}
                      chave={item.chave}
                      numero={i + 1}
                      texto={item.texto}
                      resposta={resposta}
                      onResposta={setResposta(item.chave)}
                      pendenciaAnterior={!!pendencia}
                      erro={getError(item.chave)}
                    >
                      {!pendencia && resposta === 'N' && (
                        <EvidenciaProblema
                          obrigatoria
                          observacao={naoConformidades[item.chave]?.observacao || ''}
                          onObservacao={(texto) => setEvidencia(item.chave, { observacao: texto })}
                          erroObservacao={getError(`obs_${item.chave}`)}
                          dataField={`obs_${item.chave}`}
                          foto={naoConformidades[item.chave]?.fotoBase64 || ''}
                          onTirarFoto={() => handleTirarFoto(item.chave)}
                          onRemoverFoto={() => setEvidencia(item.chave, { fotoBase64: '' })}
                          capturandoFoto={capturandoFoto && campoFotoAtual === item.chave}
                          fotoErro={campoFotoAtual === item.chave ? fotoErro : null}
                          ouvindo={ouvindoVoz && campoVozAtual === item.chave}
                          onFalar={() => handleFalar(item.chave)}
                          vozErro={campoVozAtual === item.chave ? vozErro : null}
                          aviso={item.negativa}
                        />
                      )}
                      {!pendencia && resposta === 'N' && renderPlano(item.chave)}
                    </ItemAuditoria5S>
                  )
                })}
                <Input
                  label="OBSERVAÇÕES GERAIS DO PILAR"
                  placeholder="Observações (opcional)"
                  value={form.observacoes[secao.id] || ''}
                  onChange={(e) => setObservacao(secao.id, e.target.value)}
                />
              </CadernetaSection>
            </div>
          )
        })}

        <CadernetaSection numero={SECOES_5S.length + 1} titulo="Nota do setor" required>
          <p id="nota-setor-titulo" className="-mt-2 text-sm text-gray-600">
            De 0 (muito ruim) a 5 (excelente). Independe do percentual de conformidade.
          </p>
          <SegmentoResposta5S
            opcoes={OPCOES_NOTA}
            value={form.notaGeral === null || form.notaGeral === undefined ? '' : String(form.notaGeral)}
            onChange={(v) => setForm((prev) => ({ ...prev, notaGeral: Number(v) }))}
            ariaLabelledBy="nota-setor-titulo"
            dataField="notaGeral"
            colunas={6}
            compacto
          />
          <p aria-live="polite" className="text-center text-sm font-bold text-gray-800">
            {form.notaGeral === null || form.notaGeral === undefined ? 'Toque no número para dar a nota' : `${form.notaGeral} · ${NOTAS_TEXTO[form.notaGeral]}`}
          </p>
          {getError('notaGeral') && (
            <p role="alert" className="text-sm font-semibold text-red-700">
              {getError('notaGeral')}
            </p>
          )}
        </CadernetaSection>

        <input ref={fotoInputRef} type="file" accept="image/*" capture="environment" onChange={handleFotoInput} className="hidden" />

        <button
          type="button"
          onClick={handleLimpar}
          className={`mx-auto flex !min-h-[48px] items-center justify-center gap-2 rounded-xl px-5 text-sm font-bold transition-colors focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-400/70 ${
            confirmandoLimpar ? 'bg-red-600 text-white hover:bg-red-700' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          <Brush className="h-4 w-4" strokeWidth={2.5} aria-hidden="true" />
          {confirmandoLimpar ? 'Toque de novo para apagar tudo' : 'Limpar formulário'}
        </button>
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
